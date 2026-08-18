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

/** FOOD JAPAN NAKAMA のトップ。協賛ページ・申込フォームの両方から参照する。
 *  ⚠️ **必ず別タブで開くこと**（ユーザー指示 2026-08-18）。申込フォームは下書き保存を
 *     持たないので、同じタブで移動すると入力中の内容がすべて消える。 */
export const NAKAMA_URL = "https://nakama.food-japan-summit.jp/";

/** 開催概要（ユーザー提供の資料 2026-08-18「Food Japan Summit 宮崎／TechGALA 開催概要」）。
 *  ⚠️ 時間は「時間調整中」と資料に明記されているので、その但し書きを落とさないこと。
 *  ⚠️ 名古屋の会場は資料上「（予定）」付き。VENUES.nagoya.venue（申込メール等で使う簡易表記）
 *     には付いていないので、**ここだけ（予定）を書く**という食い違いを承知で保持している。
 *  ⚠️ 来場数目標は /sponsor のFIGURES帯にも出している。片方だけ直すとページ内で矛盾する。 */
export type OutlineRow = { label: string; lines: string[] };
export const EVENT_OUTLINE: { key: string; title: string; rows: OutlineRow[] }[] = [
  {
    key: "miyazaki",
    title: "Food Japan Summit 宮崎",
    rows: [
      {
        label: "開催日時",
        lines: [
          "2026年11月17日（火）〜18日（水）",
          "1日目 9:30〜21:00（時間調整中）",
          "2日目フィールドワーク 9:30〜17:00",
        ],
      },
      {
        label: "来場者ターゲット",
        lines: [
          "生産者（農業・漁業・畜産・酪農）",
          "食品メーカー・酒造・飲料メーカー",
          "流通・小売（スーパー・卸・商社・バイヤー）",
          "飲食・ホテル",
          "自治体・農林水産省・地域商社",
          "大学・研究機関・スタートアップ・マーケティング",
        ],
      },
      { label: "来場数目標", lines: ["200名〜300名"] },
      {
        label: "イベント会場",
        lines: [
          "宮崎観光ホテル 3階（大ホール収容人数：約400席）",
          "宮崎県宮崎市松山1-1-1",
          "大淀川を望むカンファレンス＆宿泊一体型",
        ],
      },
      { label: "イベントプログラム", lines: ["各種セミナー・ワークショップ・企業ブース出展など"] },
    ],
  },
  {
    key: "nagoya",
    title: "Food Japan Summit ✕TechGALA名古屋",
    rows: [
      {
        label: "開催日時",
        lines: [
          "2026年12月15日（火）〜16日（水）",
          "1日目 10:00〜21:00（時間調整中）",
          "2日目 9:30〜15:00",
        ],
      },
      {
        label: "来場者ターゲット",
        lines: [
          "東海地域の生産者（農業・漁業・畜産・酪農）",
          "食品メーカー・酒造・飲料メーカー",
          "流通・小売（スーパー・卸・商社・バイヤー）",
          "飲食・ホテル",
          "自治体・農林水産省・地域商社",
          "大学・研究機関・スタートアップ・マーケティング",
        ],
      },
      { label: "来場数目標", lines: ["400名〜500名"] },
      {
        label: "イベント会場",
        lines: [
          "名鉄グランドホテル（予定）",
          "〒450-0002 愛知県名古屋市中村区名駅1丁目2-4（名鉄百貨店本店内11F）",
          "JR／名鉄／近鉄／地下鉄「名古屋駅」直結",
        ],
      },
      { label: "イベントプログラム", lines: ["各種セミナー・ワークショップ・企業ブース出展など"] },
    ],
  },
];

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
// ⚠️「参加後の参加者リストのご提供」は**入れない**（2026-08-17 ユーザー指示で削除）。
//    共通価値の「参加者の同意を得た範囲で紹介・面談調整を行う」と矛盾し、
//    参加者名簿の第三者提供は個人データの提供にあたるため。PDF p.9〜11 には記載があるが採用しない。
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
          // ⚠️ 2026-08-17 に募集資料（マスターPPTX p.51）側で両開催のSTANDARDにも追加されたので合わせた。
          //    単独開催のSTANDARDには元からあり、上位プランで特典が減る形になっていた。
          HANDOUT,
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

// ── 申込の締め切り ────────────────────────────────
//
// ⚠️ **宮崎は 2026年11月17日を過ぎたら選べない**（ユーザー指示 2026-08-18）。
//    「17日を超えたら」＝**11月17日いっぱいは申し込めて、11月18日0時（JST）から締め切る**と解釈している。
// ⚠️ **両開催も同時に締め切る**＝宮崎を含むので、宮崎が終わったあとに両開催だけ売ることはできない。
// ⚠️ **名古屋と「相談して決めたい」は 2026年12月15日まで**（ユーザー指示 2026-08-18）。
//    これで全開催が締め切られるので、以降はページごと「協賛の募集が終了しました。」に切り替わる。
// ⚠️ 判定は**必ずJST**で行う（サーバーはUTCで動くので、素の getDate() を使うと日付が9時間ずれる）。
// ⚠️ /sponsor/apply は静的に生成されるページなので、**ビルド時刻で判定してはいけない**。
//    画面側はマウント後にブラウザの時計で判定し、**本当の関所はサーバーアクション**に置くこと。

