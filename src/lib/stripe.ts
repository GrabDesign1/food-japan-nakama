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

// NAKAMA 月額会員（任意プラン）。¥20,000税抜＝¥22,000税込。
// 基本利用（登録・掲載・応募・メッセージ）は無料。会員特典は提案無制限＋オプション割引（2026-08-10確定）。
export const PLANS: Plan[] = [
  {
    code: "nakama",
    name: "NAKAMA 月額会員",
    amount: 22000,
    unit: "月",
    tagline: "提案し放題で、営業を加速する",
    features: [
      "「探している」案件への初回提案が無制限（通常案件・優良案件とも）",
      "掲載オプション（注目表示・最上部PR・急募・条件一致通知など）が20%割引",
      "会員向けセミナーへの参加",
      "Food Japan Summit ネットワークとの接点",
    ],
  },
];
