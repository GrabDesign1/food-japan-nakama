"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma/client";

export type AdminAccountState = { error?: string; message?: string };

// 事務局管理から作成できるロール
const ALLOWED_ROLES = ["ADMIN", "REVIEWER"] as const;

/**
 * 管理者アカウントを新規作成する。
 * Supabase Auth ユーザー（ログイン用）と、アプリ側 users 行（管理者ロール）の両方を作る。
 */
export async function createAdminAccount(
  _prev: AdminAccountState,
  formData: FormData
): Promise<AdminAccountState> {
  // 権限管理はREVIEWER不可（REVIEWERが自分用ADMINを作る昇格経路を塞ぐ）
  const su = await requireSuperAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "REVIEWER");
  const role: UserRole = (ALLOWED_ROLES as readonly string[]).includes(roleRaw)
    ? (roleRaw as UserRole)
    : "REVIEWER";

  if (!name) return { error: "お名前を入力してください。" };
  if (!email || !email.includes("@")) return { error: "正しいメールアドレスを入力してください。" };
  if (password.length < 8) return { error: "パスワードは8文字以上にしてください。" };

  // 同じテナントに同じメールのユーザーがいないか
  const existing = await prisma.user.findFirst({
    where: { tenantId: su.app.tenantId, email },
  });
  if (existing) return { error: "このメールアドレスは既に登録されています。" };

  const admin = createSupabaseAdminClient();

  // 1) ログイン用の認証ユーザーを作成（メール確認済みで即ログイン可能に）
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    if (msg.toLowerCase().includes("already")) {
      return { error: "このメールアドレスは既にアカウントが存在します。" };
    }
    return { error: `アカウント作成に失敗しました：${msg || "不明なエラー"}` };
  }

  // 2) アプリ側の users 行を管理者ロールで作成
  try {
    await prisma.user.create({
      data: {
        tenantId: su.app.tenantId,
        authId: data.user.id,
        email,
        name,
        role,
        status: "ACTIVE",
      },
    });
  } catch {
    // 失敗したら認証ユーザーもロールバック（中途半端な状態を残さない）
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    return { error: "アカウント情報の保存に失敗しました。もう一度お試しください。" };
  }

  await writeAudit(su, "admin.create", { targetType: "user", targetId: data.user.id, detail: `email=${email}, role=${role}` });
  revalidatePath("/admin");
  const roleLabel = role === "ADMIN" ? "事務局管理者" : "審査担当";
  return { message: `${name} さんの${roleLabel}アカウントを作成しました。初回はこのメール・パスワードでログインできます。` };
}

/**
 * 管理者権限を解除する（一般会員に戻す）。認証アカウント自体は削除しない。
 * 統括管理者（TENANT_ADMIN）は解除できない（事務局全体のロックアウト防止）。
 */
export async function revokeAdmin(userId: string): Promise<void> {
  const su = await requireSuperAdmin();
  if (userId === su.app.id) return; // 自分自身は解除できない
  const target = await prisma.user.findFirst({
    where: { id: userId, tenantId: su.app.tenantId },
    select: { role: true, email: true },
  });
  if (!target || target.role === "TENANT_ADMIN") return;
  await prisma.user.updateMany({
    where: { id: userId, tenantId: su.app.tenantId },
    data: { role: "MEMBER" },
  });
  await writeAudit(su, "admin.revoke", { targetType: "user", targetId: userId, detail: `email=${target.email}, was=${target.role}` });
  revalidatePath("/admin");
}
