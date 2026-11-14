// 共創フィールドワークの入力項目（2026-11-18 都城・霧島バスフィールドワーク）。
//
// 紙のワークブック「FOOD JAPAN SUMMIT 2026 in MIYAZAKI 共創フィールドワーク ワークブック」
// をそのまま写した定義。**紙とデジタルの両方を当日配る**ので、見出し番号・項目名・説明文は
// 紙と一字一句そろえる（参加者が紙とスマホを行き来するため、言葉が違うと迷う）。
//
// ⚠️ ここはクライアントからも読み込む。サーバー専用のもの（prisma, 環境変数）を入れない。
// ⚠️ 紙の§8「AIで共創レポートを作る」はデジタルには無い。
//    §8は「§2〜§6に書いたことをAI欄へ書き写す」工程で、紙だからデータが動かないせいで
//    存在する。デジタルでは §2〜§7 がそのままAIへ渡るので、二度書きさせない
//    （代わりに「AIへ渡す内容の確認」画面を出す。項目は落としていない）。

/** 当日の共通コード。参加者に口頭＋紙で配る。 */
export const FIELDWORK_CODE = "FW1118";

/** どのフィールドワークか。 */
export const FIELDWORK_EVENT_KEY = "miyazaki-2026-1118";
export const FIELDWORK_EVENT_NAME = "FOOD JAPAN SUMMIT 2026 in MIYAZAKI 共創フィールドワーク";
export const FIELDWORK_EVENT_DATE = "2026年11月18日（水）都城・霧島バスフィールドワーク";

export type FieldType = "text" | "textarea" | "score5" | "choice" | "check";

export type Field = {
  key: string;
  label: string;
  /** 紙の項目名の下にある小さい説明文 */
  hint?: string;
  type: FieldType;
  choices?: string[];
  /** textarea の目安行数（紙の下線の本数に合わせる） */
  rows?: number;
};

export type Section = {
  key: string;
  /** 紙の見出し番号 */
  no: string;
  title: string;
  lead: string;
  /** いつ書くか。画面で「いま書くところ」を示すために使う */
  when: string;
  fields: Field[];
  /** 紙の「現地で見るポイント」など、入力ではない補助文 */
  tips?: { title: string; items: string[] };
};

/** 表紙の3項目。 */
export const COVER_FIELDS: Field[] = [
  { key: "name", label: "氏名", type: "text" },
  { key: "company", label: "会社・団体", type: "text" },
  { key: "team", label: "チーム", type: "text" },
];

const SCORE_ROWS = [
  { key: "score_partner_issue", label: "相手の課題を解決できるか" },
  { key: "score_own_strength", label: "自社の強みを生かせるか" },
  { key: "score_profit", label: "お互いに売上・利益が生まれるか" },
  { key: "score_customer", label: "顧客が欲しいと思うか" },
  { key: "score_90days", label: "90日以内に試せるか" },
  { key: "score_fun", label: "自分たちが楽しんで続けられるか" },
];

/** §5の比較表。西製茶案と福山黒酢案で同じ6項目を5段階でつける。 */
export const COMPARE_ROWS = SCORE_ROWS;

