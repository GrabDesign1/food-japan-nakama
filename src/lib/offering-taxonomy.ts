// 持ち寄り台帳の分類マスタ（HANDOVER の9分類）。
// 数量書式は DECISIONS 2-2 = C案：食材・原料のみ構造化、他は自由記述。

export type OfferingCategory = {
  key: string; // 日本語ラベルをそのまま key に使う
  icon: string; // 絵文字アイコン
  structuredAmount: boolean; // 数値＋単位で数量を持つか
};

export const OFFERING_CATEGORIES: OfferingCategory[] = [
  { key: "食材・原料", icon: "🥬", structuredAmount: true },
  { key: "加工設備", icon: "🏭", structuredAmount: false },
  { key: "技術・ノウハウ", icon: "🛠", structuredAmount: false },
  { key: "販路・売り場", icon: "🏬", structuredAmount: false },
  { key: "実証の場", icon: "🧪", structuredAmount: false },
  { key: "物流", icon: "🚚", structuredAmount: false },
  { key: "資金・補助", icon: "💴", structuredAmount: false },
  { key: "人材", icon: "🧑‍🌾", structuredAmount: false },
  { key: "地域課題", icon: "🗾", structuredAmount: false },
];

export const CATEGORY_KEYS = OFFERING_CATEGORIES.map((c) => c.key);

export function categoryMeta(key: string): OfferingCategory | undefined {
  return OFFERING_CATEGORIES.find((c) => c.key === key);
}

export function isStructured(key: string): boolean {
  return categoryMeta(key)?.structuredAmount ?? false;
}

// 数量の単位・期間（食材・原料の構造化用）
export const AMOUNT_UNITS = ["t", "kg", "g", "ケース", "箱", "個", "本", "パック", "L", "人", "1ユーザー"];
// 数量の期間。「年」〜「一括」は表示時に「あたり」を付ける（値はDBに保存済みのため変更しない）。
// 2026-08-11 追加：どの期間にも決めきれない場合の逃げ道として「およそ（合計）」「期間は相談」。
export const AMOUNT_PERIODS = ["年", "月", "週", "日", "一括", "およそ（合計）", "期間は相談"];

/** 「あたり」を付けて表示する期間（付けると日本語が壊れるものは除く）。 */
const PERIOD_WITH_SUFFIX = new Set(["年", "月", "週", "日", "一括"]);

/** 期間の表示文言（例：月 → 月あたり／期間は相談 → 期間は相談）。 */
export function formatAmountPeriod(period: string): string {
  return PERIOD_WITH_SUFFIX.has(period) ? `${period}あたり` : period;
}

// 提供時期・希望時期
export const TIMINGS = ["すぐに", "1ヶ月以内", "3ヶ月以内", "時期は相談"];

// 表示名（2026-08-11 ユーザー決定。DB値 GIVE / WANT は互換のため変更しない）
// 正式名は目的が分かるよう括弧書きを添え、ボタンなど短い場所は従来どおりの短い呼び方にする。
export const DIRECTION_LABEL: Record<string, string> = {
  GIVE: "売りたい（提供したい）",
  WANT: "探している（調達したい）",
};

/** カード・バッジなど狭い場所で使う短い表記。 */
export const DIRECTION_SHORT: Record<string, string> = {
  GIVE: "売りたい",
  WANT: "探している",
};

/** 共創プロジェクトの表示名（案件区分の3つ目）。 */
export const PROJECT_LABEL = "共創パートナー募集";

// ── 取引条件（2026-08-10 売りたい改善） ─────────────────────
// 食品カテゴリ（保存・期限・品質などの食品固有項目を出す）
export function isFoodCategory(key: string): boolean {
  return key === "食材・原料";
}
// 物品カテゴリ（状態・受け渡し・発送元を必須にする）
export function isGoodsCategory(key: string): boolean {
  return key === "食材・原料" || key === "加工設備";
}

// 掲載タイプ（2026-08-10 第2次改善）は 2026-08-12 に廃止した。
// 「課題を一緒に解決したい」は共創パートナー募集（/projects）の役割と重なり、
// 売りたい側の入力を長くするだけだったため（ユーザー判断）。DBの listing_purpose 列は残置。
export const SAMPLE_AVAILABILITY = ["可", "応相談", "不可"];
export const PRICE_TAX_TYPES = ["税込", "税別"];

