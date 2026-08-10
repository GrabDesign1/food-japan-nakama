"use server";

// 課金システムの管理操作（商品マスター・審査・優良案件確認・条件一致通知）。
// 価格変更・返金相当の操作は上位管理者（requireSuperAdmin）のみ。監査ログを残す。
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { seedBillingProducts } from "@/lib/billing";
import { sendMatchedNoticeEmail } from "@/lib/email";

/** 初期商品マスターを投入（非公開状態）。既存コードは上書きしない。 */
export async function adminSeedProducts(): Promise<void> {
  const su = await requireSuperAdmin();
  const result = await seedBillingProducts(su.app.tenantId);
  await writeAudit(su, "billing.seed_products", {
    detail: `created=${result.created} skipped=${result.skipped}`,
  });
  revalidatePath("/admin/billing");
}

export type ProductUpdateState = { ok?: boolean; at?: number; error?: string };

/** 商品の価格・割引率・公開状態を更新（過去注文の金額は変わらない＝スナップショット保存済み）。 */
export async function adminUpdateProduct(
  productId: string,
  _prev: ProductUpdateState,
  formData: FormData
): Promise<ProductUpdateState> {
  const su = await requireSuperAdmin();
  const priceAmount = Math.max(0, Math.trunc(Number(formData.get("priceAmount")) || 0));
  const memberDiscountPercent = Math.min(
    100,
    Math.max(0, Math.trunc(Number(formData.get("memberDiscountPercent")) || 0))
  );
  const active = !!formData.get("active");
  const before = await prisma.billingProduct.findUnique({ where: { id: productId } });
  if (!before) return { error: "商品が見つかりません。" };
  await prisma.billingProduct.update({
    where: { id: productId },
    data: { priceAmount, memberDiscountPercent, active },
  });
  await writeAudit(su, "billing.product_update", {
    targetType: "billing_product",
    targetId: productId,
    detail: `${before.code}: price ${before.priceAmount}→${priceAmount}, discount ${before.memberDiscountPercent}→${memberDiscountPercent}, active ${before.active}→${active}`,
  });
  revalidatePath("/admin/billing");
  // at で毎回値を変え、クライアント側のトースト（保存しました）を再表示させる
  return { ok: true, at: Date.now() };
}

/** 審査待ちの掲載オプションを承認（掲載開始）。 */
export async function adminApprovePromotion(promotionId: string, formData: FormData): Promise<void> {
  const su = await requireAdmin();
  const promo = await prisma.listingPromotion.findFirst({
    where: { id: promotionId, tenantId: su.app.tenantId, status: "pending_review" },
  });
  if (!promo) return;
  // 期間は承認時から起算（durationはorder item snapshotに従う）
  const item = promo.orderItemId
    ? await prisma.billingOrderItem.findUnique({ where: { id: promo.orderItemId } })
    : null;
  const duration = item?.durationDaysSnapshot ?? 7;
  const now = new Date();
  await prisma.listingPromotion.update({
    where: { id: promo.id },
    data: {
      status: "active",
      startsAt: now,
      endsAt: new Date(now.getTime() + duration * 24 * 60 * 60 * 1000),
      reviewedBy: su.app.email,
      reviewedAt: now,
      reviewNote: String(formData.get("note") ?? "").slice(0, 500) || null,
    },
  });
  await writeAudit(su, "billing.promotion_approve", {
    targetType: "listing_promotion",
    targetId: promo.id,
    detail: `${promo.effectType} offering=${promo.offeringId}`,
  });
  revalidatePath("/admin/billing");
}

/** 審査待ちの掲載オプションを否認（返金はStripeダッシュボードで実施し、注文はWebhookで同期）。 */
export async function adminRejectPromotion(promotionId: string, formData: FormData): Promise<void> {
  // 返金相当の判断を伴うのため上位管理者のみ（REVIEWER不可）
  const su = await requireSuperAdmin();
  const reason = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!reason) return;
  const promo = await prisma.listingPromotion.findFirst({
    where: { id: promotionId, tenantId: su.app.tenantId, status: "pending_review" },
  });
  if (!promo) return;
  await prisma.listingPromotion.update({
    where: { id: promo.id },
    data: { status: "rejected", reviewedBy: su.app.email, reviewedAt: new Date(), reviewNote: reason },
  });
  await writeAudit(su, "billing.promotion_reject", {
    targetType: "listing_promotion",
    targetId: promo.id,
    detail: `${promo.effectType} offering=${promo.offeringId} reason=${reason}`,
  });
  revalidatePath("/admin/billing");
}