/**
 * 開催コード → この日までは申し込める（YYYY-MM-DD・JST）。無い開催は締め切らない。
 * ⚠️ 名古屋と「相談して決めたい」は **2026年12月15日** まで（ユーザー指示 2026-08-18）。
 *    これで全部が締め切られるので、その後はフォームごと「協賛の募集が終了しました。」に差し替わる。
 */
const COURSE_CLOSE_AFTER: Record<string, string> = {
  miyazaki: "2026-11-17",
  both: "2026-11-17",
  nagoya: "2026-12-15",
  consult: "2026-12-15",
};

/** JSTでの「今日」を YYYY-MM-DD で返す（ISO形式なので文字列比較で日付を比べられる）。 */
export function todayJst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** その開催がまだ申し込めるか（JST基準。締切日当日は申し込める）。 */
export function isCourseOpen(courseCode: string, now: Date = new Date()): boolean {
  const close = COURSE_CLOSE_AFTER[courseCode];
  if (!close) return true;
  return todayJst(now) <= close;
}

/** 締め切った開催に出す文言。 */
export const COURSE_CLOSED_LABEL = "受付を終了しました";

/**
 * すべての開催が締め切られたか＝協賛の募集そのものが終了したか。
 * 個別の開催を灰色で並べるのではなく、フォームごと終了の知らせに差し替える。
 */
export function isApplicationClosed(now: Date = new Date()): boolean {
  return COURSES.every((c) => !isCourseOpen(c.code, now));
}

// ── 見積書 ────────────────────────────────────
//
// ⚠️ **PDFはサーバーに保存しない**。会員側の納品書・請求書（src/lib/invoice.ts）と同じ方針で、
//    HTMLで組んでブラウザの「PDFとして保存」で出してもらう。保存すると電子帳簿保存法の
//    検索機能・訂正削除防止の要件を負うため。PDFライブラリも入れない（日本語フォントの
//    埋め込みが不要になる）。
// ⚠️ 見積書の金額は**税抜・消費税・税込を並べて出す**。フォームの表示は税別なので、
//    見積書だけ税込を足して見せると食い違って見える。
// ⚠️ **適格請求書発行事業者の登録番号は載せていない**（番号を把握していないため）。
//    見積書に登録番号は必須ではないが、載せるなら実際の番号を確認してから足すこと。

export const QUOTE_TAX_RATE = 10;

/** 見積書の有効期限（発行日からの日数）。ユーザー指定 2026-08-18。 */
export const QUOTE_VALID_DAYS = 30;

/** 見積書の発行者。 */
export const ISSUER = {
  name: HOST,
  address: "〒102-0073 東京都千代田区九段北1-2-1",
  tel: "03-6825-3901",
  email: "info@grab-design.com",
};

export type QuoteItem = { label: string; note?: string; amount: number };

/**
 * 税抜の明細から合計を出す。
 * ⚠️ invoice.ts の `taxBreakdown()` は**税込から割り戻す**関数で向きが逆なので使えない。
 *    こちらは税抜から積み上げる。消費税は円未満切り捨て（税率1本なので端数処理は1回）。
 */
export function quoteTotals(items: QuoteItem[]): {
  rate: number;
  excluding: number;
  tax: number;
  including: number;
} {
  const excluding = items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.floor((excluding * QUOTE_TAX_RATE) / 100);
  return { rate: QUOTE_TAX_RATE, excluding, tax, including: excluding + tax };
}

/** 見積番号。EST-YYYYMMDD-XXXXXX。 */
export function quoteNo(issuedAt: Date, seed: string): string {
  const y = issuedAt.getFullYear();
  const m = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const d = String(issuedAt.getDate()).padStart(2, "0");
  return `EST-${y}${m}${d}-${seed.toUpperCase().slice(0, 6)}`;
}

/** 募集終了時に出す文言（ユーザー指定 2026-08-18）。 */
export const APPLICATION_CLOSED_TITLE = "協賛の募集が終了しました。";
export const APPLICATION_CLOSED_BODY =
  "Food Japan Summit 2026 の協賛のお申し込み受付は終了しました。次回開催や個別のご相談については、事務局までお問い合わせください。";

// ── 申込フォームのカードUI用（2026-08-18 の指示書。/sponsor 案内ページには影響させない）──
//
// ⚠️ 価格は開催で入れ替わる（単独15/30/50/80/250万・両開催20/50/80/120/400万・
//    特別割15/30/40/70/200万）ので、**カードに価格を書かず plansFor() から出す**。
//    ここに持たせるのは「開催が変わっても変わらないもの」＝プランの性格だけ。