// ── 探している（WANT）改善（2026-08-10 買い手指示書） ─────────────────
// 募集タイプ：[DB値, 表示名, 補足文]
// 募集タイプもカテゴリ群で出し分ける（2026-08-11）。
// モノ向けの6種だけだと、人材・技術・地域課題では当てはまるものがほとんど無かった。
const SEEKING_TYPES_GOODS: [string, string, string][] = [
  ["specific", "特定の商品・原料を探している", "商品名や原料名が決まっている仕入れ・調達です。"],
  ["proposal", "条件に合う商品を提案してほしい", "商品名が未定でもOK。用途や条件に合う提案を募集します。"],
  ["oem", "OEM・PBの製造先を探している", "自社ブランド商品の製造パートナーを探します。"],
  ["surplus", "余剰品・規格外品を探している", "アップサイクルやコスト削減のための調達です。"],
  ["codev", "共同開発できる相手を探している", "一緒に商品をつくる相手を探します。"],
  ["other", "その他", "上記に当てはまらない探しものはこちら。"],
];

const SEEKING_TYPES_SERVICE: [string, string, string][] = [
  ["provider", "対応してくれる相手を探している", "依頼したい内容が決まっています。"],
  ["how_proposal", "やり方から提案してほしい", "進め方が固まっていなくても大丈夫です。"],
  ["spot", "スポット・短期でお願いしたい", "単発の依頼や、繁忙期だけの体制づくりに。"],
  ["ongoing", "継続的にお願いしたい", "長期の委託・常時の体制を前提に探します。"],
  ["partner", "一緒に取り組むパートナーを探している", "受発注ではなく、協業・共同事業として。"],
  ["other", "その他", "上記に当てはまらない探しものはこちら。"],
];

const SEEKING_TYPES_SUPPORT: [string, string, string][] = [
  ["funding", "資金・補助の出し手を探している", "出資、補助制度、支援メニューなど。"],
  ["partner", "一緒に取り組む相手を探している", "地域や事業者と組んで進めたい場合に。"],
  ["expert", "詳しい相手に相談したい", "知見・経験のある事業者や専門家を探します。"],
  ["how_proposal", "進め方の提案がほしい", "課題はあるが、進め方が決まっていない場合に。"],
  ["other", "その他", "上記に当てはまらない探しものはこちら。"],
];

/** 既定（モノ）の募集タイプ。既存の参照との互換のため残す。 */
export const SEEKING_TYPES = SEEKING_TYPES_GOODS;

/** カテゴリに応じた募集タイプ。 */
export function seekingTypesFor(category: string): [string, string, string][] {
  const g = categoryGroup(category);
  if (g === "service") return SEEKING_TYPES_SERVICE;
  if (g === "support") return SEEKING_TYPES_SUPPORT;
  return SEEKING_TYPES_GOODS;
}

// 表示用ラベルは全群の和集合（カテゴリを変えても既存の値が「未知」にならないように）
export const SEEKING_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  [...SEEKING_TYPES_SUPPORT, ...SEEKING_TYPES_SERVICE, ...SEEKING_TYPES_GOODS].map(([v, l]) => [v, l])
);

/** 全群を通した募集タイプのキー（サーバー側の検証用）。 */
export const ALL_SEEKING_TYPE_KEYS = Object.keys(SEEKING_TYPE_LABEL);

// カード表示用の短いラベル
export const SEEKING_TYPE_SHORT: Record<string, string> = {
  specific: "商品指定",
  proposal: "提案募集",
  oem: "OEM・PB",
  surplus: "余剰品・規格外",
  codev: "共同開発",
  provider: "対応先を募集",
  how_proposal: "やり方を提案募集",
  spot: "スポット",
  ongoing: "継続依頼",
  partner: "パートナー募集",
  funding: "資金・補助",
  expert: "相談先を募集",
  other: "その他",
};

// 条件の分類（必須・希望・相談可能をつけて登録する）
// ── カテゴリ群（2026-08-11 追加）─────────────────────────
// 9分類のうち食品・物品向けの入力欄が全カテゴリに出ていて、人材や技術・地域課題では
// 「保存方法」「規格・サイズ」など選べない項目ばかりだった。群ごとに項目を出し分ける。
export type CategoryGroup = "goods" | "service" | "support";

/** モノ（食材・原料／加工設備）／サービス・場・ヒト／資金・地域 の3群。 */
export function categoryGroup(key: string): CategoryGroup {
  if (key === "食材・原料" || key === "加工設備") return "goods";
  if (key === "資金・補助" || key === "地域課題") return "support";
  return "service"; // 技術・ノウハウ／販路・売り場／実証の場／物流／人材
}

