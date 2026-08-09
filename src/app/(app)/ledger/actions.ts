"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isStructured,
  isFoodCategory,
  isGoodsCategory,
  CATEGORY_KEYS,
  PRICE_TYPES,
  ITEM_CONDITIONS,
  STORAGE_TYPES,
  SUPPLY_FREQUENCIES,
  DELIVERY_METHODS,
  SHIPPING_BEARERS,
} from "@/lib/offering-taxonomy";
import { validateImageFile, storagePathFromUrl } from "@/lib/upload";

const BUCKET = "member-images";

async function ownOfferingOr404(offeringId: string) {
  const su = await getSessionUser();
  if (!su) throw new Error("ログインが必要です。");
  const member = await getOrCreateMemberForUser(su);
  const offering = await prisma.offering.findUnique({ where: { id: offeringId } });
  if (!offering || offering.memberId !== member.id) {
    throw new Error("台帳が見つかりません。");
  }
  return { su, member, offering };
}

/** 新規登録（/ledger/new のフォーム初回保存時に呼ばれる）。
 * 画面を開くだけではDBレコードを作らない。作成後は編集ページへ（写真はそこで追加）。 */
export async function createOffering(
  direction: "GIVE" | "WANT",
  _prev: OfferingState,
  formData: FormData
): Promise<OfferingState> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = await getOrCreateMemberForUser(su!);
  if (direction !== "GIVE" && direction !== "WANT") return { error: "不正な指定です。" };

  const parsed = parseOfferingForm(formData, "食材・原料");
  if (parsed.error || !parsed.data) return { error: parsed.error ?? "保存に失敗しました。" };

  // 二重送信ガード：同じタイトルの案件を直近1分以内に作っていたら、新規作成せずそれを開く
  const dup = await prisma.offering.findFirst({
    where: {
      memberId: member.id,
      direction,
      title: parsed.data.title,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    select: { id: true },
  });
  if (dup) redirect(`/ledger/${dup.id}/edit?created=1`);

  const created = await prisma.offering.create({
    data: { memberId: member.id, direction, isPublic: false, ...parsed.data },
  });
  redirect(`/ledger/${created.id}/edit?created=1`);
}

export type OfferingState = { ok?: boolean; error?: string };

type ParsedOffering = {
  category: string;
  title: string;
  description: string | null;
  points: string | null;
  tags: string[];
  amountValue: number | null;
  amountUnit: string | null;
  amountPeriod: string | null;
  amountText: string | null;
  timing: string | null;
  area: string | null;
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
  shippingCostBearer: string | null;
  applicationDeadline: Date | null;
  desiredPartner: string | null;
};

