// 共創フィールドワークの入力項目（2026-11-18 霧島・都城バスフィールドワーク）。
//
// 出典は配布資料「FOOD JAPAN SUMMIT 2026 in MIYAZAKI 旅のしおり ＋ 共創メソッド」
// （WORK 1〜7／ワークブック p.1〜p.11）。
// **紙とデジタルの両方を当日配る**ので、見出し番号（WORK 1〜7）・項目名・説明文は
// 紙と一字一句そろえる（参加者が紙とスマホを行き来するため、言葉が違うと迷う）。
//
// 2026-11-14 変更: 西製茶の視察が中止になり、霧島酒造へ差し替わった。
//   共創の相手は**福山黒酢の1社だけ**（霧島神宮は参拝・散策、霧島酒造は視察のみで、
//   どちらも共創案の対象にしない）。西製茶の項目・比較表・基礎情報はすべて削除した。
//
// ⚠️ ここはクライアントからも読み込む。サーバー専用のもの（prisma, 環境変数）を入れない。
// ⚠️ 紙の WORK 7「AIで1枚の共創レポートを作る」は、紙では WORK 1〜6 に書いたことを
//    AI欄へ書き写す工程。デジタルでは WORK 1〜6 がそのままAIへ渡るので二度書きさせない
//    （代わりに「AIへ渡す内容の確認」画面を WORK 7 として出す。項目は落としていない）。

/** 当日の共通コード。参加者に口頭＋紙で配る。 */
export const FIELDWORK_CODE = "FW1118";

/** どのフィールドワークか。 */
export const FIELDWORK_EVENT_KEY = "miyazaki-2026-1118";
export const FIELDWORK_EVENT_NAME = "FOOD JAPAN SUMMIT 2026 in MIYAZAKI 共創フィールドワーク";
export const FIELDWORK_EVENT_DATE = "2026年11月18日（水）霧島・都城バスフィールドワーク";

/** 共創の相手。今回は1社だけなので定数で持つ（選択させない）。 */
export const FIELDWORK_PARTNER = "福山黒酢（桷志田）";

/** 表紙のタイトル。 */
export const FIELDWORK_TITLE = ["福山黒酢の現場から", "自社との新しい事業をつくる"];

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
  /** 紙の見出し番号（WORK n） */
  no: string;
  title: string;
  lead: string;
  /** いつ書くか。画面で「いま書くところ」を示すために使う */
  when: string;
  fields: Field[];
  /** 紙の「観察の焦点」など、入力ではない補助文 */
  tips?: { title: string; items: string[] };
};

/** 表紙の3項目。 */
export const COVER_FIELDS: Field[] = [
  { key: "name", label: "氏名", type: "text" },
  { key: "company", label: "会社・団体", type: "text" },
  { key: "team", label: "チーム", type: "text" },
];

/** 共創を実行に変える7ステップ（しおり METHOD / ワークブック p.3）。 */
export const METHOD_STEPS: { no: string; title: string; note: string }[] = [
  { no: "1", title: "自社を知る", note: "強みと課題" },
  { no: "2", title: "相手を観察", note: "現場の事実" },
  { no: "3", title: "課題を確認", note: "本人の言葉" },
  { no: "4", title: "相互利益か？", note: "双方に価値が残るか？" },
  { no: "5", title: "小さく試す", note: "90日テスト" },
  { no: "6", title: "合意形成", note: "懸念を条件へ" },
  { no: "7", title: "判断", note: "継続・修正・中止" },
];

/**
 * WORK 4 の比較表（ワークブック p.7）。共創案A・共創案Bに同じ6項目を5段階でつける。
 * 項目名は紙のまま。
 */
export const COMPARE_ROWS = [
  { key: "score_customer_issue", label: "福山黒酢を購入する方の課題解決度" },
  { key: "score_partner_profit", label: "福山黒酢の利益" },
  { key: "score_own_profit", label: "自社の利益" },
  { key: "score_demand", label: "顧客の需要・ニーズを満足させられるか？" },
  { key: "score_90days", label: "90日で小さくテストができるか？" },
  { key: "score_execution", label: "実行力：社内の体制づくりが可能か？" },
];

