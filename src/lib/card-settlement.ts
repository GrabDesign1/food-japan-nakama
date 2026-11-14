/**
 * 「商談が実施された」の確認と、支払いの発生。
 *
 * ⚠️ **定義（ユーザー決定 2026-11-06）＝ 商談が実施された時点で支払いと報酬が発生する。受注ではない。**
 *
 * ⚠️ 支払いのトリガーになる以上、**誰が確認するか**を決めないと運用に穴が空く。
 *    企業だけに確認させると、払いたくないときに黙っていれば済んでしまう。
 *    そこで**紹介先（紹介された側）の確認で、企業の沈黙を越えられる**ようにしてある。
 *    紹介先は報酬を受け取らないので、実施の有無について利害がない。いちばん中立。
 *
 * ⚠️ **紹介者の自己申告だけでは絶対に支払わない。** 自分の報酬のために自分で押せるため。
 */

/** 確認の期限（商談予定日から何日で締めるか） */
export const CONFIRM_WINDOW_DAYS = 14;

export type MeetingConfirmation = {
  /** 企業（報酬を払う側）が「実施した」と確認した */
  byCompany: boolean;
  /** 紹介先（紹介された側）が「会った」と答えた。利害がないので重い */
  byTarget: boolean;
  /** 紹介者の自己申告。これ単独では成立しない */
  byIntroducer: boolean;
  /** 企業が「実施していない」と明示的に否認した */
  companyDenied: boolean;
};

export type SettlementDecision = {
  /** 支払いと報酬が発生するか */
  held: boolean;
  /** 事務局の仲裁が必要か */
  needsArbitration: boolean;
  /** 事務局と当事者に見せる理由 */
  reason: string;
};

/**
 * 実施されたかどうかの判定。
 * ⚠️ `needsArbitration` が立ったときは**自動で確定させないこと**。事務局が見る。
 */
export function decideSettlement(
  c: MeetingConfirmation,
  daysSinceScheduled: number
): SettlementDecision {
  // 企業が否認し、紹介先は会ったと言っている → 食い違い。人が見る
  if (c.companyDenied && c.byTarget) {
    return {
      held: false,
      needsArbitration: true,
      reason: "企業は未実施、紹介先は実施と回答しています。事務局が確認します。",
    };
  }

  if (c.companyDenied) {
    return { held: false, needsArbitration: false, reason: "企業から未実施と回答がありました。" };
  }

  // 払う側が認めた。これがいちばん素直
  if (c.byCompany) {
    return { held: true, needsArbitration: false, reason: "企業が商談の実施を確認しました。" };
  }

  // 企業が黙っていても、紹介先と紹介者の両方が実施と言うなら成立させる
  if (c.byTarget && c.byIntroducer) {
    return {
      held: true,
      needsArbitration: false,
      reason: "紹介先と紹介者の双方が実施を確認しました（企業からの回答はありません）。",
    };
  }

  // 紹介先だけが答えている。あと一歩なので期限まで待つ
  if (c.byTarget && daysSinceScheduled < CONFIRM_WINDOW_DAYS) {
    return { held: false, needsArbitration: false, reason: "紹介先の確認を受け付けました。紹介者の確認をお待ちしています。" };
  }

  // 紹介者の自己申告だけ。**これでは払わない**
  if (c.byIntroducer && !c.byTarget && daysSinceScheduled >= CONFIRM_WINDOW_DAYS) {
    return {
      held: false,
      needsArbitration: true,
      reason: "紹介者からのみ実施の申告があります。相手方の確認が取れないため、事務局が確認します。",
    };
  }

  if (daysSinceScheduled >= CONFIRM_WINDOW_DAYS) {
    return {
      held: false,
      needsArbitration: false,
      reason: `商談予定日から${CONFIRM_WINDOW_DAYS}日のあいだに実施の確認が取れませんでした。`,
    };
  }

  return { held: false, needsArbitration: false, reason: "実施の確認をお待ちしています。" };
}

/**
 * 報酬の支払期日。商談実施の確認が取れた日から数える。
 * ⚠️ UNIIINC. は「当月末締め・翌月末払い」。揃えておくと説明が楽なので、同じにしてある。
 *    変えるときは紹介プログラム規約の記載と必ず一致させること。
 */
export function payoutDueDate(confirmedAt: Date): Date {
  const d = new Date(confirmedAt.getFullYear(), confirmedAt.getMonth() + 2, 0);
  return d;
}
