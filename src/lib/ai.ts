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

// ── 共創フィールドワークの企画書（11/18 霧島・都城バスフィールドワーク用） ──────
//
// 紙の⑥「AIレポートでまとめる5つ」に入力文が書かれている。
// 当日はそれを手で打ち込む前提だった。ここでやるのは**その手打ちをなくすこと**だけで、
// 出力の1〜5（解決したい課題／活用したい地域資源／自社が提供できるもの／
// 一緒に取り組みたい相手／90日以内に実行する最初の一歩）とルール
// （わからない情報は推測で断定せず『要確認』と書く）は紙のまま変えない。
// 6以降は、持ち帰って社内で使えるように足した。
//
// 2026-11-18: 当日配布の「車内ワーク」に合わせて作り直し。発表（④）はAIレポートより前。
//
// ⚠️ 入力は「提出する前提で本人が書いた共創案」だけ。価格・個人情報・契約情報・営業秘密は
//    入力しないよう画面で明示する（紙の注意書きと同じ）。規約17条の非公開メッセージには触れない。
// ⚠️ 上限トークンを大きめに取っている（項目が14・それぞれ段落で返るため）。
//    1回あたりの目安: 入力3,000 / 出力2,500トークン ≒ 4円。

const FIELDWORK_SCHEMA = {
  type: "object",
  properties: {
    projectName: {
      type: "string",
      description: "企画名。一言で内容が伝わる名前。参加者の言葉があればそれを尊重し、整えるだけにする。",
    },
    summary: {
      type: "string",
      description:
        "冒頭に置く要約。2〜3文。誰のどの課題を、福山黒酢とどう組んで解決し、何で稼ぐのかが分かること。",
    },
    problem: {
      type: "string",
      description: "1 解決したい課題。顧客の課題と、福山黒酢の課題の両方に触れる。現地で聞いた言葉があれば引く。",
    },
    localResources: {
      type: "string",
      description:
        "2 活用したい地域資源。壺畑、発酵・熟成、職人の技、景観、福山町の気候風土、料理、売場など、現地と主催者資料にあるものだけを書く。",
    },
    ownOffer: {
      type: "string",
      description: "3 自社が提供できるもの。参加者の会社が無理なく出せる商品・技術・人・販路・設備を具体的に。",
    },
    partners: {
      type: "string",
      description:
        "4 一緒に取り組みたい相手。入力の【一緒に取り組みたい相手】に挙がっている人だけを書き、その人に何を期待するのかを一人ずつ添える。挙がっていない人物名を足さない。空なら「要確認」と書く。",
    },
    firstStep: {
      type: "string",
      description: "5 90日以内に実行する最初の一歩。いつ・誰が・何をするか。入力にあればその日付と担当を使う。",
    },
    proposal: {
      type: "string",
      description: "6 提案内容。何を、誰と、どのように実施するか。箇条書きではなく文章で。",
    },
    threeBenefits: {
      type: "string",
      description:
        "7 三者のメリット。「顧客：」「福山黒酢：」「自社：」の3行立てで、それぞれに何が残るかを書く。一方だけが得をする書き方にしない。",
    },
    rolesRevenue: {
      type: "string",
      description:
        "8 収益と役割分担。誰が何を担い、誰が何にいくら払うか。金額が入力されていなければ推測で書かず「要確認」と明記する。",
    },
    risks: {
      type: "string",
      description:
        "9 リスクと対応。品質・法務・表示・調達・物流・収益・ブランドの観点。各リスクに対応策を必ず添え、反対意見は「この条件なら安全に試せる」という条件に置き換える。",
    },
    plan90: {
      type: "string",
      description:
        "10 90日の実証計画と判断基準。何をどう試し、何の数字で継続・修正・中止を決めるか。帰社後の進め方が入力にあれば、48時間／7日／30日／90日の段取りも入れる。",
    },
    firstMessage: {
      type: "string",
      description:
        "付録1 福山黒酢（桷志田）へ送る最初の相談文。そのまま送れる敬体の文面。視察と講評のお礼から入り、いただいた講評をどう反映したか、何を一緒に試したいか、次の打ち合わせの依頼で終える。200〜400字。署名欄は入れない。",
    },
    pitch: {
      type: "string",
      description:
        "付録2 帰社後に2分で説明するときの台本。『20秒 自社と現地で見つけた事実』『30秒 解決したい顧客・事業の課題』『40秒 共創案と三者のメリット』『20秒 90日以内の実験』『10秒 協力してほしいこと』の5つに分け、各見出しのあとに実際に話す言葉を書く。",
    },
  },
  required: [
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
  ],
  additionalProperties: false,
} as const;

