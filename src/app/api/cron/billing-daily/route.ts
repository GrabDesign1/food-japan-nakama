// 課金システムの日次バッチ（Vercel Cron）。
// - 掲載オプションの開始（scheduled→active）・終了（active→expired）・終了3日前通知（一度だけ）
// - 公開範囲（非公開募集・応募者限定）の期限切れ→publicへ戻す
// - 14日未読のクレジット返還（一度だけ・冪等）
// - 期限切れクレジットロットの失効
// 冪等に設計してあり、重複実行しても二重付与・二重通知しない。
// 表示クエリ側でも endsAt を判定しているため、cron停止時も期限切れが有効扱いになることはない。
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { refundUnreadCredit, expireCreditLots } from "@/lib/contact-credits";
import { isUnreadRefundDue, type CreditType } from "@/lib/billing-core";
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
  // Vercel Cron の認証（CRON_SECRET を設定すると Authorization: Bearer <secret> が付与される）
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production") {
    if (!secret || auth !== `Bearer ${secret}`) {
      return new Response("unauthorized", { status: 401 });
    }
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
    // 消費エントリから元ロットを特定して返還する
    const consumeEntry = u.creditLedgerEntryId
      ? await prisma.contactCreditLedger.findUnique({ where: { id: u.creditLedgerEntryId } })
      : null;
    const creditType: CreditType = u.pricingTier === "verified_lead" ? "verified" : "standard";
    const result = await refundUnreadCredit({
      tenantId: u.tenantId,
      memberId: u.sellerMemberId,
      creditType,
      lotEntryId: consumeEntry?.lotEntryId ?? null,
      contactUnlockId: u.id,
    });
    await prisma.contactUnlock.update({
      where: { id: u.id },
      data: { unreadRefundedAt: now },
    });
    if (result.granted) {
      refunded++;
      const offering = await prisma.offering.findUnique({
        where: { id: u.offeringId },
        select: { title: true },
      });
      const to = await getMemberUserEmails(u.sellerMemberId);
      await notifyUnreadRefund({ to, offeringTitle: offering?.title || "（無題）" }).catch((e) =>
        console.error("[cron] 返還メール失敗:", e)
      );
    }
  }
  summary.unreadRefunds = refunded;

  // 5) 期限切れクレジットの失効
  summary.expiredCredits = await expireCreditLots();

  return Response.json({ ok: true, at: now.toISOString(), ...summary });
}
