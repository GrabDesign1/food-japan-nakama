"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { trimTo, PROFILE_SHORT_MAX, PROFILE_LONG_MAX } from "@/lib/security";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  getOrCreateMemberForUser,
  updateMemberProfile,
  submitMemberForReview,
  type ProfileInput,
} from "@/lib/member";
import { notifyAdminMemberRegistered, notifyWithdrawalRequest } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateImageFile, storagePathFromUrl } from "@/lib/upload";
import {
  AI_ENABLED,
  AI_PROFILE_MEMO_MAX,
  draftMemberProfile as generateProfileDraft,
  type ProfileDraftResult,
} from "@/lib/ai";
import { AI_ACTION_PROFILE, aiDraftLimitReached, recordAiDraftUse } from "@/lib/ai-usage";
import { canSendToOthers } from "@/lib/security";

export type ProfileState = { ok?: boolean; error?: string; message?: string };

const BUCKET = "member-images";

export async function uploadMemberImage(
  formData: FormData
): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };

  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };

  const member = await getOrCreateMemberForUser(su);
  const current = member.imageUrls ?? [];
  if (current.length >= 4) {
    return { error: "画像は最大4枚までです。" };
  }

  const path = `${member.id}/${crypto.randomUUID()}.${v.ext}`;

  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, v.body, { contentType: v.contentType, upsert: false });
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
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };

  const member = await getOrCreateMemberForUser(su);
  const admin = createSupabaseAdminClient();

  // 旧アイコンを削除（自分のフォルダ配下のみ）
  if (member.avatarUrl) {
    const oldPath = storagePathFromUrl(member.avatarUrl, BUCKET, `avatars/${member.id}/`);
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]);
  }

  const path = `avatars/${member.id}/${crypto.randomUUID()}.${v.ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, v.body, { contentType: v.contentType });
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
    const oldPath = storagePathFromUrl(member.avatarUrl, BUCKET, `avatars/${member.id}/`);
    if (oldPath) {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(BUCKET).remove([oldPath]);
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

  if (!(kind in LOGO_FIELD)) return { error: "不正な指定です。" };
  const file = formData.get("file");
  const v = await validateImageFile(file);
  if (!v.ok) return { error: v.error };

  const member = await getOrCreateMemberForUser(su);
  const field = LOGO_FIELD[kind];
  const admin = createSupabaseAdminClient();

  // 旧ロゴを削除（自分のフォルダ配下のみ）
  const currentUrl = member[field];
  if (currentUrl) {
    const oldPath = storagePathFromUrl(currentUrl, BUCKET, `logos/${member.id}/`);
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  const path = `logos/${member.id}/${kind}-${crypto.randomUUID()}.${v.ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, v.body, { contentType: v.contentType });
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
  if (!(kind in LOGO_FIELD)) return { error: "不正な指定です。" };
  const member = await getOrCreateMemberForUser(su);
  const field = LOGO_FIELD[kind];
  const currentUrl = member[field];
  if (currentUrl) {
    const oldPath = storagePathFromUrl(currentUrl, BUCKET, `logos/${member.id}/`);
    if (oldPath) {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {});
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
  // 自分のプロフィールに実際に登録されているURLしか消させない（任意ファイル削除の防止）
  if (!(member.imageUrls ?? []).includes(url)) {
    return { error: "対象の画像が見つかりません。" };
  }
  const next = (member.imageUrls ?? []).filter((u) => u !== url);
  await prisma.member.update({
    where: { id: member.id },
    data: { imageUrls: next },
  });

  // ストレージからも削除（自分のフォルダ配下のみ）
  const path = storagePathFromUrl(url, BUCKET, `${member.id}/`);
  if (path) {
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
  // 上限つきで取得する（既定は1行項目、本文系は明示的に長い上限を渡す）
  const g = (k: string, max = PROFILE_SHORT_MAX) => trimTo(formData.get(k), max);
  const gl = (k: string) => trimTo(formData.get(k), PROFILE_LONG_MAX);

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
    description: gl("description"),
    featureText: gl("featureText"),
    hasLicense: g("hasLicense") === "yes",
    licenseName: g("hasLicense") === "yes" ? g("licenseName") : "",
    invoiceRegNo: g("invoiceRegNo"),
    bankAccount: g("bankAccount"),
    productItems: gl("productItems"),
    productVolume: gl("productVolume"),
    equipmentText: gl("equipmentText"),
    salesAreaText: gl("salesAreaText"),
    logisticsText: gl("logisticsText"),
    foodlossText: gl("foodlossText"),
    challengeText: gl("challengeText"),
    collabStyle: gl("collabStyle"),
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

/**
 * 退会を申し出る（規約19条）。
 * その場で消さず「申請」として記録し、事務局が課金の解約・データ削除まで確認して実行する。
 * 誤操作による取り返しのつかない削除と、Stripeの解約漏れを同時に防ぐため。
 */
export async function requestWithdrawal(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const member = await getOrCreateMemberForUser(su);

  if (member.withdrawalRequestedAt) {
    return { error: "すでに退会申請を受け付けています。事務局からの連絡をお待ちください。" };
  }

  const reason = trimTo(formData.get("reason"), PROFILE_LONG_MAX);
  await prisma.member.update({
    where: { id: member.id },
    data: { withdrawalRequestedAt: new Date(), withdrawalReason: reason || null },
  });
  await writeAudit(su, "member.withdrawal_request", {
    targetType: "member",
    targetId: member.id,
    detail: reason ? `理由=${reason.slice(0, 200)}` : "理由なし",
  });

  // 事務局への通知と、申請者への受付控え（送信に失敗しても申請自体は成立）
  notifyWithdrawalRequest({
    memberName: member.name || "（名称未設定）",
    memberId: member.id,
    email: su.app.email,
    reason,
  }).catch((e) => console.error("[profile] 退会申請の通知に失敗:", e));

  revalidatePath("/profile");
  return { ok: true, message: "退会のお申し出を受け付けました。事務局よりご連絡いたします。" };
}

/**
 * メモから事業者プロフィールの下書きを作る（2026-08-14）。
 * 作るだけで保存はしない。会員がフォーム上で直してから保存する。
 * 回数の上限は台帳（売りたい）の下書きと共有（合わせて1日20回）。
 */
export async function draftProfile(formData: FormData): Promise<ProfileDraftResult> {
  if (!AI_ENABLED) return { error: "この機能は現在ご利用いただけません。" };

  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const member = await getOrCreateMemberForUser(su);
  if (!canSendToOthers(member.status)) {
    return { error: "現在のご登録状態ではご利用いただけません。" };
  }

  const limited = await aiDraftLimitReached(su);
  if (limited) return { error: limited };

  const result = await generateProfileDraft({
    memberName: trimTo(formData.get("memberName"), PROFILE_SHORT_MAX),
    category: trimTo(formData.get("category"), PROFILE_SHORT_MAX),
    area: trimTo(formData.get("area"), PROFILE_SHORT_MAX),
    memo: trimTo(formData.get("memo"), AI_PROFILE_MEMO_MAX),
  });

  if ("draft" in result) {
    await recordAiDraftUse(su, AI_ACTION_PROFILE, `プロフィールの下書きを生成 member=${member.id}`);
  }
  return result;
}

/**
 * 案内メール（広告・宣伝を含む）の受け取り設定を切り替える（2026-08-16）。
 * 規約第27条の2で「いつでも配信停止できる」と約束しているため、会員が自分で止められるようにする。
 * 手続的な連絡（審査結果・掲載の確認依頼など）は本設定に関わらず送る。
 */
export async function setMarketingOptIn(optIn: boolean): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  await prisma.user.update({
    where: { id: su.app.id },
    data: { marketingOptInAt: optIn ? new Date() : null },
  });
  await writeAudit(su, optIn ? "user.marketing_opt_in" : "user.marketing_opt_out", {
    targetType: "user",
    targetId: su.app.id,
  });
  revalidatePath("/profile");
}