const FIELDWORK_SYSTEM = `あなたは、地域資源を活用した新規事業の共創ファシリテーターです。
鹿児島県霧島市福山町の「福山黒酢（桷志田）」と参加企業が、顧客・福山黒酢・自社の三者に
利益が残る共創事業案を、日本語で1枚のレポートにまとめます。

守ること:
- わからない情報は推測で断定せず「要確認」と書く。特に金額・数量・期日・社名・人名は作らない。
- 参加者が書いた言葉を尊重する。言い換えて意味を変えない。整えるだけにする。
- 現地で見た事実と、参加者の推測を混ぜない。根拠が入力に無い主張は書かない。
- 福山黒酢さまからいただいた講評が入力にあるときは、それをどう反映したかが分かるように書く。
  講評に反する案を、そのまま通さない。
- 「福山黒酢の基礎情報」は主催者資料の公開情報である。提案の裏づけとして使ってよいが、
  参加者が現地で確かめたことのように書かない。そこに無い数値や認証を足さない。
- 福山黒酢の伝統・製法・品質を尊重する。「絶対に守らなければならない価値」に書かれたことを
  変える案は出さない。
- 顧客・福山黒酢・自社の三者すべてに何が残るかを必ず書く。一方だけが得をする案にしない。
- 大きな構想より、90日以内に試せる小さな実験として書く。
- 敬体（です・ます）で書く。誇大な表現、断定的な売上予測、根拠のない「日本初」「唯一」は使わない。
- 黒酢の健康効果について、病気の予防・治療・改善を示す表現は書かない（景品表示法・健康増進法に触れるため）。
- 入力が空の項目が多いときは、埋めるために話を作らず、その項目に「要確認」と書く。`;

export type FieldworkResult = { report: FieldworkReportDraft } | { error: string };

/** ai.ts の中だけで使う型（画面側は fieldwork-core.ts の FieldworkReport を使う）。 */
type FieldworkReportDraft = {
  projectName: string;
  summary: string;
  problem: string;
  localResources: string;
  ownOffer: string;
  partners: string;
  firstStep: string;
  proposal: string;
  threeBenefits: string;
  rolesRevenue: string;
  risks: string;
  plan90: string;
  firstMessage: string;
  pitch: string;
};

/**
 * フィールドワークの回答から共創企画書を作る。
 * 本人が直す前提の下書きなので、画面には「事実と現場の声を確認してから使う」旨を必ず出す。
 */