const REQUIREMENT_KINDS_GOODS: [string, string][] = [
  ["origin", "産地・地域"],
  ["quantity", "数量・ロット"],
  ["price", "価格"],
  ["delivery", "納期・時期"],
  ["storage", "保存方法"],
  ["spec", "規格・サイズ"],
  ["cert", "認証・検査"],
  ["payment", "支払い方法"],
  ["other", "その他"],
];

const REQUIREMENT_KINDS_SERVICE: [string, string][] = [
  ["area", "対応エリア"],
  ["term", "期間・稼働"],
  ["staffing", "人数・体制"],
  ["experience", "実績・経験"],
  ["license", "資格・許認可"],
  ["fee", "費用・報酬"],
  ["contract", "契約形態"],
  ["payment", "支払い方法"],
  ["other", "その他"],
];

const REQUIREMENT_KINDS_SUPPORT: [string, string][] = [
  ["target_area", "対象エリア"],
  ["schedule", "時期・スケジュール"],
  ["budget", "予算・原資"],
  ["partners", "関係者・体制"],
  ["requirement", "条件・要件"],
  ["other", "その他"],
];

/** 既定（モノ）の分類。既存の参照との互換のため残す。 */
export const REQUIREMENT_KINDS = REQUIREMENT_KINDS_GOODS;

/** カテゴリに応じた条件の分類。 */
export function requirementKindsFor(category: string): [string, string][] {
  const g = categoryGroup(category);
  if (g === "service") return REQUIREMENT_KINDS_SERVICE;
  if (g === "support") return REQUIREMENT_KINDS_SUPPORT;
  return REQUIREMENT_KINDS_GOODS;
}

/** 「条件を追加」したときの初期値。 */
export function defaultRequirementKind(category: string): string {
  return requirementKindsFor(category)[0][0];
}

// 表示用ラベルは全群の和集合（カテゴリを変更しても既存の条件が「未知の値」にならないように）
export const REQUIREMENT_KIND_LABEL: Record<string, string> = Object.fromEntries([
  ...REQUIREMENT_KINDS_SUPPORT,
  ...REQUIREMENT_KINDS_SERVICE,
  ...REQUIREMENT_KINDS_GOODS,
]);

/** 全群を通した条件分類のキー（サーバー側の検証用。群を切り替えても値が失われないように）。 */
export const ALL_REQUIREMENT_KIND_KEYS = Object.keys(REQUIREMENT_KIND_LABEL);

/**
 * 入力例（グレー文字）と一部の見出し。カテゴリ群 × 売りたい／探している で切り替える。
 * 食品前提の例文が人材・技術・地域課題にも出ていて、書き方が伝わらなかったため（2026-08-11）。
 */
export type FormExamples = {
  title: string;
  description: string;
  descriptionLabel: string;
  points: string;
  tags: string;
  area: string;
  usageLabel: string;
  usagePlaceholder: string;
  seekingIntro: string;
};

