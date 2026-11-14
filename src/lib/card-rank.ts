/**
 * ⚠️⚠️ **「成約」の定義（ユーザー決定 2026-11-06）＝「商談が実施された時点」。受注ではない。**
 *
 *    支払いと報酬は、**商談が実施された時点**で発生する。契約が取れたかどうかは問わない。
 *    コード中の `settled` / `settledDeals` / `pointsForDeal` はすべてこの意味。
 *    ⚠️ 「成約」という語は普通は受注を指すので、**読み違えると報酬の意味が変わる**。
 *       画面に出す日本語は必ず**「商談実施」**と書くこと。「成約」とは書かない。
 */

/**
 * 交換カードのレベルと、紹介報酬のランク。
 *
 * ⚠️ **2層に分けてあることが肝**。混ぜないこと。
 *    - レベル（EXCHANGE_LEVELS）＝**交換した枚数**で上がる。称号と見た目だけ。**報酬には一切効かない**。
 *    - ランク（REFERRAL_RANKS）＝**紹介が成立した件数**で上がる。**報酬額はこちらだけで決まる**。
 *    交換数で報酬を上げると、実際には会っていない人同士が相互に交換し合うだけで
 *    報酬が上がる（水増しが経済的に得になる）。レベルを報酬に繋げないのはそのため。
 *
 * ⚠️ 金額はすべて**仮置き**。公開前に必ず確定させること。
 *    ⚠️ **「最大100万円」は1件あたりではなく、年間累計の到達例**として書くこと。
 *       1件100万円と読める書き方をすると、到達者がほとんど出ない場合に
 *       景品表示法の有利誤認になる。達成条件と、実際の到達実績を併記できる形にしておく。
 *    ⚠️ 紹介報酬は「紹介という役務の対価」であって景品類ではないため、景品規制の
 *       上限そのものはかからない。問題になるのは**表示**のほう。
 */

export type ExchangeLevel = {
  level: number;
  /** この称号になるのに必要な交換枚数（以上） */
  minExchanges: number;
  name: string;
  /** 次の称号までの案内に使う短い一言 */
  blurb: string;
};

/** 交換枚数で上がる称号。報酬には効かない（見た目と励みのため） */
export const EXCHANGE_LEVELS: ExchangeLevel[] = [
  { level: 1, minExchanges: 0, name: "はじめまして", blurb: "カードを交換すると、ここが変わります。" },
  { level: 2, minExchanges: 5, name: "顔つなぎ", blurb: "5人と交換しました。" },
  { level: 3, minExchanges: 15, name: "名もなき世話役", blurb: "15人と交換しました。" },
  { level: 4, minExchanges: 30, name: "まとめ役", blurb: "30人と交換しました。" },
  { level: 5, minExchanges: 60, name: "ハブ", blurb: "60人と交換しました。" },
  { level: 6, minExchanges: 120, name: "食の交差点", blurb: "120人と交換しました。" },
];

export function levelForExchanges(count: number): ExchangeLevel {
  let current = EXCHANGE_LEVELS[0];
  for (const l of EXCHANGE_LEVELS) if (count >= l.minExchanges) current = l;
  return current;
}

/** 次の称号と、あと何枚か。最上位なら null */
export function nextLevel(count: number): { level: ExchangeLevel; remaining: number } | null {
  const next = EXCHANGE_LEVELS.find((l) => l.minExchanges > count);
  return next ? { level: next, remaining: next.minExchanges - count } : null;
}

export type ReferralRank = {
  code: "bronze" | "silver" | "gold" | "platinum";
  name: string;
  /** このランクになるのに必要なポイント（以上）。ポイントは商談実施でのみ増える */
  minPoints: number;
  /** オファー額への上乗せ率。0.10 なら報酬が1割増える */
  bonusRate: number;
};

/**
 * 紹介報酬の決まり方（2つの掛け算）。
 *
 *   報酬 ＝ 企業が出した**オファー額** × （1 ＋ ランクの**上乗せ率**）
 *
 * ⚠️ **金額は「カード」ではなく「オファー」に付ける。人に値札を貼らない。**
 *    「この人のカードは100万円」という持ち方にすると、実在の人物に価格を表示することになり、
 *    本人の人格的利益・パブリシティ権の問題が出る（本人の同意なしにはできない）。
 *    会員同士が互いの値段を見られる形も、共創の場として壊れる。
 *    代わりに **企業が「こういう人に会いたい、報酬◯◯円」と出す**。
 *    会いにくい相手ほど企業が高く積むので、「あの人に繋げたら100万円」は市場側で自然に成立する。
 *    値段が付いているのは人ではなく、**企業が出した依頼**。ここを崩さないこと。
 *
 * ⚠️ オファー額の上限は設けていない。100万円のオファーを出すのは企業の判断。
 *    ただし**掲載時に事務局が内容を確認する**前提（極端な額や不適切な条件を素通しさせない）。
 */
export const REFERRAL_RANKS: ReferralRank[] = [
  { code: "bronze",   name: "ブロンズ",   minPoints: 0,   bonusRate: 0 },
  { code: "silver",   name: "シルバー",   minPoints: 30,  bonusRate: 0.05 },
  { code: "gold",     name: "ゴールド",   minPoints: 100, bonusRate: 0.10 },
  { code: "platinum", name: "プラチナ",   minPoints: 300, bonusRate: 0.15 },
];

/**
 * **商談が実施された**ときにもらえるポイント。**交換では増えない**
 * （交換で増やすと相互交換の水増しが得になる）。
 * オファー額1万円につき1ポイント。大きい紹介を決めた人ほど一気に上がる。
 */
export function pointsForDeal(offerAmount: number): number {
  return Math.max(1, Math.floor(offerAmount / 10000));
}

export function rankForPoints(points: number): ReferralRank {
  let current = REFERRAL_RANKS[0];
  for (const r of REFERRAL_RANKS) if (points >= r.minPoints) current = r;
  return current;
}

export function nextRank(points: number): { rank: ReferralRank; remaining: number } | null {
  const next = REFERRAL_RANKS.find((r) => r.minPoints > points);
  return next ? { rank: next, remaining: next.minPoints - points } : null;
}

/** 実際に支払う報酬額（円・税別）。端数は切り捨て */
export function rewardFor(offerAmount: number, points: number): number {
  return Math.floor(offerAmount * (1 + rankForPoints(points).bonusRate));
}

/**
 * ⚠️ 「最大100万円」と書くときの注意。
 *    1件100万円のオファーは**出せる**が、実際に出た実績が無いうちに
 *    「最大100万円」と掲げると景品表示法の有利誤認になりうる。
 *    実績が出るまでは「例」「想定」の語を外さないこと（このプロジェクトの既存ルールと同じ）。
 *    紹介報酬は「紹介という役務の対価」なので景品類ではなく、景品規制の上限そのものは
 *    かからない。問題になるのは**表示**のほう。
 */
export const HEADLINE_OFFER_EXAMPLE = 1000000;

export function yen(n: number): string {
  return `${n.toLocaleString("ja-JP")}円`;
}