export async function draftFieldworkReport(params: {
  /** 共創する相手（今回は福山黒酢の1社） */
  partner: string;
  /** 記入者の会社・団体 */
  company: string;
  /** fieldwork-core.ts の answersToPrompt() が組み立てたテキスト */
  answersText: string;
  /** 福山黒酢の基礎情報（主催者資料由来。無ければ空文字） */
  partnerBrief?: string;
}): Promise<FieldworkResult> {
  if (!client) return { error: "この機能は現在ご利用いただけません。" };

  const answersText = params.answersText.trim().slice(0, 20_000);
  if (answersText.length < 80) {
    return {
      error:
        "レポートを作るには入力が足りません。まず「① 自社の棚卸し」と「③ 共創案づくり」を書いてください。",
    };
  }

  try {
    const res = await client.responses.create({
      model: MODEL,
      max_output_tokens: 8000,
      text: {
        format: { type: "json_schema", name: "fieldwork_report", schema: FIELDWORK_SCHEMA, strict: true },
      },
      input: [
        { role: "system", content: FIELDWORK_SYSTEM },
        {
          role: "user",
          content: `次の情報をもとに、顧客・福山黒酢・当社の三者に利益が残る共創事業案を1枚のレポートにまとめてください。

【共創する相手】
${params.partner || "福山黒酢（桷志田）"}

【当社】
${params.company || "（未記入）"}
${
  params.partnerBrief
    ? `
【福山黒酢の基礎情報（主催者資料より。参加者が現地で見聞きしたものではない）】
${params.partnerBrief}
`
    : ""
}
【フィールドワークの記入内容】
${answersText}`,
        },
      ],
    });

    const message = res.output.find((o) => o.type === "message");
    if (message?.content?.some((c) => c.type === "refusal")) {
      return { error: "この内容では企画書を作れませんでした。表現を変えてお試しください。" };
    }
    const text = res.output_text;
    if (!text) return { error: "企画書を作れませんでした。時間をおいてお試しください。" };

    const parsed = JSON.parse(text) as Record<string, unknown>;
    const pick = (k: keyof FieldworkReportDraft) =>
      typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "";
    return {
      report: {
        projectName: pick("projectName"),
        summary: pick("summary"),
        problem: pick("problem"),
        localResources: pick("localResources"),
        ownOffer: pick("ownOffer"),
        partners: pick("partners"),
        firstStep: pick("firstStep"),
        proposal: pick("proposal"),
        threeBenefits: pick("threeBenefits"),
        rolesRevenue: pick("rolesRevenue"),
        risks: pick("risks"),
        plan90: pick("plan90"),
        firstMessage: pick("firstMessage"),
        pitch: pick("pitch"),
      },
    };
  } catch (e) {
    console.error("[ai] 共創企画書の生成に失敗:", e);
    if (e instanceof RateLimitError) {
      const code = (e as { code?: string }).code;
      if (code === "insufficient_quota" || code === "credit_balance_exhausted") {
        console.error("[ai] ⚠️ APIの残高切れです。OpenAIのBillingでクレジットを追加してください。");
        return {
          error:
            "ただいま企画書の作成はご利用いただけません。入力は端末に残っていますので、記入した内容をコピーしてお使いください。",
        };
      }
      return { error: "混み合っています。少し時間をおいてお試しください。" };
    }
    return { error: "企画書を作れませんでした。電波の良いところで、もう一度お試しください。" };
  }
}

// ── 名刺の読み取り（2026-11-21） ───────────────────────────────
//
// なぜ入れるか: 会場で受け取った紙の名刺は、手で打ち直す手間のせいで机の引き出しに消える。
//   撮って読み取れば、「あの時会った人」が検索できる形で残る（ユーザー指示 2026-11-21）。
//
// ⚠️⚠️ **外部へ送るのは他人の個人情報である。** これまでの用途（本人が掲載するつもりで書いた文）
//    とは性質が違う。プライバシーポリシーに「会員が取り込んだ名刺の画像をAI事業者へ送って
//    読み取る」旨を書いてから本番に出すこと（2026-11-21時点で未記載）。
// ⚠️ 読み取りは必ず間違える。出てくるのは**下書き**で、本人が確認して保存する前提にする。
//    読めなかった項目は、推測で埋めずに空のままにさせる（勝手に会社名を創作されると質が悪い）。
// ⚠️ 1回あたりの目安: 画像1枚 + 出力300トークン ≒ 3円。

const CARD_SCAN_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "氏名。姓と名の間は全角スペース1つ。読めなければ空文字。" },
    nameKana: { type: "string", description: "氏名のふりがな。名刺に書かれている場合だけ。ひらがな。無ければ空文字。" },
    company: { type: "string", description: "会社・団体名。法人格（株式会社など）も名刺のとおりに含める。" },
    department: { type: "string", description: "部署名。無ければ空文字。" },
    jobTitle: { type: "string", description: "役職。無ければ空文字。" },
    email: { type: "string", description: "メールアドレス。無ければ空文字。推測しない。" },
    phone: { type: "string", description: "代表・固定電話。名刺の表記のまま。無ければ空文字。" },
    mobile: { type: "string", description: "携帯電話。名刺の表記のまま。無ければ空文字。" },
    website: { type: "string", description: "ウェブサイトのURL。無ければ空文字。" },
    postalCode: { type: "string", description: "郵便番号。ハイフンありの7桁。無ければ空文字。" },
    address: { type: "string", description: "住所。郵便番号を除いた部分。無ければ空文字。" },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "読み取りの自信。low のときは画面で「写真を撮り直してください」と促す。",
    },
  },
  required: [
    "name", "nameKana", "company", "department", "jobTitle",
    "email", "phone", "mobile", "website", "postalCode", "address", "confidence",
  ],
  additionalProperties: false,
} as const;