export function formExamples(category: string, direction: string): FormExamples {
  const isGive = direction === "GIVE";
  const group = categoryGroup(category);

  if (group === "service") {
    return isGive
      ? {
          title: "例：小ロットの惣菜OEM製造を承ります（レトルト対応）",
          descriptionLabel: "この技術・サービスについて",
          description:
            "どのような技術・サービスですか？ 対応できる範囲、設備・体制、実績、進め方などを紹介してください。",
          points: "小ロット（100食）から対応できます\n試作は最短2週間でお出しできます",
          tags: "小ロット, 短納期, レトルト",
          area: "例：九州全域（訪問対応可）",
          usageLabel: "対応できる範囲",
          usagePlaceholder: "",
          seekingIntro: "",
        }
      : {
          title: "例：年末の店頭販売を手伝ってくれる方を探している",
          descriptionLabel: "何を探していますか？（詳しく）",
          description:
            "例：12月の繁忙期に、百貨店の催事で店頭販売をお願いできる方を探しています。\n土日を中心に1日6時間程度、接客経験のある方だと助かります。商品説明はこちらで研修します。",
          points: "毎年12月だけ人手が足りません\n来年以降も継続してお願いする可能性があります",
          tags: "短期, 週2日, 未経験可",
          area: "例：宮崎市内（勤務地）",
          usageLabel: "依頼の背景・目的",
          usagePlaceholder:
            "例：\n・目的：年末催事の売り場運営\n・期間：12月中旬〜12月25日\n・場所：宮崎市内の百貨店\n・人数／体制：2名（交代制）\n・必要な経験・資格：接客経験があれば尚可\n・稼働：1日6時間・週3日程度\n・費用の目安：時給1,200円前後で相談\n・契約形態：業務委託または短期雇用\n\n繁忙期のみの募集ですが、来年以降も継続してお願いできる方を希望しています。",
          seekingIntro:
            "依頼内容が固まっていなくても、目的や条件から募集できます。途中で変更しても入力内容は消えません。",
        };
  }

  if (group === "support") {
    return isGive
      ? {
          title: "例：6次産業化の補助金申請を伴走支援します",
          descriptionLabel: "この支援について",
          description:
            "どのような支援ですか？ 対象、支援できる範囲、進め方、これまでの実績などを紹介してください。",
          points: "申請書の作成から実績報告まで対応できます\n初回相談は無料です",
          tags: "補助金, 事業計画, 伴走支援",
          area: "例：宮崎県内（オンライン可）",
          usageLabel: "支援できる範囲",
          usagePlaceholder: "",
          seekingIntro: "",
        }
      : {
          title: "例：加工場の整備に使える補助金・出資先を探している",
          descriptionLabel: "何を探していますか？（詳しく）",
          description:
            "例：地域の農産物を加工する小規模な工場を整備したいと考えています。\n総額3,000万円程度を見込んでおり、補助金の活用と、一部を出資でまかなう方法を検討しています。事業計画は作成中です。",
          points: "地域の雇用づくりにつながる取り組みです\n自治体とも連携を進めています",
          tags: "補助金, 設備投資, 地域連携",
          area: "例：宮崎県日南市（対象エリア）",
          usageLabel: "背景・目的",
          usagePlaceholder:
            "例：\n・目的：地域の未利用果実を加工して商品化する\n・対象エリア：宮崎県日南市\n・規模／予算：総額3,000万円程度（うち自己資金1,000万円）\n・時期：2027年春の稼働をめざす\n・現在の状況：事業計画を作成中、候補地は確保済み\n・相談したいこと：使える制度、資金の組み立て方、必要な体制\n\n同じような取り組みの経験がある方のご意見もいただきたいです。",
          seekingIntro:
            "進め方が決まっていなくても、課題や目的から募集できます。途中で変更しても入力内容は消えません。",
        };
  }

  // モノ（食材・原料／加工設備）＝従来の例文
  return isGive
    ? {
        title: "例：宮崎産の柑橘を使った香り豊かなクラフトビール",
        descriptionLabel: "この商品・原料について",
        description:
          "どのような商品・原料ですか？ 産地・製法・味わい・用途などを紹介してください。",
        points: "高品質な果実の生産ノウハウがあります\n少量からでも相談可能です",
        tags: "規格外, 加工用, 少量可",
        area: "例：宮崎県 宮崎市",
        usageLabel: "使用目的・販売先",
        usagePlaceholder: "",
        seekingIntro: "",
      }
    : {
        title: "例：クリスマスで使うイチゴを探している",
        descriptionLabel: "何を探していますか？（詳しく）",
        description:
          "例：クリスマスケーキの製造に使用する国産いちごを探しています。\nデコレーション用途のため、粒揃いがよく、色付き・形状が安定したものを希望しています。品種は問いませんが、ケーキに使用した際に見栄えがよく、適度な酸味と甘みがあるものを希望します。",
        points:
          "毎年クリスマスになるとケーキに使ういちごが不足しています\nはじめてのお取引から再発注につながる可能性もございます",
        tags: "規格外, 加工用, 少量可",
        area: "例：東京都 千代田区（納品先）",
        usageLabel: "使用目的・販売先",
        usagePlaceholder:
          "例：\n・用途：クリスマスケーキのデコレーション\n・産地：国産\n・規格：秀品〜優品相当を希望\n・サイズ：M〜L中心（粒揃い希望）\n・荷姿：パック・平詰め等、応相談\n・必要数量：1日あたり50〜100パック程度\n・納品希望：12月20日〜25日\n・納品場所：東京都内店舗\n・価格：相場を踏まえてご相談\n・継続取引：条件が合えば通常期の仕入れも検討\n\nクリスマス期間は使用量が多いため、必要数量を安定して確保したいと考えています。",
        seekingIntro:
          "商品名が決まっていなくても、用途や条件から募集できます。途中で変更しても入力内容は消えません。",
      };
}