export const SECTIONS: Section[] = [
  {
    key: "own",
    no: "2",
    title: "自社を棚卸しする",
    lead: "相手を知る前に、自分たちが提供できるものと実現したいことを整理します。",
    when: "バス内 8:10–8:45",
    fields: [
      {
        key: "own_business",
        label: "事業の特徴",
        hint: "誰に、何を、どのような方法で提供していますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_customers",
        label: "主な顧客",
        hint: "現在のお客様と、これから増やしたいお客様",
        type: "textarea",
        rows: 1,
      },
      {
        key: "own_strengths",
        label: "強み・資源",
        hint: "商品、技術、人材、設備、販路、ブランド、データ、地域との関係など",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_issues",
        label: "現在の課題",
        hint: "売上、認知、販路、人手、商品開発、物流、原料、地域課題など",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_ambition",
        label: "やりたいこと",
        hint: "今後3年で実現したいこと。まだ言葉になっていない希望でも構いません",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_offer",
        label: "提供できるもの",
        hint: "西製茶や福山黒酢に対して、自社が無理なく提供できるもの",
        type: "textarea",
        rows: 2,
      },
    ],
    tips: {
      title: "共創を考えるときの基本",
      items: [
        "自社に何ができるかだけでなく、相手にどのような利益が生まれるかを考える",
        "商品を一度つくって終わりではなく、継続して売れる仕組みを考える",
        "大きな構想より、90日以内に試せる小さな実験から始める",
        "相手の伝統や品質を尊重し、変えてはいけないものを先に確認する",
      ],
    },
  },
  {
    key: "nishi",
    no: "3",
    title: "西製茶との共創を考える",
    lead: "有機栽培、生産・加工、霧島茶のブランド、販路、体験価値に注目して観察します。",
    when: "視察前はバス内 8:45–9:25／視察後は移動中 11:00–11:30",
    fields: [
      {
        key: "nishi_hypothesis",
        label: "視察前の仮説",
        hint: "あなたの事業と西製茶は、どのような点で組めそうですか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "nishi_questions",
        label: "聞きたいこと",
        hint: "現地で確認したい質問を3つ書いてください",
        type: "textarea",
        rows: 3,
      },
      {
        key: "nishi_resources",
        label: "発見した資源",
        hint: "茶葉、栽培、土、設備、人、物語、地域、技術、販路など（視察後）",
        type: "textarea",
        rows: 2,
      },
      {
        key: "nishi_issues",
        label: "感じた課題",
        hint: "現地の話から見えた課題や、まだ活用しきれていない可能性（視察後）",
        type: "textarea",
        rows: 2,
      },
      {
        key: "nishi_fit",
        label: "自社との接点",
        hint: "自社の商品、技術、顧客、販路、発信力などと接続できる点（視察後）",
        type: "textarea",
        rows: 2,
      },
      {
        key: "nishi_idea",
        label: "共創アイデア",
        hint: "組んだら、お互いにビジネスになり、楽しそうだと思うこと（視察後）",
        type: "textarea",
        rows: 3,
      },
    ],
    tips: {
      title: "現地で見るポイント",
      items: [
        "有機栽培や土づくりを、どのような商品価値として伝えているか",
        "生産・加工・販売のどこに強みがあり、どこに課題があるか",
        "食品、飲食、観光、教育、健康、海外販路とどう組み合わせられるか",
      ],
    },
  },
  {
    key: "kurozu",
    no: "4",
    title: "福山黒酢との共創を考える",
    lead: "伝統製法、壺畑、発酵、熟成、健康、料理、観光、ブランドの若返りに注目して観察します。",
    when: "視察前はバス内 12:00–12:50／視察後は帰路 14:40–15:00",
    fields: [
      {
        key: "kurozu_hypothesis",
        label: "視察前の仮説",
        hint: "あなたの事業と福山黒酢は、どのような点で組めそうですか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_questions",
        label: "聞きたいこと",
        hint: "現地で確認したい質問を3つ書いてください",
        type: "textarea",
        rows: 3,
      },
      {
        key: "kurozu_keep",
        label: "絶対に守るもの",
        hint: "製法、品質、味、地域性、信頼など、変えてはいけない価値（視察後）",
        type: "textarea",
        rows: 1,
      },
      {
        key: "kurozu_change",
        label: "変えられるもの",
        hint: "商品、用途、顧客、デザイン、売り方、体験、伝え方など（視察後）",
        type: "textarea",
        rows: 1,
      },
      {
        key: "kurozu_resources",
        label: "発見した資源",
        hint: "壺、時間、発酵、職人、景観、料理、健康価値、歴史など（視察後）",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_issues",
        label: "感じた課題",
        hint: "現地の話から見えた課題や、まだ活用しきれていない可能性（視察後）",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_idea",
        label: "共創アイデア",
        hint: "組んだら、お互いにビジネスになり、楽しそうだと思うこと（視察後）",
        type: "textarea",
        rows: 3,
      },
    ],
    tips: {
      title: "現地で見るポイント",
      items: [
        "伝統を守りながら、新しい顧客に選ばれるために何を変えてきたか",
        "黒酢を調味料以外の商品・サービス・体験へ広げられるか",
        "健康、スポーツ、観光、飲食、教育、ギフトとの接点はあるか",
      ],
    },
  },
  {
    key: "choose",
    no: "5",
    title: "共創案を比べて一つに絞る",
    lead: "西製茶案と福山黒酢案を比較し、チームで最も実現可能性の高い案を選びます。",
    when: "帰路バス内 15:00–15:25",
    fields: [
      {
        key: "chosen_partner",
        label: "選んだ共創先",
        type: "choice",
        choices: ["西製茶", "福山黒酢", "両社をつなぐ"],
      },
      {
        key: "project_name",
        label: "企画名",
        hint: "一言で内容が伝わる名前",
        type: "text",
      },
      {
        key: "chosen_reason",
        label: "選んだ理由",
        hint: "誰のどの課題を、なぜこの組み合わせで解決するのか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kirishima_insight",
        label: "霧島神宮での気づき",
        hint: "地域の歴史や文化のうち、守りながら未来へつなぎたいもの",
        type: "textarea",
        rows: 2,
      },
    ],
  },
  {
    key: "business",
    no: "6",
    title: "お互いに利益が生まれる事業にする",
    lead: "良い話で終わらせず、顧客・役割・収益・検証方法まで具体化します。",
    when: "帰路バス内 15:00–15:25",
    fields: [
      {
        key: "biz_customer",
        label: "顧客",
        hint: "最初に買う人・利用する人は誰ですか",
        type: "textarea",
        rows: 1,
      },
      {
        key: "biz_customer_issue",
        label: "顧客の課題",
        hint: "その人は何に困り、何を求めていますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_value",
        label: "提供する価値",
        hint: "商品・サービス・体験によって、何がどう良くなりますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_partner_gain",
        label: "西製茶・黒酢の利益",
        hint: "売上、販路、顧客、発信、地域価値など、相手に何が残りますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_own_gain",
        label: "自社の利益",
        hint: "売上、商品、顧客、ブランド、学びなど、自社に何が残りますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_roles",
        label: "役割分担",
        hint: "誰が、何を担当しますか。他に必要な協力者は誰ですか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_revenue",
        label: "収益のつくり方",
        hint: "誰が、何に、いくら払いますか。継続して売れる理由は何ですか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_experiment",
        label: "最小実験",
        hint: "90日以内に、低コストで何を試しますか",
        type: "textarea",
        rows: 2,
      },
    ],
  },
  {
    key: "internal",
    no: "7",
    title: "帰社後の社内合意を設計する",
    lead: "社内の懸念を「やらない理由」ではなく、「安全に試す条件」に変えます。",
    when: "帰路バス内 16:05–16:10／帰社後",
    fields: [
      {
        key: "approval_ask",
        label: "承認してほしいこと",
        hint: "誰に、何を決めてもらいたいですか",
        type: "textarea",
        rows: 1,
      },
      {
        key: "approval_why_now",
        label: "今やる理由",
        hint: "顧客、市場、地域、自社の課題から、なぜ今なのか",
        type: "textarea",
        rows: 1,
      },
      {
        key: "approval_evidence",
        label: "現地の根拠",
        hint: "視察で見た事実、聞いた言葉、数字。推測と分けて書く",
        type: "textarea",
        rows: 2,
      },
      {
        key: "approval_strategy",
        label: "自社戦略との接続",
        hint: "既存事業、中期計画、顧客、ブランドとどうつながるか",
        type: "textarea",
        rows: 1,
      },
      {
        key: "approval_resources",
        label: "必要な資源",
        hint: "予算、人、時間、設備、対外調整。上限も書く",
        type: "textarea",
        rows: 1,
      },
      {
        key: "approval_concerns",
        label: "主な懸念と対応",
        hint: "品質、法務、表示、調達、物流、収益、ブランドの懸念と対応策",
        type: "textarea",
        rows: 2,
      },
      {
        key: "map_decider",
        label: "決める人：最終決裁者",
        hint: "その人が必要とする根拠もあわせて書いてください",
        type: "textarea",
        rows: 1,
      },
      {
        key: "map_doer",
        label: "動かす人：実行責任者",
        hint: "協力が必要な部門もあわせて書いてください",
        type: "textarea",
        rows: 1,
      },
      {
        key: "map_skeptic",
        label: "先に聞く人：反対・慎重になりそうな人",
        hint: "その懸念もあわせて書いてください",
        type: "textarea",
        rows: 1,
      },
      {
        key: "road_48h",
        label: "48時間以内：視察レポートを社内共有",
        hint: "担当・期限",
        type: "text",
      },
      {
        key: "road_7d",
        label: "7日以内：関係者ヒアリング・社内会議",
        hint: "日時",
        type: "text",
      },
      {
        key: "road_30d",
        label: "30日以内：視察先と実証条件を確認",
        hint: "予算上限",
        type: "text",
      },
      {
        key: "road_90d",
        label: "90日以内：実証完了",
        hint: "KPI／継続・修正・中止の判断日",
        type: "text",
      },
    ],
    tips: {
      title: "社内合意の考え方",
      items: [
        "合意形成とは、全員の賛成を待つことではありません。懸念を早く見つけ、「どの条件なら小さく試せるか」に変えることです。",
      ],
    },
  },
];

