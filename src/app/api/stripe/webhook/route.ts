// Stripe Webhook（課金状態の正）。
// - フェイルクローズ：シークレット未設定・署名なし・検証失敗はすべて拒否する
// - 冪等化：event.id を stripe_events に記録し、同じイベントは一度だけ処理する
// - 処理失敗時は 500 を返して Stripe の再送に乗せる
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { fulfillPaidOrder, revokeRefundedOrder } from "@/lib/billing";

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

  // 冪等化：処理済みイベントは何もせず 200（Stripeダッシュボードからの再送・リトライ対策）。
  // ただし「受信は記録したが処理は未完（タイムアウト・強制終了）」の行は再送で処理し直す。
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (e) {
    const isDuplicate =
      typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
    if (!isDuplicate) {
      // DB障害を「処理済み」と誤認すると、課金済みなのに永久に未履行になる。再送に乗せる。
      console.error("[stripe webhook] イベント記録に失敗（再送させます）:", e);
      return new Response("record error", { status: 500 });
    }
    const known = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
    if (known?.processedAt) return new Response("duplicate");
    // 未処理のまま残っている＝前回取りこぼした。このまま処理へ進む。
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // 非同期決済（コンビニ等）を有効化した場合、入金前に有効化しない
        if (session.payment_status !== "paid") break;

        // 一回払い（掲載オプション・紹介クレジット）：注文IDで履行。金額はサーバー側で突合する
        const billingOrderId = session.metadata?.billingOrderId;
        if (billingOrderId) {
          await fulfillPaidOrder(
            billingOrderId,
            idOf(session.payment_intent as string | { id: string } | null),
            {
              amountTotal: session.amount_total ?? null,
              currency: session.currency ?? null,
              sessionId: session.id,
            }
          );
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
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const billingOrderId = session.metadata?.billingOrderId;
        if (billingOrderId) {
          await prisma.billingOrder.updateMany({
            where: { id: billingOrderId, status: "pending_payment" },
            data: {
              status: event.type === "checkout.session.expired" ? "cancelled" : "payment_failed",
              cancelledAt: new Date(),
            },
          });
        }
        break;
      }
      case "charge.refunded":
      case "charge.dispute.created": {
        // 返金・チャージバックは注文の状態だけでなく、付与済みの効果も取り消す
        const pi =
          event.type === "charge.refunded"
            ? idOf((event.data.object as Stripe.Charge).payment_intent as string | { id: string } | null)
            : idOf(
                (event.data.object as Stripe.Dispute).payment_intent as string | { id: string } | null
              );
        if (!pi) break;
        if (event.type === "charge.refunded") {
          // 部分返金では取り消さない（全額返金のみ）
          const charge = event.data.object as Stripe.Charge;
          if (charge.amount_refunded < charge.amount) {
            console.warn(`[stripe webhook] 部分返金のため効果は維持します pi=${pi}`);
            break;
          }
        }
        await revokeRefundedOrder(pi, event.type === "charge.refunded" ? "refund" : "dispute");
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // 自社の月額プラン（NAKAMA Premium）の請求書に限る。
        // 金額を見ずに昇格させると、割引コードや手動発行の少額請求で特典を得られてしまう。
        if (!isPremiumInvoice(invoice)) {
          console.warn(`[stripe webhook] 対象外のinvoice.paidを無視しました invoice=${invoice.id}`);
          break;
        }
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

  // 処理完了の印。これが無い記録は「受信のみ」とみなし、再送で処理し直す
  await prisma.stripeEvent
    .update({ where: { id: event.id }, data: { processedAt: new Date() } })
    .catch((e) => console.error("[stripe webhook] processedAtの記録に失敗:", e));

  return new Response("ok");
}

/** 自社の月額プラン（NAKAMA Premium）の請求書か。金額と定期課金であることの両方で判定する。 */
function isPremiumInvoice(invoice: Stripe.Invoice): boolean {
  const expected = PLANS.find((p) => p.code === "nakama")?.amount ?? null;
  if (expected === null) return false;
  const inv = invoice as unknown as {
    subscription?: unknown;
    parent?: { subscription_details?: unknown } | null;
  };
  const isSubscription = !!inv.subscription || !!inv.parent?.subscription_details;
  if (!isSubscription) return false;
  const paid = invoice.amount_paid ?? 0;
  if (paid !== expected) {
    console.warn(
      `[stripe webhook] 請求額が月額プランと一致しません invoice=${invoice.id} paid=${paid} expected=${expected}`
    );
    return false;
  }
  return (invoice.currency ?? "jpy").toLowerCase() === "jpy";
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

/** 支払い反映。SUSPENDED / REJECTED は決済イベントで勝手に復活させない。
 * 事務局の審査は決済で飛ばさない：APPROVED になるのは「承認済み・課金待ち（AWAITING_PAYMENT）」からのみ。
 * DRAFT / PENDING は課金状態だけ更新し、審査待ちのまま残す。 */
async function markPaid(
  memberId: string,
  ids: { customerId?: string | null; subscriptionId?: string | null }
): Promise<void> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { status: true },
  });
  if (!member) return;
  const canApprove = member.status === "AWAITING_PAYMENT";
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
