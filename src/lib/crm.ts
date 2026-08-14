// 事務局CRM（Phase 11）の定数。
// 事務局だけが使う内部管理項目で、会員側の画面には出さない。
// 注意：規約17条（通信の秘密）により、会員間メッセージの本文はCRMの記録に転記しない。

/** 対応履歴の種別 */
export const NOTE_KINDS: [string, string][] = [
  ["call", "電話"],
  ["email", "メール"],
  ["visit", "訪問"],
  ["meeting", "面談・打合せ"],
  ["event", "イベント・展示会"],
  ["other", "その他"],
];

export const NOTE_KIND_LABEL: Record<string, string> = Object.fromEntries(NOTE_KINDS);
export const NOTE_KIND_KEYS = new Set(NOTE_KINDS.map(([k]) => k));

/**
 * 会員の状況（事務局から見た営業・伴走の段階）。
 * 会員の審査状態（MemberStatus）とは別物で、承認済みの会員をどこまで動かせたかを表す。
 */
export const CRM_STAGES: [string, string][] = [
  ["lead", "見込み（未接触）"],
  ["contacted", "接触済み"],
  ["onboarding", "掲載づくり中"],
  ["active", "稼働中（掲載・商談あり）"],
  ["dormant", "休眠（反応なし）"],
  ["lost", "見送り・退会"],
];

export const CRM_STAGE_LABEL: Record<string, string> = Object.fromEntries(CRM_STAGES);
export const CRM_STAGE_KEYS = new Set(CRM_STAGES.map(([k]) => k));

/** 入力の上限（security.ts の考え方に合わせ、サーバー側でも必ず切る） */
export const CRM_NOTE_MAX = 4000;
export const CRM_NEXT_ACTION_MAX = 200;
export const CRM_TAG_MAX = 20; // 1つのタグの文字数
export const CRM_TAGS_MAX = 10; // タグの個数

/** カンマ・読点・空白区切りの入力をタグ配列にする（重複と空を落とし、上限で切る） */
export function parseTags(raw: string): string[] {
  const parts = raw
    .split(/[,、\s]+/)
    .map((t) => t.trim().slice(0, CRM_TAG_MAX))
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, CRM_TAGS_MAX);
}

/** 期限の状態（期限切れ＝赤、7日以内＝橙。共創PJの応募者管理と同じ考え方） */
export function dueState(due: Date | null, now: Date): "none" | "overdue" | "soon" | "later" {
  if (!due) return "none";
  const diff = due.getTime() - now.getTime();
  if (diff < 0) return "overdue";
  if (diff <= 7 * 24 * 60 * 60 * 1000) return "soon";
  return "later";
}
