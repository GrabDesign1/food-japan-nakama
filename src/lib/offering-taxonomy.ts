// 持ち寄り台帳の分類マスタ（HANDOVER の9分類）。
// 数量書式は DECISIONS 2-2 = C案：食材・原料のみ構造化、他は自由記述。

export type OfferingCategory = {
  key: string; // 日本語ラベルをそのまま key に使う
  icon: string; // 絵文字アイコン
  structuredAmount: boolean; // 数値＋単位で数量を持つか
};

export const OFFERING_CATEGORIES: OfferingCategory[] = [
  { key: "食材・原料", icon: "🥬", structuredAmount: true },
  { key: "加工設備", icon: "🏭", structuredAmount: false },
  { key: "技術・ノウハウ", icon: "🛠", structuredAmount: false },
  { key: "販路・売り場", icon: "🏬", structuredAmount: false },
  { key: "実証の場", icon: "🧪", structuredAmount: false },
  { key: "物流", icon: "🚚", structuredAmount: false },
  { key: "資金・補助", icon: "💴", structuredAmount: false },
  { key: "人材", icon: "🧑‍🌾", structuredAmount: false },
  { key: "地域課題", icon: "🗾", structuredAmount: false },
];

export const CATEGORY_KEYS = OFFERING_CATEGORIES.map((c) => c.key);

export function categoryMeta(key: string): OfferingCategory | undefined {
  return OFFERING_CATEGORIES.find((c) => c.key === key);
}

export function isStructured(key: string): boolean {
  return categoryMeta(key)?.structuredAmount ?? false;
}

// 数量の単位・期間（食材・原料の構造化用）
export const AMOUNT_UNITS = ["t", "kg", "g", "ケース", "箱", "個", "本", "パック", "L"];
export const AMOUNT_PERIODS = ["年", "月", "週", "日", "一括"];

// 提供時期・希望時期
export const TIMINGS = ["すぐに", "1ヶ月以内", "3ヶ月以内", "時期は相談"];

export const DIRECTION_LABEL: Record<string, string> = {
  GIVE: "売りたい",
  WANT: "買いたい",
};

export const DIRECTION_SHORT: Record<string, string> = {
  GIVE: "売りたい",
  WANT: "買いたい",
};

// 数量を表示用テキストに整形
export function formatAmount(o: {
  amountValue: number | null;
  amountUnit: string | null;
  amountPeriod: string | null;
  amountText: string | null;
}): string | null {
  if (o.amountValue != null && o.amountUnit) {
    const period = o.amountPeriod ? `${o.amountPeriod}あたり ` : "";
    return `${period}${o.amountValue}${o.amountUnit}`;
  }
  return o.amountText || null;
}