/** カードの見出し下に置く1行要約（文言はユーザー提供・指示書 2026-08-18）。 */
export const PLAN_TAGLINE: Record<string, string> = {
  light: "まずは協賛企業として参加",
  standard: "商品を見てもらい、交流したい企業向け",
  presenter: "登壇して、自社の取り組みを伝える",
  strategic: "商談・共創をより本格的に進める",
  diamond: "協賛ではなく、共創プロジェクトを一緒につくる",
};

/**
 * 開催の短縮表記。スマホ下部の固定バーのように幅が取れない場所で使う
 * （「宮崎・名古屋の両開催」がそのままだと省略されて読めない）。
 */
export const COURSE_SHORT: Record<string, string> = {
  miyazaki: "宮崎",
  nagoya: "名古屋",
  both: "両開催",
  consult: "相談",
};

/**
 * 募集資料の料金表に合わせた番号と日本語の通称（ユーザー提供 2026-08-18）。
 * ⚠️ **送信値・メール本文で使うプラン名は `SponsorPlan.name`（LIGHT 等）のまま**。
 *    ここで足しているのは画面上の呼び方だけで、申込データの中身は変えていない。
 */
export const PLAN_NO: Record<string, string> = {
  light: "PLAN 01",
  standard: "PLAN 02",
  presenter: "PLAN 03",
  strategic: "PLAN 04",
  diamond: "PLAN 05",
};

export const PLAN_NICKNAME: Record<string, string> = {
  light: "協賛のみ",
  standard: "シルバー",
  presenter: "ゴールド",
  strategic: "プレミアム",
  diamond: "パートナー",
};

/**
 * プランごとのアクセント色。**CSS変数名だけを持つ**（色を直書きしない）。
 *
 * ⚠️ Tailwind のクラスを組み立てないこと。`bg-[var(${x})]` のように動的に作った文字列は
 *    ビルド時のスキャンに引っかからず**CSSが生成されない**（色が出ない）。
 *    使うときは inline style で `var(--xxx)` を渡す。
 * ⚠️ 上に行くほど強い色にして、価格の階段が色でも分かるようにしている。
 *    資料は DIAMOND に紫を使っているが、NAKAMA の変数に紫が無く、globals.css を
 *    触らない方針。**DIAMOND は深い緑**（ユーザー指定 2026-08-18）。
 */
export const PLAN_ACCENT: Record<string, string> = {
  light: "--muted",
  standard: "--ink-2",
  presenter: "--amber",
  strategic: "--action",
  diamond: "--green-d",
};

/** 数字だけ大きく見せたいので「50」と「万円」に分ける。 */
export function yenParts(n: number): { num: string; unit: string } {
  return { num: (n / 10000).toLocaleString("ja-JP"), unit: "万円" };
}

/**
 * 開催ごとの「おすすめ」プラン（ユーザー指定 2026-08-18）。
 *
 * ⚠️ **おすすめは開催で変わる**。プランコードだけで決めていた実装から直したので、
 *    ここを1つの表にまとめている。宮崎のみ・両開催＝ゴールド(PRESENTER)、
 *    **名古屋のみ＝プレミアム(STRATEGIC)**。
 * ⚠️ 宮崎県法人の特別割は宮崎開催に対する価格違いなので、おすすめは宮崎と同じ。
 * ⚠️ 「内容を相談して決めたい」(consult) はプランを出さないので対象外。
 */
export const RECOMMENDED_PLAN: Record<string, string> = {
  miyazaki: "presenter",
  nagoya: "strategic",
  both: "presenter",
};

/** 最上位として常に目立たせるプラン。 */
const TOP_PLAN = "diamond";

/** カード右上のラベル。付かないときは null。 */
export function planBadge(courseCode: string, planCode: string): string | null {
  if (planCode === TOP_PLAN) return "最上位プラン";
  return RECOMMENDED_PLAN[courseCode] === planCode ? "おすすめ" : null;
}

/**
 * ボタンを「選ぶ」ではなく「相談する」と出すプラン。
 * ⚠️ 送信値は他のプランと同じ（plan=diamond）。表記だけを変える。
 */
export const PLAN_CTA_CONSULT = new Set(["diamond"]);

/** カードに出す主要特典の数（残りは「すべての特典を見る」で開く）。 */
export const PLAN_CARD_FEATURES = 4;

/**
 * 協賛企業共通の提供価値（申込フォーム用の5カード）。
 * ⚠️ 案内ページ（/sponsor）が使っている COMMON_BENEFITS とは**別に持つ**。
 *    文章の箇条書きとカードでは必要な長さが違うため。内容の意味は揃えること。
 * ⚠️ 「参加者の同意を得た範囲で」を落とさない（参加者名簿の第三者提供ではない）。
 */