/** 比較表の列（紙は「共創案A」「共創案B」の2列）。 */
export const COMPARE_COLS = [
  { side: "a", label: "共創案A" },
  { side: "b", label: "共創案B" },
] as const;

export const SECTIONS: Section[] = [
  {
    key: "own",
    no: "1",
    title: "自社の棚卸し",
    lead: "まず、自社の強み・持っているもの・実現したいことを整理します。",
    when: "バス内 8:10–8:45",
    fields: [
      {
        key: "own_business",
        label: "事業の特徴",
        hint: "誰に何を提供しているか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_customers",
        label: "主な顧客",
        hint: "現在の顧客と、今後付き合いたい顧客",
        type: "textarea",
        rows: 1,
      },
      {
        key: "own_strengths",
        label: "強み・資源",
        hint: "商品・技術・人材・販路・設備・データ",
        type: "textarea",
        rows: 2,
      },
      {
        key: "own_issues",
        label: "現在の課題",
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
        label: "提供できるもの",
        hint: "福山黒酢へ無理なく提供できるもの",
        type: "textarea",
        rows: 2,
      },
    ],
    tips: {
      title: "共創を考えるときの基本",
      items: [
        "自社に何ができるかだけでなく、福山黒酢と顧客にどのような利益が残るかを考える",
        "商品を一度つくって終わりではなく、継続して売れる仕組みを考える",
        "大きな構想より、90日以内に試せる小さな実験から始める",
        "相手の伝統や品質を尊重し、変えてはいけないものを先に確認する",
      ],
    },
  },
  {
    key: "hypothesis",
    no: "2",
    title: "福山黒酢への仮説と質問",
    lead: "視察前に、組める可能性と現地で聞くことを決めておきます。",
    when: "バス内 8:45–9:10（視察前）",
    fields: [
      {
        key: "kurozu_hypothesis",
        label: "自社と組めそうな点",
        hint: "あなたの事業と福山黒酢は、どのような点で組めそうですか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_questions",
        label: "現地で確認する質問 3つ",
        hint: "聞かずに帰ると、提案が推測だけになります",
        type: "textarea",
        rows: 3,
      },
    ],
    tips: {
      title: "観察の焦点",
      items: [
        "伝統製法と壺畑",
        "守りたい価値と課題",
        "未活用の資源",
        "顧客・販路・体験との接点",
      ],
    },
  },
  {
    key: "material",
    no: "3",
    title: "福山黒酢で集めた材料",
    lead: "視察で見たこと・聞いたことを、提案の材料として書き留めます。",
    when: "移動中 11:00–11:40 ／ 視察後 13:40–14:25",
    fields: [
      {
        key: "kurozu_facts",
        label: "現地で見つけた事実",
        hint: "壺畑、発酵・熟成、職人、商品、料理、売場、顧客体験。見たこと・聞いたことだけを書く",
        type: "textarea",
        rows: 3,
      },
      {
        key: "kurozu_issues",
        label: "福山黒酢の悩み・課題",
        hint: "できるだけ本人の言葉で",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_keep",
        label: "絶対に守らなければならない価値",
        hint: "製法、品質、味、地域性、信頼など、変えてはいけないもの",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_change",
        label: "変えられる部分",
        hint: "商品、用途、顧客、デザイン、売り方、体験、伝え方",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_fit",
        label: "自社の資源との接点",
        hint: "自社の商品、技術、顧客、販路、発信力などと接続できる点",
        type: "textarea",
        rows: 2,
      },
      {
        key: "kurozu_ideas",
        label: "共創アイデア 3案",
        hint: "課題解決・新しい用途・顧客・体験の切り口で3つ出す",
        type: "textarea",
        rows: 4,
      },
    ],
    tips: {
      title: "観察の焦点",
      items: [
        "伝統製法と壺畑（発酵・熟成・職人）",
        "商品・料理・健康",
        "売場・観光・顧客体験",
        "守る価値と、変えられる部分",
      ],
    },
  },
  {
    key: "choose",
    no: "4",
    title: "共創案の比較と選定",
    lead: "点数と対話から1案を選び、企画名と選定理由を決めます。",
    when: "帰路バス内 15:25–15:45",
    fields: [
      {
        key: "idea_a",
        label: "共創案A",
        hint: "一言で（比較表のA列はこの案です）",
        type: "text",
      },
      {
        key: "idea_b",
        label: "共創案B",
        hint: "一言で（比較表のB列はこの案です）",
        type: "text",
      },
      {
        key: "project_name",
        label: "企画名",
        hint: "一言で内容が伝わる名前",
        type: "text",
      },
      {
        key: "chosen_reason",
        label: "選定理由",
        hint: "誰のどの課題を、なぜこの案で解決するのか",
        type: "textarea",
        rows: 2,
      },
    ],
  },
  {
    key: "business",
    no: "5",
    title: "三者に利益が残る事業設計",
    lead: "顧客・福山黒酢・自社の三者に価値が残るかを確認します。",
    when: "帰路バス内 15:25–15:45",
    fields: [
      {
        key: "biz_customer",
        label: "顧客",
        hint: "誰の、どの課題を解決するか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_value",
        label: "提供価値",
        hint: "何がどう良くなるか",
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
        label: "収益",
        hint: "誰が何に払うか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_roles",
        label: "役割分担",
        hint: "誰が何を担うか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_experiment",
        label: "最小実験",
        hint: "90日以内に何を試すか",
        type: "textarea",
        rows: 2,
      },
      {
        key: "biz_criteria",
        label: "判断基準",
        hint: "継続・修正・中止を何で決めるか",
        type: "textarea",
        rows: 2,
      },
    ],
  },
  {
    key: "internal",
    no: "6",
    title: "社内の合意形成",
    lead: "承認を得るために、相手ごとに必要な説明を分けておきます。",
    when: "帰路バス内 15:25–15:45 ／ 帰社後",
    fields: [
      {
        key: "map_decider",
        label: "決める人：最終決裁者",
        hint: "必要な根拠と承認事項",
        type: "textarea",
        rows: 2,
      },
      {
        key: "map_doer",
        label: "動かす人：実行責任者",
        hint: "担当・時間・予算",
        type: "textarea",
        rows: 2,
      },
      {
        key: "map_skeptic",
        label: "話しを聞く人：慎重な部門",
        hint: "品質・法務・調達・物流・収益の懸念",
        type: "textarea",
        rows: 2,
      },
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
        key: "approval_conditions",
        label: "懸念を置き換える「安全に試す条件」",
        hint: "反対意見は、実証を安全に進めるための条件に置き換えます",
        type: "textarea",
        rows: 2,
      },
      {
        key: "road_48h",
        label: "48時間：現地レポートを社内共有",
        hint: "担当・期限",
        type: "text",
      },
      {
        key: "road_7d",
        label: "7日：関係者へ個別相談／社内会議で実証条件を整理",
        hint: "日時。企画書にまとめ、福山黒酢へのアポイントメントを取るところまで",
        type: "text",
      },
      {
        key: "road_30d",
        label: "30日：福山黒酢と実証条件を確認",
        hint: "予算上限",
        type: "text",
      },
      {
        key: "road_90d",
        label: "90日：実証を終えて判断",
        hint: "KPI／継続・修正・中止の判断日",
        type: "text",
      },
    ],
    tips: {
      title: "社内合意の考え方",
      items: [
        "合意形成とは、全員の賛成を待つことではありません。懸念を早く見つけ、「どの条件なら小さく試せるか」に変えることです。",
        "社内担当者・期限・予算上限・KPI・判断日を一枚にします。",
      ],
    },
  },
];

