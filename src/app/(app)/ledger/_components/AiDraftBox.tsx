"use client";

// 掲載文の下書き支援（2026-08-14・「売りたい」で試験導入）。
// 3〜4行のメモから各項目の下書きを作り、**本人が確認してからフォームに入れる**。
// 勝手に保存はしない。生成しただけでは何も変わらない。
import { useRef, useState, useTransition } from "react";
import { draftOfferingCopy } from "../actions";
import {
  AI_DRAFT_FIELDS,
  AI_DRAFT_MEMO_MAX,
  AI_PROVIDER_NAME,
  type OfferingDraft,
} from "@/lib/ai-draft-core";
import { btn, h2FormCls, input } from "@/lib/ui";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";

const PLACEHOLDER = `例：
・宮崎の日向夏を果皮ごと使ったクラフトビール
・規格外の日向夏を活かしたくて地元農家と開発
・苦味が控えめで柑橘の香りが強い
・330ml瓶／月500本まで／飲食店や土産物店に置いてほしい`;

// 普段お使いのAI（ChatGPT・Gemini など）に投げて、その答えをメモ欄に貼ってもらうための文面。
// ゼロから書き出すより、すでに自分の事業を知っているAIにまとめさせるほうが早い（2026-08-14 ユーザー指定）。
//
// 文面の狙い:
//   ・この画面のメモ欄に貼るだけで下書きが作れるよう、**必要な項目を名指しで並べる**
//   ・相手のAIが話を盛る／作るのが一番こわいので、「分からないものは不明と書く」を最初に置く
//   ・メモ欄の上限（1,200文字）に収まるよう1000字以内に抑える
//   ・最後に質問を返させて、足りない情報を本人が埋められるようにする
const HANDOFF_PROMPT = `あなたは、プロの出版社のライターです。私の事業と、私が売りたいものを取材してまとめてください。

これは、食品業界の事業者どうしをつなぐサイト「FOOD JAPAN NAKAMA」に掲載する文章の材料です。読むのは飲食店・小売・卸・ホテルなどの仕入れ担当者です。

【守ってほしいこと】
・これまでの会話や、私が渡した資料から分かることだけを書く。
・分からない項目は、想像で埋めずに「不明」と書く。
・「日本一」「最高級」などの誇張や、健康効果をうたう表現は使わない。
・全体で1000字以内。項目ごとの箇条書きで。

【まとめてほしい項目】
1. 会社概要（社名・所在地・事業内容・創業年）
2. 売りたいもの（商品名や原料名・作り方や品質の特徴）
3. 品質・規格（容量・入数・等級・産地・認証・保存条件など、分かっている事実だけ）
4. 賞味期限・取扱期限（日数や条件が決まっていれば。決まっていなければ「不明」）
5. ほかの商品との違い（買い手が比べたときの決め手）
6. 生まれた背景（なぜ作ったか、なぜ売りたいか）
7. 想定する使い方・売り場（どんな店・料理・場面に合うか）
8. 取引したい相手（業種・規模・地域）
9. 買い手に効くおすすめポイント（1行に1つ、3つまで）
10. 検索に使いそうな短い語（産地・原料・カテゴリ・用途など、8個まで）
11. 分かっている取引条件（希望価格・最小ロット・供給できる量と時期・発送元）

最後に、「不明」と書いた項目について私に質問してください。`;

