// Stripe Webhook。支払い完了で会員の課金状態を PAID に更新する。
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!stripe) return new Response("stripe not configured", { status: 200 });

  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (secret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, secret);
    } else {
      event = JSON.parse(body) as Stripe.Event; // 署名シークレット未設定時（開発用）
    }
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "invoice.paid"
    ) {
      const obj = event.data.object as { metadata?: Record<string, string> | null };
      const memberId = obj.metadata?.memberId;
      if (memberId) {
        await prisma.member.update({
          where: { id: memberId },
          data: { paymentStatus: "PAID", status: "APPROVED" },
        });
      }
    } else if (event.type === "customer.subscription.deleted") {
      const obj = event.data.object as { metadata?: Record<string, string> | null };
      const memberId = obj.metadata?.memberId;
      if (memberId) {
        await prisma.member.update({
          where: { id: memberId },
          data: { paymentStatus: "UNPAID" },
        });
      }
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
  }

  return new Response("ok");
}