const CARD_SCAN_SYSTEM = `あなたは名刺の文字起こしをする係です。画像に写っている名刺から、項目ごとに文字をそのまま書き出します。

守ること:
- 画像に**書かれている文字だけ**を書き出す。書かれていないものは空文字にする。
- 推測して補わない。会社名の正式名称を知っていても、名刺の表記のまま書く。
- 電話番号・郵便番号は、名刺のハイフンの位置をそのまま残す。
- 肩書きが複数行にまたがるときは、1行にまとめる。
- 裏面やロゴだけが写っていて読み取れないときは、すべて空文字にして confidence を low にする。
- 名刺以外のもの（人物の写真、書類、風景）が写っているときも、すべて空文字にして confidence を low にする。`;

export type CardScanDraft = {
  name: string;
  nameKana: string;
  company: string;
  department: string;
  jobTitle: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  postalCode: string;
  address: string;
  confidence: "high" | "medium" | "low";
};

export type CardScanResult = { card: CardScanDraft } | { error: string };

/**
 * 名刺の画像から項目を読み取る。**下書きを返すだけ**で、保存は本人の確認後に行う。
 *
 * @param dataUrl `data:image/jpeg;base64,...` 形式。画面側で長辺1600px程度に縮めてから渡すこと
 *                （そのままの写真を送ると費用と待ち時間が跳ねる）。
 */
export async function scanBusinessCard(dataUrl: string): Promise<CardScanResult> {
  if (!client) return { error: "この機能は現在ご利用いただけません。" };
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) {
    return { error: "画像を読み取れませんでした。もう一度撮影してください。" };
  }

  try {
    const res = await client.responses.create({
      model: MODEL,
      max_output_tokens: 1500,
      text: {
        format: { type: "json_schema", name: "business_card", schema: CARD_SCAN_SCHEMA, strict: true },
      },
      input: [
        { role: "system", content: CARD_SCAN_SYSTEM },
        {
          role: "user",
          content: [
            { type: "input_text", text: "この名刺の内容を項目ごとに書き出してください。" },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        },
      ],
    });

    const message = res.output.find((o) => o.type === "message");
    if (message?.content?.some((c) => c.type === "refusal")) {
      return { error: "この画像からは読み取れませんでした。名刺だけが写るように撮影してください。" };
    }
    const text = res.output_text;
    if (!text) return { error: "読み取れませんでした。もう一度お試しください。" };

    const parsed = JSON.parse(text) as Record<string, unknown>;
    const pick = (k: keyof CardScanDraft) =>
      typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "";
    const conf = parsed.confidence;
    return {
      card: {
        name: pick("name"),
        nameKana: pick("nameKana"),
        company: pick("company"),
        department: pick("department"),
        jobTitle: pick("jobTitle"),
        email: pick("email"),
        phone: pick("phone"),
        mobile: pick("mobile"),
        website: pick("website"),
        postalCode: pick("postalCode"),
        address: pick("address"),
        confidence: conf === "high" || conf === "medium" || conf === "low" ? conf : "low",
      },
    };
  } catch (e) {
    console.error("[ai] 名刺の読み取りに失敗:", e);
    if (e instanceof RateLimitError) {
      const code = (e as { code?: string }).code;
      if (code === "insufficient_quota" || code === "credit_balance_exhausted") {
        console.error("[ai] ⚠️ APIの残高切れです。OpenAIのBillingでクレジットを追加してください。");
        return { error: "ただいま読み取りはご利用いただけません。手で入力してください。" };
      }
      return { error: "混み合っています。少し時間をおいてお試しください。" };
    }
    return { error: "読み取れませんでした。明るいところで、もう一度撮影してください。" };
  }
}