/** §1の「次のステップへ進む前の3つの関門」。企画書を作る前の自己点検。 */
export const GATES: Field[] = [
  {
    key: "gate_fact",
    label: "事実の関門",
    hint: "現地で見たこと・聞いたことに基づいているか",
    type: "check",
  },
  {
    key: "gate_mutual",
    label: "相互利益の関門",
    hint: "相手と自社の両方に、継続できる利益があるか",
    type: "check",
  },
  {
    key: "gate_action",
    label: "実行の関門",
    hint: "担当者・期限・費用・次の行動が決まっているか",
    type: "check",
  },
];

/** §9の発表後の記録。企画書ができたあとに書く。 */
export const AFTER_FIELDS: Field[] = [
  {
    key: "after_feedback",
    label: "発表後にもらった意見",
    type: "textarea",
    rows: 2,
  },
  {
    key: "after_contact",
    label: "連絡する相手",
    hint: "氏名・会社・連絡期限",
    type: "textarea",
    rows: 1,
  },
  { key: "after_first_day", label: "私が最初に動く日", hint: "日付・担当", type: "text" },
];

/** 当日のタイムテーブル（紙と同じ。入力ではなく手元の確認用）。 */
export const TIMETABLE: { time: string; place: string; work: string }[] = [
  { time: "7:50", place: "宮崎観光ホテル 配車・受付", work: "乗車・チーム確認" },
  { time: "8:00", place: "宮崎観光ホテル 出発", work: "目的共有・役割決定" },
  { time: "8:10–8:45", place: "バス内", work: "自社の特徴・資源・課題・やりたいことを整理" },
  { time: "8:45–9:25", place: "バス内", work: "西製茶との共創仮説を作成" },
  { time: "9:25–9:50", place: "バス内・休憩", work: "チーム共有・現地で聞く質問を決める" },
  { time: "10:00–11:00", place: "西製茶 視察", work: "観察・試飲・質問・共創の材料集め" },
  { time: "11:00–11:30", place: "移動", work: "発見を記録し、仮説を修正" },
  { time: "11:30–12:00", place: "霧島神宮", work: "地域資源と『守るもの・変えるもの』を考える" },
  { time: "12:00–12:50", place: "移動", work: "福山黒酢との共創仮説・質問を整理" },
  { time: "12:50–14:40", place: "福山黒酢『桷志田』", work: "壺畑視察・昼食・交流・共創の材料集め" },
  { time: "14:40–15:00", place: "帰路バス内", work: "個人で2つの共創案を整理" },
  { time: "15:00–15:25", place: "帰路バス内", work: "チームで提案1案を選定・具体化" },
  { time: "15:25–15:45", place: "帰路バス内", work: "AIで共創レポートを作成" },
  { time: "15:45–16:05", place: "帰路バス内", work: "2分発表・協力者募集" },
  { time: "16:05–16:10", place: "帰路バス内", work: "帰社後の社内合意と90日実証を宣言" },
  { time: "16:10", place: "宮崎空港 到着", work: "空港降車者 解散" },
  { time: "17:00", place: "宮崎観光ホテル 到着", work: "解散" },
];

