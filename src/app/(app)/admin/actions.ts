"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { writeAudit } from "@/lib/audit";
import { grantCredits } from "@/lib/contact-credits";
import { MEMBER_MONTHLY_CREDITS } from "@/lib/billing-core";
import { setMemberReview, type ReviewDecision } from "@/lib/member";

export async function reviewAction(
  memberId: string,
  decision: ReviewDecision
): Promise<void> {
  const su = await requireAdmin();
  if (!memberId) return;
  await setMemberReview(memberId, decision, su.app.id, su.app.tenantId);
  await writeAudit(su, `member.review.${decision}`, { targetType: "member", targetId: memberId });
  revalidatePath("/admin");
}

/**
 * 入金を手動で確認済みにする（銀行振込・請求書払い用）。課金中(PAID)にする。
 * Stripeを使わずにメッセージ等の有料機能を開放できる。
 */
export async function markMemberPaid(memberId: string): Promise<void> {
  const su = await requireSuperAdmin(); // 課金操作はREVIEWER不可
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
  await writeAudit(su, "member.mark_paid", { targetType: "member", targetId: memberId });
  revalidatePath("/admin");
}

/**
 * ビジネス会員の月次クレジットを手動で付与する（2026-08-11）。
 * 月次付与はStripeの invoice.paid（税込22,000円ちょうど）でしか走らないため、
 * 手動でビジネス会員にした場合や、割引つき申込み・イベント取りこぼしでは0のままになる。
 * 当月1回だけ付与する（同じ月に何度押しても増えない）。
 */
