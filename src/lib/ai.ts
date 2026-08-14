// 掲載文の下書き支援（2026-08-14・「売りたい」で試験導入）。
//
// なぜ入れるか: 掲載が積み上がらない一番の理由は、必須項目が13〜15個あって
// 「何をどう書けばいいか分からない」ところで手が止まること。
// 3〜4行のメモから各項目の**下書き**を出し、本人が直して保存する形にする。
//
// なぜ OpenAI か: すでに請求とダッシュボードがあるため（2026-08-14 ユーザー判断）。
// 取引先を増やさない判断であって、性能で選んだわけではない。
// 事業者を替えるときは**このファイルだけ**を書き換えればよい（画面と Server Action は provider を知らない）。
//
// 使わない場所（重要）:
//   会員間の非公開メッセージには一切使わない。規約第17条で
//   「当社は、会員間の非公開メッセージを、AI等の学習、分析または営業目的に利用しません」と
//   約束しており、電気通信事業（通信の秘密）の観点でも触れてはいけない。
//   ここで外部へ送るのは、**掲載する前提で本人が書いたメモと、掲載項目の値だけ**。
//
// 未設定時の扱い: OPENAI_API_KEY が無ければ AI_ENABLED=false。
// Stripe と同じで、鍵が無い環境では機能ごと出さない（画面にボタンを出さない）。
import OpenAI, { RateLimitError } from "openai";
import { AI_DRAFT_MEMO_MAX, AI_DRAFT_TAG_MAX, type OfferingDraft } from "@/lib/ai-draft-core";
import { AI_PROFILE_MEMO_MAX, type ProfileDraft } from "@/lib/ai-profile-core";
import {
  CATEGORY_L1,
  MEMBER_CATEGORIES,
  PREFECTURES,
  SIZES,
  START_TIMINGS,
} from "@/lib/member-taxonomy";

// 型と定数は ai-draft-core.ts（クライアントからも読み込める）。従来どおりここからも使えるように再輸出する。
export * from "@/lib/ai-draft-core";
export * from "@/lib/ai-profile-core";

const apiKey = process.env.OPENAI_API_KEY;

/** APIキーが設定されているか。false のときは画面にボタンを出さない。 */
export const AI_ENABLED = !!apiKey;

const client = apiKey
  ? new OpenAI({
      apiKey,
      // 下書きは対話中の待ち時間になるので、長く待たせずに諦めて再試行を促す
      timeout: 90_000,
      maxRetries: 1,
    })
  : null;

/** 会員あたり24時間の生成回数。書き直しを何度か試せて、暴走はしない程度。 */
export const AI_DRAFT_DAILY_LIMIT = 20;

