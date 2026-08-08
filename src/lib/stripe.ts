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

// NAKAMA 月額会員（単一プラン）。¥20,000税抜＝¥22,000税込。
export const PLANS: Plan[] = [
  {
    code: "nakama",
    name: "NAKAMA 月額会員",
    amount: 22000,
    unit: "月",
    tagline: "出会い・営業・マッチング・学び",
    features: [
      "自社プロフィール・案件（売りたい／買いたい／共創）の掲載",
      "掲載案件の詳細閲覧",
      "会員へのメッセージ・問い合わせ",
      "会員向けセミナーへの参加",
      "Food Japan Summit ネットワークとの接点",
    ],
  },
];
