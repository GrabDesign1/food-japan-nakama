// Food Japan Summit 2026 協賛申込フォームの定義。
//
// ⚠️ これは NAKAMA の機能ではなく、サミットの協賛申込を受けるだけの独立したフォーム。
//    NAKAMA 側からリンクは張らない（URLを直接案内して使う。ユーザー指示 2026-08-17）。
// ⚠️ サーバー依存を持たせないこと（クライアントの入力フォームからも import する）。
// ⚠️ 金額は**すべて税別**（NAKAMA本体は税込表記なので混同しないこと）。
//
// 出典＝2026_宮崎_協賛募集資料_JapanFoodSummit.pdf（p.9 宮崎のみ／愛知のみ、p.10 両開催、
// p.11 宮崎県法人特別割、p.13 年間会員）＋ユーザー提供のフォーム文面（2026-08-17）。
// **PDFで裏が取れる範囲でユーザー文面の抜けを補っている**（下の「※」コメント参照）。

export const SUMMIT_TITLE = "Food Japan Summit 2026";

export const VENUES = {
  miyazaki: { label: "宮崎開催", dates: "2026年11月17日（火）・18日（水）", venue: "宮崎観光ホテル" },
  nagoya: { label: "名古屋開催", dates: "2026年12月15日（火）・16日（水）", venue: "名鉄グランドホテル" },
} as const;

export const HOST = "フードジャパンサミット実行委員会（株式会社グラブデザイン）";

/** 申込の受付先。両方に同じ内容を送る。 */
export const SPONSOR_INBOX = ["info@grab-design.com", "umetaku@grab-design.com"];

export type SponsorPlan = {
  code: string;
  name: string;
  /** 税別・円 */
  price: number;
  features: string[];
  note?: string;
};

export type Course = {
  code: string;
  /** 設問1のラジオに出す文言 */
  label: string;
  /** プラン一覧の見出し */
  heading: string;
  /** 見出し下の説明 */
  lead?: string;
  /** 対象の開催（日程・会場を出す） */
  venues: { label: string; dates: string; venue: string }[];
  plans: SponsorPlan[];
  /**
   * 宮崎県法人の特別割価格。**宮崎開催のみに用意する**（PDF p.11「宮崎開催に限り」）。
   * これがあるコースでだけ、フォームに特別割のチェックボックスを出す。
   */
  localPlans?: SponsorPlan[];
  localLead?: string;
  /** プランを出さない選択肢（相談）は plans: [] */
};

// ── 各プランで共通して付く特典（PDF p.9〜11 で全プランに並んでいるもの）──
const LOGO = "協賛ロゴ掲載";
const NAKAMA = "FOOD JAPAN NAKAMA掲載";
const NAKAMA_THEME = "FOOD JAPAN NAKAMAでの事業者・共創テーマ掲載";
const NAKAMA_FEATURE = "FOOD JAPAN NAKAMAでの共創プロジェクト特集掲載";
const COWORK = "コワーキングルーム使用";
const HANDOUT = "試食・チラシ・ノベルティの配布";
const ATTENDEE_LIST = "参加後の参加者リストのご提供"; // ※PDF p.9〜11 の PRESENTER 以上にあり。ユーザー文面では抜けていたので補った
const MATCHING = "商談候補者の優先紹介・面談調整";
const SELF_STAY = "宿泊はご自身でご手配ください。";

const DIAMOND_BASE = [
  "テーマセッション主催",
  "共催ブランディング",
  "新規事業の共同設計",
  "60分間の協賛プレゼンテーション枠",
  "全プランの特典",
  "実行委員会への参加",
];