/** 2分発表の組み立て（紙と同じ）。 */
export const PITCH_PLAN: { sec: string; what: string }[] = [
  { sec: "20秒", what: "私たちと、視察先の紹介" },
  { sec: "30秒", what: "解決したい顧客・地域の課題" },
  { sec: "40秒", what: "共創事業の内容" },
  { sec: "20秒", what: "双方に生まれる利益" },
  { sec: "10秒", what: "90日以内に行う最初の一歩" },
];

/** 1項目の最大文字数。長文を貼られてAIの費用が跳ねるのを防ぐ。 */
export const FIELDWORK_FIELD_MAX = 1200;

/** 入力の型。すべて文字列で持つ（空欄は ""）。 */
export type FieldworkAnswers = Record<string, string>;

/** 入力のうち、何項目書けたか。画面の進み具合に使う。 */
export function filledCount(answers: FieldworkAnswers, fields: Field[]): number {
  return fields.filter((f) => (answers[f.key] ?? "").trim() !== "").length;
}

/** すべての入力項目（表紙・関門・発表後を除く本体）。 */
export function allBodyFields(): Field[] {
  return SECTIONS.flatMap((s) => s.fields);
}

// ── AIが作る共創企画書 ────────────────────────────────────
// 構成は紙の§8「AIへの入力文」が指定している①〜⑫をそのまま使う。
// 変えていないのは、当日その順で発表・社内説明する前提で紙が組まれているため。
// summary（リード文）と pitch（2分発表の台本）だけ足した。
//   summary: 企画書の1枚目に要約が無いと、決裁者が読む前に置かれる。
//   pitch:   当日15:45から2分発表がある。紙の「2分発表の順番」に沿った台本を出す。