// 1回あたりの目安: 入力1,500 / 出力800トークン ≒ 2円（gpt-5.6-terra: $2/$12 per 1M）。
// もっと安くするなら gpt-5.6-luna（$0.20/$1.20 ≒ 0.2円）。ただし下書きの質が落ちると
// 会員が書き直す手間に跳ね返るので、実物を見てから下げること。
const MODEL = "gpt-5.6-terra";

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description:
        "掲載タイトル。何を売っているかが一目で分かる30文字以内。すでにタイトルが入力されている場合は、それをそのまま返す。",
    },
    tagline: {
      type: "string",
      description: "一言で伝わる特徴。40文字以内の1文。材料が足りなければ空文字。",
    },
    description: {
      type: "string",
      description:
        "商品・原料そのものの説明。何であるか・どんな品質かが分かる150〜300文字。材料が足りなければ空文字。",
    },
    specification: {
      type: "string",
      description:
        "品質・規格。容量・入数・等級・産地・認証・保存条件など、**メモに書かれている事実だけ**を並べる。80文字以内。書かれていなければ必ず空文字。推測は禁止。**供給できる数量や価格はこの項目に書かない**（別の入力欄があるため）。",
    },
    shelfLifeText: {
      type: "string",
      description:
        "賞味期限・取扱期限。**メモに日数や期限が書かれている場合だけ**その表記を使う。40文字以内。書かれていなければ必ず空文字。推測は禁止。",
    },
    featureDiff: {
      type: "string",
      description:
        "他の商品と何が違うか。80〜200文字。メモに違いが書かれていなければ空文字。",
    },
    backgroundStory: {
      type: "string",
      description:
        "なぜ作った・販売したいのか。80〜200文字。メモに背景が書かれていなければ空文字。",
    },
    usageIdeas: {
      type: "string",
      description:
        "どんな売り場・料理・用途に合うか。80〜200文字。メモの内容から無理なく言える範囲にとどめる。",
    },
    desiredPartner: {
      type: "string",
      description:
        "どんな相手と取引したいか。60〜150文字。メモに希望が無ければ、商品の性質から自然に考えられる業種を挙げる。",
    },
    points: {
      type: "string",
      description:
        "買い手に効くおすすめポイント。**1行に1つ**、改行区切りで2〜4行。1行は30文字以内。記号や番号は付けない。ほかの項目に書いた内容の繰り返しにしない。",
    },
    tags: {
      type: "string",
      description:
        "検索に使う短い語を、半角カンマ区切りで最大8個。1語は10文字以内。#は付けない。産地・原料・商品カテゴリ・用途など、メモから確実に言えるものだけ。",
    },
  },
  // strict: true では全プロパティを required にし、additionalProperties を false にする必要がある
  required: [
    "title",
    "tagline",
    "description",
    "specification",
    "shelfLifeText",
    "featureDiff",
    "backgroundStory",
    "usageIdeas",
    "desiredPartner",
    "points",
    "tags",
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `あなたは日本の食品・飲料業界のBtoB取引に詳しい編集者です。
生産者や食品事業者が書いた短いメモをもとに、業務用マーケットプレイス「FOOD JAPAN NAKAMA」に載せる掲載文の**下書き**を作ります。読み手は飲食店・小売・卸などの仕入れ担当者です。

必ず守ること:
- メモに書かれていない事実を作らない。産地・原材料・製法・受賞歴・認証・数量・価格・取引実績・企業名は、メモに無ければ書かない。
- 材料が足りない項目は、埋めようとせず空文字("")を返す。空欄のほうが、間違いを載せるよりよい。
- とくに「品質・規格」と「賞味・取扱期限」は食品衛生と取引条件に直結する。メモに書かれていなければ**必ず空文字**にし、一般論や推測で埋めない。
- 「日本一」「最高級」「業界初」など、根拠なく優良だと誤解させる表現を使わない。
- 健康効果・効能・医薬品のような効き目をうたわない（健康増進法・景品表示法）。
- 感嘆符や絵文字は使わない。事実と用途が分かる、落ち着いた「です・ます」調で書く。
- 買い手が判断するための文章であって、広告のあおり文句ではない。
- 各項目には、その項目で聞かれていることだけを書く。**他の項目に書いた内容を繰り返さない**。書くことが残っていない項目は空文字にする。`;

export type DraftResult = { draft: OfferingDraft } | { error: string };

/**
 * メモから掲載文の下書きを作る。
 * 出力は本人が直す前提の下書きなので、そのまま保存はしない（呼び出し側でフォームに入れるだけ）。
 */
export async function draftOfferingCopy(params: {
  category: string;
  title: string;
  area: string;
  memo: string;
}): Promise<DraftResult> {
  if (!client) return { error: "この機能は現在ご利用いただけません。" };

  const memo = params.memo.trim().slice(0, AI_DRAFT_MEMO_MAX);
  if (memo.length < 10) {
    return { error: "メモをもう少し詳しく書いてください（10文字以上）。" };
  }

  const known = [
    `カテゴリ: ${params.category || "（未選択）"}`,
    params.title ? `タイトル: ${params.title}` : null,
    params.area ? `発送元・受渡地域: ${params.area}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await client.responses.create({
      model: MODEL,
      max_output_tokens: 4000,
      // JSONスキーマで形を固定する（項目の抜けや余計なキーが混ざらない）
      text: { format: { type: "json_schema", name: "offering_draft", schema: DRAFT_SCHEMA, strict: true } },
      input: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `次のメモから、掲載ページの各項目の下書きを作ってください。

【すでに入力されている情報】
${known}

【出品者のメモ】
${memo}`,
        },
      ],
    });

    // 安全上の理由で断られたときは refusal が返る（本文は入っていない）
    const message = res.output.find((o) => o.type === "message");
    if (message?.content?.some((c) => c.type === "refusal")) {
      return { error: "この内容では下書きを作れませんでした。表現を変えてお試しください。" };
    }
    const text = res.output_text;
    if (!text) return { error: "下書きを作れませんでした。時間をおいてお試しください。" };

    const parsed = JSON.parse(text) as Record<string, unknown>;
    const pick = (k: keyof OfferingDraft) =>
      typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "";
    // タグは数を数えるのはこちらの仕事（指示だけに任せると多すぎることがある）
    const tags = pick("tags")
      .split(/[,、]/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, AI_DRAFT_TAG_MAX)
      .join(", ");
    return {
      draft: {
        title: pick("title"),
        tagline: pick("tagline"),
        description: pick("description"),
        specification: pick("specification"),
        shelfLifeText: pick("shelfLifeText"),
        featureDiff: pick("featureDiff"),
        backgroundStory: pick("backgroundStory"),
        usageIdeas: pick("usageIdeas"),
        desiredPartner: pick("desiredPartner"),
        points: pick("points"),
        tags,
      },
    };
  } catch (e) {
    console.error("[ai] 下書きの生成に失敗:", e);
    if (e instanceof RateLimitError) {
      // 429 には2種類ある。残高切れは会員が待っても直らない（こちらが入金するしかない）ので、
      // 「少し時間をおいて」とは言わない。運用者が気づけるようにログも分ける。
      const code = (e as { code?: string }).code;
      if (code === "insufficient_quota" || code === "credit_balance_exhausted") {
        console.error(
          "[ai] ⚠️ APIの残高切れです。OpenAIのBillingでクレジットを追加するまで下書きは作れません。"
        );
        return { error: "ただいま下書きの作成はご利用いただけません。恐れ入りますが手入力でお願いします。" };
      }
      return { error: "混み合っています。少し時間をおいてお試しください。" };
    }
    return { error: "下書きを作れませんでした。時間をおいてお試しください。" };
  }
}

// ── プロフィールの下書き（2026-08-14） ─────────────────────────
// 台帳（売りたい）と同じ考え方。項目が「会社の紹介」に変わるだけ。
// 会員自身のことなので、掲載文よりさらに事実確認が効きにくい。作らせないことを最優先にする。

// 全ての細分類（大分類ごとの入れ子を平らにしたもの）
const ALL_L2 = MEMBER_CATEGORIES.flatMap((c) => c.l2);

const PROFILE_SCHEMA = {
  type: "object",
  properties: {
    // ── 基本情報。会社の素性なので、メモに書かれていなければ必ず空文字 ──
    name: {
      type: "string",
      description: "事業者名（会社名・屋号）。メモに書かれていなければ空文字。省略形にせず書かれたまま。",
    },
    contactName: {
      type: "string",
      description: "担当者の氏名。メモに書かれていなければ空文字。読みがなは推測しない（この項目には書かない）。",
    },
    categoryL1: {
      type: "string",
      enum: [...CATEGORY_L1, ""],
      description: "会員種別の大分類。メモの事業内容から明らかに判断できるときだけ選ぶ。迷えば空文字。",
    },
    categoryL2: {
      type: "string",
      enum: [...ALL_L2, ""],
      description: "会員種別の細分類。必ず大分類に属するものを選ぶ。迷えば空文字。",
    },
    prefecture: {
      type: "string",
      enum: [...PREFECTURES, ""],
      description: "都道府県。メモに地名が書かれている場合だけ。書かれていなければ空文字。",
    },
    city: {
      type: "string",
      description: "市区町村。メモに書かれていなければ空文字。20文字以内。",
    },
    postalCode: {
      type: "string",
      description: "郵便番号（例：8890111）。メモに書かれていなければ空文字。推測は禁止。",
    },
    address: {
      type: "string",
      description: "番地・建物名。メモに書かれていなければ空文字。推測は禁止。40文字以内。",
    },
    website: {
      type: "string",
      description: "ウェブサイトのURL。メモに書かれているものをそのまま。無ければ空文字。URLを作らない。",
    },
    founded: {
      type: "string",
      description: "設立・創業（例：1995年）。メモから確実に分かる場合だけ。「30年前」など曖昧なら空文字。",
    },
    size: {
      type: "string",
      enum: [...SIZES, ""],
      description: "従業員規模。メモに人数が書かれている場合だけ、当てはまる区分を選ぶ。無ければ空文字。",
    },
    startTiming: {
      type: "string",
      enum: [...START_TIMINGS, ""],
      description: "共創を始めたい時期。メモに時期が書かれている場合だけ選ぶ。無ければ空文字。",
    },
    description: {
      type: "string",
      description: "事業紹介。何をしている事業者かが分かる150〜300文字。材料が足りなければ空文字。",
    },
    featureText: {
      type: "string",
      description: "強み・特徴。他社と比べたときに選ばれる理由。80〜200文字。メモに無ければ空文字。",
    },
    productItems: {
      type: "string",
      description: "生産・取扱品目の名前だけを読点区切りで並べる。40文字以内。メモに無ければ空文字。",
    },
    productVolume: {
      type: "string",
      description: "生産量・供給量。**メモに数字が書かれている場合だけ**その表記を使う。40文字以内。推測は禁止。",
    },
    equipmentText: {
      type: "string",
      description: "設備・加工能力。保有する設備や対応できる加工。80〜200文字。メモに無ければ空文字。",
    },
    salesAreaText: {
      type: "string",
      description: "現在の販路・売り場。80〜200文字。メモに無ければ空文字。取引先の企業名はメモにあっても書かない。",
    },
    logisticsText: {
      type: "string",
      description: "いま困っていること。80〜200文字。メモに無ければ空文字。",
    },
    foodlossText: {
      type: "string",
      description: "余っている食材や規格外品。80〜200文字。メモに無ければ空文字。",
    },
    collabStyle: {
      type: "string",
      description: "組みたい相手・共創のイメージ。どんな相手と何をしたいか。80〜200文字。",
    },
    challengeText: {
      type: "string",
      description: "解決したい課題。80〜200文字。「困りごと」と同じ内容を繰り返さず、事業として越えたい壁を書く。",
    },
  },
  required: [
    "name",
    "contactName",
    "categoryL1",
    "categoryL2",
    "prefecture",
    "city",
    "postalCode",
    "address",
    "website",
    "founded",
    "size",
    "startTiming",
    "description",
    "featureText",
    "productItems",
    "productVolume",
    "equipmentText",
    "salesAreaText",
    "logisticsText",
    "foodlossText",
    "collabStyle",
    "challengeText",
  ],
  additionalProperties: false,
} as const;

const PROFILE_SYSTEM = `あなたは日本の食品・飲料業界に詳しい編集者です。
生産者や食品事業者が書いたメモをもとに、業務用マーケットプレイス「FOOD JAPAN NAKAMA」の**事業者プロフィールの下書き**を作ります。読むのは、一緒に組む相手を探している他の事業者です。

必ず守ること:
- メモに書かれていない事実を作らない。所在地・沿革・取引先・認証・受賞歴・規模・数量・売上は、メモに無ければ書かない。
- 材料が足りない項目は、埋めようとせず空文字("")を返す。空欄のほうが、間違いを載せるよりよい。
- 取引先や仕入先の**企業名は書かない**（相手の同意が要る情報のため）。
- 会社名・所在地・郵便番号・URL・設立年・人数は、**メモに書かれているものをそのまま写す**。似た値を作らない。曖昧な書き方（「30年前から」等）は空文字にする。
- 「日本一」「最高級」「業界初」など、根拠なく優良だと誤解させる表現を使わない。
- 健康効果・効能をうたわない（健康増進法・景品表示法）。
- 感嘆符や絵文字は使わない。落ち着いた「です・ます」調で書く。
- 各項目には、その項目で聞かれていることだけを書く。**他の項目に書いた内容を繰り返さない**。書くことが残っていない項目は空文字にする。`;

export type ProfileDraftResult = { draft: ProfileDraft } | { error: string };

/** メモから事業者プロフィールの下書きを作る（保存はしない）。 */
export async function draftMemberProfile(params: {
  memberName: string;
  category: string;
  area: string;
  memo: string;
}): Promise<ProfileDraftResult> {
  if (!client) return { error: "この機能は現在ご利用いただけません。" };

  const memo = params.memo.trim().slice(0, AI_PROFILE_MEMO_MAX);
  if (memo.length < 10) {
    return { error: "メモをもう少し詳しく書いてください（10文字以上）。" };
  }

  const known = [
    params.memberName ? `事業者名: ${params.memberName}` : null,
    params.category ? `分類: ${params.category}` : null,
    params.area ? `所在地: ${params.area}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await client.responses.create({
      model: MODEL,
      max_output_tokens: 4000,
      text: {
        format: { type: "json_schema", name: "member_profile_draft", schema: PROFILE_SCHEMA, strict: true },
      },
      input: [
        { role: "system", content: PROFILE_SYSTEM },
        {
          role: "user",
          content: `次のメモから、事業者プロフィールの各項目の下書きを作ってください。

【すでに入力されている情報】
${known || "（なし）"}

【本人のメモ】
${memo}`,
        },
      ],
    });

    const message = res.output.find((o) => o.type === "message");
    if (message?.content?.some((c) => c.type === "refusal")) {
      return { error: "この内容では下書きを作れませんでした。表現を変えてお試しください。" };
    }
    const text = res.output_text;
    if (!text) return { error: "下書きを作れませんでした。時間をおいてお試しください。" };

    const parsed = JSON.parse(text) as Record<string, unknown>;
    const pick = (k: keyof ProfileDraft) =>
      typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "";
    return {
      draft: {
        name: pick("name"),
        contactName: pick("contactName"),
        categoryL1: pick("categoryL1"),
        categoryL2: pick("categoryL2"),
        prefecture: pick("prefecture"),
        city: pick("city"),
        postalCode: pick("postalCode"),
        address: pick("address"),
        website: pick("website"),
        founded: pick("founded"),
        size: pick("size"),
        startTiming: pick("startTiming"),
        description: pick("description"),
        featureText: pick("featureText"),
        productItems: pick("productItems"),
        productVolume: pick("productVolume"),
        equipmentText: pick("equipmentText"),
        salesAreaText: pick("salesAreaText"),
        logisticsText: pick("logisticsText"),
        foodlossText: pick("foodlossText"),
        collabStyle: pick("collabStyle"),
        challengeText: pick("challengeText"),
      },
    };
  } catch (e) {
    console.error("[ai] プロフィール下書きの生成に失敗:", e);
    if (e instanceof RateLimitError) {
      const code = (e as { code?: string }).code;
      if (code === "insufficient_quota" || code === "credit_balance_exhausted") {
        console.error("[ai] ⚠️ APIの残高切れです。OpenAIのBillingでクレジットを追加してください。");
        return { error: "ただいま下書きの作成はご利用いただけません。恐れ入りますが手入力でお願いします。" };
      }
      return { error: "混み合っています。少し時間をおいてお試しください。" };
    }
    return { error: "下書きを作れませんでした。時間をおいてお試しください。" };
  }
}
