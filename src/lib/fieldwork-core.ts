// 共創フィールドワークの入力項目（2026-11-18 霧島フィールドワーク）。
//
// 一次資料は当日配布の「FJS2026宮崎_DAY2車内ワーク_1118」（①〜⑥と時刻）。
// 補助資料は「旅のしおり ＋ 共創メソッド」（観察の焦点・3つの関門・2分発表の配分）。
// 時刻・ワーク番号・項目名は**車内ワークの紙と一字一句そろえる**
// （参加者は紙とスマホを行き来するので、言葉がずれると迷う）。
//
// 当日の流れで特に大事な点:
//   ・発表（④）は桷志田で 12:45–13:15。**AIレポート（⑥）より前**に行う。
//     だから発表用の台本をAIに作らせても間に合わない。発表の組み立ては③の手引きに置く。
//   ・④のあと福山黒酢さまから講評をいただく。⑤はその講評を受けて案を直す工程。
//   ・⑥は帰りの車内 15:50–16:40。ここで1日の内容を1枚にまとめる。
//
// ⚠️ ここはクライアントからも読み込む。サーバー専用のもの（prisma, 環境変数）を入れない。
// ⚠️ 紙の⑥は「①〜⑤に書いたことをAI欄へ書き写す」工程。デジタルでは①〜⑤がそのまま
//    AIへ渡るので二度書きさせない（代わりに「AIへ渡す内容の確認」画面を⑥として出す）。

/** 当日の共通コード。参加者に口頭＋紙で配る。 */
export const FIELDWORK_CODE = "FW1118";

/** どのフィールドワークか。 */
export const FIELDWORK_EVENT_KEY = "miyazaki-2026-1118";
export const FIELDWORK_EVENT_NAME = "FOOD JAPAN SUMMIT 2026 in MIYAZAKI DAY2 霧島フィールドワーク";
export const FIELDWORK_EVENT_DATE = "2026年11月18日（水）霧島フィールドワーク 共創ワーク";

/** 共創の相手。今回は1社だけなので定数で持つ（選択させない）。 */
export const FIELDWORK_PARTNER = "福山黒酢（桷志田）";

/** 表紙のタイトル（紙の表紙と同じ言葉）。 */
export const FIELDWORK_TITLE = ["福山黒酢との", "共創事業のつくりかた"];

/** 表紙のリード（紙のまま）。 */
export const FIELDWORK_LEAD =
  "行きの車内で共創案をつくり、福山黒酢（桷志田）で発表します。講評を受けて、帰りの車内で仕上げます。";

export type FieldType = "text" | "textarea" | "score5" | "choice" | "check";

export type Field = {
  key: string;
  label: string;
  /** 紙の項目名の下にある小さい説明文 */
  hint?: string;
  type: FieldType;
  choices?: string[];
  /** textarea の目安行数 */
  rows?: number;
};

export type Section = {
  key: string;
  /** 紙の丸数字 */
  no: string;
  title: string;
  lead: string;
  /** いつ・どこで書くか（紙の時刻・場所のまま） */
  when: string;
  fields: Field[];
  /** 入力ではない補助文（観察の焦点・発表の組み立てなど） */
  tips?: { title: string; items: string[] };
};

/** 表紙の3項目。 */
export const COVER_FIELDS: Field[] = [
  { key: "name", label: "お名前", type: "text" },
  { key: "company", label: "会社・団体", type: "text" },
  { key: "team", label: "役職", type: "text" },
];

/** 共創を実行に変える7ステップ（しおり METHOD）。 */
export const METHOD_STEPS: { no: string; title: string; note: string }[] = [
  { no: "1", title: "自社を知る", note: "強みと課題" },
  { no: "2", title: "相手を観察", note: "現場の事実" },
  { no: "3", title: "課題を確認", note: "本人の言葉" },
  { no: "4", title: "相互利益か？", note: "双方に価値が残るか？" },
  { no: "5", title: "小さく試す", note: "90日テスト" },
  { no: "6", title: "合意形成", note: "懸念を条件へ" },
  { no: "7", title: "判断", note: "継続・修正・中止" },
];