export const COMMON_VALUE_CARDS: { icon: string; label: string; text: string }[] = [
  { icon: "awareness", label: "認知", text: "Food Japan Summitの協賛企業として、会場・関連媒体に社名またはロゴを掲載します。" },
  { icon: "listing", label: "NAKAMA掲載", text: "FOOD JAPAN NAKAMAに、協賛企業として紹介情報を掲載します。" },
  { icon: "meet", label: "出会い", text: "生産者、食品メーカー、小売・流通、飲食、行政などとの接点を提供します。" },
  { icon: "deal", label: "商談", text: "参加者の同意を得た範囲で、商談候補者の紹介・面談調整を行います。" },
  { icon: "cocreate", label: "共創", text: "登壇、展示、試食・試飲、商談設定などを、各協賛プランに応じて提供します。" },
];

/** 上のカードに添える注記＝協賛の範囲と年間会員特典の切り分け（崩さないこと）。 */
export const COMMON_VALUE_NOTE =
  "案件掲載、メッセージ、マッチング相談などの継続利用は、年間会員特典として提供します。";

/** フォーム上部に固定表示する4ステップ。id は本文側のアンカーと対応させる。 */
export const APPLY_STEPS = [
  { id: "step-venue", no: "STEP 1", label: "開催を選ぶ" },
  { id: "step-plan", no: "STEP 2", label: "プラン・オプションを選ぶ" },
  { id: "step-company", no: "STEP 3", label: "会社情報・目的を入力" },
  { id: "step-confirm", no: "STEP 4", label: "確認・申込" },
] as const;

/**
 * 全プランの最安価格（税別）。ファーストビューの「〇万円〜」に使う。
 * ⚠️ **固定値を書かない**（ユーザー指示 2026-08-18）。価格を直したら表示が自動で追随する。
 */
export const MIN_PLAN_PRICE = Math.min(
  ...COURSES.flatMap((c) => [...c.plans, ...(c.localPlans ?? [])]).map((p) => p.price)
);

/** ファーストビューの情報チップ（開催選択の直前に置く3つ）。 */
export const HERO_CHIPS = [
  { head: `${yen(MIN_PLAN_PRICE)}〜`, body: "協賛プラン" },
  { head: "宮崎・名古屋・両開催", body: "開催地を選択" },
  { head: "登壇・展示・商談・NAKAMA", body: "プランに応じて提供" },
];

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

/** 「500,000円」形式。申込内容サマリーの金額に使う（yen() は「50万円」形式）。 */
export function yenFull(n: number): string {
  return `${n.toLocaleString("ja-JP")}円`;
}

/**
 * 現時点の申込金額（税別）。プランが決まっていない（相談）ときは null。
 * ⚠️ 年間会員は「あわせて相談したい」＝金額が確定しないので**加算しない**（指示書10）。
 *    ブース出展は定価が決まっている買い物なので加算する。
 */
export function applicationTotal(plan: SponsorPlan | null, boothOption: boolean): number | null {
  if (!plan) return null;
  return plan.price + (boothOption ? BOOTH_OPTION.price : 0);
}

/**
 * 「希望する協賛特典」が、選んだプランに含まれるか。
 *  true＝含まれる／false＝含まれない（画面に「要相談」を出す）／null＝判定しない。
 *
 * ⚠️ これが無いと LIGHT（最安）を選んだ人が登壇・展示・商談まで全部チェックでき、
 *    含まれていると誤解する（指示書11）。判定は PLAN_SUMMARY と同じ述語を使うこと。
 * ⚠️ DIAMOND PARTNER は特典が個別に列挙されず「全プランの特典」で表されるので、
 *    それを見落とすと最上位プランだけ「含まれない」と誤判定する（過去に踏んだ）。
 */
export function benefitIncluded(benefit: string, plan: SponsorPlan | null): boolean | null {
  // プラン未選択・「内容を相談して決めたい」のときは、含む/含まないを断定しない。
  if (!plan) return null;
  // 特典の指定ではないので判定の対象外。
  if (benefit === "特に希望はない" || benefit === "その他") return null;

  const f = plan.features;
  const all = f.includes("全プランの特典");
  if (all) return true;

  switch (benefit) {
    case "登壇・協賛プレゼンテーション":
      return f.some((x) => x.includes("協賛プレゼンテーション枠"));
    case "試食・試飲・展示":
      return f.some((x) => x === HANDOUT || x.includes("試食会・スナック交流"));
    case "チラシ・ノベルティ配布":
      return f.includes(HANDOUT);
    case "商談候補者の紹介・面談調整":
      return f.includes(MATCHING);
    case "FOOD JAPAN NAKAMAへの掲載":
      return f.some((x) => x.startsWith("FOOD JAPAN NAKAMA"));
    // 共通提供価値として全プランに提供するもの（PDF p.9〜11 の共通項）。
    case "生産者・食品メーカー・小売・行政との共創相談":
      return true;
    default:
      return null;
  }
}

/**
 * そのプランに付く登壇（協賛プレゼンテーション）枠。付かないプランは null。
 *
 * ⚠️ 協賛の価値として一番大きいのが登壇枠だという判断（ユーザー 2026-08-18）なので、
 *    プランカードでは特典リストに埋めず、価格のすぐ下に独立して出す。
 * ⚠️ **付かないプランには「なし」と明示する**こと。黙って省くと LIGHT・STANDARD でも
 *    登壇できると読めてしまう（指示書11 と同じ論点）。
 * ⚠️ 判定は PLAN_SUMMARY の hasPresentation と同じものを使う（別に書くと必ず食い違う）。
 */
