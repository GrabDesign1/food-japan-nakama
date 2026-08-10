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
export const AMOUNT_UNITS = ["t", "kg", "g", "ケース", "箱", "個", "本", "パック", "L", "人", "1ユーザー"];
export const AMOUNT_PERIODS = ["年", "月", "週", "日", "一括"];

// 提供時期・希望時期
export const TIMINGS = ["すぐに", "1ヶ月以内", "3ヶ月以内", "時期は相談"];

// 表示は「探している」中心（2026-08-10 買い手指示書 §3。DB値 WANT は互換のため変更しない）
export const DIRECTION_LABEL: Record<string, string> = {
  GIVE: "売りたい",
  WANT: "探している",
};

export const DIRECTION_SHORT: Record<string, string> = {
  GIVE: "売りたい",
  WANT: "探している",
};

// ── 取引条件（2026-08-10 売りたい改善） ─────────────────────
// 食品カテゴリ（保存・期限・品質などの食品固有項目を出す）
export function isFoodCategory(key: string): boolean {
  return key === "食材・原料";
}
// 物品カテゴリ（状態・受け渡し・発送元を必須にする）
export function isGoodsCategory(key: string): boolean {
  return key === "食材・原料" || key === "加工設備";
}

// 掲載タイプ（2026-08-10 第2次改善）
export const LISTING_PURPOSES: [string, string, string][] = [
  ["trade", "商品・原料を売りたい", "通常の卸売・仕入れ・業務取引。簡潔に登録できます。"],
  ["challenge", "課題を一緒に解決したい", "食品ロス・余剰在庫・規格外品・地域課題など。背景を詳しく伝えられます。"],
];
export const SAMPLE_AVAILABILITY = ["可", "応相談", "不可"];
export const PRICE_TAX_TYPES = ["税込", "税別"];

// ── 探している（WANT）改善（2026-08-10 買い手指示書） ─────────────────
// 募集タイプ：[DB値, 表示名, 補足文]
export const SEEKING_TYPES: [string, string, string][] = [
  ["specific", "特定の商品・原料を探している", "商品名や原料名が決まっている仕入れ・調達です。"],
  ["proposal", "条件に合う商品を提案してほしい", "商品名が未定でもOK。用途や条件に合う提案を募集します。"],
  ["oem", "OEM・PBの製造先を探している", "自社ブランド商品の製造パートナーを探します。"],
  ["surplus", "余剰品・規格外品を探している", "アップサイクルやコスト削減のための調達です。"],
  ["codev", "共同開発できる相手を探している", "一緒に商品をつくる相手を探します。"],
  ["other", "その他", "上記に当てはまらない探しものはこちら。"],
];
export const SEEKING_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  SEEKING_TYPES.map(([v, l]) => [v, l])
);
// カード表示用の短いラベル
export const SEEKING_TYPE_SHORT: Record<string, string> = {
  specific: "商品指定",
  proposal: "提案募集",
  oem: "OEM・PB",
  surplus: "余剰品・規格外",
  codev: "共同開発",
  other: "その他",
};

// 条件の分類（必須・希望・相談可能をつけて登録する）
export const REQUIREMENT_KINDS: [string, string][] = [
  ["origin", "産地・地域"],
  ["quantity", "数量・ロット"],
  ["price", "価格"],
  ["delivery", "納期・時期"],
  ["storage", "保存方法"],
  ["spec", "規格・サイズ"],
  ["cert", "認証・検査"],
  ["other", "その他"],
];
export const REQUIREMENT_KIND_LABEL: Record<string, string> =
  Object.fromEntries(REQUIREMENT_KINDS);

export const REQUIREMENT_LEVELS: [string, string][] = [
  ["must", "必須"],
  ["want", "希望"],
  ["negotiable", "相談可能"],
];
export const REQUIREMENT_LEVEL_LABEL: Record<string, string> =
  Object.fromEntries(REQUIREMENT_LEVELS);

export const PRICE_TYPES: [string, string][] = [
  ["fixed", "固定価格"],
  ["free", "無償"],
  ["negotiable", "応相談"],
];
export const PRICE_UNITS = [
  "円/kg", "円/g", "円/t", "円/個", "円/箱", "円/ケース", "円/本", "円/パック", "円/L", "円/式", "円/月", "円/回", "円/人", "円/1ユーザー",
];
export const ITEM_CONDITIONS = ["生鮮", "冷蔵", "冷凍", "乾燥", "加工直後・湿潤", "常温品", "中古", "その他"];
export const STORAGE_TYPES = ["常温", "冷蔵", "冷凍", "乾燥", "その他"];
export const SUPPLY_FREQUENCIES = ["今回限り", "毎週", "毎月", "季節限定", "応相談"];
export const DELIVERY_METHODS = ["現地引取", "配送可能", "応相談"];
export const SHIPPING_BEARERS = ["応相談", "売り手負担", "買い手負担"];

// 希望価格を表示用テキストに整形
export function formatPrice(o: {
  priceType: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
}): string | null {
  if (o.priceType === "free") return "無償";
  if (o.priceType === "fixed" && o.priceAmount != null) {
    return `${o.priceAmount.toLocaleString()}${o.priceUnit ?? "円"}`;
  }
  if (o.priceType === "negotiable") {
    return o.priceAmount != null
      ? `${o.priceAmount.toLocaleString()}${o.priceUnit ?? "円"}（応相談）`
      : "価格応相談";
  }
  return null;
}

// 募集期限を表示用テキストに整形（切れている場合は目印）
export function formatDeadline(d: Date | string | null): string | null {
  if (!d) return null;
  const date = new Date(d);
  const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日まで`;
  return date.getTime() < Date.now() ? `${label}（募集終了）` : label;
}

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
