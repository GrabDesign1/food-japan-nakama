// 課金システムの中核（商品マスター・注文・Stripe Checkout・履行・掲載効果）。
// 仕様=docs/NAKAMA_課金システム_ClaudeCode実装パッケージ/00_Claude提出用_最終実装指示_2026-08-10.md
// 原則：価格・権限・対象者数・公開範囲はサーバー側で確定。決済確定は署名検証済みWebhookのみ。
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type { Prisma } from "@/generated/prisma/client";
import {
  discountedUnitAmount,
  MEMBER_OPTION_DISCOUNT_PERCENT,
  CREDIT_PACK_EXPIRY_DAYS,
  VERIFIED_LEAD_CREDIT_COST,
  creditExpiryFrom,
} from "@/lib/billing-core";
import { grantCredits } from "@/lib/contact-credits";
import { safeInternalPath } from "@/lib/security";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ── 商品マスター ────────────────────────────────

export type SeedProduct = {
  code: string;
  name: string;
  description?: string;
  billingType: string; // one_time / quote / grant / subscription / free / success_fee
  audience: string; // sell / seek / both / banner
  effectType: string;
  priceAmount: number; // 税込・円（0=無料/見積の起点表示）
  durationDays?: number;
  unitLimit?: number;
  requiresReview?: boolean;
  memberDiscountPercent?: number;
  sortOrder?: number;
};