export function presentationSlot(plan: SponsorPlan): string | null {
  return hasPresentation(plan.features);
}

/**
 * 登壇（協賛プレゼンテーション）のイメージ図。申込フォームでモーダル表示する
 * （ユーザー指示 2026-08-18）。30分・60分で同じ図を使い、キャプションだけ枠に合わせて変える。
 * ⚠️ キャプションは「セッションタイトルに企業名が入ります」まで（ユーザー提供の文面）。
 *    客席数・登壇者数・進行役の有無など、図から読み取れるだけの要素を保証として書かないこと。
 */
export const PRESENTATION_IMAGE = {
  src: "/sponsor/presentation-stage.png",
  alt:
    "登壇のイメージ。FOOD JAPAN SUMMIT のロゴと「食を起点に、未来の共創を考える。」と書かれた" +
    "大型のバックパネルを背にしたステージで、登壇者が話し、進行役がマイクを持って立ち、" +
    "客席の来場者が着席して聞いている様子。",
  /** 枠（30分／60分／60分＋セッション主催）を受けてキャプションを作る。 */
  caption: (slot: string) => `${slot}の登壇枠です。セッションタイトルに企業名が入ります。`,
};

/** 希望特典の下に必ず出す注記（プランに含まれない特典への誤解を防ぐ）。 */
export const DESIRED_BENEFITS_NOTE =
  "各特典は、選択した協賛プランに含まれる範囲で提供します。プランに含まれない内容をご希望の場合は、事務局より別途ご相談いたします。";

/** 特別割のチェックを出すコードか（宮崎開催のみ） */
export const LOCAL_DISCOUNT_COURSE = "miyazaki";
export const LOCAL_DISCOUNT_LABEL = "宮崎県内に本店または主たる事業所を置く法人";

/**
 * 年間会員（協賛プランとの併用可。PDF p.13）。
 *
 * **実現の方法＝システムは作らず、Stripeのクーポンで NAKAMAビジネス会員を付与する**
 * （ユーザー決定 2026-08-17）。したがって年間会員が実際に受け取るのは
 * **ビジネス会員の特典＝毎月50クレジット（繰越なし）＋単品クレジットと掲載オプションの20%割引**。
 * 「提案無制限」の機能は作らない（2026-08-11 に大量営業・スパム懸念で撤回した決定のまま）。
 *
 * ⚠️ したがって「使いたい放題」は**毎月50クレジットの範囲**での訴求。無制限と受け取られる
 *    表現なので、料金ページや規約に上限を書くかどうかは要判断（景表法）。
 *    ※ 50クレジットは提案50件相当（確認済み案件は3クレジット）。これまでの消費実績は0件。
 *
 * ⚠️ クーポンで申し込ませたときの運用手順（`webhook/route.ts` の invoice.paid の作りによる）:
 *    ①**割引つきの請求では自動で会員にならない**（割引コードが漏れたときに誰でも会員に
 *      なれてしまうのを防ぐため、昇格は定価どおりの支払いのみ）
 *      → `/admin/members` で手動で「ビジネス会員（課金中）」にする
 *    ②手動で会員にしただけでは**その月の月次クレジットは付かない**
 *      → `/admin/members` の「今月分のクレジット（50）を付与する」を押す（同月に何度押しても増えない）
 *    ③**翌月以降は自動**（すでにPAIDなら割引つきの請求でも invoice.paid で50クレジットが付く）
 */
export const ANNUAL_MEMBER = {
  label: "年間会員もあわせて相談したい",
  title: "年間会員",
  badge: "おすすめオプション",
  // ⚠️ 見出しは 2026-08-18 の指示書でユーザー指定の文言に差し替えた
  //    （旧＝募集資料PDF p.13 の「年間を通じて、共創コミュニティに属する。」）。
  // ⚠️「使いたい放題」は**実際に無制限なものだけ**に付ける約束なので、見出しで広く言う代わりに
  //    すぐ下の features で「提案：毎月50件まで」を必ず並べて上限を同じカード内に見せている。
  //    この1行を features から外さないこと（外すと無制限と読める＝景表法の論点が戻る）。
  headline: "FOOD JAPAN NAKAMAを1年間、使いたい放題。",
  // 見出しのリンク先＝NAKAMAのトップ（ユーザー指示 2026-08-18「NAKAMAが何なのか分からないので」）。
  href: NAKAMA_URL,
  price: "月額30,000円（税別）",
  seats: "1団体2名まで登録",
  // ⚠️ 2026-08-17 に決めた主従（月例ミーティング等が主・NAKAMAは付帯）とは順番が逆になっている。
  //    2026-08-18 の指示書がNAKAMA側を先に列挙しているため、そちらに合わせた。
  features: [
    "案件掲載：使いたい放題",
    "メッセージ：使いたい放題",
    "マッチング相談：使いたい放題",
    "提案：毎月50件まで",
    "月例ミーティング",
    "優先マッチング",
    "年間アクセラレータープログラム",
  ],
  note: "「相手を探す」だけで終わらず、出会いから商談、共創、事業化まで継続的にサポートします。",
  combinable: "協賛プランとの併用が可能です。",
};