/** 「プロンプトはこちら」。他のAIに渡す文面を見せて、そのままコピーできるようにする。 */
function PromptModal() {
  const [open, setOpen] = useState(false);
  // "idle" | "copied" | "failed"。クリップボードが使えない環境（権限を切っている等）もあるため状態を分ける
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  useCloseOnEscape(open, () => setOpen(false));

  async function copy() {
    try {
      await navigator.clipboard.writeText(HANDOFF_PROMPT);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // 自動コピーできないときは、手で選択してコピーできるように選択状態にする
      setCopyState("failed");
      promptRef.current?.select();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-bold text-[var(--green-d)] underline"
      >
        プロンプトはこちら
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-prompt-title"
            className="relative max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 id="ai-prompt-title" className={h2FormCls}>
              ほかのAIに渡す文面（プロンプト）
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-[var(--ink-2)]">
              下の文面をコピーして、普段お使いのAI（ChatGPT・Gemini・Claude など）に貼り付けてください。
              この画面のメモ欄に貼り付けると下書きが作れます。
              返ってきた要約から、今回「売りたい」で必要な文章だけを抜いてコピーしてください。
            </p>
            <textarea
              ref={promptRef}
              readOnly
              rows={6}
              value={HANDOFF_PROMPT}
              onFocus={(e) => e.currentTarget.select()}
              // field-sizing: 対応ブラウザでは中身の行数に合わせて伸びる（未対応でも rows 分は見える）。
              // ただし文面が長いので、画面の4割までで止めて中をスクロールさせる（ボタンが画面外に出ないように）
              className={`${input()} mt-3 max-h-[40vh] overflow-y-auto bg-[#FAFBF9] [field-sizing:content]`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={copy} className={btn("primary", "sm")}>
                {copyState === "copied" ? "コピーしました" : "コピーする"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                閉じる
              </button>
            </div>
            {copyState === "failed" ? (
              <p className="mt-2 text-[11px] text-[var(--red)]">
                自動コピーできませんでした。上の文面を選択してコピーしてください。
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AiDraftBox({
  category,
  title,
  area,
  food,
  current,
  onApply,
}: {
  category: string;
  title: string;
  area: string;
  /** 食品カテゴリか（品質・規格／賞味期限の入力欄があるかどうか） */
  food: boolean;
  /** いまフォームに入っている値（上書きになるかの判定に使う） */
  current: OfferingDraft;
  onApply: (draft: OfferingDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [draft, setDraft] = useState<OfferingDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // このカテゴリでフォームに入力欄がある項目だけを扱う
  const fields = AI_DRAFT_FIELDS.filter((f) => !f.foodOnly || food);
  // 下書きが入る項目のうち、すでに書かれているもの＝上書きになる項目
  const willOverwrite = draft
    ? fields.filter((f) => draft[f.key] && current[f.key].trim()).map((f) => f.label)
    : [];

  function run() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("category", category);
      fd.set("title", title);
      fd.set("area", area);
      fd.set("memo", memo);
      const res = await draftOfferingCopy(fd);
      if ("error" in res) {
        setError(res.error);
        setDraft(null);
      } else {
        setDraft(res.draft);
      }
    });
  }

  if (!open) {
    return (
      <div className="rounded-[10px] border border-dashed border-[var(--green)] bg-[var(--green-soft)] p-4">
        <div className="text-[13px] font-bold text-[var(--green-d)]">
          メモから下書きを作る（任意）
        </div>
        <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
          商品の要点を3〜4行書くだけで、タイトル・説明文・特徴・使い方・おすすめポイント・タグまで下書きを作ります。
          作った下書きはそのまま保存されません。内容を確かめて直してからご登録ください。
        </p>
        <button type="button" onClick={() => setOpen(true)} className={`${btn("secondary", "sm")} mt-2`}>
          下書きを作ってみる
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold text-[var(--green-d)]">メモから下書きを作る（任意）</div>
          <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
            箇条書きで構いません。書かれていないことは補いませんので、分かる範囲でどうぞ。
          </p>
          {/* モーダル（div）を <p> の中に入れるとHTMLとして不正になるので、説明文とは分けて置く */}
          <div className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
            お使いのChatGPT・Gemini・Claudeなどで、ご自身の事業と売りたいものの要約を作って貼り付けるのもおすすめです。{" "}
            <PromptModal />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-[12px] text-[var(--muted)] underline"
        >
          閉じる
        </button>
      </div>

      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={6}
        maxLength={AI_DRAFT_MEMO_MAX}
        placeholder={PLACEHOLDER}
        className={`${input()} mt-2 bg-white`}
      />
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={pending || memo.trim().length < 10}
          className={btn("primary", "sm")}
        >
          {pending ? "作成中…（30秒ほどかかります）" : draft ? "作り直す" : "下書きを作る"}
        </button>
        <span className="text-[11px] text-[var(--muted)]">
          {memo.length}/{AI_DRAFT_MEMO_MAX}文字
        </span>
      </div>

      {error ? <p className="mt-2 text-[12px] text-[var(--red)]">{error}</p> : null}

      {draft ? (
        <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-white p-3">
          <div className="text-[12px] font-bold text-[var(--ink)]">下書きができました</div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--red)]">
            AIが作った下書きです。事実と違うところ・書きすぎているところは必ず直してから保存してください。
          </p>
          <dl className="mt-2 flex flex-col gap-2">
            {fields.map((f) =>
              draft[f.key] ? (
                <div key={f.key}>
                  <dt className="text-[11px] font-bold text-[var(--muted)]">{f.label}</dt>
                  <dd className="whitespace-pre-wrap text-[12px] leading-5 text-[var(--ink-2)]">
                    {draft[f.key]}
                  </dd>
                </div>
              ) : (
                <div key={f.key} className="text-[11px] text-[var(--muted)]">
                  {f.label}：メモに材料が無かったため空のままです
                </div>
              )
            )}
          </dl>
          {willOverwrite.length ? (
            <p className="mt-2 text-[11px] text-[var(--red)]">
              すでに入力済みの「{willOverwrite.join("」「")}」は上書きされます。
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
            className={`${btn("primary", "sm")} mt-2`}
          >
            {willOverwrite.length ? "上書きしてフォームに入れる" : "フォームに入れる"}
          </button>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] leading-4 text-[var(--muted)]">
        入力したメモは下書きを作るためだけに外部のAIサービス（{AI_PROVIDER_NAME}）へ送信します。
        会員どうしのメッセージがAIに渡ることはありません。
      </p>
    </div>
  );
}