export type FieldworkReport = {
  /** ①企画名 */
  projectName: string;
  /** 企画書の冒頭に置く2〜3行の要約 */
  summary: string;
  /** ②解決する課題 */
  problem: string;
  /** ③顧客 */
  customer: string;
  /** ④提案内容 */
  proposal: string;
  /** ⑤視察先のメリット */
  partnerBenefit: string;
  /** ⑥当社のメリット */
  ownBenefit: string;
  /** ⑦収益の仕組み */
  revenue: string;
  /** ⑧必要な協力者 */
  collaborators: string;
  /** ⑨想定リスクと対応 */
  risks: string;
  /** ⑩90日以内の実証計画とKPI */
  plan90: string;
  /** ⑪社内で承認してほしいこと */
  approval: string;
  /** ⑫相手への最初の相談文（そのまま送れる文面） */
  firstMessage: string;
  /** 2分発表の台本 */
  pitch: string;
};

/** 企画書の見出し（画面と印刷で同じ順・同じ言葉を使う）。 */
export const REPORT_SECTIONS: { key: keyof FieldworkReport; no: string; label: string }[] = [
  { key: "problem", no: "1", label: "解決する課題" },
  { key: "customer", no: "2", label: "顧客" },
  { key: "proposal", no: "3", label: "提案内容" },
  { key: "partnerBenefit", no: "4", label: "視察先のメリット" },
  { key: "ownBenefit", no: "5", label: "当社のメリット" },
  { key: "revenue", no: "6", label: "収益の仕組み" },
  { key: "collaborators", no: "7", label: "必要な協力者" },
  { key: "risks", no: "8", label: "想定リスクと対応" },
  { key: "plan90", no: "9", label: "90日以内の実証計画とKPI" },
  { key: "approval", no: "10", label: "社内で承認してほしいこと" },
];

export const EMPTY_REPORT_KEYS: (keyof FieldworkReport)[] = [
  "projectName",
  "summary",
  "problem",
  "customer",
  "proposal",
  "partnerBenefit",
  "ownBenefit",
  "revenue",
  "collaborators",
  "risks",
  "plan90",
  "approval",
  "firstMessage",
  "pitch",
];

/** AIに渡すために、入力を「見出し: 内容」の素のテキストへ組み立てる。 */
export function answersToPrompt(answers: FieldworkAnswers): string {
  const out: string[] = [];
  for (const s of SECTIONS) {
    const lines = s.fields
      .map((f) => {
        const v = (answers[f.key] ?? "").trim();
        return v ? `・${f.label}: ${v}` : null;
      })
      .filter(Boolean);
    if (lines.length === 0) continue;
    out.push(`【${s.no} ${s.title}】`, ...(lines as string[]), "");
  }
  // §5の比較点数（書かれていれば判断の根拠として渡す）
  const scores = COMPARE_ROWS.map((r) => {
    const a = (answers[`${r.key}_nishi`] ?? "").trim();
    const b = (answers[`${r.key}_kurozu`] ?? "").trim();
    if (!a && !b) return null;
    return `・${r.label}: 西製茶案 ${a || "-"} / 福山黒酢案 ${b || "-"}（5点満点）`;
  }).filter(Boolean);
  if (scores.length) out.push("【5 共創案の比較点数】", ...(scores as string[]), "");
  return out.join("\n").trim();
}