/** 初期商品マスター（product-catalog.seed.json 2026-08-10版を基に整形。投入は active=false＝非公開）。 */
export const SEED_PRODUCTS: SeedProduct[] = [
  // 初回紹介料・クレジット
  { code: "contact_unlock_standard", name: "紹介クレジット1クレジット", description: "通常案件への初回提案1件分（有効期限180日）", billingType: "one_time", audience: "sell", effectType: "contact_unlock", priceAmount: 1100, unitLimit: 1, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 10 },
  { code: "contact_unlock_verified_lead", name: "紹介クレジット3クレジット（確認済み案件用）", description: "NAKAMA確認済み案件への初回提案1件分＝3クレジット（有効期限180日）", billingType: "one_time", audience: "sell", effectType: "contact_unlock_verified", priceAmount: 3300, unitLimit: 1, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 11 },
  // パックは「まとめ買いの手間を省く」ためのもので、単価は1クレジット1,100円と同じ（2026-08-11 価格整合）。
  // まとめ買い割引を残すと、会費（22,000円で30クレジット＝733円/件）より安く買えて会員プランが破綻する。
  { code: "contact_credits_5", name: "紹介クレジット5クレジットパック", description: "1クレジット1,100円×5・有効期限180日", billingType: "one_time", audience: "sell", effectType: "contact_credits", priceAmount: 5500, durationDays: CREDIT_PACK_EXPIRY_DAYS, unitLimit: 5, memberDiscountPercent: 0, sortOrder: 12 },
  { code: "contact_credits_10", name: "紹介クレジット10クレジットパック", description: "1クレジット1,100円×10・有効期限180日", billingType: "one_time", audience: "sell", effectType: "contact_credits", priceAmount: 11000, durationDays: CREDIT_PACK_EXPIRY_DAYS, unitLimit: 10, memberDiscountPercent: 0, sortOrder: 13 },
  // 掲載オプション（売りたい（提供したい））
  { code: "sell_featured_7d", name: "注目表示", description: "一覧のスポンサー枠に7日間表示（広告表記つき）", billingType: "one_time", audience: "sell", effectType: "featured", priceAmount: 5500, durationDays: 7, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 20 },
  { code: "sell_top_pr_7d", name: "最上部PR", description: "対象ページ上部のスポンサー枠に7日間表示（審査あり）", billingType: "one_time", audience: "sell", effectType: "top_pr", priceAmount: 22000, durationDays: 7, requiresReview: true, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 21 },
  { code: "sell_urgent_7d", name: "急募ラベル", description: "賞味期限・販売希望時期などを強調（審査あり）", billingType: "one_time", audience: "sell", effectType: "urgent", priceAmount: 3300, durationDays: 7, requiresReview: true, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 22 },
  // 掲載オプション（探している（調達したい））
  { code: "seek_featured_7d", name: "注目表示", description: "一覧のスポンサー枠に7日間表示（広告表記つき）", billingType: "one_time", audience: "seek", effectType: "featured", priceAmount: 11000, durationDays: 7, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 30 },
  { code: "seek_top_pr_7d", name: "最上部PR", description: "対象ページ上部のスポンサー枠に7日間表示（審査あり）", billingType: "one_time", audience: "seek", effectType: "top_pr", priceAmount: 22000, durationDays: 7, requiresReview: true, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 31 },
  { code: "seek_urgent_7d", name: "急募表示", description: "急ぎの探している案件として強調（審査あり）", billingType: "one_time", audience: "seek", effectType: "urgent", priceAmount: 5500, durationDays: 7, requiresReview: true, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 32 },
  // 案内メール一斉送信・公開範囲
  { code: "matched_notice_100", name: "案内メール一斉送信（同意者・最大100件）", description: "案内メールに同意した会員へ、この案件のお知らせを一斉送信します（先着最大100件・審査後に送信）。条件による絞り込みは行いません。", billingType: "one_time", audience: "both", effectType: "matched_notice", priceAmount: 11000, unitLimit: 100, requiresReview: true, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 40 },
  { code: "seek_private_30d", name: "非公開募集", description: "一覧・検索に出さず、限定公開（30日）", billingType: "one_time", audience: "seek", effectType: "private", priceAmount: 22000, durationDays: 30, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 41 },
  { code: "seek_applicant_only_30d", name: "応募者限定公開", description: "会社名・詳細条件を承認相手だけに開示（30日）", billingType: "one_time", audience: "seek", effectType: "applicant_only", priceAmount: 11000, durationDays: 30, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 42 },
  // おすすめセット
  { code: "sell_steady_promotion_7d", name: "しっかり告知セット", description: "注目表示7日＋急募ラベル7日", billingType: "one_time", audience: "sell", effectType: "bundle", priceAmount: 8800, durationDays: 7, requiresReview: true, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 50 },
  { code: "both_reach_matched_100", name: "相手へ届けるセット", description: "注目表示7日＋案内メール一斉送信100件", billingType: "one_time", audience: "both", effectType: "bundle", priceAmount: 22000, requiresReview: true, memberDiscountPercent: MEMBER_OPTION_DISCOUNT_PERCENT, sortOrder: 51 },
  // 相談・見積（自動決済しない）
  { code: "sell_serious_promotion_quote", name: "本気で売るセット", description: "最上部PR＋案内メール一斉送信＋SNS紹介申込（審査・日程調整あり）", billingType: "quote", audience: "sell", effectType: "bundle", priceAmount: 55000, requiresReview: true, sortOrder: 60 },
  { code: "managed_growth_support_quote", name: "事務局に任せるセット", description: "原稿改善＋候補探索＋商談設定（個別契約）", billingType: "quote", audience: "both", effectType: "bundle", priceAmount: 220000, requiresReview: true, sortOrder: 61 },
  { code: "banner_ad_quote", name: "バナー広告", description: "トップ・検索結果・記事等。申込・審査・日程確定後に決済", billingType: "quote", audience: "both", effectType: "banner", priceAmount: 33000, requiresReview: true, sortOrder: 62 },
  { code: "sns_intro_quote", name: "SNS紹介", description: "公式SNSで紹介（実施可否と日程を事務局が確認）", billingType: "quote", audience: "both", effectType: "sns", priceAmount: 33000, requiresReview: true, sortOrder: 63 },
  { code: "feature_article_quote", name: "特集記事", description: "取材・原稿・写真・紹介ページ制作（個別見積）", billingType: "quote", audience: "both", effectType: "article", priceAmount: 110000, requiresReview: true, sortOrder: 64 },
  { code: "sales_page_improvement_quote", name: "販売ページ改善", description: "コピー・写真・デザイン・販売導線の改善（個別見積）", billingType: "quote", audience: "sell", effectType: "sales_page_improvement", priceAmount: 110000, requiresReview: true, sortOrder: 65 },
  { code: "partner_search_quote", name: "買い手探索・事務局による探索", description: "候補調査と個別打診（個別契約）", billingType: "quote", audience: "both", effectType: "search_support", priceAmount: 165000, requiresReview: true, sortOrder: 66 },
  { code: "meeting_support_quote", name: "商談設定支援", description: "条件整理・候補選定・日程調整・同席（個別契約）", billingType: "quote", audience: "seek", effectType: "meeting_support", priceAmount: 330000, requiresReview: true, sortOrder: 67 },
];