/** 優良案件（NAKAMA確認済み）として確認。確認日と根拠を記録する。 */
export async function adminMarkVerifiedLead(offeringId: string, formData: FormData): Promise<void> {
  // 紹介料を1,100円→3,300円に変える操作＝価格変更に相当のため上位管理者のみ（REVIEWER不可）
  const su = await requireSuperAdmin();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!note) return; // 根拠の記録は必須
  const offering = await prisma.offering.findFirst({
    where: { id: offeringId, direction: "WANT", member: { tenantId: su.app.tenantId } },
    select: { id: true },
  });
  if (!offering) return;
  await prisma.offering.update({
    where: { id: offeringId },
    data: { verifiedLeadAt: new Date(), verifiedLeadBy: su.app.email, verifiedLeadNote: note },
  });
  await writeAudit(su, "billing.verified_lead_mark", {
    targetType: "offering",
    targetId: offeringId,
    detail: note,
  });
  revalidatePath("/admin/billing");
  revalidatePath("/admin/listings");
}

/** 優良案件の確認を解除。 */
export async function adminUnmarkVerifiedLead(offeringId: string): Promise<void> {
  // 価格ティアを戻す操作＝価格変更に相当のため上位管理者のみ（REVIEWER不可）
  const su = await requireSuperAdmin();
  const offering = await prisma.offering.findFirst({
    where: { id: offeringId, member: { tenantId: su.app.tenantId } },
    select: { id: true },
  });
  if (!offering) return;
  await prisma.offering.update({
    where: { id: offeringId },
    data: { verifiedLeadAt: null, verifiedLeadBy: null, verifiedLeadNote: null },
  });
  await writeAudit(su, "billing.verified_lead_unmark", { targetType: "offering", targetId: offeringId });
  revalidatePath("/admin/billing");
  revalidatePath("/admin/listings");
}

/** 条件一致通知を承認して送信（案内メール同意者のみ・上限件数まで）。冪等（sent後は再送しない）。 */
export async function adminSendMatchedNotice(noticeId: string, _formData: FormData): Promise<void> {
  // 最大100名への一斉メール送信＝取り消せない外部送信のため上位管理者のみ（REVIEWER不可）
  const su = await requireSuperAdmin();
  const notice = await prisma.matchedNotice.findFirst({
    where: { id: noticeId, tenantId: su.app.tenantId, status: "pending_review" },
  });
  if (!notice) return;
  const offering = await prisma.offering.findUnique({
    where: { id: notice.offeringId },
    include: { member: { select: { id: true, name: true } } },
  });
  // 非公開・応募者限定の案件を告知しない（受信者が開けないリンクを100通送ることになる）
  if (!offering || !offering.isPublic || offering.visibility !== "public") return;

  // 送信件数は注文時の商品の上限（スナップショット）に従う。無ければ既定100件
  const orderItem = notice.orderItemId
    ? await prisma.billingOrderItem.findUnique({
        where: { id: notice.orderItemId },
        select: { productCode: true },
      })
    : null;
  const product = orderItem
    ? await prisma.billingProduct.findFirst({
        where: { code: orderItem.productCode, tenantId: su.app.tenantId },
        select: { unitLimit: true },
      })
    : null;

  // 対象抽出：案内メール同意済み・承認済み会員・掲載者自身を除く（サーバー側で確定）
  const limit = product?.unitLimit ?? 100;
  const targets = await prisma.user.findMany({
    where: {
      tenantId: su.app.tenantId,
      marketingOptInAt: { not: null },
      status: "ACTIVE",
      member: { status: "APPROVED", id: { not: offering.memberId } },
    },
    select: { email: true },
    take: limit,
  });

  let sent = 0;
  for (const t of targets) {
    try {
      await sendMatchedNoticeEmail({
        to: t.email,
        offeringTitle: offering.title,
        offeringId: offering.id,
        direction: offering.direction,
      });
      sent++;
    } catch (e) {
      console.error("[matched notice] 送信失敗:", e);
    }
  }

  await prisma.matchedNotice.update({
    where: { id: notice.id },
    data: { status: "sent", sentAt: new Date(), sentCount: sent, targetCount: targets.length },
  });
  await writeAudit(su, "billing.matched_notice_send", {
    targetType: "matched_notice",
    targetId: notice.id,
    detail: `offering=${offering.id} sent=${sent}/${targets.length}`,
  });
  revalidatePath("/admin/billing");
}

/** 条件一致通知を否認（返金対応はStripeダッシュボード→Webhook同期）。 */
export async function adminRejectMatchedNotice(noticeId: string, formData: FormData): Promise<void> {
  // 返金相当の判断を伴うのため上位管理者のみ（REVIEWER不可）
  const su = await requireSuperAdmin();
  const reason = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!reason) return;
  const notice = await prisma.matchedNotice.findFirst({
    where: { id: noticeId, tenantId: su.app.tenantId, status: "pending_review" },
  });
  if (!notice) return;
  await prisma.matchedNotice.update({
    where: { id: notice.id },
    data: { status: "rejected", reviewNote: reason },
  });
  await writeAudit(su, "billing.matched_notice_reject", {
    targetType: "matched_notice",
    targetId: notice.id,
    detail: reason,
  });
  revalidatePath("/admin/billing");
}