/** 共創を企画・実行するための3つの関門（しおり THREE GATES / ワークブック p.3）。 */
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

/** 発表後の記録。企画書ができたあとに書く。 */
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

/** 当日のタイムテーブル（しおり FIELD ROUTE / BUS WORK と同じ）。入力ではなく手元の確認用。 */
export const TIMETABLE: { time: string; place: string; work: string }[] = [
  { time: "7:50", place: "宮崎観光ホテル 配車・受付", work: "乗車・チーム確認" },
  { time: "8:00", place: "宮崎観光ホテル 出発", work: "目的共有・役割決定" },
  { time: "8:10–8:45", place: "バス内", work: "WORK 1 自社の棚卸し（特徴・資源・課題・やりたいこと）" },
  { time: "8:45–9:10", place: "バス内", work: "WORK 2 福山黒酢の仮説（組める可能性と現地で聞く質問）" },
  { time: "9:20–11:00", place: "霧島神宮", work: "参拝・境内散策" },
  { time: "11:00–11:40", place: "移動", work: "観察ポイントの確認（守る価値・課題・未活用資源）" },
  { time: "11:40–13:40", place: "福山黒酢「黒酢ガーデン壺畑／桷志田」", work: "壺畑視察・昼食・交流・共創の材料集め" },
  { time: "13:40–14:25", place: "移動", work: "WORK 3 発見の共有と共創案を3つ出す" },
  { time: "14:25–15:25", place: "霧島酒造 志比田工場（霧島ファクトリーガーデン）", work: "視察・庭園散策・買い物" },
  { time: "15:25–15:45", place: "帰路バス内", work: "WORK 4・5・6 案を比較し1案に絞る／事業設計／社内合意" },
  { time: "15:45–16:10", place: "帰路バス内", work: "WORK 7 AIレポートと2分発表・90日テストの宣言" },
  { time: "16:10", place: "宮崎空港 到着", work: "空港降車者 解散" },
  { time: "17:00", place: "宮崎観光ホテル 到着", work: "解散" },
];