/** セット商品の内訳（サーバー側で展開して履行する）。 */
export const BUNDLE_COMPONENTS: Record<string, string[]> = {
  sell_steady_promotion_7d: ["featured", "urgent"],
  both_reach_matched_100: ["featured", "matched_notice"],
};

/** クレジットパックの付与数（商品コード＝注文時のスナップショットから決める）。 */
const PACK_QUANTITY: Record<string, number> = {
  contact_credits_5: 5,
  contact_credits_10: 10,
};

/** 初期商品マスターを投入（既存コードは更新しない＝価格の勝手な上書きを避ける）。 */
export async function seedBillingProducts(tenantId: string): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const p of SEED_PRODUCTS) {
    const exists = await prisma.billingProduct.findUnique({ where: { code: p.code } });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.billingProduct.create({
      data: {
        tenantId,
        code: p.code,
        name: p.name,
        description: p.description ?? null,
        billingType: p.billingType,
        audience: p.audience,
        effectType: p.effectType,
        priceAmount: p.priceAmount,
        durationDays: p.durationDays ?? null,
        unitLimit: p.unitLimit ?? null,
        requiresReview: p.requiresReview ?? false,
        memberDiscountPercent: p.memberDiscountPercent ?? 0,
        active: false, // 非公開で投入（公開チェック後に管理画面から有効化）
        sortOrder: p.sortOrder ?? 0,
      },
    });
    created++;
  }
  return { created, skipped };
}