/** 数量欄の見出し（カテゴリ群 × 売りたい／探している）。 */
export function amountLabel(category: string, direction: string): string {
  const isGive = direction === "GIVE";
  switch (categoryGroup(category)) {
    case "service":
      return isGive ? "提供できる規模・稼働量" : "必要な人数・稼働量";
    case "support":
      return isGive ? "提供できる規模・件数" : "必要な規模・件数";
    default:
      return isGive ? "提供可能量" : "必要数量";
  }
}

/** 数量欄の入力例（自由記述のとき）。 */
export function amountPlaceholder(category: string): string {
  switch (categoryGroup(category)) {
    case "service":
      return "例：週2日・1名 / 月10時間 / 3か月間";
    case "support":
      return "例：総額500万円規模 / 対象10事業者";
    default:
      return "例：月20ケース / 2〜3店舗 / 1名 など";
  }
}

/** 条件行の入力例。 */
export function requirementPlaceholder(category: string): string {
  switch (categoryGroup(category)) {
    case "service":
      return "例：週2日、現地に来られること";
    case "support":
      return "例：自治体と連携できること";
    default:
      return "例：常温で保存できること";
  }
}

/** 条件セクションの下に出す例文。 */
export function requirementHint(category: string): string {
  switch (categoryGroup(category)) {
    case "service":
      return "例：対応エリア「関東近郊」＝希望／資格・許認可「食品衛生責任者」＝必須／費用・報酬「月20万円まで」＝相談可能／期間・稼働「週2日から」＝希望";
    case "support":
      return "例：対象エリア「宮崎県内」＝必須／予算・原資「補助金の活用を想定」＝希望／時期・スケジュール「2027年3月まで」＝希望";
    default:
      return "例：産地・地域「宮崎県産が望ましい」＝希望／保存方法「常温保存必須」＝必須／価格「〜500円/個で相談可」＝相談可能／支払い方法「請求書払い（振込）・PayPay・応相談」";
  }
}

export const REQUIREMENT_LEVELS: [string, string][] = [
  ["must", "必須"],
  ["want", "希望"],
  ["negotiable", "相談可能"],
];
export const REQUIREMENT_LEVEL_LABEL: Record<string, string> =
  Object.fromEntries(REQUIREMENT_LEVELS);

export const PRICE_TYPES: [string, string][] = [
  ["fixed", "固定価格"],
  ["free", "無償"],
  ["negotiable", "応相談"],
];
export const PRICE_UNITS = [
  "円/kg", "円/g", "円/t", "円/個", "円/箱", "円/ケース", "円/本", "円/パック", "円/L", "円/式", "円/月", "円/回", "円/人", "円/1ユーザー",
];
export const ITEM_CONDITIONS = ["生鮮", "冷蔵", "冷凍", "乾燥", "加工直後・湿潤", "常温品", "中古", "その他"];
export const STORAGE_TYPES = ["常温", "冷蔵", "冷凍", "乾燥", "その他"];
export const SUPPLY_FREQUENCIES = ["今回限り", "毎週", "毎月", "季節限定", "応相談"];
export const DELIVERY_METHODS = ["現地引取", "配送可能", "応相談"];
export const SHIPPING_BEARERS = ["応相談", "売り手負担", "買い手負担"];

// 希望価格を表示用テキストに整形
export function formatPrice(o: {
  priceType: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
}): string | null {
  if (o.priceType === "free") return "無償";
  if (o.priceType === "fixed" && o.priceAmount != null) {
    return `${o.priceAmount.toLocaleString()}${o.priceUnit ?? "円"}`;
  }
  if (o.priceType === "negotiable") {
    return o.priceAmount != null
      ? `${o.priceAmount.toLocaleString()}${o.priceUnit ?? "円"}（応相談）`
      : "価格応相談";
  }
  return null;
}

// 募集期限を表示用テキストに整形（切れている場合は目印）
export function formatDeadline(d: Date | string | null): string | null {
  if (!d) return null;
  const date = new Date(d);
  const label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日まで`;
  return date.getTime() < Date.now() ? `${label}（募集終了）` : label;
}

// 数量を表示用テキストに整形
export function formatAmount(o: {
  amountValue: number | null;
  amountUnit: string | null;
  amountPeriod: string | null;
  amountText: string | null;
}): string | null {
  if (o.amountValue != null && o.amountUnit) {
    const period = o.amountPeriod ? `${formatAmountPeriod(o.amountPeriod)} ` : "";
    return `${period}${o.amountValue}${o.amountUnit}`;
  }
  return o.amountText || null;
}