/** ③の比較表（しおり p.7 の6項目）。案1〜3に同じ項目で点数をつける。 */
export const COMPARE_ROWS = [
  { key: "score_customer_issue", label: "福山黒酢を購入する方の課題解決度" },
  { key: "score_partner_profit", label: "福山黒酢の利益" },
  { key: "score_own_profit", label: "自社の利益" },
  { key: "score_demand", label: "顧客の需要・ニーズを満足させられるか？" },
  { key: "score_90days", label: "90日で小さくテストができるか？" },
  { key: "score_execution", label: "実行力：社内の体制づくりが可能か？" },
];

/** 比較表の列。紙の③は「共創案を3つ出して1つに絞る」。 */
export const COMPARE_COLS = [
  { side: "1", label: "案1" },
  { side: "2", label: "案2" },
  { side: "3", label: "案3" },
] as const;

export const SECTIONS: Section[] = [
  {
    key: "own",
    no: "①",
    title: "自社の棚卸し",
    lead: "自社の特徴・使える資源・いまの課題・やりたいことを書き出します。",
    when: "車内 8:15〜8:50",
    fields: [
      {
        key: "own_business",
        label: "自社の特徴",
        hint: "誰に、何を提供していますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_customers",
        label: "主な顧客",
        hint: "いまの顧客と、これから付き合いたい顧客",
        type: "textarea",
        rows: 1,
      },
      {
        key: "own_resources",
        label: "使える資源",
        hint: "商品・技術・人材・販路・設備・データ・地域との関係",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_issues",
        label: "いまの課題",
        hint: "売上・認知・人手・物流・商品開発",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_ambition",
        label: "やりたいこと",
        hint: "今後3年で実現したいこと",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_offer",
        label: "自社が提供できるもの",
        hint: "福山黒酢や他の参加者へ、無理なく出せるもの",
        type: "textarea",
        rows: 2,
      },
    ],
    tips: {
      title: "共創を考えるときの基本",
      items: [
        "自社に何ができるかだけでなく、福山黒酢と顧客に何が残るかを考える",
        "一度つくって終わりではなく、続けて売れる仕組みを考える",
        "大きな構想より、90日以内に試せる小さな実験から始める",
        "相手の伝統や品質を尊重し、変えてはいけないものを先に確認する",
      ],
    },
  },
  {
    key: "hypothesis",
    no: "②",
    title: "福山黒酢の仮説",
    lead: "福山黒酢と組めそうなことの見当をつけ、現地で聞く質問を決めます。",
    when: "車内 8:50〜9:20",
    fields: [
      {
        key: "kurozu_hypothesis",
        label: "組めそうなこと",
        hint: "自社の資源と、福山黒酢のどこが噛み合いそうですか",
        type: "textarea",
        rows: 3,
      },
      {
        key: "kurozu_questions",
        label: "現地で聞く質問",
        hint: "3つ決めてください。聞かずに帰ると、提案が推測だけになります",
        type: "textarea",
        rows: 3,
      },
    ],
    tips: {
      title: "観察の焦点",
      items: [
        "伝統製法と壺畑（発酵・熟成・職人）",
        "守りたい価値と、変えられる部分",
        "まだ使われていない資源",
        "商品・料理・健康／売場・観光・顧客体験との接点",
      ],
    },
  },
  {
    key: "ideas",
    no: "③",
    title: "共創案づくり",
    lead: "共創案を3つ出して1つに絞ります。壺畑で確かめることも決めます。",
    when: "車内 10:45〜11:20",
    fields: [
      { key: "idea_1", label: "共創案 1", hint: "一言で", type: "text" },
      { key: "idea_2", label: "共創案 2", hint: "一言で", type: "text" },
      { key: "idea_3", label: "共創案 3", hint: "一言で", type: "text" },
      {
        key: "chosen_idea",
        label: "絞った1案",
        hint: "どんな事業にするか、2〜3行で",
        type: "textarea",
        rows: 3,
      },
      {
        key: "chosen_reason",
        label: "選んだ理由",
        hint: "誰のどの課題を、なぜこの案で解決するのか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "check_at_site",
        label: "壺畑で確かめること",
        hint: "この案が成り立つかどうかを決める、現地で見る・聞くこと",
        type: "textarea",
        rows: 2,
      },
    ],
    tips: {
      title: "12:45から1人2分で発表します。この配分で組み立ててください",
      items: [
        "20秒　自社と、現地で見つけた事実",
        "30秒　解決したい顧客・事業の課題",
        "40秒　共創案と、顧客・福山黒酢・自社それぞれのメリット",
        "20秒　90日以内に試すこと",
        "10秒　協力してほしいこと",
      ],
    },
  },
  {
    key: "presentation",
    no: "④",
    title: "発表と講評",
    lead: "1人2分で発表し、福山黒酢さまから講評をいただきます。聞いたことをここに残してください。",
    when: "桷志田 12:45〜13:15（見学・ランチは 11:25〜12:45）",
    fields: [
      {
        key: "site_facts",
        label: "壺畑で確かめたこと",
        hint: "見たこと・聞いたことだけを書く。推測は分ける",
        type: "textarea",
        rows: 3,
      },
      {
        key: "kurozu_feedback",
        label: "福山黒酢さまからの講評",
        hint: "できるだけ、言われたままの言葉で",
        type: "textarea",
        rows: 3,
      },
      {
        key: "peer_feedback",
        label: "参加者からの意見",
        hint: "他の方の発表で、自分の案に使えそうだと思ったこと",
        type: "textarea",
        rows: 2,
      },
    ],
    tips: {
      title: "壺畑で見るところ",
      items: [
        "壺の並べ方、発酵・熟成のさせ方、職人の手の入れ方",
        "レストランと売場。誰が何を買っているか",
        "絶対に守らなければならない価値は何か（必ず聞く）",
      ],
    },
  },
  {
    key: "revise",
    no: "⑤",
    title: "案の見直し",
    lead: "講評を受けて案を直し、90日で試す方法を決めます。",
    when: "車内 13:20〜14:10",
    fields: [
      {
        key: "revised_idea",
        label: "直した共創案",
        hint: "講評と現地で見たことを反映した、最終の案",
        type: "textarea",
        rows: 3,
      },
      {
        key: "keep_value",
        label: "絶対に守らなければならない価値",
        hint: "製法・品質・味・地域性・信頼など、変えてはいけないもの",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_customer",
        label: "顧客と課題",
        hint: "誰の、どの課題を解決するか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_partner_gain",
        label: "福山黒酢の利益",
        hint: "売上・顧客・販路・ブランド",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_own_gain",
        label: "自社の利益",
        hint: "強みが生き、事業として何が残るか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_revenue",
        label: "収益と役割分担",
        hint: "誰が何に払うか。誰が何を担うか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "test_90",
        label: "90日で試す方法",
        hint: "低コストで、90日以内に何をどう試しますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "test_criteria",
        label: "判断基準",
        hint: "継続・修正・中止を、何の数字で決めますか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "first_step",
        label: "90日以内に実行する最初の一歩",
        hint: "いつ、誰が、何をしますか",
        type: "textarea",
        rows: 2,
      },
    ],
  },
];

