// Food Japan Summit 2026 in MIYAZAKI 協賛申込フォームの定義。
//
// ⚠️ これは NAKAMA の機能ではなく、サミットの協賛申込を受けるだけの独立したフォーム。
//    NAKAMA 側からリンクは張らない（URLを直接案内して使う。ユーザー指示 2026-08-17）。
// ⚠️ サーバー依存を持たせないこと（クライアントの入力フォームからも import する）。
// ⚠️ 金額は**すべて税別**（NAKAMA本体は税込表記なので混同しないこと）。

export const SUMMIT = {
  title: "Food Japan Summit 2026 in MIYAZAKI",
  dates: "2026年11月17日（火）・18日（水）",
  venue: "宮崎観光ホテル",
  host: "フードジャパンサミット実行委員会（株式会社グラブデザイン）",
} as const;

/** 申込の受付先。両方に同じ内容を送る。 */
export const SPONSOR_INBOX = ["info@grab-design.com", "umetaku@grab-design.com"];

export type SponsorPlan = {
  code: string;
  name: string;
  /** 宮崎開催 協賛プランの価格（税別・円） */
  price: number;
  /** 宮崎県法人 特別割の価格（税別・円）。通常と同額のものもある */
  localPrice: number;
  features: string[];
  note?: string;
};

export const SPONSOR_PLANS: SponsorPlan[] = [
  {
    code: "light",
    name: "LIGHT",
    price: 150000,
    localPrice: 150000,
    features: [
      "カンファレンスパス 1名",
      "ネットワーキングパーティ 1名",
      "協賛ロゴ掲載",
      "FOOD JAPAN NAKAMA掲載",
    ],
    note: "宿泊はご自身でご手配ください。",
  },
  {
    code: "standard",
    name: "STANDARD",
    price: 300000,
    localPrice: 300000,
    features: [
      "カンファレンスパス 2名",
      "ネットワーキングパーティ 2名",
      "試食会・スナック交流への参加",
      "協賛ロゴ掲載",
      "コワーキングルーム使用",
      "試食、チラシ、ノベルティの配布",
      "FOOD JAPAN NAKAMA掲載",
    ],
    note: "宿泊はご自身でご手配ください。",
  },
  {
    code: "presenter",
    name: "PRESENTER",
    price: 500000,
    localPrice: 400000,
    features: [
      "カンファレンスパス 2名",
      "ネットワーキングパーティ 2名",
      "宿泊付き",
      "30分間の協賛プレゼンテーション枠",
      "商談候補者の優先紹介・面談調整",
      "協賛ロゴ掲載",
      "コワーキングルーム使用",
      "試食、チラシ、ノベルティの配布",
      "FOOD JAPAN NAKAMAでの事業者・共創テーマ掲載",
    ],
  },
  {
    code: "strategic",
    name: "STRATEGIC",
    price: 800000,
    localPrice: 700000,
    features: [
      "カンファレンスパス 3名",
      "ネットワーキングパーティ 3名",
      "宿泊付き",
      "60分間の協賛プレゼンテーション枠",
      "商談候補者の優先紹介・面談調整",
      "協賛ロゴ掲載",
      "コワーキングルーム使用",
      "試食、チラシ、ノベルティの配布",
      "FOOD JAPAN NAKAMAでの事業者・共創テーマ掲載",
    ],
  },
  {
    code: "diamond",
    name: "DIAMOND PARTNER",
    price: 2500000,
    localPrice: 2000000,
    features: [
      "ネットワーキングパーティ参加",
      "テーマセッション主催",
      "共催ブランディング",
      "新規事業の共同設計",
      "60分間の協賛プレゼンテーション枠",
      "全プランの特典",
      "実行委員会への参加",
      "FOOD JAPAN NAKAMAでの共創プロジェクト特集掲載",
    ],
  },
];

/** 「内容を相談して決めたい」＝プランを選ばない場合の値 */
export const PLAN_CONSULT = "consult";

export function planLabel(code: string, isLocal: boolean): string {
  if (code === PLAN_CONSULT) return "内容を相談して決めたい";
  const p = SPONSOR_PLANS.find((x) => x.code === code);
  if (!p) return code;
  return `${p.name}　${yen(isLocal ? p.localPrice : p.price)}（税別）`;
}

export function yen(n: number): string {
  return `${(n / 10000).toLocaleString("ja-JP")}万円`;
}

/** 設問1｜申込区分。宮崎県法人のチェックの有無で先頭の選択肢が入れ替わる。 */
export const ENTRY_MIYAZAKI = "miyazaki_plan";
export const ENTRY_LOCAL = "miyazaki_local_plan";
export const ENTRY_ANNUAL = "annual_member";
export const ENTRY_CONSULT = "consult";

export const ENTRY_LABEL: Record<string, string> = {
  [ENTRY_MIYAZAKI]: "宮崎開催 協賛プラン",
  [ENTRY_LOCAL]: "宮崎県法人 特別割協賛プラン",
  [ENTRY_ANNUAL]: "年間会員もあわせて相談したい",
  [ENTRY_CONSULT]: "協賛内容を相談して決めたい",
};

export const CO_CREATION_THEMES = [
  "食×環境",
  "食×科学",
  "食×加工",
  "食×教育",
  "食×人材",
  "食×流通",
  "地域ブランディング",
  "食品ロス",
  "商品開発",
  "販路開拓",
  "その他",
];

export const DESIRED_BENEFITS = [
  "登壇・協賛プレゼンテーション",
  "試食・試飲・展示",
  "チラシ・ノベルティ配布",
  "商談候補者の紹介・面談調整",
  "生産者・食品メーカー・小売・行政との共創相談",
  "FOOD JAPAN NAKAMAへの掲載",
  "特に希望はない",
  "その他",
];

export const LOGO_SUBMISSION = [
  "申込後、事務局からの案内に従いメールで提出する",
  "すでに事務局へ提出済み",
  "後日相談したい",
];

export const CONSENTS = [
  "申込内容を確認後、事務局から協賛内容・請求・今後の進行について連絡することに同意します。",
  "協賛ロゴ、社名、掲載内容の使用について、事務局との確認のうえ進めることに同意します。",
  "商談候補者の紹介および面談調整は、相手方の同意を得た範囲で行われることを承諾します。",
];

export const COMMON_BENEFITS = [
  "Food Japan Summit 2026 in MIYAZAKIの協賛企業として、会場および関連媒体に社名またはロゴを掲載します。",
  "FOOD JAPAN NAKAMAに協賛企業情報を掲載します。",
  "生産者、企業、自治体などとの共創・商談につながる機会を提供します。",
  "紹介および面談調整は、相手方の同意を得たうえで行います。",
  "協賛内容の詳細、登壇・展示・試食の時間帯や方法は、会場運営上の都合により事務局と個別に調整します。",
];