/** 2分発表の組み立て（しおり FINAL / ワークブック p.11）。 */
export const PITCH_PLAN: { sec: string; what: string }[] = [
  { sec: "20秒", what: "自社と現地で見つけた事実" },
  { sec: "30秒", what: "解決したい顧客・事業の課題" },
  { sec: "40秒", what: "共創案と三者のメリット" },
  { sec: "20秒", what: "90日以内の実験" },
  { sec: "10秒", what: "協力してほしいこと" },
];

/** 帰社後のロードマップ（しおり ACTION PLAN / ワークブック p.9）。 */
export const ROADMAP: { when: string; what: string }[] = [
  { when: "48時間", what: "現地レポートを社内共有" },
  { when: "7日", what: "関係者へ個別相談／社内会議で実証条件を整理" },
  { when: "30日", what: "福山黒酢と実証条件を確認" },
  { when: "90日", what: "実証を終えて判断" },
];

// ── 視察先の基礎情報 ────────────────────────────────
//
// 出典は配布資料「旅のしおり ＋ 共創メソッド」および当日の進行スライド。
// 紙のワークブックの記入欄には載っていない。
//
// なぜ入れるか: この情報が無いと、AIは「黒酢」程度の抽象度でしか書けない。
//   壺畑・酢酸菌・シラス台地・霧島火山帯の地熱まで渡すと、提案内容が具体的になる。
//   参加者が現地で聞いたことと取り違えないよう、企画書を作るときは
//   **主催者資料として出典を明示して**渡す。
//
// ⚠️ ここに書いてよいのは主催者資料に載っている事実だけ。推測を足さない。
//    記載が古くなった場合は11/18までに主催者資料と突き合わせて直すこと。

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

/** 入力のうち、何項目書けたか。画面の進み具合に使う。 */
export function filledCount(answers: FieldworkAnswers, fields: Field[]): number {
  return fields.filter((f) => (answers[f.key] ?? "").trim() !== "").length;
}

/** すべての入力項目（表紙・関門・発表後を除く本体）。 */
export function allBodyFields(): Field[] {
  return SECTIONS.flatMap((s) => s.fields);
}

