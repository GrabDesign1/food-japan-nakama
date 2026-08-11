// 違反報告の種別（2026-08-11）。規約・ガイドラインで禁止している行為に対応させる。
// クラウドワークスの分類を、食の共創プラットフォームの実態に合わせて置き換えた。
// 企業間の食の取引で実際に起きうることを並べる（勧誘系だけでなく、取引そのもののトラブルも拾う）。
// 上から順に「取引で困ったこと」→「相手の情報が疑わしい」→「勧誘・迷惑行為」。
export const VIOLATION_KINDS: [string, string][] = [
  ["terms_mismatch", "合意した条件と違う（数量・規格・価格・納期など）"],
  ["no_response", "連絡が取れなくなった（発送・納品・入金が果たされない）"],
  ["payment", "支払いのトラブル（未払い・一方的な減額や取消）"],
  ["false_info", "商品や実績の情報が事実と違う（産地・規格・数量・認証など）"],
  ["identity", "なりすまし・会社情報が事実と違う"],
  ["food_safety", "食品衛生・表示に関わる懸念（無許可の製造・販売など）"],
  ["outside_deal", "サイト外での直接取引・直接連絡の勧誘"],
  ["multi_level", "マルチ商法・ネットワークビジネスの勧誘"],
  ["school", "セミナー・スクール・情報商材の勧誘"],
  ["spam", "スパム・フィッシング・不審なURLの送付"],
  ["harassment", "迷惑行為・威圧的な言動・しつこい勧誘"],
  ["law", "法令違反のおそれがある取引"],
  ["other", "その他、規約やガイドラインに反するおそれ"],
];

export const VIOLATION_KIND_LABEL: Record<string, string> = Object.fromEntries(VIOLATION_KINDS);

export const VIOLATION_STATUS_LABEL: Record<string, string> = {
  new: "新規",
  reviewing: "確認中",
  handled: "対応済み",
  dismissed: "対応不要",
};
