// 掲載文の下書き支援（2026-08-14・「売りたい」で試験導入）。
//
// なぜ入れるか: 掲載が積み上がらない一番の理由は、必須項目が13〜15個あって
// 「何をどう書けばいいか分からない」ところで手が止まること。
// 3〜4行のメモから各項目の**下書き**を出し、本人が直して保存する形にする。
//
// 使わない場所（重要）:
//   会員間の非公開メッセージには一切使わない。規約第17条で
//   「当社は、会員間の非公開メッセージを、AI等の学習、分析または営業目的に利用しません」と
//   約束しており、電気通信事業（通信の秘密）の観点でも触れてはいけない。
//   ここで外部へ送るのは、**掲載する前提で本人が書いたメモと、掲載項目の値だけ**。
//
// 未設定時の扱い: ANTHROPIC_API_KEY が無ければ AI_ENABLED=false。
// Stripe と同じで、鍵が無い環境では機能ごと出さない（画面にボタンを出さない）。
import Anthropic from "@anthropic-ai/sdk";
import { AI_DRAFT_MEMO_MAX, type OfferingDraft } from "@/lib/ai-draft-core";

// 型と定数は ai-draft-core.ts（クライアントからも読み込める）。従来どおりここからも使えるように再輸出する。
export * from "@/lib/ai-draft-core";

const apiKey = process.env.ANTHROPIC_API_KEY;

/** APIキーが設定されているか。false のときは画面にボタンを出さない。 */
export const AI_ENABLED = !!apiKey;

const client = apiKey
  ? new Anthropic({
      apiKey,
      // 下書きは対話中の待ち時間になるので、長く待たせずに諦めて再試行を促す
      timeout: 90_000,
      maxRetries: 1,
    })
  : null;

/** 会員あたり24時間の生成回数。書き直しを何度か試せて、暴走はしない程度。 */
export const AI_DRAFT_DAILY_LIMIT = 20;

// 1回あたりの目安: 入力1,500 / 出力800トークン前後 ≒ 4円。
// 迷ったら effort を上げるより、まずプロンプトの指示を足すほうが安い。
const MODEL = "claude-opus-5";

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    tagline: {
      type: "string",
      description: "一言で伝わる特徴。40文字以内の1文。材料が足りなければ空文字。",
    },
    description: {
      type: "string",
      description:
        "商品・原料そのものの説明。何であるか・どんな品質かが分かる150〜300文字。材料が足りなければ空文字。",
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
  },
  required: [
    "tagline",
    "description",
    "featureDiff",
    "backgroundStory",
    "usageIdeas",
    "desiredPartner",
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `あなたは日本の食品・飲料業界のBtoB取引に詳しい編集者です。
生産者や食品事業者が書いた短いメモをもとに、業務用マーケットプレイス「FOOD JAPAN NAKAMA」に載せる掲載文の**下書き**を作ります。読み手は飲食店・小売・卸などの仕入れ担当者です。

必ず守ること:
- メモに書かれていない事実を作らない。産地・原材料・製法・受賞歴・認証・数量・価格・取引実績・企業名は、メモに無ければ書かない。
- 材料が足りない項目は、埋めようとせず空文字("")を返す。空欄のほうが、間違いを載せるよりよい。
- 「日本一」「最高級」「業界初」など、根拠なく優良だと誤解させる表現を使わない。
- 健康効果・効能・医薬品のような効き目をうたわない（健康増進法・景品表示法）。
- 感嘆符や絵文字は使わない。事実と用途が分かる、落ち着いた「です・ます」調で書く。
- 買い手が判断するための文章であって、広告のあおり文句ではない。`;

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
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      // 対話中に待たせる処理なので、まずは低めの effort から。品質が足りなければ上げる。
      output_config: { effort: "low", format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      messages: [
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

    if (res.stop_reason === "refusal") {
      return { error: "この内容では下書きを作れませんでした。表現を変えてお試しください。" };
    }
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    if (!text) return { error: "下書きを作れませんでした。時間をおいてお試しください。" };

    const parsed = JSON.parse(text) as Record<string, unknown>;
    const pick = (k: keyof OfferingDraft) =>
      typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "";
    return {
      draft: {
        tagline: pick("tagline"),
        description: pick("description"),
        featureDiff: pick("featureDiff"),
        backgroundStory: pick("backgroundStory"),
        usageIdeas: pick("usageIdeas"),
        desiredPartner: pick("desiredPartner"),
      },
    };
  } catch (e) {
    console.error("[ai] 下書きの生成に失敗:", e);
    if (e instanceof Anthropic.RateLimitError) {
      return { error: "混み合っています。少し時間をおいてお試しください。" };
    }
    return { error: "下書きを作れませんでした。時間をおいてお試しください。" };
  }
}