/**
 * ブース出展（オプション）。募集資料PDF p.47「出展20万円（税別）」。
 * ⚠️ **協賛プランとは別枠の商品**（ユーザー確定 2026-08-17）。協賛プランに含まれないので、
 *    プランの特典一覧には入れず、独立したチェックボックスで受ける。
 * ⚠️ 金額は税別（このファイルの他の金額と同じ）。
 */
export const BOOTH_OPTION = {
  label: "ブース出展もあわせて申し込みたい",
  title: "ブース出展",
  price: 200000,
  // ⚠️ 金額を本文に書かない（2026-08-18）。以前は detail に「200,000円」と書いていて price と
  //    二重になっていた。表示は price から yen()/yenFull() で作る。
  lead: "試食・試飲・商品展示を行うスペースをご用意します。",
  features: ["試食", "試飲", "商品展示", "来場者との直接交流"],
  note: "協賛プランとは別枠のオプションです。ブース数・位置・什器は、会場運営上の都合により事務局と個別に調整します。",
  /**
   * ブースのレイアウト図（申込フォームでモーダル表示する。ユーザー指示 2026-08-18）。
   * ⚠️ alt は図の中身を言葉で書く（画像が出ないときに何の図か分かるように）。
   * ⚠️ **キャプションで「〜が付きます」と書かないこと**。什器は上の note のとおり個別調整なので、
   *    何が含まれるかを断定できない。図はあくまで「イメージ」。
   */
  image: {
    src: "/sponsor/booth-layout.png",
    alt:
      "ブース出展のレイアウト図。正面イメージは、パーテーションの前に試食・試飲用のテーブルを置き、" +
      "商品と試食皿を並べて来場者と会話している様子。俯瞰イメージは、間口2,000mm×奥行1,500mmの区画に、" +
      "パーテーション・椅子2脚・テーブル・案内看板スタンドを配置した平面図。",
    caption:
      "ブースの標準レイアウトのイメージです（間口2,000mm × 奥行1,500mm）。" +
      "什器の内容と配置は、会場運営上の都合により事務局と個別に調整します。",
  },
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
  // 2026-08-18 にユーザー指示で追加。「その他」は必ず末尾に置くこと。
  "マーケティング",
  "ファンづくり",
  "地方創生",
  "関係人口の増加",
  "サスティナブル",
  "食料問題",
  // ⚠️ 区切り記号は既存の「食×環境」等に合わせた全角の × （U+00D7）。
  //    指示原文は ✕ （U+2715）だが、リスト内で字形が揃わないため統一している。
  "食×芸術",
  "その他",
];

export const DESIRED_BENEFITS = [
  // 2026-08-18 ユーザー指示で先頭に追加。
  "企業ロゴ・ブランドロゴの掲載",
  "登壇・協賛プレゼンテーション",
  "試食・試飲・展示",
  "チラシ・ノベルティ配布",
  "商談候補者の紹介・面談調整",
  "生産者・食品メーカー・小売・行政との共創相談",
  "FOOD JAPAN NAKAMAへの掲載",
  "特に希望はない",
  "その他",
];

/** 特典ラベルの一部を外部リンクにする指定。キー＝DESIRED_BENEFITS の値。
 *  ⚠️ ラベルは <label> の中にあるので、リンクのクリックでチェックが変わらないよう
 *     呼び出し側で stopPropagation すること（2026-08-18）。 */
export const BENEFIT_LINKS: Record<string, { text: string; href: string }> = {
  "FOOD JAPAN NAKAMAへの掲載": { text: "FOOD JAPAN NAKAMA", href: NAKAMA_URL },
};

/** ロゴ提出方法。**先頭の値を選んだときだけ**フォームにファイル添付欄が出る
 *  （SponsorForm / actions.ts の両方がこの定数を見て判定するので、文言を変えるときは
 *  LOGO_SUBMISSION_UPLOAD も一緒に直すこと）。 */
export const LOGO_SUBMISSION_UPLOAD = "こちらから提出する（Illustratorデータ／PDF）";
/** 添付できる最大サイズ。
 *  ⚠️ ファイルは **Server Action を通さず、ブラウザから Supabase Storage へ直接**送る。
 *     Vercel の関数はリクエストボディが 4.5MB を超えると 413 を返し、これは
 *     next.config.ts の serverActions.bodySizeLimit では回避できない**インフラ側の制限**
 *     （2026-08-18 に確認）。ここを 4.5MB 超にできているのは直アップロードだから。
 *     もし Server Action 経由に戻すなら、この値を 4MB 以下に下げること。
 *  ⚠️ Supabase 側のバケット `sponsor-logos` にも同じ 20MB の上限を設定してある。
 *     片方だけ変えても実際の上限は変わらない。 */