export async function grantMonthlyCreditsManually(memberId: string): Promise<void> {
  const su = await requireSuperAdmin(); // 課金操作はREVIEWER不可
  if (!memberId) return;
  const tenantId = su.app.tenantId;
  const m = await prisma.member.findFirst({
    where: { id: memberId, tenantId },
    select: { id: true, paymentStatus: true },
  });
  if (!m || m.paymentStatus !== "PAID") return;

  // 「当月分」を1回だけ。有効期限は翌月の同日（次回更新日相当）
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const expiresAt = new Date(now);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 1);

  const { granted } = await grantCredits({
    tenantId,
    memberId,
    creditType: "standard",
    quantity: MEMBER_MONTHLY_CREDITS,
    entryType: "member_monthly",
    expiresAt,
    idempotencyKey: `member_monthly_manual:${memberId}:${ym}`,
    note: `事務局による月次クレジットの手動付与（${ym}）`,
  });

  await writeAudit(su, "member.grant_monthly_credits", {
    targetType: "member",
    targetId: memberId,
    detail: granted ? `${MEMBER_MONTHLY_CREDITS}クレジット付与（${ym}）` : `付与済みのため何もしない（${ym}）`,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/members");
}

/** 課金を解除して無料(FREE)に戻す。 */
export async function unmarkMemberPaid(memberId: string): Promise<void> {
  const su = await requireSuperAdmin(); // 課金操作はREVIEWER不可
  if (!memberId) return;
  await prisma.member.updateMany({
    where: { id: memberId, tenantId: su.app.tenantId },
    data: { paymentStatus: "FREE" },
  });
  await writeAudit(su, "member.unmark_paid", { targetType: "member", targetId: memberId });
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
  // Supabase側でも新規トークン発行を止める（既存トークンは getSessionUser のSUSPENDED判定で遮断）
  const users = await prisma.user.findMany({ where: { memberId, tenantId }, select: { authId: true } });
  const admin = createSupabaseAdminClient();
  for (const u of users) {
    if (u.authId) {
      await admin.auth.admin.updateUserById(u.authId, { ban_duration: "87600h" }).catch((e) =>
        console.error("[suspendMember] Supabaseバン失敗:", e)
      );
    }
  }
  await writeAudit(su, "member.suspend", { targetType: "member", targetId: memberId });
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
  // Supabase側のバンを解除
  const users = await prisma.user.findMany({ where: { memberId, tenantId }, select: { authId: true } });
  const admin = createSupabaseAdminClient();
  for (const u of users) {
    if (u.authId) {
      await admin.auth.admin.updateUserById(u.authId, { ban_duration: "none" }).catch((e) =>
        console.error("[reactivateMember] Supabaseバン解除失敗:", e)
      );
    }
  }
  await writeAudit(su, "member.reactivate", { targetType: "member", targetId: memberId });
  revalidatePath("/admin");
}

/**
 * 会員を完全に削除する（元に戻せない）。
 * 会員情報・登録データ（台帳/お気に入り/プロジェクト/商談/メッセージ）と、
 * 紐づくログインアカウントもまとめて削除する。
 */
export async function deleteMember(memberId: string): Promise<void> {
  const su = await requireSuperAdmin(); // 完全削除はREVIEWER不可
  if (!memberId) return;
  const tenantId = su.app.tenantId;

  // 対象がこのテナントの会員か確認
  const member = await prisma.member.findFirst({
    where: { id: memberId, tenantId },
    select: { id: true, name: true, paymentStatus: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!member) return;

  // 先にStripeサブスクを解約する（削除後は本人がポータルに入れず解約手段を失うため）。
  // 解約に失敗した場合は会員を削除しない＝課金だけが生き残る事故を防ぐ。
  if (stripe) {
    try {
      let subId = member.stripeSubscriptionId;
      if (!subId && member.stripeCustomerId) {
        const subs = await stripe.subscriptions.list({ customer: member.stripeCustomerId, status: "active", limit: 3 });
        subId = subs.data[0]?.id ?? null;
      }
      if (subId) await stripe.subscriptions.cancel(subId);
    } catch (e) {
      console.error("[deleteMember] Stripe解約失敗のため削除を中止:", e);
      throw new Error("Stripeサブスクリプションの解約に失敗したため、削除を中止しました。Stripeダッシュボードで解約後に再実行してください。");
    }
  } else if (member.paymentStatus === "PAID" && member.stripeSubscriptionId) {
    throw new Error("Stripe未設定のため課金中の会員は削除できません。");
  }

  // 紐づくログインユーザーの認証アカウントを削除
  const users = await prisma.user.findMany({ where: { memberId, tenantId }, select: { authId: true } });
  const admin = createSupabaseAdminClient();
  for (const u of users) {
    if (u.authId) await admin.auth.admin.deleteUser(u.authId).catch(() => {});
  }

  // DB削除前に、Storage上のファイルの場所（案件ID・プロジェクトID・スレッドID）を控える。
  // 控えずに消すと、実体だけが公開URLのまま残り続ける（規約19条の削除と矛盾する）。
  const [offerings, projects, threads] = await Promise.all([
    prisma.offering.findMany({ where: { memberId }, select: { id: true } }),
    prisma.project.findMany({ where: { memberId }, select: { id: true } }),
    prisma.thread.findMany({
      where: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] },
      select: { id: true },
    }),
  ]);

  // DBの関連データを削除（台帳・お気に入りは Member 削除で自動連鎖）
  await prisma.$transaction([
    prisma.project.deleteMany({ where: { memberId } }),
    prisma.deal.deleteMany({ where: { OR: [{ ownerMemberId: memberId }, { counterpartMemberId: memberId }] } }),
    prisma.thread.deleteMany({ where: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] } }),
    prisma.user.deleteMany({ where: { memberId, tenantId } }),
    prisma.member.delete({ where: { id: memberId } }),
  ]);

  // Storage上のファイルも消す（画像・ロゴ・アバター・一時アップロード・メッセージ添付）
  const removed = await removeStorageFolders(admin, {
    memberImages: [
      `${memberId}/`,
      `avatars/${memberId}/`,
      `logos/${memberId}/`,
      `offerings/tmp/${memberId}/`,
      `projects/tmp/${memberId}/`,
      ...offerings.map((o) => `offerings/${o.id}/`),
      ...projects.map((p) => `projects/${p.id}/`),
    ],
    attachments: threads.map((t) => `${t.id}/`),
  });
  await writeAudit(su, "member.delete", {
    targetType: "member",
    targetId: memberId,
    detail: `name=${member.name} / storage=${removed}件削除`,
  });
  revalidatePath("/admin");
}

/**
 * 指定フォルダ配下のファイルを削除する（退会・会員削除時の孤児ファイル対策）。
 * 失敗しても会員削除自体は巻き戻さない（DB上は消えているため、残骸はログで追える）。
 */
async function removeStorageFolders(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  folders: { memberImages: string[]; attachments: string[] }
): Promise<number> {
  let count = 0;
  const targets: [string, string[]][] = [
    ["member-images", folders.memberImages],
    ["message-attachments", folders.attachments],
  ];
  for (const [bucket, prefixes] of targets) {
    for (const prefix of prefixes) {
      try {
        const { data, error } = await admin.storage.from(bucket).list(prefix.replace(/\/$/, ""), {
          limit: 1000,
        });
        if (error || !data?.length) continue;
        const paths = data.filter((f) => f.name).map((f) => `${prefix}${f.name}`);
        if (!paths.length) continue;
        const { error: rmError } = await admin.storage.from(bucket).remove(paths);
        if (rmError) {
          console.error(`[deleteMember] ${bucket}/${prefix} の削除に失敗:`, rmError);
          continue;
        }
        count += paths.length;
      } catch (e) {
        console.error(`[deleteMember] ${bucket}/${prefix} の削除で例外:`, e);
      }
    }
  }
  return count;
}
