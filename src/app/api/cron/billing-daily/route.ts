// 課金システムの日次バッチ（Vercel Cron）。
// - 掲載オプションの開始（scheduled→active）・終了（active→expired）・終了3日前通知（一度だけ）
// - 公開範囲（非公開募集・応募者限定）の期限切れ→publicへ戻す
// - 14日未読のクレジット返還（一度だけ・冪等）
// - 期限切れクレジットロットの失効
// 冪等に設計してあり、重複実行しても二重付与・二重通知しない。
// 表示クエリ側でも endsAt を判定しているため、cron停止時も期限切れが有効扱いになることはない。
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  refundUnreadCredits,
  expireCreditLots,
  grantMonthlyMemberCredits,
} from "@/lib/contact-credits";
import { isUnreadRefundDue } from "@/lib/billing-core";
import { getMemberUserEmails } from "@/lib/member";
import { notifyPromotionEnding, notifyUnreadRefund } from "@/lib/email";

const EFFECT_LABEL: Record<string, string> = {
  featured: "注目表示",
  top_pr: "最上部PR",
  urgent: "急募",
  private: "非公開募集",
  applicant_only: "応募者限定公開",
};

export async function GET(req: NextRequest) {
  // Vercel Cron の認証（CRON_SECRET を設定すると Authorization: Bearer <secret> が付与される）。
  // シークレットが設定されていれば環境を問わず必ず検証する（プレビュー環境の無認証実行を防ぐ）。
  // 未設定はローカル開発のみ許可し、本番・プレビューでは拒否する。
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret) {
    if (!timingSafeEquals(auth ?? "", `Bearer ${secret}`)) {
      return new Response("unauthorized", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    console.error("[cron] CRON_SECRET が未設定のため実行を拒否しました");
    return new Response("cron not configured", { status: 500 });
  }

  const now = new Date();
  const summary: Record<string, number> = {};

  // 1) scheduled → active
  const activated = await prisma.listingPromotion.updateMany({
    where: { status: "scheduled", startsAt: { lte: now } },
    data: { status: "active" },
  });
  summary.activated = activated.count;

  // 2) 終了3日前通知（active・未通知のみ・一度だけ）
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const endingSoon = await prisma.listingPromotion.findMany({
    where: {
      status: "active",
      endingNoticeSentAt: null,
      endsAt: { gt: now, lte: soon },
    },
  });
  for (const p of endingSoon) {
    // 先に印を付ける（メール失敗しても二重送信しない方向に倒す）
    await prisma.listingPromotion.update({
      where: { id: p.id },
      data: { endingNoticeSentAt: now },
    });
    const offering = await prisma.offering.findUnique({
      where: { id: p.offeringId },
      select: { title: true, memberId: true },
    });
    if (offering && p.endsAt) {
      const to = await getMemberUserEmails(offering.memberId);
      await notifyPromotionEnding({
        to,
        offeringTitle: offering.title || "（無題）",
        effectLabel: EFFECT_LABEL[p.effectType] ?? p.effectType,
        endsAt: p.endsAt,
        ended: false,
      }).catch((e) => console.error("[cron] 終了予告メール失敗:", e));
    }
  }
  summary.endingNotices = endingSoon.length;

  // 3) active → expired ＋ 終了メール ＋ 公開範囲の復帰
  const expiredPromos = await prisma.listingPromotion.findMany({
    where: { status: "active", endsAt: { lte: now } },
  });
  for (const p of expiredPromos) {
    await prisma.listingPromotion.update({ where: { id: p.id }, data: { status: "expired" } });

    // 非公開募集・応募者限定：他に有効な同種オプションが無ければ public へ戻す
    if (p.effectType === "private" || p.effectType === "applicant_only") {
      const still = await prisma.listingPromotion.count({
        where: {
          offeringId: p.offeringId,
          effectType: { in: ["private", "applicant_only"] },
          status: { in: ["active", "scheduled"] },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      });
      if (still === 0) {
        await prisma.offering.update({
          where: { id: p.offeringId },
          data: { visibility: "public" },
        });
      }
    }

    const offering = await prisma.offering.findUnique({
      where: { id: p.offeringId },
      select: { title: true, memberId: true },
    });
    if (offering && p.endsAt) {
      const to = await getMemberUserEmails(offering.memberId);
      await notifyPromotionEnding({
        to,
        offeringTitle: offering.title || "（無題）",
        effectLabel: EFFECT_LABEL[p.effectType] ?? p.effectType,
        endsAt: p.endsAt,
        ended: true,
      }).catch((e) => console.error("[cron] 終了メール失敗:", e));
    }
  }
  summary.expiredPromos = expiredPromos.length;

  // 4) 14日未読のクレジット返還（unlock単位で一度だけ）
  const dueUnlocks = await prisma.contactUnlock.findMany({
    where: {
      unreadRefundDueAt: { lte: now },
      unreadRefundedAt: null,
      openedAt: null,
      creditLedgerEntryId: { not: null }, // クレジット消費があるもののみ（会員無制限分は対象外）
    },
    take: 200,
  });
  let refunded = 0;
  for (const u of dueUnlocks) {
    if (!isUnreadRefundDue({ openedAt: u.openedAt, unreadRefundDueAt: u.unreadRefundDueAt, unreadRefundedAt: u.unreadRefundedAt, now })) {
      continue;
    }
    // 消費した各ロットへ同数を戻す（期限切れロットへは戻さない＝再発行しない）
    const result = await refundUnreadCredits({
      tenantId: u.tenantId,
      memberId: u.sellerMemberId,
      contactUnlockId: u.id,
    });
    await prisma.contactUnlock.update({
      where: { id: u.id },
      data: { unreadRefundedAt: now },
    });
    if (result.skippedExpired > 0) {
      console.warn(
        `[cron] 有効期限切れのため返還しなかったクレジット unlock=${u.id} qty=${result.skippedExpired}`
      );
    }
    if (result.refunded > 0) {
      refunded += result.refunded;
      const offering = await prisma.offering.findUnique({
        where: { id: u.offeringId },
        select: { title: true },
      });
      const to = await getMemberUserEmails(u.sellerMemberId);
      await notifyUnreadRefund({ to, offeringTitle: offering?.title || "（無題）", quantity: result.refunded }).catch((e) =>
        console.error("[cron] 返還メール失敗:", e)
      );
    }
  }
  summary.unreadRefunds = refunded;

  // 5) 月次クレジットの取りこぼし補填（2026-08-11）
  // 付与の機会が「Webhookが届いた瞬間」だけだと、イベント設定漏れ・仕様変更・障害で落ちる。
  // 実際にクーポン契約（請求0円）で付与されない事故が起きたため、日次で補う。
  // 直近27日以内に月次付与があればスキップ（通常の invoice.paid と二重にしない）。
  const paidMembers = await prisma.member.findMany({
    where: { paymentStatus: "PAID", stripeSubscriptionId: { not: null } },
    select: { id: true, tenantId: true },
  });
  const RECENT_MS = 27 * 24 * 60 * 60 * 1000;
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const ym = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
  let backfilled = 0;
  for (const m of paidMembers) {
    const recent = await prisma.contactCreditLedger.findFirst({
      where: {
        memberId: m.id,
        entryType: "member_monthly",
        quantity: { gt: 0 },
        createdAt: { gte: new Date(now.getTime() - RECENT_MS) },
      },
      select: { id: true },
    });
    if (recent) continue;
    // 冪等キーは会員×月。付与時に前月分の未使用ロットは失効する（繰越なしの担保）
    const res = await grantMonthlyMemberCredits({
      tenantId: m.tenantId,
      memberId: m.id,
      invoiceId: `backfill:${m.id}:${ym}`,
      periodEnd: null,
    });
    if (res.granted) {
      backfilled++;
      console.warn(`[cron] 月次クレジットを補填しました member=${m.id} ${ym}`);
    }
  }
  summary.monthlyBackfills = backfilled;

  // 6) 期限切れクレジットの失効
  summary.expiredCredits = await expireCreditLots();

  // 7) 古いメッセージの削除（保存期間＝最後のやり取りから1年）。
  //    プライバシーポリシーに保存期間を明記したうえで運用する（2026-08-11）。
  //    添付は非公開バケットに残さず、メッセージと一緒に消す。
  const cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oldThreads = await prisma.thread.findMany({
    where: { lastMessageAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  let deletedMessages = 0;
  if (oldThreads.length) {
    const threadIds = oldThreads.map((t) => t.id);
    const attachments = await prisma.messageAttachment.findMany({
      where: { message: { threadId: { in: threadIds } } },
      select: { path: true },
    });
    const legacy = await prisma.message.findMany({
      where: { threadId: { in: threadIds }, attachmentUrl: { not: null } },
      select: { attachmentUrl: true },
    });
    const paths = [
      ...attachments.map((a) => a.path),
      ...legacy.map((m) => m.attachmentUrl).filter((v): v is string => !!v),
    ];
    if (paths.length) {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.storage.from("message-attachments").remove(paths);
      if (error) console.error("[cron] 添付の削除に失敗:", error);
    }
    // MessageAttachment は Message の削除でカスケードされる
    const res = await prisma.message.deleteMany({ where: { threadId: { in: threadIds } } });
    deletedMessages = res.count;
  }
  summary.deletedOldMessages = deletedMessages;

  return Response.json({ ok: true, at: now.toISOString(), ...summary });
}

/** 定数時間比較（シークレットの推測に長さ・一致位置の情報を与えない）。 */
function timingSafeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // 長さが違う場合も比較コストを揃える（結果は常に false）
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
