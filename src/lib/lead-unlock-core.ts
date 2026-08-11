// 開封課金の「ルールそのもの」だけを置く（DB・サーバー依存なし＝テストできる）。
// billing-core.ts と同じ考え方で、判定と文言をここに集約する。
//
// **初回の接点に紹介料**という一本のルール。
//   ・売り手 →「探している」への初回提案 … ContactUnlock（従来）
//   ・買い手 →「売りたい」への問い合わせ … 売り手が開くときに LeadUnlock（今回）
// どちらも1クレジット。**開封後のやり取りは何往復でも無料**。

/** リードを開くのに必要なクレジット数（提案側の通常案件と同じ1）。 */
export const LEAD_UNLOCK_COST = 1;

/** 一覧で無料で見せる概要の文字数。これ以上は開封するまで伏せる。 */
export const LEAD_PREVIEW_CHARS = 40;

/**
 * 開封課金の施行日（2026-08-26 00:00 JST・ユーザー決定 2026-08-12）。
 *
 * 「届いた問い合わせへの返信は何往復でも無料」を狭める**不利益変更**なので、
 * 2週間の予告を置いてから始める。判定は**最初の問い合わせが届いた日時**で行うので、
 *   ・施行日より前に届いた未開封のリード … 無料のまま（後出しで課金しない）
 *   ・施行日より前の全期間 … そもそも課金対象が存在しない
 * の両方がこの1つのルールで満たされる。
 */
export const LEAD_UNLOCK_START_AT = new Date("2026-08-25T15:00:00.000Z");
/** 画面・メール・規約で使う施行日の表記（`LEAD_UNLOCK_START_AT` と必ず揃える）。 */
export const LEAD_UNLOCK_START_LABEL = "2026年8月26日";

/** 施行日を過ぎているか（予告期間中は開封無料）。 */
export function isLeadChargingActive(now: Date = new Date()): boolean {
  return now.getTime() >= LEAD_UNLOCK_START_AT.getTime();
}

/** 未開封のときに一覧へ出す文言（本文は返さない）。 */
export const LEAD_LOCKED_TEXT = "（未開封）開封すると全文を読めます";

/** 無料で見せてよい冒頭だけを切り出す。 */
export function leadPreview(body: string): string {
  const head = (body || "").slice(0, LEAD_PREVIEW_CHARS);
  return head ? `${head}…` : "（ファイル）";
}


/** 何日ひらかれなければ買い手へ知らせるか（ユーザー決定＝7日）。 */
export const LEAD_UNOPENED_NOTICE_DAYS = 7;

/**
 * 課金の対象になるリードか。
 * 対象＝**自分が掲載した「売りたい」案件に、相手から届いた問い合わせ**。
 * 自分から送ったやり取り・「探している」案件・案件に紐づかない直接連絡は対象外（従来どおり無料）。
 */
export function isChargeableLead(params: {
  direction: string;
  offeringMemberId: string;
  viewerMemberId: string;
  threadFromMemberId: string;
  /** 相手から最初のメッセージが届いた日時。施行日より前のものは無料のまま。 */
  firstInboundAt: Date | null;
}): boolean {
  if (params.direction !== "GIVE") return false;
  if (params.offeringMemberId !== params.viewerMemberId) return false;
  // 掲載者が自分から送り始めたスレッドは「届いたリード」ではない
  if (params.threadFromMemberId === params.viewerMemberId) return false;
  // 施行日より前に届いていた問い合わせは、無料と案内していた期間のものなので課金しない
  if (!params.firstInboundAt) return false;
  return params.firstInboundAt.getTime() >= LEAD_UNLOCK_START_AT.getTime();
}
