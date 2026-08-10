// Stripe Webhook（課金状態の正）。
// - フェイルクローズ：シークレット未設定・署名なし・検証失敗はすべて拒否する
// - 冪等化：event.id を stripe_events に記録し、同じイベントは一度だけ処理する
// - 処理失敗時は 500 を返して Stripe の再送に乗せる
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { fulfillPaidOrder } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    console.error("[stripe webhook] STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET が未設定のため拒否しました");
    return new Response("webhook not configured", { status: 500 });
  }
  if (!sig) {
    console.error("[stripe webhook] stripe-signature ヘッダのないリクエストを拒否しました");
    return new Response("missing signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error("[stripe webhook] 署名検証に失敗:", e instanceof Error ? e.message : e);
    return new Response("invalid signature", { status: 400 });
  }

  // 冪等化：処理済みイベントは何もせず 200（Stripeダッシュボードからの再送・リトライ対策）
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return new Response("duplicate");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // 非同期決済（コンビニ等）を有効化した場合、入金前に有効化しない
        if (session.payment_status !== "paid") break;

        // 一回払い（掲載オプション・紹介クレジット）：注文IDで履行
        const billingOrderId = session.metadata?.billingOrderId;
        if (billingOrderId) {
          await fulfillPaidOrder(billingOrderId, idOf(session.payment_intent as string | { id: string } | null));
          break;
        }

        // 月額会員サブスク
        const memberId = session.metadata?.memberId;
        if (!memberId) break;
        await markPaid(memberId, {
          customerId: idOf(session.customer),
          subscriptionId: idOf(session.subscription),
        });
        break;
      }
      case "charge.refunded": {
        // 一回払いの返金を注文へ同期（Stripe Dashboardからの返金も反映）
        const charge = event.data.object as Stripe.Charge;
        const pi = idOf(charge.payment_intent as string | { id: string } | null);
        if (pi) {
          await prisma.billingOrder.updateMany({
            where: { stripePaymentIntentId: pi },
            data: { status: "refunded", refundedAt: new Date() },
          });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const memberId = await memberIdFromInvoice(invoice);
        if (memberId) await markPaid(memberId, { customerId: idOf(invoice.customer) });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const memberId = await memberIdFromInvoice(invoice);
        if (memberId) {
          await prisma.member.updateMany({
            where: { id: memberId },
            data: { paymentStatus: "UNPAID" },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const memberId =
          sub.metadata?.memberId || (await memberIdFromCustomer(idOf(sub.customer)));
        if (!memberId) break;
        if (sub.status === "active" || sub.status === "trialing") {
          await markPaid(memberId, { customerId: idOf(sub.customer), subscriptionId: sub.id });
        } else if (
          sub.status === "past_due" ||
          sub.status === "unpaid" ||
          sub.status === "incomplete_expired" ||
          sub.status === "canceled"
        ) {
          await prisma.member.updateMany({
            where: { id: memberId },
            data: { paymentStatus: "UNPAID" },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const memberId =
          sub.metadata?.memberId || (await memberIdFromCustomer(idOf(sub.customer)));
        if (memberId) {
          await prisma.member.updateMany({
            where: { id: memberId },
            data: { paymentStatus: "UNPAID", stripeSubscriptionId: null },
          });
        }
        break;
      }
    }
  } catch (e) {
    console.error("[stripe webhook] 処理失敗:", e);
    // 記録を消して Stripe の再送でリトライできるようにする
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    return new Response("processing error", { status: 500 });
  }

  return new Response("ok");
}

function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

async function memberIdFromCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const m = await prisma.member.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return m?.id ?? null;
}

/** Invoice から会員を特定する。
 * 注意：Invoice 本体の metadata にはサブスクの metadata はコピーされないため、
 * subscription_details.metadata（APIバージョンにより parent 配下）→ 保存済み顧客ID の順で解決する。 */
async function memberIdFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
  const inv = invoice as unknown as {
    subscription_details?: { metadata?: Record<string, string> | null } | null;
    parent?: { subscription_details?: { metadata?: Record<string, string> | null } | null } | null;
  };
  const fromMeta =
    inv.subscription_details?.metadata?.memberId ??
    inv.parent?.subscription_details?.metadata?.memberId;
  if (fromMeta) return fromMeta;
  return memberIdFromCustomer(idOf(invoice.customer));
}

/** 支払い反映。SUSPENDED / REJECTED は決済イベントで勝手に復活させない。 */
async function markPaid(
  memberId: string,
  ids: { customerId?: string | null; subscriptionId?: string | null }
): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { status: true },
  });
  if (!member) return;
  const canApprove = member.status !== "SUSPENDED" && member.status !== "REJECTED";
  await prisma.member.update({
    where: { id: memberId },
    data: {
      paymentStatus: "PAID",
      ...(ids.customerId ? { stripeCustomerId: ids.customerId } : {}),
      ...(ids.subscriptionId ? { stripeSubscriptionId: ids.subscriptionId } : {}),
      ...(canApprove ? { status: "APPROVED" as const } : {}),
    },
  });
}
