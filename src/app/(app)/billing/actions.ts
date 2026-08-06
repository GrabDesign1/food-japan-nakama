"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { stripe, PLANS } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type CheckoutState = { error?: string };

export async function startCheckout(
  planCode: string,
  _prev: CheckoutState,
  _formData: FormData
): Promise<CheckoutState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  const plan = PLANS.find((p) => p.code === planCode);
  if (!plan || plan.amount == null || plan.amount === 0) {
    return { error: "このプランはオンライン決済の対象外です（フリー/個別見積）。" };
  }
  if (!stripe) {
    return { error: "決済（Stripe）が未設定です。事務局にお問い合わせください。" };
  }

  const me = await getOrCreateMemberForUser(su);

  let url: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: { name: `FOOD JAPAN NAKAMA ${plan.name}プラン` },
            unit_amount: plan.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      customer_email: su.app.email,
      success_url: `${APP_URL}/billing?success=1`,
      cancel_url: `${APP_URL}/billing`,
      metadata: { memberId: me.id, planCode },
      // 解約(subscription.deleted)時にも会員を特定できるよう、サブスク側にもIDを付与
      subscription_data: { metadata: { memberId: me.id, planCode } },
    });
    url = session.url;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "決済の開始に失敗しました。" };
  }

  if (url) redirect(url);
  return { error: "決済URLの取得に失敗しました。" };
}