/** 共創を企画・実行するための3つの関門（しおり THREE GATES）。 */
export const GATES: Field[] = [
  {
    key: "gate_fact",
    label: "事実の関門",
    hint: "現地で見たこと、聞いたことに基づいているか",
    type: "check",
  },
  {
    key: "gate_mutual",
    label: "相互利益の関門",
    hint: "福山黒酢、顧客、自社に継続できる利益が出来上がるか？",
    type: "check",
  },
  {
    key: "gate_action",
    label: "実行の関門",
    hint: "担当者、期限、費用、次の行動が定まっているか",
    type: "check",
  },
];

// ── 一緒に取り組みたい相手 ──────────────────────────
//
// ⑥の「AIレポートでまとめる5つ」の4番目。当日のバスに乗っている人から選ぶ。
// ⚠️ 名簿のうち**お名前・会社・役職だけ**を持つ。電話番号と注文番号は入れない
//    （この画面に置く必要がなく、置けば漏れる先が増えるだけ）。
// ⚠️ このページは noindex ＋ 参加コードの内側にある。会期後はこの配列を空にしてよい。

export type Attendee = { name: string; org: string; role?: string };

export const ATTENDEES: { group: string; people: Attendee[] }[] = [
  {
    group: "参加者",
    people: [
      { name: "髙野 一朗", org: "モーターホーム株式会社", role: "代表" },
      { name: "松下 亮子", org: "ハッピーエイジングプロジェクト", role: "代表理事" },
      { name: "小畑 陽一", org: "株式会社UNCOVER TRUTH", role: "取締役COO" },
      { name: "瀬名波 麻子", org: "Comexposium Japan株式会社", role: "Alliance Manager" },
      { name: "高林 努", org: "株式会社ダブルノット", role: "代表取締役" },
      { name: "松池 恭佑", org: "CityCamp株式会社", role: "CEO" },
      { name: "髙橋 里", org: "forest Inc.", role: "感動プロデューサー＆VP" },
      { name: "平川 陽樹", org: "HINOSASU", role: "代表" },
    ],
  },
  {
    group: "ゲスト",
    people: [{ name: "原 智彦", org: "春日井製菓販売株式会社", role: "おかしな実験室 室長" }],
  },
  {
    group: "運営",
    people: [
      { name: "河野 愛", org: "アイ・プラス株式会社", role: "代表取締役CEO" },
      { name: "吉田 明日香", org: "FOOD JAPAN SUMMIT 事務局" },
      { name: "志立 正嗣", org: "FOOD JAPAN SUMMIT 実行委員会" },
      { name: "梅原 卓也", org: "株式会社グラブデザイン", role: "代表取締役" },
    ],
  },
];