/** 単独開催（宮崎のみ／名古屋のみ）のプラン。宿泊の有無だけが違う。 */
function singleVenuePlans(withStay: boolean): SponsorPlan[] {
  return [
    {
      code: "light",
      name: "LIGHT",
      price: 150000,
      features: ["カンファレンスパス 1名", "ネットワーキングパーティ 1名", LOGO, NAKAMA],
      note: SELF_STAY,
    },
    {
      code: "standard",
      name: "STANDARD",
      price: 300000,
      features: [
        "カンファレンスパス 2名",
        "ネットワーキングパーティ 2名",
        "試食会・スナック交流",
        LOGO,
        COWORK,
        HANDOUT,
        NAKAMA,
      ],
      note: SELF_STAY,
    },
    {
      code: "presenter",
      name: "PRESENTER",
      price: 500000,
      features: [
        "カンファレンスパス 2名",
        "ネットワーキングパーティ 2名",
        ...(withStay ? ["宿泊付き"] : []),
        "30分間の協賛プレゼンテーション枠",
        MATCHING,
        LOGO, // ※ユーザー文面では抜けていたが PDF p.9 にあるので補った
        COWORK, // ※同上
        HANDOUT,
        ATTENDEE_LIST,
        NAKAMA_THEME,
      ],
      note: withStay ? undefined : SELF_STAY,
    },
    {
      code: "strategic",
      name: "STRATEGIC",
      price: 800000,
      features: [
        "カンファレンスパス 3名",
        "ネットワーキングパーティ 3名",
        ...(withStay ? ["宿泊付き"] : []),
        "60分間の協賛プレゼンテーション枠",
        MATCHING,
        LOGO, // ※同上
        COWORK, // ※同上
        HANDOUT,
        ATTENDEE_LIST,
        NAKAMA_THEME,
      ],
      note: withStay ? undefined : SELF_STAY,
    },
    {
      code: "diamond",
      name: "DIAMOND PARTNER",
      price: 2500000,
      features: [...DIAMOND_BASE, NAKAMA_FEATURE],
    },
  ];
}

/**
 * 宮崎県法人 特別割の価格（税別・円）。**特典は通常の宮崎開催プランと同一で、価格だけが違う**。
 * LIGHT と STANDARD は通常と同額（割引なし）。
 */
const LOCAL_DISCOUNT_PRICES: Record<string, number> = {
  light: 150000,
  standard: 300000,
  presenter: 400000,
  strategic: 700000,
  diamond: 2000000,
};

export const COURSES: Course[] = [
  {
    code: "miyazaki",
    label: "宮崎開催のみ",
    heading: "宮崎開催のみへの協賛",
    venues: [VENUES.miyazaki],
    plans: singleVenuePlans(true),
    // ⚠️ 特別割は**特典の内容が宮崎開催プランと同一で、価格だけが違う**（ユーザー確定 2026-08-17）。
    //    だから通常プランから価格だけ差し替えて作る。特典を別々に書くと必ず食い違う。
    //    PDF p.11 はカンファレンスパスが1名/3名/4名となっていたが、これは資料側の誤りとして扱う
    //    （同額のSTANDARDで通常2名に対し1名、値引きされたPRESENTERで通常2名に対し3名と逆転していた）。
    localPlans: singleVenuePlans(true).map((p) => ({
      ...p,
      price: LOCAL_DISCOUNT_PRICES[p.code] ?? p.price,
    })),
    localLead:
      "宮崎県内に本店または主たる事業所を置く法人は、宮崎開催に限り特別割価格でお申し込みいただけます。特典の内容は宮崎開催協賛プランと同じで、PRESENTER・STRATEGIC・DIAMOND PARTNERの価格が割引されます。",
  },
  {
    code: "nagoya",
    label: "名古屋開催のみ",
    heading: "名古屋開催のみへの協賛",
    venues: [VENUES.nagoya],
    plans: singleVenuePlans(false),
  },
  {
    code: "both",
    label: "宮崎・名古屋の両開催",
    heading: "宮崎・名古屋の両開催への協賛",
    lead: "両開催に協賛いただく企業向けのプランです。両会場での発信、登壇、商談、共創機会を通じて、継続的な事業づくりにつなげます。",
    venues: [VENUES.miyazaki, VENUES.nagoya],
    plans: [
      {
        code: "light",
        name: "LIGHT",
        price: 200000,
        features: [
          "両開催のカンファレンスパス 各1名",
          "両開催のネットワーキングパーティ 各1名",
          LOGO,
          NAKAMA,
        ],
        note: SELF_STAY,
      },
      {
        code: "standard",
        name: "STANDARD",
        price: 500000,
        features: [
          "両開催のカンファレンスパス 各2名",
          "両開催のネットワーキングパーティ 各2名",
          "試食会・スナック交流",
          LOGO,
          COWORK,
          NAKAMA,
        ],
        note: SELF_STAY,
      },
      {
        code: "presenter",
        name: "PRESENTER",
        price: 800000,
        features: [
          "両開催のカンファレンスパス 各2名",
          "両開催のネットワーキングパーティ 各2名",
          "宮崎開催の宿泊・朝食付き",
          "30分間の協賛プレゼンテーション枠",
          MATCHING,
          LOGO,
          COWORK,
          HANDOUT,
          ATTENDEE_LIST,
          NAKAMA_THEME,
        ],
      },
      {
        code: "strategic",
        name: "STRATEGIC",
        price: 1200000,
        features: [
          "両開催のカンファレンスパス 各3名",
          "両開催のネットワーキングパーティ 各3名",
          "宮崎開催の宿泊・朝食付き",
          "60分間の協賛プレゼンテーション枠",
          "メインセッション冠",
          MATCHING,
          LOGO,
          COWORK,
          HANDOUT,
          ATTENDEE_LIST,
          NAKAMA_THEME,
        ],
      },
      {
        code: "diamond",
        name: "DIAMOND PARTNER",
        price: 4000000,
        features: [...DIAMOND_BASE, "プログラム優待", "セッション枠優待", NAKAMA_FEATURE],
      },
    ],
  },
  {
    code: "consult",
    label: "内容を相談して決めたい",
    heading: "内容を相談して決めたい",
    lead: "ご希望の開催、予算、実現したいことをうかがったうえで、事務局から協賛内容をご提案します。下の設問にお答えください。",
    venues: [VENUES.miyazaki, VENUES.nagoya],
    plans: [],
  },
];

