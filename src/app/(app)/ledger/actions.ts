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
  LISTING_PURPOSES,
  SAMPLE_AVAILABILITY,
  PRICE_TAX_TYPES,
} from "@/lib/offering-taxonomy";
import { validateImageFile, storagePathFromUrl } from "@/lib/upload";
import { missingForPublish } from "@/lib/offering-publish";

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

/** 新規登録フォーム用：一時領域へ画像をアップロード（保存時に案件フォルダへ移動して紐付け）。 */
export async function uploadTempOfferingImage(
  formData: FormData
): Promise<{ url?: string; error?: string; warning?: string }> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const member = await getOrCreateMemberForUser(su);
  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };
  const path = `offerings/tmp/${member.id}/${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, v.body, { contentType: v.contentType });
  if (error) return { error: `アップロード失敗：${error.message}` };
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, warning: v.warning };
}

/** 新規登録フォーム用：一時画像の取消（自分の一時フォルダ配下のみ）。 */
export async function removeTempOfferingImage(url: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const member = await getOrCreateMemberForUser(su);
  const path = storagePathFromUrl(url, BUCKET, `offerings/tmp/${member.id}/`);
  if (!path) return;
  const admin = createSupabaseAdminClient();
  await admin.storage.from(BUCKET).remove([path]).catch(() => {});
}

/** 一時画像を案件フォルダへ移動して紐付ける（最大6枚・自分の一時フォルダ配下のみ）。 */
async function attachTempImages(
  memberId: string,
  offeringId: string,
  tempUrls: string[]
): Promise<void> {
  if (!tempUrls.length) return;
  const admin = createSupabaseAdminClient();
  const current = await prisma.offering.findUnique({
    where: { id: offeringId },
    select: { imageUrls: true },
  });
  const urls: string[] = [...(current?.imageUrls ?? [])];
  for (const u of tempUrls) {
    if (urls.length >= 10) break;
    const from = storagePathFromUrl(u, BUCKET, `offerings/tmp/${memberId}/`);
    if (!from) continue;
    const name = from.split("/").pop();
    if (!name) continue;
    const to = `offerings/${offeringId}/${name}`;
    const { error } = await admin.storage.from(BUCKET).move(from, to);
    if (error) {
      console.error("[attachTempImages] 移動失敗:", error.message);
      continue;
    }
    urls.push(admin.storage.from(BUCKET).getPublicUrl(to).data.publicUrl);
  }
  if (urls.length) {
    await prisma.offering.update({ where: { id: offeringId }, data: { imageUrls: urls } });
  }
}

/** 新規登録（/ledger/new のフォーム初回保存時に呼ばれる）。
 * 画面を開くだけではDBレコードを作らない。写真は一時アップロード→保存時に案件へ紐付け。 */
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

  const tempUrls = formData
    .getAll("tempImageUrls")
    .map((v) => String(v))
    .slice(0, 10);

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
  if (dup) {
    await attachTempImages(member.id, dup.id, tempUrls);
    redirect(`/ledger/${dup.id}/edit?created=1`);
  }

  const created = await prisma.offering.create({
    data: { memberId: member.id, direction, isPublic: false, ...parsed.data },
  });
  await attachTempImages(member.id, created.id, tempUrls);
  redirect(`/ledger/${created.id}/edit?created=1`);
}

export type OfferingState = { ok?: boolean; error?: string; warning?: string };

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
  listingPurpose: string | null;
  tagline: string | null;
  featureDiff: string | null;
  backgroundStory: string | null;
  usageIdeas: string | null;
  challengeCurrent: string | null;
  challengeScale: string | null;
  challengeTried: string | null;
  challengeAsk: string | null;
  challengeValue: string | null;
  sampleAvailability: string | null;
  priceTaxType: string | null;
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
      // 掲載タイプと物語（質問形式）
      listingPurpose: LISTING_PURPOSES.some(([v]) => v === g("listingPurpose"))
        ? g("listingPurpose")
        : null,
      tagline: g("tagline", 120) || null,
      featureDiff: g("featureDiff", 4000) || null,
      backgroundStory: g("backgroundStory", 4000) || null,
      usageIdeas: g("usageIdeas", 4000) || null,
      challengeCurrent: g("challengeCurrent", 4000) || null,
      challengeScale: g("challengeScale", 2000) || null,
      challengeTried: g("challengeTried", 4000) || null,
      challengeAsk: g("challengeAsk", 4000) || null,
      challengeValue: g("challengeValue", 4000) || null,
      sampleAvailability: pick("sampleAvailability", SAMPLE_AVAILABILITY),
      priceTaxType: pick("priceTaxType", PRICE_TAX_TYPES),
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
  if ((offering.imageUrls ?? []).length >= 10) {
    return { error: "画像は最大10枚までです。" };
  }

  const path = `offerings/${offeringId}/${crypto.randomUUID()}.${v.ext}`;
  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, v.body, { contentType: v.contentType });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.offering.update({
    where: { id: offeringId },
    data: { imageUrls: [...offering.imageUrls, data.publicUrl] },
  });
  revalidatePath(`/ledger/${offeringId}/edit`);
  return { ok: true, warning: v.warning };
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
    .upload(path, v.body, { contentType: v.contentType });
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

/** 画像の並べ替え（1枚目=メイン画像）。既存URLの並べ替えのみ許可。 */
export async function reorderOfferingImages(
  offeringId: string,
  urls: string[]
): Promise<void> {
  const { offering } = await ownOfferingOr404(offeringId);
  const current = offering.imageUrls;
  const set = new Set(current);
  if (
    urls.length !== current.length ||
    new Set(urls).size !== urls.length ||
    !urls.every((u) => set.has(u))
  ) {
    return; // 既存画像の並べ替え以外は受け付けない
  }
  await prisma.offering.update({ where: { id: offeringId }, data: { imageUrls: urls } });
  revalidatePath(`/ledger/${offeringId}/edit`);
  revalidatePath(`/ledger/${offeringId}`);
  revalidatePath("/ledger");
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