export const LOGO_MAX_BYTES = 20 * 1024 * 1024;
export const LOGO_ACCEPT = ".ai,.pdf,.eps";
export const LOGO_BUCKET = "sponsor-logos";
/** 事務局が受け取るダウンロードリンクの有効期間。 */
export const LOGO_LINK_TTL_SEC = 60 * 60 * 24 * 30;

/** アップロード先パスの妥当性。⚠️ 受け取ったパスをそのまま署名するので、
 *  ここを緩めるとバケット内の任意ファイルを読める口になる。 */
export function isLogoPath(path: string): boolean {
  return /^[0-9]{6}\/[0-9a-f-]{36}\.(ai|pdf|eps)$/i.test(path);
}

/** ラジオの初期選択。⚠️ 先頭（＝添付）を初期値にしないこと。
 *  初期状態でファイル添付が必須になり、ロゴをまだ用意していない人が進めなくなる。 */
export const LOGO_SUBMISSION_DEFAULT = "申込後、事務局からの案内に従いメールで提出する";

export const LOGO_SUBMISSION = [
  LOGO_SUBMISSION_UPLOAD,
  LOGO_SUBMISSION_DEFAULT,
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
  // ⚠️ NAKAMAは「協賛企業としての紹介情報の掲載」までが協賛の範囲。
  //    案件掲載・メッセージ・マッチング相談の継続利用は**年間会員の特典**（切り分けを崩さないこと）。
  "FOOD JAPAN NAKAMAに、協賛企業としての紹介情報を掲載します。",
  "案件掲載、メッセージ、マッチング相談などの継続利用は、年間会員特典として提供します。",
  "生産者、食品メーカー、小売・流通、飲食、行政などとの共創・商談につながる機会を提供します。",
  // ⚠️ 参加者名簿を渡すのではなく「同意を得た範囲での紹介」であることを明示する。
  "参加者の同意を得た範囲で、商談候補者の紹介・面談調整を行います。",
  // ⚠️ 旧文は「内容・時間帯を個別に調整」だけで、LIGHTでも登壇できると読めた。
  //    プランに応じて提供される旨を先に書く。
  "登壇、展示、試食・試飲、商談設定は、各協賛プランに応じて提供します。実施内容と時間帯は、会場運営上の都合により個別に調整します。",
];

// ── 案内ページ（/sponsor）用のプラン早見表 ─────────────────────
// ⚠️ 表の中身は**プラン定義から導出する**（手で別表を書くと必ず食い違う）。
//    判定に使う文字列は上の定数（MATCHING / HANDOUT / NAKAMA*）と同じものなので、
//    特典を書き換えても表が自動で追随する。

export type PlanSummaryRow = {
  name: string;
  /** 単独開催（宮崎のみ／名古屋のみ）の価格 */
  single: string;
  /** 両開催の価格 */
  both: string;
  /** 登壇（プレゼン枠）。無ければ null */
  presentation: string | null;
  exhibit: boolean;
  matching: boolean;
  nakama: boolean;
};

function hasPresentation(features: string[]): string | null {
  const f = features.find((x) => x.includes("協賛プレゼンテーション枠"));
  if (!f) return null;
  if (features.some((x) => x.includes("テーマセッション主催"))) return "60分＋セッション主催";
  return f.startsWith("30分") ? "30分" : "60分";
}

export const PLAN_SUMMARY: PlanSummaryRow[] = (() => {
  const single = findCourse("miyazaki");
  const both = findCourse("both");
  if (!single || !both) return [];
  return single.plans.map((p) => {
    const b = both.plans.find((x) => x.code === p.code);
    // ⚠️ DIAMOND PARTNER の特典は個別に列挙されておらず「全プランの特典」で表される。
    //    これを見落とすと、最上位プランだけ「展示・試食 —」「商談の紹介 —」と誤って出る（実際に踏んだ）。
    const inheritsAll = p.features.includes("全プランの特典");
    return {
      name: p.name,
      single: yen(p.price),
      both: b ? yen(b.price) : "—",
      presentation: hasPresentation(p.features),
      exhibit: inheritsAll || p.features.some((f) => f === HANDOUT || f.includes("試食会・スナック交流")),
      matching: inheritsAll || p.features.includes(MATCHING),
      nakama: inheritsAll || p.features.some((f) => f.startsWith("FOOD JAPAN NAKAMA")),
    };
  });
})();

/** 案内ページで先に見せる3点。 */
export const PLAN_HIGHLIGHTS = [
  "協賛プランは15万円（税別）から",
  "宮崎開催・名古屋開催・両開催から選べます",
  "登壇、展示・試食、商談の紹介、NAKAMA掲載の範囲はプランごとに異なります",
];

