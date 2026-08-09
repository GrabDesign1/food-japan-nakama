"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isStructured } from "@/lib/offering-taxonomy";
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

/** 提供/募集の下書きを新規作成して編集ページへ。 */
export async function createDraftOffering(direction: "GIVE" | "WANT"): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = await getOrCreateMemberForUser(su!);
  const created = await prisma.offering.create({
    data: { memberId: member.id, direction, category: "食材・原料", title: "", isPublic: false },
  });
  redirect(`/ledger/${created.id}/edit`);
}

export type OfferingState = { ok?: boolean; error?: string };

export async function saveOffering(
  offeringId: string,
  _prev: OfferingState,
  formData: FormData
): Promise<OfferingState> {
  const { offering } = await ownOfferingOr404(offeringId);
  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const category = g("category") || offering.category;
  const structured = isStructured(category);

  const amountValueRaw = g("amountValue");
  const amountValue =
    structured && amountValueRaw !== "" ? Number(amountValueRaw) : null;

  const title = g("title");
  if (!title) return { error: "タイトルは必須です。" };

  const tags = g("tags")
    .split(/[,、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  await prisma.offering.update({
    where: { id: offeringId },
    data: {
      category,
      title,
      description: g("description") || null,
      points: g("points") || null,
      tags,
      amountValue: Number.isFinite(amountValue as number) ? amountValue : null,
      amountUnit: structured ? g("amountUnit") || null : null,
      amountPeriod: structured ? g("amountPeriod") || null : null,
      amountText: structured ? null : g("amountText") || null,
      timing: g("timing") || null,
      area: g("area") || null,
    },
  });

  revalidatePath(`/ledger/${offeringId}`);
  revalidatePath("/ledger");
  return { ok: true };
}

export async function togglePublish(
  offeringId: string,
  isPublic: boolean
): Promise<void> {
  const { offering } = await ownOfferingOr404(offeringId);
  // 公開するにはタイトル必須
  if (isPublic && !offering.title) return;
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
