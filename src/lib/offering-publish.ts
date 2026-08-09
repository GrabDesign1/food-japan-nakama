// 公開時の必須チェック（純関数。actions と編集画面のバナーで共用）。
// 新規公開時だけ適用する（既存の公開中案件・買いたいは従来どおり）。
import { isFoodCategory, isGoodsCategory } from "@/lib/offering-taxonomy";

export type PublishCheckInput = {
  direction: string;
  category: string;
  title: string;
  area: string | null;
  amountValue: number | null;
  amountText: string | null;
  priceType: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  minOrderText: string | null;
  itemCondition: string | null;
  storageType: string | null;
  shelfLifeText: string | null;
  specification: string | null;
  supplyFrequency: string | null;
  deliveryMethods: string[];
  applicationDeadline: Date | null;
  description: string | null;
  listingPurpose: string | null;
  featureDiff: string | null;
  usageIdeas: string | null;
  desiredPartner: string | null;
  challengeCurrent: string | null;
  challengeAsk: string | null;
  challengeValue: string | null;
};

export function missingForPublish(o: PublishCheckInput): string[] {
  const missing: string[] = [];
  if (!o.title) missing.push("タイトル");
  if (o.direction !== "GIVE") return missing; // 買いたいは従来どおりタイトルのみ

  // 物語部（質問形式）。通常取引型=商品説明・特徴・使い方・相手、課題解決型=＋課題・協力・価値
  if (!o.description) missing.push("この商品・原料について（詳細説明）");
  if (!o.featureDiff) missing.push("他の商品との違い・特徴");
  if (!o.usageIdeas) missing.push("おすすめの使い方・売り場");
  if (!o.desiredPartner) missing.push("希望する相手");
  if (o.listingPurpose === "challenge") {
    if (!o.challengeCurrent) missing.push("いま起きている課題");
    if (!o.challengeAsk) missing.push("求める協力・提案");
    if (!o.challengeValue) missing.push("解決後に生まれる価値");
  }

  if (!o.priceType) missing.push("希望価格");
  if (o.priceType === "fixed" && (o.priceAmount == null || !o.priceUnit)) {
    missing.push("価格の金額と単位");
  }
  if (!o.applicationDeadline) missing.push("募集期限");
  else if (o.applicationDeadline.getTime() < Date.now()) missing.push("募集期限（過去の日付です）");

  if (isGoodsCategory(o.category)) {
    if (!o.itemCondition) missing.push("商品・原料の状態");
    if (!o.deliveryMethods?.length) missing.push("受け渡し方法");
    if (!o.area) missing.push("発送元・受渡地域");
  }
  if (isFoodCategory(o.category)) {
    if (o.amountValue == null && !o.amountText) missing.push("提供可能量");
    if (!o.minOrderText) missing.push("最小取引量");
    if (!o.storageType) missing.push("保存状態");
    if (!o.shelfLifeText) missing.push("賞味・取扱期限");
    if (!o.specification) missing.push("品質・規格");
    if (!o.supplyFrequency) missing.push("提供頻度");
  }
  return missing;
}
