"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getOrCreateMemberForUser,
  updateMemberProfile,
  submitMemberForReview,
  type ProfileInput,
} from "@/lib/member";
import { notifyAdminMemberRegistered } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProfileState = { ok?: boolean; error?: string };

const BUCKET = "member-images";

export async function uploadMemberImage(
  formData: FormData
): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "画像ファイルを選んでください。" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "画像ファイルのみアップロードできます。" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "画像は5MBまでにしてください。" };
  }

  const member = await getOrCreateMemberForUser(su);
  const current = member.imageUrls ?? [];
  if (current.length >= 4) {
    return { error: "画像は最大4枚までです。" };
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${member.id}/${crypto.randomUUID()}.${ext}`;

  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: `アップロードに失敗しました：${upErr.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.member.update({
    where: { id: member.id },
    data: { imageUrls: [...current, data.publicUrl] },
  });

  revalidatePath("/profile");
  return { ok: true };
}

export async function uploadMemberAvatar(
  formData: FormData
): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "画像ファイルを選んでください。" };
  }
  if (!file.type.startsWith("image/")) return { error: "画像ファイルのみです。" };
  if (file.size > 5 * 1024 * 1024) return { error: "画像は5MBまでです。" };

  const member = await getOrCreateMemberForUser(su);
  const admin = createSupabaseAdminClient();

  // 旧アイコンを削除
  if (member.avatarUrl) {
    const marker = `/${BUCKET}/`;
    const idx = member.avatarUrl.indexOf(marker);
    if (idx >= 0) await admin.storage.from(BUCKET).remove([member.avatarUrl.slice(idx + marker.length)]);
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `avatars/${member.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.member.update({
    where: { id: member.id },
    data: { avatarUrl: data.publicUrl },
  });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMemberAvatar(): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const member = await getOrCreateMemberForUser(su);
  if (member.avatarUrl) {
    const marker = `/${BUCKET}/`;
    const idx = member.avatarUrl.indexOf(marker);
    if (idx >= 0) {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(BUCKET).remove([member.avatarUrl.slice(idx + marker.length)]);
    }
  }
  await prisma.member.update({
    where: { id: member.id },
    data: { avatarUrl: null },
  });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

// 会社ロゴ／ブランドロゴ（1枚ずつ）
type LogoKind = "company" | "brand";
const LOGO_FIELD: Record<LogoKind, "companyLogoUrl" | "brandLogoUrl"> = {
  company: "companyLogoUrl",
  brand: "brandLogoUrl",
};

export async function uploadMemberLogo(
  kind: LogoKind,
  formData: FormData
): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "画像ファイルを選んでください。" };
  }
  if (!file.type.startsWith("image/")) return { error: "画像ファイルのみです。" };
  if (file.size > 5 * 1024 * 1024) return { error: "画像は5MBまでです。" };

  const member = await getOrCreateMemberForUser(su);
  const field = LOGO_FIELD[kind];
  const admin = createSupabaseAdminClient();

  // 旧ロゴを削除
  const currentUrl = member[field];
  if (currentUrl) {
    const marker = `/${BUCKET}/`;
    const idx = currentUrl.indexOf(marker);
    if (idx >= 0) await admin.storage.from(BUCKET).remove([currentUrl.slice(idx + marker.length)]).catch(() => {});
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `logos/${member.id}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });
  if (upErr) return { error: `アップロード失敗：${upErr.message}` };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  await prisma.member.update({
    where: { id: member.id },
    data: { [field]: data.publicUrl },
  });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMemberLogo(kind: LogoKind): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const member = await getOrCreateMemberForUser(su);
  const field = LOGO_FIELD[kind];
  const currentUrl = member[field];
  if (currentUrl) {
    const marker = `/${BUCKET}/`;
    const idx = currentUrl.indexOf(marker);
    if (idx >= 0) {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(BUCKET).remove([currentUrl.slice(idx + marker.length)]).catch(() => {});
    }
  }
  await prisma.member.update({
    where: { id: member.id },
    data: { [field]: null },
  });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMemberImage(url: string): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };

  const member = await getOrCreateMemberForUser(su);
  const next = (member.imageUrls ?? []).filter((u) => u !== url);
  await prisma.member.update({
    where: { id: member.id },
    data: { imageUrls: next },
  });

  // ストレージからも削除（URLからパスを復元）
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    const path = url.slice(idx + marker.length);
    const admin = createSupabaseAdminClient();
    await admin.storage.from(BUCKET).remove([path]);
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };

  const member = await getOrCreateMemberForUser(su);
  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const input: ProfileInput = {
    name: g("name"),
    contactName: g("contactName"),
    contactKana: g("contactKana"),
    categoryL1: g("categoryL1"),
    categoryL2: g("categoryL2"),
    prefecture: g("prefecture"),
    city: g("city"),
    postalCode: g("postalCode"),
    address: g("address"),
    website: g("website"),
    founded: g("founded"),
    size: g("size"),
    description: g("description"),
    featureText: g("featureText"),
    hasLicense: g("hasLicense") === "yes",
    licenseName: g("hasLicense") === "yes" ? g("licenseName") : "",
    productItems: g("productItems"),
    productVolume: g("productVolume"),
    equipmentText: g("equipmentText"),
    salesAreaText: g("salesAreaText"),
    logisticsText: g("logisticsText"),
    foodlossText: g("foodlossText"),
    challengeText: g("challengeText"),
    collabStyle: g("collabStyle"),
    startTiming: g("startTiming"),
  };

  if (!input.name) return { error: "事業者名は必須です。" };
  if (!input.contactName) return { error: "担当者名は必須です。" };

  await updateMemberProfile(member.id, input);
  revalidatePath("/profile");
  return { ok: true };
}

export async function submitProfile(
  _prev: ProfileState,
  _formData: FormData
): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };

  const member = await getOrCreateMemberForUser(su);
  const fresh = await prisma.member.findUnique({ where: { id: member.id } });
  if (!fresh) return { error: "会員が見つかりません。" };

  if (!fresh.name || !fresh.contactName || !fresh.categoryL1) {
    return { error: "事業者名・担当者名・会員種別（大分類）を入力してから申請してください。" };
  }

  await submitMemberForReview(member.id);

  // 事務局へ通知メール（送信サービス未設定でも失敗しない）
  const admins = await prisma.user.findMany({
    where: {
      tenantId: su.app.tenantId,
      role: { in: ["TENANT_ADMIN", "ADMIN", "REVIEWER"] },
    },
    select: { email: true },
  });
  await notifyAdminMemberRegistered({
    adminEmails: admins.map((a) => a.email),
    memberName: fresh.name,
    contactName: fresh.contactName || su.app.name,
    contactEmail: su.app.email,
    categoryL1: fresh.categoryL1,
    categoryL2: fresh.categoryL2,
    prefecture: fresh.prefecture,
    city: fresh.city,
    description: fresh.description,
  });

  revalidatePath("/profile");
  return { ok: true };
}
