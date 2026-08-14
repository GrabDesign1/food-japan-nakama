"use client";

// 掲載文の下書き支援（2026-08-14・「売りたい」で試験導入）。
// 3〜4行のメモから各項目の下書きを作り、**本人が確認してからフォームに入れる**。
// 勝手に保存はしない。生成しただけでは何も変わらない。
import { useCallback, useState, useTransition } from "react";
import { draftOfferingCopy } from "../actions";
import {
  AI_DRAFT_FIELDS,
  AI_DRAFT_MEMO_MAX,
  AI_PROVIDER_NAME,
  type OfferingDraft,
} from "@/lib/ai-draft-core";
import { btn, h2FormCls, input } from "@/lib/ui";
import { AiPromptDialog } from "@/components/AiPromptDialog";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";

const PLACEHOLDER = `例：
・宮崎の日向夏を果皮ごと使ったクラフトビール
・規格外の日向夏を活かしたくて地元農家と開発
・苦味が控えめで柑橘の香りが強い
・330ml瓶／月500本まで／飲食店や土産物店に置いてほしい`;

// 普段お使いのAI（ChatGPT・Gemini など）に投げるための文面。
// 会員はすでにどこかのAIを契約している。ゼロから書き出すより、
// 自分の事業を知っているAIに書かせるほうが早い（2026-08-14 ユーザー指定）。
//
// **返ってくる形をフォームの項目そのものにしてある**のが肝（2026-08-14 ユーザー指定）。
//   ・会員は各欄にそのまま貼れる ＝ うちのAPIを1回も呼ばずに済む（当社の課金がゼロ）
//   ・まとめて整えたい人だけ、メモ欄に貼って「下書きを作る」を押す
//   ・つまり、うちの生成は主役ではなく任意の手段。残高が無くても掲載は完成する
//
// 文面の狙い:
//   ・見出しと文字数を、こちらのフォームおよび DRAFT_SCHEMA と一致させる
//   ・相手のAIが話を盛る／作るのが一番こわいので、「分からないものは不明と書く」を先に置く
//   ・品質・規格と賞味期限は事故に直結するので、推測禁止を名指しで書く
//   ・最後に質問を返させて、足りない情報を本人が埋められるようにする
const HANDOFF_PROMPT = `あなたは、プロの出版社のライターです。私の事業と、私が売りたいものを取材し、掲載ページの文章を書いてください。

これは、食品業界の事業者どうしをつなぐサイト「FOOD JAPAN NAKAMA」の掲載文です。読むのは飲食店・小売・卸・ホテルなどの仕入れ担当者です。

【守ってほしいこと】
・これまでの会話や、私が渡した資料から分かることだけを書く。
・分からない項目は、想像で埋めずに「不明」とだけ書く。空欄のほうが、間違いを載せるよりよい。
・「品質・規格」と「賞味・取扱期限」は食品衛生と取引条件に直結する。分からなければ必ず「不明」。一般論で埋めない。
・「日本一」「最高級」などの誇張や、健康効果をうたう表現は使わない。
・感嘆符や絵文字は使わない。落ち着いた「です・ます」調で書く。

【出力の形】
下の見出しをそのまま使い、1項目ずつ書いてください。私はこれを各入力欄にそのまま貼り付けます。前置きや感想は不要です。

タイトル（30文字以内）
一言で伝わる特徴（40文字以内）
商品・原料の説明（150〜300文字）
品質・規格（容量・入数・等級・産地・認証・保存条件など、分かっている事実だけ。80文字以内）
賞味・取扱期限（40文字以内）
他の商品との違い（80〜200文字）
生まれた背景・販売したい理由（80〜200文字）
おすすめの使い方・売り場（80〜200文字）
希望する相手（業種・規模・地域。60〜150文字）
おすすめポイント（1行に1つ、3行まで。各30文字以内）
タグ（カンマ区切りで8個まで。各10文字以内。#は付けない）

最後に、「不明」と書いた項目について私に質問してください。`;

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
  // フォームに入れた直後の確認。入れて終わりではなく、必ず読み直してもらうために出す
  const [applied, setApplied] = useState(false);
  // 文面ダイアログの開閉。押すと下書きフォームも開くため、状態はここで持つ
  const [promptOpen, setPromptOpen] = useState(false);
  const closePrompt = useCallback(() => setPromptOpen(false), []);
  // 確認を閉じたら、この枠もたたむ（用は済んだので入力欄の邪魔をしない）
  const closeApplied = useCallback(() => {
    setApplied(false);
    setOpen(false);
  }, []);
  useCloseOnEscape(applied, closeApplied);

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
        <div className="text-[16px] font-bold text-[var(--green-d)]">
          AIで下書きをつくる（任意）
        </div>
        <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
          商品の要点を3〜4行書くだけで、タイトル・説明文・特徴・使い方・おすすめポイント・タグまで下書きを作ります。
          作った下書きはそのまま保存されません。内容を確かめて直してからご登録ください。
        </p>
        {/* たたんだ状態からでも文面を取りに行けるようにする（ほかのAIで書く人は、
            この枠を開かずに各入力欄へ直接貼るため）。モーダルは <p> の外に置く。 */}
        <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
          お使いのChatGPT・Gemini・Claudeなどに書いてもらうこともできます。
        </p>
        {/* モーダル（div）を <p> の中に入れるとHTMLとして不正になるので、説明文とは分けて置く */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // 文面を取りに来た人は、戻ってきて貼り付ける先がすぐ要る（2026-08-14 ユーザー指定）
              setPromptOpen(true);
              setOpen(true);
            }}
            className={btn("primary", "sm")}
          >
            プロンプトはこちら
          </button>
          <button type="button" onClick={() => setOpen(true)} className={btn("secondary", "sm")}>
            下書きを作ってみる
          </button>
        </div>
        <AiPromptDialog
          open={promptOpen}
          onClose={closePrompt}
          prompt={HANDOFF_PROMPT}
          note="このフォームと同じ項目立てで返ってくるので、フォームにそのまま貼り付けられます。"
        />
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-bold text-[var(--green-d)]">AIで下書きをつくる（任意）</div>
          <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
            箇条書きで構いません。書かれていないことは補いませんので、分かる範囲でどうぞ。
          </p>
          {/* モーダル（div）を <p> の中に入れるとHTMLとして不正になるので、説明文とは分けて置く */}
          <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
            お使いのChatGPT・Gemini・Claudeなどで、ご自身の事業と売りたいものの要約を作って貼り付けるのもおすすめです。
          </p>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setPromptOpen(true)}
              className={btn("primary", "sm")}
            >
              プロンプトはこちら
            </button>
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
        className={`${input()} mt-2 w-full bg-white`}
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
              setApplied(true);
            }}
            className={`${btn("primary", "sm")} mt-2`}
          >
            {willOverwrite.length ? "上書きしてフォームに入れる" : "フォームに入れる"}
          </button>
        </div>
      ) : null}

      <AiPromptDialog
          open={promptOpen}
          onClose={closePrompt}
          prompt={HANDOFF_PROMPT}
          note="このフォームと同じ項目立てで返ってくるので、フォームにそのまま貼り付けられます。"
        />

      {/* 入れた直後の確認。押しただけで完了した気にならないよう、
          「読み直すこと」と「まだ必須が残っていること」をここで伝える。 */}
      {applied ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeApplied} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-applied-title"
            className="relative w-full max-w-[440px] rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 id="ai-applied-title" className={h2FormCls}>
              フォームに入れました
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">
              入力内容および、まだ必須入力、画像登録がありますのでご確認ください。
            </p>
            {/* 下書きは事実を作らない作りにしてあるが、それでも最後に見るのは本人。
                品質・規格や期限の書き間違いは事故に直結するので、ここで強く言う。 */}
            <p className="mt-2 text-[13px] font-bold leading-6 text-[var(--red)]">
              書き間違えると食品事故と取引トラブルに直結しますのでよくご確認ください。
            </p>
            <button
              type="button"
              onClick={closeApplied}
              autoFocus
              className={`${btn("primary", "sm")} mt-4`}
            >
              閉じる
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] leading-4 text-[var(--muted)]">
        入力したメモは下書きを作るためだけに外部のAIサービス（{AI_PROVIDER_NAME}）へ送信します。
        会員どうしのメッセージがAIに渡ることはありません。
      </p>
    </div>
  );
}
