// 違反報告の種別（2026-08-11）。規約・ガイドラインで禁止している行為に対応させる。
// クラウドワークスの分類を、食の共創プラットフォームの実態に合わせて置き換えた。
export const VIOLATION_KINDS: [string, string][] = [
  ["outside_deal", "サイト外での直接取引・直接連絡の勧誘"],
  ["multi_level", "マルチ商法・ネットワークビジネスの勧誘"],
  ["school", "セミナー・スクール・情報商材の勧誘"],
  ["spam", "スパム・フィッシング・不審なURLの送付"],
  ["false_info", "虚偽の情報（産地・規格・数量・実績など）"],
  ["food_safety", "食品衛生・表示に関わる懸念（無許可の製造・販売など）"],
  ["harassment", "迷惑行為・威圧的な言動・しつこい勧誘"],
  ["law", "法令違反のおそれがある取引"],
  ["other", "その他ガイドライン・規約に反するおそれ"],
];

export const VIOLATION_KIND_LABEL: Record<string, string> = Object.fromEntries(VIOLATION_KINDS);

export const VIOLATION_STATUS_LABEL: Record<string, string> = {
  new: "新規",
  reviewing: "確認中",
  handled: "対応済み",
  dismissed: "対応不要",
};
