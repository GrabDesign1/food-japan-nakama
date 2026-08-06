"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { setMemberReview, type ReviewDecision } from "@/lib/member";

export async function reviewAction(
  memberId: string,
  decision: ReviewDecision
): Promise<void> {
  const su = await requireAdmin();
  if (!memberId) return;
  await setMemberReview(memberId, decision, su.app.id);
  revalidatePath("/admin");
}

/**
 * 入金を手動で確認済みにする（銀行振込・請求書払い用）。課金中(PAID)にする。
 * Stripeを使わずにメッセージ等の有料機能を開放できる。
 */
export async function markMemberPaid(memberId: string): Promise<void> {
  const su = await requireAdmin();
  if (!memberId) return;
  const tenantId = su.app.tenantId;
  const m = await prisma.member.findFirst({
    where: { id: memberId, tenantId },
    select: { status: true },
  });
  if (!m) return;
  await prisma.member.updateMany({
    where: { id: memberId, tenantId },
    data: {
      paymentStatus: "PAID",
      // 審査中・要課金の状態なら、入金確認と同時に承認済みへ引き上げる
      ...(m.status === "AWAITING_PAYMENT" || m.status === "PENDING"
        ? { status: "APPROVED" as const }
        : {}),
    },
  });
  revalidatePath("/admin");
}

/** 課金を解除して無料(FREE)に戻す。 */
export async function unmarkMemberPaid(memberId: string): Promise<void> {
  const su = await requireAdmin();
  if (!memberId) return;
  await prisma.member.updateMany({
    where: { id: memberId, tenantId: su.app.tenantId },
    data: { paymentStatus: "FREE" },
  });
  revalidatePath("/admin");
}

/** アカウント停止（無効化）。ログイン不可にし、公開から外す。元に戻せる。 */
export async function suspendMember(memberId: string): Promise<void> {
  const su = await requireAdmin();
  if (!memberId) return;
  const tenantId = su.app.tenantId;
  await prisma.$transaction([
    prisma.member.updateMany({ where: { id: memberId, tenantId }, data: { status: "SUSPENDED" } }),
    prisma.user.updateMany({ where: { memberId, tenantId }, data: { status: "SUSPENDED" } }),
  ]);
  revalidatePath("/admin");
}

/** 停止した会員の利用を再開する。承認済み・利用可能に戻す。 */
export async function reactivateMember(memberId: string): Promise<void> {
  const su = await requireAdmin();
  if (!memberId) return;
  const tenantId = su.app.tenantId;
  await prisma.$transaction([
    prisma.member.updateMany({ where: { id: memberId, tenantId }, data: { status: "APPROVED" } }),
    prisma.user.updateMany({ where: { memberId, tenantId }, data: { status: "ACTIVE" } }),
  ]);
  revalidatePath("/admin");
}

/**
 * 会員を完全に削除する（元に戻せない）。
 * 会員情報・登録データ（台帳/お気に入り/プロジェクト/商談/メッセージ）と、
 * 紐づくログインアカウントもまとめて削除する。
 */
export async function deleteMember(memberId: string): Promise<void> {
  const su = await requireAdmin();
  if (!memberId) return;
  const tenantId = su.app.tenantId;

  // 対象がこのテナントの会員か確認
  const member = await prisma.member.findFirst({ where: { id: memberId, tenantId }, select: { id: true } });
  if (!member) return;

  // 紐づくログインユーザーの認証アカウントを削除
  const users = await prisma.user.findMany({ where: { memberId, tenantId }, select: { authId: true } });
  const admin = createSupabaseAdminClient();
  for (const u of users) {
    if (u.authId) await admin.auth.admin.deleteUser(u.authId).catch(() => {});
  }

  // DBの関連データを削除（台帳・お気に入りは Member 削除で自動連鎖）
  await prisma.$transaction([
    prisma.project.deleteMany({ where: { memberId } }),
    prisma.deal.deleteMany({ where: { OR: [{ ownerMemberId: memberId }, { counterpartMemberId: memberId }] } }),
    prisma.thread.deleteMany({ where: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] } }),
    prisma.user.deleteMany({ where: { memberId, tenantId } }),
    prisma.member.delete({ where: { id: memberId } }),
  ]);
  revalidatePath("/admin");
}
