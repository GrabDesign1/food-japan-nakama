// Stripe クライアントとプラン定義。STRIPE_SECRET_KEY 未設定なら stripe は null。
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = key ? new Stripe(key) : null;

export type Plan = {
  code: string;
  name: string;
  amount: number | null; // 月額（税込・円）。JPYはゼロ小数なのでStripe unit_amountと同値。null は個別見積
  unit: string; // 単位表記（月 など）
  tagline?: string;
  features: string[];
};

// NAKAMAビジネス会員（任意プラン）。¥20,000税抜＝¥22,000税込。
// 基本利用（登録・掲載・応募・メッセージ）は無料。会員特典は毎月20件の提案チケット（繰越なし）と
// 追加チケット・掲載オプションの20%割引（2026-08-11確定。提案無制限は撤回）。
export const PLANS: Plan[] = [
  {
    code: "nakama",
    name: "NAKAMAビジネス会員",
    amount: 22000,
    unit: "月",
    tagline: "毎月20件の提案で、営業を積み上げる",
    features: [
      "毎月20件の提案チケット（「仕入れ・調達したいもの」案件への初回提案に使えます。繰越はありません）",
      "追加の提案チケットが20%割引",
      "掲載オプション（注目表示・最上部PR・急募・条件一致通知など）が20%割引",
      "Food Japan Summit ネットワークとの接点",
    ],
  },
];