/**
 * 登壇・参加予定企業・団体のロゴ（2026-08-18 提供・34件／指示書＝参加企業ロゴ/CloudCode_協賛ページ追加指示書.md）。
 *
 * ⚠️ **見出しは必ず「登壇・参加予定企業・団体」**。「協賛企業」「参加確定企業」とは書かない（指示書）。
 * ⚠️ **提供されたファイルだけを使う**（外部からロゴを取得しない）。同一企業のロゴは1点だけ。
 * ⚠️ 掲載内容が変わる前提なので、**セクション下の注記（PARTICIPANTS_NOTE）を消さないこと**。
 * ⚠️ **並び順はユーザー指定（2026-08-18）**＝カンロ／ミツカン／クリスピー・クリーム／Dole／紀文／有楽製菓／
 *    塚田農場／エステー／サンマルクカフェ／オイシックス／宮崎大学／愛知／ベイシア／八代目儀兵衛 を先頭に置き、
 *    残りは提供順のまま。**先頭14件の順序を勝手に変えないこと**。マルキーは**この配列を2回描く**（1周ぶんの複製＝継ぎ目を消すためで、
 *    社数を二重に見せる意図ではない。2セット目は aria-hidden にして読み上げから外す）。
 * ⚠️ 画像は `public/images/participants/`。表示枠は194×108（モバイル156×90）なので、
 *    取り込み時に**長辺400px以内へ縮小**してある（2.2MB→600KB）。差し替えるときも同じ手順で。
 *    jdocco はSVG（240KB・中身は埋め込みラスタ）だったので400px幅のPNGに変換した（10KB）。
 */
export const PARTICIPANTS_EYEBROW = "WHO YOU CAN MEET";
export const PARTICIPANTS_TITLE = "登壇・参加予定企業・団体";
export const PARTICIPANTS_NOTE =
  "資料提供を受けた登壇・参加予定企業・団体の一部です（順不同）。掲載内容は開催準備に伴い変更となる場合があります。";

export const PARTICIPANT_LOGOS: { src: string; alt: string }[] = [
  { src: "/images/participants/kanro.jpg", alt: "カンロ" },
  { src: "/images/participants/mizkan.jpg", alt: "Mizkan" },
  { src: "/images/participants/krispy-kreme.gif", alt: "クリスピー・クリーム・ドーナツ" },
  { src: "/images/participants/dole.png", alt: "Dole" },
  { src: "/images/participants/kibun.png", alt: "紀文食品" },
  { src: "/images/participants/yuraku.jpg", alt: "有楽製菓（ブラックサンダー）" },
  { src: "/images/participants/tsukada-farm.jpg", alt: "塚田農場" },
  { src: "/images/participants/s-t.png", alt: "エステー" },
  { src: "/images/participants/saint-marc-cafe.jpeg", alt: "サンマルクカフェ" },
  { src: "/images/participants/oisix.webp", alt: "オイシックス" },
  { src: "/images/participants/university-of-miyazaki.jpg", alt: "宮崎大学" },
  { src: "/images/participants/aichi-agricultural-innovation-project.webp", alt: "Aichi Agricultural Innovation Project" },
  { src: "/images/participants/beisia.png", alt: "ベイシア" },
  { src: "/images/participants/hachidaime-gihey.jpg", alt: "八代目儀兵衛" },
  { src: "/images/participants/asano-suisan.jpg", alt: "浅野水産" },
  { src: "/images/participants/bronco-billy.jpeg", alt: "ブロンコビリー" },
  { src: "/images/participants/daiwa-farm.jpg", alt: "ダイワファーム" },
  { src: "/images/participants/gra.jpeg", alt: "GRA" },
  { src: "/images/participants/hideji-beer.png", alt: "宮崎ひでじビール" },
  { src: "/images/participants/jdocco.png", alt: "JDOCCO" },
  { src: "/images/participants/kadoya.png", alt: "角屋食品" },
  { src: "/images/participants/kagoshima-buns.png", alt: "カゴシマバンズ" },
  { src: "/images/participants/kakuyasu.jpg", alt: "カクヤス" },
  { src: "/images/participants/kasugai.png", alt: "春日井製菓" },
  { src: "/images/participants/michino-le-tourbillon.png", alt: "ミチノ・ル・トゥールビヨン" },
  { src: "/images/participants/tsuno-wine.png", alt: "都農ワイン" },
  { src: "/images/participants/tsumoto-shiki.jpeg", alt: "津本式" },
  { src: "/images/participants/tsuboichi.jpg", alt: "つぼ市製茶本舗" },
  { src: "/images/participants/tanaka-farm.jpeg", alt: "田中農場" },
  { src: "/images/participants/revonity.jpg", alt: "Rebonity Holdings" },
  { src: "/images/participants/pasta-cuore.jpg", alt: "パスタクオーレ" },
  { src: "/images/participants/origane.png", alt: "折兼ホールディングス" },
  { src: "/images/participants/obisugi.png", alt: "飫肥杉" },
  { src: "/images/participants/nakamo.png", alt: "ナカモ" },
];