/** 対象（sell/seek）に合う有効商品。 */
export async function getActiveProducts(audience: "sell" | "seek") {
  return prisma.billingProduct.findMany({
    where: { active: true, audience: { in: [audience, "both"] } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getProductByCode(code: string) {
  return prisma.billingProduct.findUnique({ where: { code } });
}

// ── 注文と Stripe Checkout（一回払い） ────────────────

export type CheckoutResult = { url?: string; error?: string };

/**
 * 一回払いの Checkout を作成する。
 * - 価格は商品マスターから取得し、会員割引をサーバー側で適用
 * - 先に pending_payment の注文を作成し、metadata には注文IDのみ入れる
 * - paid 化は Webhook のみ（success URL では有効化しない）
 */
export async function createOneTimeCheckout(params: {
  tenantId: string;
  memberId: string;
  isMember: boolean; // 月額会員（PAID）か
  email: string;
  productCode: string;
  offeringId?: string | null;
  returnPath: string; // 決済後に戻すパス（自サイトのみ）
}): Promise<CheckoutResult> {
  if (!stripe) return { error: "決済（Stripe）が未設定です。事務局にお問い合わせください。" };
  const product = await prisma.billingProduct.findUnique({ where: { code: params.productCode } });
  if (!product || !product.active) return { error: "この商品は現在購入できません。" };
  if (product.billingType !== "one_time") return { error: "この商品はオンライン決済の対象外です（相談・個別見積）。" };

  // 対象案件の所有権チェック（案件向けオプションの場合）
  if (params.offeringId) {
    const offering = await prisma.offering.findFirst({
      where: { id: params.offeringId, memberId: params.memberId },
      select: { id: true },
    });
    // 紹介料（他人の案件への提案）は所有権不要。掲載オプションは自分の案件のみ。
    const isContactProduct = product.effectType.startsWith("contact_");
    if (!offering && !isContactProduct) return { error: "対象の案件が見つかりません。" };
  }

  const unit = discountedUnitAmount(product.priceAmount, product.memberDiscountPercent, params.isMember);
  const discount = product.priceAmount - unit;

  // 戻り先は自サイトのパスのみ許可（open redirect防止）
  const path = safeInternalPath(params.returnPath, "/billing");

  // 連打対策：直近2分以内の同一条件の未決済注文があれば、そのCheckoutを開き直す。
  // サーバー側で止めないと、押した回数だけ注文とStripeセッションが増える。
  const recent = await prisma.billingOrder.findFirst({
    where: {
      memberId: params.memberId,
      offeringId: params.offeringId ?? null,
      status: "pending_payment",
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      items: { some: { productCode: product.code } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, stripeCheckoutSessionId: true },
  });
  if (recent?.stripeCheckoutSessionId && stripe) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(recent.stripeCheckoutSessionId);
      if (existing.status === "open" && existing.url) return { url: existing.url };
    } catch (e) {
      console.error("[billing] 直近セッションの再利用に失敗（新規作成に進みます）:", e);
    }
  }

  const order = await prisma.billingOrder.create({
    data: {
      tenantId: params.tenantId,
      memberId: params.memberId,
      offeringId: params.offeringId ?? null,
      status: "pending_payment",
      subtotalAmount: product.priceAmount,
      discountAmount: discount,
      totalAmount: unit,
      currency: "jpy",
      items: {
        create: {
          productId: product.id,
          productCode: product.code,
          name: product.name,
          quantity: 1,
          unitAmount: unit,
          totalAmount: unit,
          effectType: product.effectType,
          durationDaysSnapshot: product.durationDays,
        },
      },
    },
  });

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: { name: `FOOD JAPAN NAKAMA ${product.name}` },
              unit_amount: unit,
            },
            quantity: 1,
          },
        ],
        customer_email: params.email,
        success_url: `${APP_URL}${path}${path.includes("?") ? "&" : "?"}paid=1`,
        cancel_url: `${APP_URL}${path}`,
        metadata: { billingOrderId: order.id },
      },
      { idempotencyKey: `order:${order.id}` }
    );
    if (!session.url) return { error: "決済URLの取得に失敗しました。" };
    await prisma.billingOrder.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });
    return { url: session.url };
  } catch (e) {
    await prisma.billingOrder.update({ where: { id: order.id }, data: { status: "cancelled" } }).catch(() => {});
    return { error: e instanceof Error ? e.message : "決済の開始に失敗しました。" };
  }
}

// ── 履行（Webhook から呼ぶ。トランザクション内で注文確定と効果作成） ──

/**
 * 決済完了した注文を履行する。冪等（注文statusとorderItemId uniqueで多重防止）。
 * paid は Stripe が実際に受領した金額・通貨・セッションID。注文と一致しない限り履行しない
 * （クーポン・部分支払い・別セッションの取り違えで、支払っていない商品が付与されるのを防ぐ）。
 */
