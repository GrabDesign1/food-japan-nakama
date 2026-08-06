// Stripe クライアントとプラン定義。STRIPE_SECRET_KEY 未設定なら stripe は null。
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = key ? new Stripe(key) : null;

export type Plan = {
  code: string;
  name: string;
  amount: number | null; // 月額（税別）。null は個別見積
  unit: string; // 単位表記（月 / 団体・月額 など）
  tagline?: string;
  features: string[];
};

// プラン構成（フリー ＋ 共創コミュニティ の2つ）
export const PLANS: Plan[] = [
  {
    code: "free",
    name: "フリー",
    amount: 0,
    unit: "月",
    tagline: "まずは無料で始める",
    features: ["台帳4件", "案件1件", "興味送信は有償"],
  },
  {
    code: "community",
    name: "共創コミュニティ",
    amount: 30000,
    unit: "団体・月額",
    tagline: "年間を通じて共創コミュニティに属する",
    features: [
      "365日機能する共創関係（月次定例ミーティング）",
      "事例・知見の高速循環（成功も失敗も共有）",
      "優先マッチング（新規生産者・パートナー紹介の優先権）",
      "月1回の共創会議に参加",
      "共創ナビ（メディア）閲覧",
      "1団体あたり2名まで登録",
      "年間アクセラレータープログラム参加",
    ],
  },
];
