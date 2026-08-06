"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { stripe, PLANS } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type CheckoutState = { error?: string };
export type PortalState = { error?: string };

/** Stripeカスタマーポータルを開く（解約・領収書・カード変更などを会員自身が行える）。 */
export async function openBillingPortal(
  _prev: PortalState,
  _formData: FormData
): Promise<PortalState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインが必要です。" };
  if (!stripe) return { error: "決済（Stripe）が未設定です。" };

  let url: string;
  try {
    // 会員のメールからStripe顧客を特定
    const customers = await stripe.customers.list({ email: su.app.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return { error: "お支払い情報が見つかりません（まだご契約がない可能性があります）。" };
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${APP_URL}/billing`,
    });
    url = session.url;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "お支払い管理ページを開けませんでした。" };
  }

  redirect(url);
}

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
      allow_promotion_codes: true, // 決済画面でクーポン（プロモーションコード）入力を可能にする
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