export async function fulfillPaidOrder(
  orderId: string,
  paymentIntentId: string | null,
  paid?: { amountTotal: number | null; currency: string | null; sessionId: string | null }
): Promise<void> {
  let fulfilled: { memberId: string; itemNames: string[]; totalAmount: number; requiresReview: boolean } | null =
    null;

  await prisma.$transaction(async (tx) => {
    const order = await tx.billingOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;
    // 冪等かつ、支払い待ち以外（キャンセル済み・返金済み）は履行しない
    if (order.status !== "pending_payment") return;

    // 実支払額との突合（Stripeのイベント順序に依存せず、注文行だけを信用する）
    if (paid) {
      const mismatch: string[] = [];
      if (paid.sessionId && order.stripeCheckoutSessionId && paid.sessionId !== order.stripeCheckoutSessionId) {
        mismatch.push(`session ${paid.sessionId} != ${order.stripeCheckoutSessionId}`);
      }
      if (paid.amountTotal !== null && paid.amountTotal !== order.totalAmount) {
        mismatch.push(`amount ${paid.amountTotal} != ${order.totalAmount}`);
      }
      if (paid.currency && paid.currency.toLowerCase() !== order.currency.toLowerCase()) {
        mismatch.push(`currency ${paid.currency} != ${order.currency}`);
      }
      if (mismatch.length > 0) {
        console.error(`[billing] 支払額が注文と一致しないため履行しません order=${order.id}: ${mismatch.join(", ")}`);
        await tx.billingOrder.update({
          where: { id: order.id },
          data: { status: "payment_failed" },
        });
        return;
      }
    }

    await tx.billingOrder.update({
      where: { id: order.id },
      data: {
        status: "fulfilled",
        paidAt: new Date(),
        ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
      },
    });

    let requiresReview = false;
    for (const item of order.items) {
      const product = await tx.billingProduct.findUnique({ where: { code: item.productCode } });
      if (product?.requiresReview) requiresReview = true;
      await fulfillItemTx(tx, {
        tenantId: order.tenantId,
        memberId: order.memberId,
        offeringId: order.offeringId,
        item,
      });
    }
    fulfilled = {
      memberId: order.memberId,
      itemNames: order.items.map((i) => i.name),
      totalAmount: order.totalAmount,
      requiresReview,
    };
  });

  // 決済完了メール（トランザクション外・失敗しても履行は巻き戻さない）
  if (fulfilled) {
    const f: { memberId: string; itemNames: string[]; totalAmount: number; requiresReview: boolean } = fulfilled;
    try {
      const { getMemberUserEmails } = await import("@/lib/member");
      const { notifyBillingPaid } = await import("@/lib/email");
      const to = await getMemberUserEmails(f.memberId);
      await notifyBillingPaid({
        to,
        itemNames: f.itemNames,
        totalAmount: f.totalAmount,
        requiresReview: f.requiresReview,
      });
    } catch (e) {
      console.error("[billing] 決済完了メール送信失敗:", e);
    }
  }
}

/**
 * 返金・チャージバックされた注文の効果を取り消す。
 * 付与済みクレジットは未消費分だけを打ち消し（消費済みは戻さない）、掲載効果は cancelled にする。
 * 冪等（打ち消しエントリの idempotencyKey と status 判定）。
 */
export async function revokeRefundedOrder(
  paymentIntentId: string,
  reason: "refund" | "dispute"
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.billingOrder.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { items: true },
    });
    if (!order) return;
    if (order.status === "refunded") return; // 冪等

    await tx.billingOrder.update({
      where: { id: order.id },
      data: { status: "refunded", refundedAt: new Date() },
    });

    for (const item of order.items) {
      // 掲載効果：期間を打ち切る
      await tx.listingPromotion.updateMany({
        where: { orderItemId: item.id, status: { in: ["pending_review", "scheduled", "active"] } },
        data: { status: "cancelled", endsAt: new Date() },
      });
      await tx.matchedNotice.updateMany({
        where: { orderItemId: item.id, status: "pending_review" },
        data: { status: "rejected", reviewNote: `${reason} により取消` },
      });

      // クレジット：未消費分だけを負のエントリで打ち消す
      const lot = await tx.contactCreditLedger.findFirst({
        where: { orderItemId: item.id, quantity: { gt: 0 } },
      });
      if (!lot) continue;
      const used = await tx.contactCreditLedger.aggregate({
        where: { lotEntryId: lot.id },
        _sum: { quantity: true },
      });
      const remaining = lot.quantity + (used._sum.quantity ?? 0);
      if (remaining <= 0) continue;
      try {
        await tx.contactCreditLedger.create({
          data: {
            tenantId: order.tenantId,
            memberId: order.memberId,
            entryType: "admin_adjust",
            creditType: lot.creditType,
            quantity: -remaining,
            lotEntryId: lot.id,
            orderItemId: item.id,
            idempotencyKey: `revoke:${item.id}`,
            note: `${reason} により未消費${remaining}件を取消`,
          },
        });
      } catch (e) {
        // 既に取消済み（再送）なら何もしない
        if (!(typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002")) {
          throw e;
        }
      }
    }

    // 公開範囲の有料オプション（非公開募集・応募者限定）を購入していた場合は公開へ戻す
    const stillRestricted = await tx.listingPromotion.count({
      where: {
        offeringId: order.offeringId ?? "",
        effectType: { in: ["private", "applicant_only"] },
        status: { in: ["scheduled", "active"] },
      },
    });
    if (order.offeringId && stillRestricted === 0) {
      await tx.offering.updateMany({
        where: { id: order.offeringId, visibility: { not: "public" } },
        data: { visibility: "public" },
      });
    }
  });
}