/** ⑥でAIに渡す前に書く項目。 */
export const WRAPUP_FIELDS: Field[] = [
  {
    key: "want_partners_note",
    label: "一緒に取り組みたい相手",
    hint: "上で選んだ方に加えて、社外・社内で誘いたい相手があれば書いてください",
    type: "textarea",
    rows: 2,
  },
];

/** 帰社後の進め方（任意。しおり ACTION PLAN）。 */
export const ROADMAP_FIELDS: Field[] = [
  { key: "road_48h", label: "48時間：現地レポートを社内共有", hint: "担当・期限", type: "text" },
  { key: "road_7d", label: "7日：関係者へ相談・社内会議で実証条件を整理", hint: "日時", type: "text" },
  { key: "road_30d", label: "30日：福山黒酢と実証条件を確認", hint: "予算上限", type: "text" },
  { key: "road_90d", label: "90日：実証を終えて判断", hint: "KPI・判断日", type: "text" },
];

/** 発表後の記録。企画書ができたあとに書く。 */
export const AFTER_FIELDS: Field[] = [
  { key: "after_feedback", label: "帰りの車内でもらった意見", type: "textarea", rows: 2 },
  { key: "after_contact", label: "連絡する相手", hint: "お名前・会社・連絡期限", type: "textarea", rows: 1 },
  { key: "after_first_day", label: "私が最初に動く日", hint: "日付・担当", type: "text" },
];

/** 当日のタイムテーブル（車内ワークの紙のまま）。 */
export const TIMETABLE: { time: string; place: string; work: string }[] = [
  { time: "7:50", place: "宮崎観光ホテル", work: "配車・受付" },
  { time: "8:00", place: "宮崎観光ホテル", work: "出発" },
  { time: "8:15〜8:50", place: "車内", work: "① 自社の棚卸し" },
  { time: "8:50〜9:20", place: "車内", work: "② 福山黒酢の仮説" },
  { time: "9:20〜10:45", place: "霧島神宮", work: "参拝・散策" },
  { time: "10:45〜11:20", place: "車内", work: "③ 共創案づくり" },
  { time: "11:25〜12:45", place: "桷志田", work: "見学・ランチ（壺畑で案を確かめ、質問する）" },
  { time: "12:45〜13:15", place: "桷志田", work: "④ 発表（1人2分）・福山黒酢さまから講評" },
  { time: "13:20〜14:10", place: "車内", work: "⑤ 案の見直し" },
  { time: "14:25〜15:25", place: "霧島酒造", work: "視察・散策" },
  { time: "15:50〜16:40", place: "車内", work: "⑥ AIレポート" },
  { time: "のち", place: "宮崎空港 → 宮崎観光ホテル", work: "解散" },
];