/** 比較表のキー（`score_xxx_a` / `score_xxx_b`）。 */
export function compareKeys(): string[] {
  return COMPARE_ROWS.flatMap((r) => COMPARE_COLS.map((c) => `${r.key}_${c.side}`));
}

// ── AIが作る共創企画書 ────────────────────────────────────
// 構成は紙の WORK 7「AIで1枚の共創レポートを作る」が指定している
//   企画名／顧客と課題／提案内容／三者のメリット／役割分担と収益／
//   リスクと対応／90日実証とKPI／社内承認事項
// をそのまま使う。「三者のメリット」は読みやすさのため顧客・福山黒酢・自社の3節に分けた。
// summary（リード文）と firstMessage（相談文）と pitch（2分発表の台本）を足している。
//   summary: 企画書の1枚目に要約が無いと、決裁者が読む前に置かれる。
//   firstMessage: 7日以内に福山黒酢へアポイントメントを取るところまでが宿題なので、送れる文面を出す。
//   pitch: 当日15:45から2分発表がある。しおり FINAL の秒数配分に沿った台本を出す。

export type FieldworkReport = {
  /** 企画名 */
  projectName: string;
  /** 企画書の冒頭に置く2〜3行の要約 */
  summary: string;
  /** 1 顧客と課題 */
  customerProblem: string;
  /** 2 提案内容 */
  proposal: string;
  /** 3 顧客のメリット */
  benefitCustomer: string;
  /** 4 福山黒酢のメリット */
  benefitPartner: string;
  /** 5 自社のメリット */
  benefitOwn: string;
  /** 6 役割分担と収益 */
  rolesRevenue: string;
  /** 7 リスクと対応 */
  risks: string;
  /** 8 90日実証とKPI */
  plan90: string;
  /** 9 社内承認事項 */
  approval: string;
  /** 付録1 福山黒酢への最初の相談文（そのまま送れる文面） */
  firstMessage: string;
  /** 付録2 2分発表の台本 */
  pitch: string;
};

/** 企画書の見出し（画面と印刷で同じ順・同じ言葉を使う）。 */
export const REPORT_SECTIONS: { key: keyof FieldworkReport; no: string; label: string }[] = [
  { key: "customerProblem", no: "1", label: "顧客と課題" },
  { key: "proposal", no: "2", label: "提案内容" },
  { key: "benefitCustomer", no: "3", label: "顧客のメリット" },
  { key: "benefitPartner", no: "4", label: "福山黒酢のメリット" },
  { key: "benefitOwn", no: "5", label: "自社のメリット" },
  { key: "rolesRevenue", no: "6", label: "役割分担と収益" },
  { key: "risks", no: "7", label: "リスクと対応" },
  { key: "plan90", no: "8", label: "90日実証とKPI" },
  { key: "approval", no: "9", label: "社内承認事項" },
];

export const EMPTY_REPORT_KEYS: (keyof FieldworkReport)[] = [
  "projectName",
  "summary",
  "customerProblem",
  "proposal",
  "benefitCustomer",
  "benefitPartner",
  "benefitOwn",
  "rolesRevenue",
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
    out.push(`【WORK ${s.no} ${s.title}】`, ...(lines as string[]), "");
  }
  // WORK 4 の比較点数（書かれていれば判断の根拠として渡す）
  const nameA = (answers.idea_a ?? "").trim();
  const nameB = (answers.idea_b ?? "").trim();
  const scores = COMPARE_ROWS.map((r) => {
    const a = (answers[`${r.key}_a`] ?? "").trim();
    const b = (answers[`${r.key}_b`] ?? "").trim();
    if (!a && !b) return null;
    return `・${r.label}: 共創案A ${a || "-"} / 共創案B ${b || "-"}（5点満点）`;
  }).filter(Boolean);
  if (scores.length) {
    out.push(
      "【WORK 4 共創案の比較点数】",
      `・共創案A: ${nameA || "（未記入）"}`,
      `・共創案B: ${nameB || "（未記入）"}`,
      ...(scores as string[]),
      "",
    );
  }
  return out.join("\n").trim();
}