/** 「内容を相談して決めたい」＝プランを選ばない場合の値 */
export const PLAN_CONSULT = "consult";

export function findCourse(code: string): Course | undefined {
  return COURSES.find((c) => c.code === code);
}

export function yen(n: number): string {
  return `${(n / 10000).toLocaleString("ja-JP")}万円`;
}

/** 特別割にチェックが入っているときは、そちらの価格表を使う。 */
export function plansFor(course: Course, isLocal: boolean): SponsorPlan[] {
  return isLocal && course.localPlans ? course.localPlans : course.plans;
}

export function planLabel(courseCode: string, planCode: string, isLocal: boolean): string {
  const c = findCourse(courseCode);
  if (!c) return planCode;
  const suffix = isLocal ? "（宮崎県法人 特別割）" : "";
  if (planCode === PLAN_CONSULT) return `${c.label}${suffix}／内容を相談して決めたい`;
  const p = plansFor(c, isLocal).find((x) => x.code === planCode);
  if (!p) return planCode;
  return `${c.label}${suffix}／${p.name}　${yen(p.price)}（税別）`;
}

/** 特別割のチェックを出すコードか（宮崎開催のみ） */
export const LOCAL_DISCOUNT_COURSE = "miyazaki";
export const LOCAL_DISCOUNT_LABEL = "宮崎県内に本店または主たる事業所を置く法人";

/** 年間会員（協賛プランとの併用可。PDF p.13） */
export const ANNUAL_MEMBER = {
  label: "年間会員もあわせて相談したい",
  detail: "月額30,000円（税別）／1団体あたり2名まで登録。月例ミーティング、年間アクセラレータープログラム、優先マッチング。協賛プランとの併用ができます。",
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
  "Food Japan Summitの協賛企業として、会場および関連媒体に社名またはロゴを掲載します。",
  "FOOD JAPAN NAKAMAに協賛企業情報を掲載します。",
  "生産者、食品メーカー、小売・流通、飲食、行政などとの共創・商談につながる機会を提供します。",
  "紹介および面談調整は、相手方の同意を得たうえで行います。",
  "登壇、展示、試食・試飲、商談設定の内容・時間帯は、会場運営上の都合により事務局と個別に調整します。",
];