type OrderItemRow = {
  id: string;
  productCode: string;
  effectType: string;
  durationDaysSnapshot: number | null;
};

async function fulfillItemTx(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; memberId: string; offeringId: string | null; item: OrderItemRow }
): Promise<void> {
  const { tenantId, memberId, offeringId, item } = params;
  const now = new Date();

  // 有償クレジットは単品・パックとも購入日から180日（2026-08-11の法務レビューによる。
  // 期限延長・実質的な再発行は行わない）。購入画面・規約・特商法表記にも同じ内容を明示している。
  const grantPurchasedCreditsTx = async (qty: number) => {
    // $transaction 内で例外を握りつぶすと以後のクエリが失敗するため、createMany + skipDuplicates で冪等にする
    await tx.contactCreditLedger.createMany({
      data: [
        {
          tenantId,
          memberId,
          creditType: "standard",
          quantity: qty,
          entryType: "purchase",
          expiresAt: creditExpiryFrom(now),
          orderItemId: item.id,
          idempotencyKey: `item:${item.id}`,
        },
      ],
      skipDuplicates: true,
    });
  };

  const createPromotionTx = async (effectType: string, requiresReview: boolean, durationDays: number | null) => {
    if (!offeringId) return;
    // 同一効果が有効なら期間を「加算」する＝既存の終了時刻から開始する scheduled 行を作る
    const existing = await tx.listingPromotion.findFirst({
      where: {
        offeringId,
        effectType,
        status: { in: ["active", "scheduled"] },
        endsAt: { gt: now },
      },
      orderBy: { endsAt: "desc" },
    });
    const base = existing?.endsAt && existing.endsAt.getTime() > now.getTime() ? existing.endsAt : now;
    const startsAt = requiresReview ? null : base;
    const endsAt =
      requiresReview || !durationDays ? null : new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const initialStatus = requiresReview
      ? "pending_review"
      : base.getTime() > now.getTime()
        ? "scheduled"
        : "active";
    await tx.listingPromotion.createMany({
      data: [
        {
          tenantId,
          offeringId,
          // セット展開で1明細から複数効果を作るため、orderItemId は先頭効果のみに紐づける
          orderItemId: effectType === item.effectType || item.effectType !== "bundle" ? item.id : null,
          effectType,
          status: initialStatus,
          startsAt,
          endsAt,
        },
      ],
      skipDuplicates: true,
    });
    // 公開範囲の即時反映
    if (effectType === "private" || effectType === "applicant_only") {
      await tx.offering.update({
        where: { id: offeringId },
        data: { visibility: effectType === "private" ? "private" : "applicant_only" },
      });
    }
  };

  const createMatchedNoticeTx = async () => {
    if (!offeringId) return;
    await tx.matchedNotice.createMany({
      data: [
        {
          tenantId,
          offeringId,
          orderItemId: item.effectType === "matched_notice" ? item.id : null,
          status: "pending_review",
        },
      ],
      skipDuplicates: true,
    });
  };

  // 商品マスターの現在値ではなくスナップショット（durationDaysSnapshot）を使う
  const product = await tx.billingProduct.findUnique({ where: { code: item.productCode } });
  const requiresReview = product?.requiresReview ?? false;
  const duration = item.durationDaysSnapshot;

  switch (item.effectType) {
    case "contact_unlock":
      await grantPurchasedCreditsTx(1);
      break;
    case "contact_unlock_verified":
      // 確認済み案件への提案は3クレジットを消費するため、同額の3クレジットを付与する
      await grantPurchasedCreditsTx(VERIFIED_LEAD_CREDIT_COST);
      break;
    case "contact_credits": {
      // 付与数は注文時の商品コード（スナップショット）から決める。
      // 商品マスターの現在値に頼ると、商品行の改名・削除で誤った件数を付与してしまう。
      const qty = PACK_QUANTITY[item.productCode] ?? product?.unitLimit ?? null;
      if (!qty) throw new Error(`クレジット付与数を決定できません: ${item.productCode}`);
      await grantPurchasedCreditsTx(qty);
      break;
    }
    case "featured":
    case "top_pr":
    case "urgent":
    case "private":
    case "applicant_only":
      await createPromotionTx(item.effectType, requiresReview, duration);
      break;
    case "matched_notice":
      await createMatchedNoticeTx();
      break;
    case "bundle": {
      const components = BUNDLE_COMPONENTS[item.productCode] ?? [];
      for (const c of components) {
        if (c === "matched_notice") await createMatchedNoticeTx();
        else await createPromotionTx(c, requiresReview, duration ?? 7);
      }
      break;
    }
    default:
      // quote 等はここに来ない（one_time のみ Checkout 可能）
      break;
  }
}

