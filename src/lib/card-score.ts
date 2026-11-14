import { effectiveCount } from "@/lib/card-relationship";
import { levelForExchanges, rankForPoints, type ExchangeLevel, type ReferralRank } from "@/lib/card-rank";

/**
 * カードのスコア。**カードが本人の身代わりになる**（ユーザー指示 2026-11-06）。
 *
 * ⚠️⚠️ **ここがこの機能で最大の法務リスク地点。**
 *    人にスコアを付けて他人に見せるのは「信用スコア」そのもの。日本では Yahoo!スコアが
 *    本人の十分な同意なくスコア化したとして強い批判を受け、サービスごと終了している。
 *    スコアが低い人が取引から外される（スコアによる不利益取扱い）と、
 *    個人情報保護法の問題だけでなく、共創の場としての信頼が失われる。
 *
 *    したがって、**出していい数字と、本人以外に絶対に出さない数字を分ける。**
 *
 *    ■ 他人のカードに出してよい（＝実績。積み上げた事実だけ）
 *        - 交換した人数の**段階**（正確な数は出さない）
 *        - **商談実施**の件数、ランクの称号
 *        - 交換の称号（レベル）
 *    ■ **本人だけ**（他人・企業・事務局の一覧に出さない）
 *        - 信用残高  … **減る指標**。見えると不利益取扱いに直結する
 *        - 関係係数  … 相手との関係の近さ。相手本人に見えると人間関係を壊す
 *        - 静かな評価の集計
 *
 * ⚠️ 他人のカードに出す項目は、**本人が公開を選べる**こと。既定は非公開でよい。
 *    「黙っていてもスコアが付いて他人に見える」状態を作らないこと。
 */

/** 交換人数は段階でしか出さない（正確な数は人脈の規模を晒すので出さない） */
export type ReachBand = { code: "seed" | "small" | "mid" | "wide" | "hub"; label: string };

/**
 * 段階は **Dunbar の層** に合わせてある（5 / 15 / 50 / 150）。
 * 携帯電話の通話データを使った MacCarron, Kaski & Dunbar (2016, arXiv:1604.02400) で、
 * 各層の平均がおよそ 5・15・50・150 人になることが報告されている。
 * ⚠️ 500・1500 の層は提案にとどまり、確立したとは言えないので、最上段は「150人以上」で止めている。
 * ⚠️ 150 は**維持できる関係の上限の目安**でもある。ここを大きく超えて「生きている」と出る場合、
 *    減衰の設定が甘い可能性を疑うこと（数字が良く見えるほうへ寄せない）。
 */
export function reachBand(effective: number): ReachBand {
  if (effective >= 150) return { code: "hub",   label: "150人以上と続いている" };
  if (effective >= 50)  return { code: "wide",  label: "50人以上と続いている" };
  if (effective >= 15)  return { code: "mid",   label: "15人以上と続いている" };
  if (effective >= 5)   return { code: "small", label: "5人以上と続いている" };
  return { code: "seed", label: "これからつながるところ" };
}

/** 他人のカードに出してよいもの。**信用残高と関係係数は入れない** */
export type CardPublicStats = {
  level: ExchangeLevel;
  rank: ReferralRank;
  reach: ReachBand;
  /** **商談が実施された**件数（受注数ではない）。実績なので出してよい */
  settledDeals: number;
};

/** 本人だけが見るもの */
export type CardPrivateStats = CardPublicStats & {
  /** 生きている関係の数（正確な値） */
  effectiveConnections: number;
  /** 交換した総枚数（切れている関係も含む） */
  totalExchanges: number;
  /** ⚠️ 本人以外に出さない */
  trustBalance: number;
  /** ⚠️ 本人以外に出さない。いま押さえている（紹介中の）信用 */
  trustOnHold: number;
  points: number;
};

export function publicStats(input: {
  totalExchanges: number;
  strengths: number[];
  points: number;
  settledDeals: number;
}): CardPublicStats {
  return {
    level: levelForExchanges(input.totalExchanges),
    rank: rankForPoints(input.points),
    reach: reachBand(effectiveCount(input.strengths)),
    settledDeals: input.settledDeals,
  };
}

export function privateStats(input: {
  totalExchanges: number;
  strengths: number[];
  points: number;
  settledDeals: number;
  trustBalance: number;
  trustOnHold: number;
}): CardPrivateStats {
  return {
    ...publicStats(input),
    effectiveConnections: effectiveCount(input.strengths),
    totalExchanges: input.totalExchanges,
    trustBalance: input.trustBalance,
    trustOnHold: input.trustOnHold,
    points: input.points,
  };
}

/**
 * カードの公開設定。**既定はすべて非公開**。
 * ⚠️ 既定を公開にしないこと。「黙っていたらスコアが他人に見えていた」は作らない。
 */
export type CardVisibility = {
  showLevel: boolean;
  showRank: boolean;
  showReach: boolean;
  showSettledDeals: boolean;
};

export const DEFAULT_CARD_VISIBILITY: CardVisibility = {
  showLevel: false,
  showRank: false,
  showReach: false,
  showSettledDeals: false,
};

/** 公開設定を当てはめて、相手に見せる分だけ残す */
export function applyVisibility(
  stats: CardPublicStats,
  v: CardVisibility
): Partial<CardPublicStats> {
  return {
    ...(v.showLevel ? { level: stats.level } : {}),
    ...(v.showRank ? { rank: stats.rank } : {}),
    ...(v.showReach ? { reach: stats.reach } : {}),
    ...(v.showSettledDeals ? { settledDeals: stats.settledDeals } : {}),
  };
}