export const TIMETABLE_NOTE = "※道路状況等により時間が前後する場合がございます。";

/** 2分発表の組み立て（しおり FINAL）。発表は④（桷志田 12:45）。 */
export const PITCH_PLAN: { sec: string; what: string }[] = [
  { sec: "20秒", what: "自社と現地で見つけた事実" },
  { sec: "30秒", what: "解決したい顧客・事業の課題" },
  { sec: "40秒", what: "共創案と三者のメリット" },
  { sec: "20秒", what: "90日以内の実験" },
  { sec: "10秒", what: "協力してほしいこと" },
];

/** お持ち帰りいただくもの（紙のまま）。 */
export const TAKEAWAYS = [
  "自社の強みと課題を整理した共創シート",
  "視察先や参加者との共創アイデア",
  "一緒に取り組む可能性のある仲間とのつながり",
  "90日以内に実行するアクションプラン",
];

// ── 福山黒酢の基礎情報 ────────────────────────────
//
// 出典は主催者の配布資料。参加者が現地で見聞きしたものではない。
// ⚠️ ここに書いてよいのは配布資料に載っている事実だけ。推測を足さない。

export type PartnerBrief = { name: string; lines: string[] };

export const PARTNER_BRIEF: PartnerBrief = {
  name: "福山黒酢（桷志田）",
  lines: [
    "福山町では、壺を屋外に並べ、太陽と風、微生物、時間の力で黒酢を発酵・熟成させる伝統製法が受け継がれている。良質な水と温暖な気候、職人の管理が品質を支えている。",
    "代表・津曲泰作が50歳を迎えるのをきっかけに健康を深く考え、さまざまな健康法を試す中でたどり着いたのが、200年に及ぶ伝統製法により黒酢に不可欠な酢酸菌の保存を続けていた赤池力の造った黒酢だった。",
    "200年という年月が育んだ福山町の空気、夏は涼しく冬は暖かい気候、シラス台地が生み出す良質な水、霧島火山帯の地熱といった自然条件と、こだわりの原材料、長期熟成。すべてに手間と時間をかけて造り上げている。",
    "視察では、製造工程だけでなく、壺畑の景観、食事、商品説明、売場づくりを通して、地域の技術を顧客体験へ変える方法を観察する。",
  ],
};

/** 1項目の最大文字数。長文を貼られてAIの費用が跳ねるのを防ぐ。 */
export const FIELDWORK_FIELD_MAX = 1200;

/** 入力の型。すべて文字列で持つ（空欄は ""）。 */
export type FieldworkAnswers = Record<string, string>;

/** 入力のうち、何項目書けたか。 */
export function filledCount(answers: FieldworkAnswers, fields: Field[]): number {
  return fields.filter((f) => (answers[f.key] ?? "").trim() !== "").length;
}

/** すべての入力項目（表紙・関門・発表後を除く本体）。 */
export function allBodyFields(): Field[] {
  return [...SECTIONS.flatMap((s) => s.fields), ...WRAPUP_FIELDS, ...ROADMAP_FIELDS];
}

/** 比較表のキー（`score_xxx_1` 〜 `_3`）。 */
export function compareKeys(): string[] {
  return COMPARE_ROWS.flatMap((r) => COMPARE_COLS.map((c) => `${r.key}_${c.side}`));
}

/** 一緒に取り組みたい相手のチェックボックスのキー。 */
export function attendeeKey(name: string): string {
  return `want_${name.replace(/\s+/g, "")}`;
}

export function attendeeKeys(): string[] {
  return ATTENDEES.flatMap((g) => g.people.map((p) => attendeeKey(p.name)));
}

/** 選ばれた相手を「お名前（会社）」の並びにする。 */
export function selectedAttendees(answers: FieldworkAnswers): string[] {
  const out: string[] = [];
  for (const g of ATTENDEES) {
    for (const p of g.people) {
      if ((answers[attendeeKey(p.name)] ?? "") === "1") out.push(`${p.name}（${p.org}）`);
    }
  }
  return out;
}