// ── 掲載効果の参照（一覧・詳細の表示用） ─────────────────

/** 現在有効な効果（status=active かつ 期間内）。cron停止時も期限切れを有効扱いしない。 */
export async function getActiveEffectsFor(offeringIds: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (offeringIds.length === 0) return map;
  const now = new Date();
  const promos = await prisma.listingPromotion.findMany({
    where: {
      offeringId: { in: offeringIds },
      status: "active",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    select: { offeringId: true, effectType: true },
  });
  for (const p of promos) {
    if (!map.has(p.offeringId)) map.set(p.offeringId, new Set());
    map.get(p.offeringId)!.add(p.effectType);
  }
  return map;
}

/** スポンサー枠（注目表示）の案件を取得。広告表記つきで自然結果と分離表示する。 */
export async function getSponsoredOfferings(direction: "GIVE" | "WANT", limit = 4) {
  const now = new Date();
  const promos = await prisma.listingPromotion.findMany({
    where: {
      effectType: "featured",
      status: "active",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { startsAt: "desc" },
    select: { offeringId: true },
  });
  if (promos.length === 0) return [];
  const ids = Array.from(new Set(promos.map((p) => p.offeringId)));
  const offerings = await prisma.offering.findMany({
    where: {
      id: { in: ids },
      direction,
      isPublic: true,
      visibility: "public",
      member: { status: "APPROVED" },
    },
    include: { member: { select: { name: true, companyLogoUrl: true } } },
  });
  // 同条件はローテーション（日替わりで先頭を変える）
  const day = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
  const rotated = offerings.length
    ? [...offerings.slice(day % offerings.length), ...offerings.slice(0, day % offerings.length)]
    : offerings;
  return rotated.slice(0, limit);
}

/** 最上部PR枠（1件・日替わりローテーション）。 */
export async function getTopPrOffering(direction: "GIVE" | "WANT") {
  const now = new Date();
  const promos = await prisma.listingPromotion.findMany({
    where: {
      effectType: "top_pr",
      status: "active",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    select: { offeringId: true },
  });
  if (promos.length === 0) return null;
  const ids = Array.from(new Set(promos.map((p) => p.offeringId)));
  const offerings = await prisma.offering.findMany({
    where: { id: { in: ids }, direction, isPublic: true, visibility: "public", member: { status: "APPROVED" } },
    include: { member: { select: { name: true, companyLogoUrl: true } } },
  });
  if (offerings.length === 0) return null;
  const day = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
  return offerings[day % offerings.length];
}