// フォーム値の共通パース（保存・新規作成で共用。公開時の必須チェックは togglePublish 側）
function parseOfferingForm(
  formData: FormData,
  fallbackCategory: string
): { data?: ParsedOffering; error?: string } {
  const g = (k: string, max = 2000) => String(formData.get(k) ?? "").trim().slice(0, max);

  const category = CATEGORY_KEYS.includes(g("category")) ? g("category") : fallbackCategory;
  const structured = isStructured(category);

  const title = g("title", 200);
  if (!title) return { error: "タイトルは必須です。" };

  const amountValueRaw = g("amountValue", 20);
  let amountValue = structured && amountValueRaw !== "" ? Number(amountValueRaw) : null;
  if (amountValue != null && (!Number.isFinite(amountValue) || amountValue < 0)) {
    return { error: "数量は0以上の数値で入力してください。" };
  }
  if (amountValue != null && amountValue > 1e9) amountValue = null;

  // 希望価格
  const priceType = PRICE_TYPES.some(([v]) => v === g("priceType")) ? g("priceType") : null;
  const priceAmountRaw = g("priceAmount", 20);
  let priceAmount = priceAmountRaw !== "" ? Number(priceAmountRaw) : null;
  if (priceAmount != null && (!Number.isFinite(priceAmount) || priceAmount < 0 || priceAmount > 1e9)) {
    return { error: "価格は0以上の数値で入力してください。" };
  }
  if (priceType === "free") priceAmount = null; // 無償は金額なし
  const priceUnit = g("priceUnit", 20) || null;

  // 受け渡し方法（複数選択・ホワイトリスト）
  const deliveryMethods = formData
    .getAll("deliveryMethods")
    .map((v) => String(v))
    .filter((v) => DELIVERY_METHODS.includes(v));

  // 募集期限（YYYY-MM-DD のみ受け付け、当日いっぱい有効）
  const deadlineRaw = g("applicationDeadline", 10);
  const applicationDeadline = /^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw)
    ? new Date(`${deadlineRaw}T23:59:59+09:00`)
    : null;
  if (applicationDeadline && Number.isNaN(applicationDeadline.getTime())) {
    return { error: "募集期限の日付が正しくありません。" };
  }

  const pick = (k: string, list: string[]) => (list.includes(g(k)) ? g(k) : null);

  const tags = g("tags", 400)
    .split(/[,、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    data: {
      category,
      title,
      description: g("description", 4000) || null,
      points: g("points") || null,
      tags,
      amountValue,
      amountUnit: structured ? g("amountUnit", 20) || null : null,
      amountPeriod: structured ? g("amountPeriod", 20) || null : null,
      amountText: structured ? null : g("amountText", 200) || null,
      timing: g("timing", 100) || null,
      area: g("area", 200) || null,
      // 取引条件
      priceType,
      priceAmount,
      priceUnit,
      minOrderText: g("minOrderText", 200) || null,
      itemCondition: pick("itemCondition", ITEM_CONDITIONS),
      storageType: pick("storageType", STORAGE_TYPES),
      shelfLifeText: g("shelfLifeText", 300) || null,
      specification: g("specification", 4000) || null,
      supplyFrequency: pick("supplyFrequency", SUPPLY_FREQUENCIES),
      deliveryMethods,
      shippingCostBearer: pick("shippingCostBearer", SHIPPING_BEARERS),
      applicationDeadline,
      desiredPartner: g("desiredPartner", 4000) || null,
    },
  };
}

export async function saveOffering(
  offeringId: string,
  _prev: OfferingState,
  formData: FormData
): Promise<OfferingState> {
  const { offering } = await ownOfferingOr404(offeringId);
  const parsed = parseOfferingForm(formData, offering.category);
  if (parsed.error || !parsed.data) return { error: parsed.error ?? "保存に失敗しました。" };

  await prisma.offering.update({
    where: { id: offeringId },
    data: parsed.data,
  });

  revalidatePath(`/ledger/${offeringId}`);
  revalidatePath("/ledger");
  return { ok: true };
}