// ── AIが作る共創レポート ────────────────────────────────
// 紙の⑥「AIレポートでまとめる5つ」をそのまま1〜5に置き、
// 6以降に提案の中身（提案内容・三者のメリット・収益と役割分担・リスク・90日計画）を足す。
// 付録は、福山黒酢への相談文と、帰社後に2分で説明するときの台本。
//   ※当日の発表（④ 12:45）はこのレポートより前なので、台本は当日用ではない。

export type FieldworkReport = {
  /** 企画名 */
  projectName: string;
  /** 冒頭の要約 */
  summary: string;
  /** 1 解決したい課題 */
  problem: string;
  /** 2 活用したい地域資源 */
  localResources: string;
  /** 3 自社が提供できるもの */
  ownOffer: string;
  /** 4 一緒に取り組みたい相手 */
  partners: string;
  /** 5 90日以内に実行する最初の一歩 */
  firstStep: string;
  /** 6 提案内容 */
  proposal: string;
  /** 7 三者のメリット（顧客・福山黒酢・自社） */
  threeBenefits: string;
  /** 8 収益と役割分担 */
  rolesRevenue: string;
  /** 9 リスクと対応 */
  risks: string;
  /** 10 90日の実証計画と判断基準 */
  plan90: string;
  /** 付録1 福山黒酢への最初の相談文 */
  firstMessage: string;
  /** 付録2 2分で説明するときの台本 */
  pitch: string;
};

/** レポートの見出し（画面と印刷で同じ順・同じ言葉）。 */
export const REPORT_SECTIONS: { key: keyof FieldworkReport; no: string; label: string }[] = [
  { key: "problem", no: "1", label: "解決したい課題" },
  { key: "localResources", no: "2", label: "活用したい地域資源" },
  { key: "ownOffer", no: "3", label: "自社が提供できるもの" },
  { key: "partners", no: "4", label: "一緒に取り組みたい相手" },
  { key: "firstStep", no: "5", label: "90日以内に実行する最初の一歩" },
  { key: "proposal", no: "6", label: "提案内容" },
  { key: "threeBenefits", no: "7", label: "三者のメリット（顧客・福山黒酢・自社）" },
  { key: "rolesRevenue", no: "8", label: "収益と役割分担" },
  { key: "risks", no: "9", label: "リスクと対応" },
  { key: "plan90", no: "10", label: "90日の実証計画と判断基準" },
];

export const EMPTY_REPORT_KEYS: (keyof FieldworkReport)[] = [
  "projectName",
  "summary",
  "problem",
  "localResources",
  "ownOffer",
  "partners",
  "firstStep",
  "proposal",
  "threeBenefits",
  "rolesRevenue",
  "risks",
  "plan90",
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

    // ③のあとに比較点数を差し込む
    if (s.key === "ideas") {
      const scores = COMPARE_ROWS.map((r) => {
        const vals = COMPARE_COLS.map((c) => (answers[`${r.key}_${c.side}`] ?? "").trim());
        if (vals.every((v) => !v)) return null;
        return `・${r.label}: ${COMPARE_COLS.map((c, i) => `${c.label} ${vals[i] || "-"}`).join(" / ")}（5点満点）`;
      }).filter(Boolean);
      if (scores.length) out.push("【③ 共創案の比較点数】", ...(scores as string[]), "");
    }
  }

  const picked = selectedAttendees(answers);
  const note = (answers.want_partners_note ?? "").trim();
  if (picked.length || note) {
    out.push("【一緒に取り組みたい相手】");
    if (picked.length) out.push(...picked.map((p) => `・${p}`));
    if (note) out.push(`・その他: ${note}`);
    out.push("");
  }

  const road = ROADMAP_FIELDS.map((f) => {
    const v = (answers[f.key] ?? "").trim();
    return v ? `・${f.label}: ${v}` : null;
  }).filter(Boolean);
  if (road.length) out.push("【帰社後の進め方】", ...(road as string[]), "");

  return out.join("\n").trim();
}