/** 公開時の必須チェック。新規公開時だけ適用する（既存の公開中案件は触らない）。 */
function missingForPublish(o: {
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
}): string[] {
  const missing: string[] = [];
  if (!o.title) missing.push("タイトル");
  if (o.direction !== "GIVE") return missing; // 買いたいは従来どおりタイトルのみ

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

export async function togglePublish(
  offeringId: string,
  isPublic: boolean
): Promise<void> {
  const { member, offering } = await ownOfferingOr404(offeringId);
  // 公開は月額会員のみ（下書き作成・編集・非公開化は誰でも可）
  if (isPublic && member.paymentStatus !== "PAID") redirect("/billing");
  // 公開時のみ必須チェック（不足があれば編集画面へ戻して表示）
  if (isPublic) {
    const missing = missingForPublish(offering);
    if (missing.length) {
      redirect(`/ledger/${offeringId}/edit?missing=${encodeURIComponent(missing.join("・"))}`);
    }
  }
  await prisma.offering.update({
    where: { id: offeringId },
    data: { isPublic },
  });
  revalidatePath(`/ledger/${offeringId}`);
  revalidatePath("/ledger");
}

export async function deleteOffering(offeringId: string): Promise<void> {
  const { offering } = await ownOfferingOr404(offeringId);
  // 画像も削除（自分の台帳フォルダ配下のみ）
  const admin = createSupabaseAdminClient();
  const paths = offering.imageUrls
    .map((u) => storagePathFromUrl(u, BUCKET, `offerings/${offeringId}/`))
    .filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(BUCKET).remove(paths);

  await prisma.offering.delete({ where: { id: offeringId } });
  revalidatePath("/ledger");
  redirect("/ledger");
}

export async function uploadOfferingImage(
  offeringId: string,
  formData: FormData
): Promise<OfferingState> {
  const { offering } = await ownOfferingOr404(offeringId);
  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };
  if ((offering.imageUrls ?? []).length >= 6) {
    return { error: "画像は最大6枚までです。" };
  }

  const path = `offerings/${offeringId}/${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file as File, { contentType: v.contentType });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.offering.update({
    where: { id: offeringId },
    data: { imageUrls: [...offering.imageUrls, data.publicUrl] },
  });
  revalidatePath(`/ledger/${offeringId}/edit`);
  return { ok: true };
}

type SlotKey = "description" | "points";
const SLOT_FIELD: Record<SlotKey, "descriptionImageUrl" | "pointsImageUrl"> = {
  description: "descriptionImageUrl",
  points: "pointsImageUrl",
};

export async function setOfferingSlotImage(
  offeringId: string,
  slot: SlotKey,
  formData: FormData
): Promise<OfferingState> {
  const { offering } = await ownOfferingOr404(offeringId);
  if (!(slot in SLOT_FIELD)) return { error: "不正な指定です。" };
  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };

  const path = `offerings/${offeringId}/${slot}-${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file as File, { contentType: v.contentType });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  // 旧画像を消す（自分の台帳フォルダ配下のみ）
  const field = SLOT_FIELD[slot];
  const old = offering[field];
  if (old) {
    const oldPath = storagePathFromUrl(old, BUCKET, `offerings/${offeringId}/`);
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]);
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.offering.update({
    where: { id: offeringId },
    data: { [field]: data.publicUrl },
  });
  revalidatePath(`/ledger/${offeringId}/edit`);
  return { ok: true };
}

export async function clearOfferingSlotImage(
  offeringId: string,
  slot: SlotKey
): Promise<OfferingState> {
  const { offering } = await ownOfferingOr404(offeringId);
  if (!(slot in SLOT_FIELD)) return { error: "不正な指定です。" };
  const field = SLOT_FIELD[slot];
  const old = offering[field];
  if (old) {
    const oldPath = storagePathFromUrl(old, BUCKET, `offerings/${offeringId}/`);
    if (oldPath) {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(BUCKET).remove([oldPath]);
    }
  }
  await prisma.offering.update({
    where: { id: offeringId },
    data: { [field]: null },
  });
  revalidatePath(`/ledger/${offeringId}/edit`);
  return { ok: true };
}

export async function removeOfferingImage(
  offeringId: string,
  url: string
): Promise<OfferingState> {
  const { offering } = await ownOfferingOr404(offeringId);
  // 自分の台帳に実際に登録されているURLしか消させない（任意ファイル削除の防止）
  if (!offering.imageUrls.includes(url)) return { error: "対象の画像が見つかりません。" };
  await prisma.offering.update({
    where: { id: offeringId },
    data: { imageUrls: offering.imageUrls.filter((u) => u !== url) },
  });
  const path = storagePathFromUrl(url, BUCKET, `offerings/${offeringId}/`);
  if (path) {
    const admin = createSupabaseAdminClient();
    await admin.storage.from(BUCKET).remove([path]);
  }
  revalidatePath(`/ledger/${offeringId}/edit`);
  return { ok: true };
}
