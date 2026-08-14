"use client";

// プロフィールの下書き支援（2026-08-14・台帳「売りたい」と同じ仕組み）。
// メモから各項目の下書きを作り、**本人が確認してからフォームに入れる**。勝手に保存はしない。
//
// 反映先の入力欄は defaultValue のまま（非制御）にしてあるので、
// フォーム要素を name で引いて値を書き込む。React は非制御の値を管理しないため、
// これで送信内容にも反映される（全項目を制御コンポーネントに作り替える必要がない）。
import { useCallback, useState, useTransition } from "react";
import { draftProfile } from "../actions";
import { AI_PROFILE_FIELDS, AI_PROFILE_MEMO_MAX, type ProfileDraft } from "@/lib/ai-profile-core";
import { AI_PROVIDER_NAME } from "@/lib/ai-draft-core";
import { btn, h2FormCls, input } from "@/lib/ui";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";
import { AiPromptDialog } from "@/components/AiPromptDialog";

const PLACEHOLDER = `例：
・宮崎県日南市で30年、露地でリーフレタスとネギを作っています
・真空パックと急速冷凍の設備があり、カット野菜まで対応できます
・いまは地元の直売所と学校給食が中心で、県外に販路がありません
・規格外品が年間2トンほど出るので、加工してくれる相手を探しています`;

// ほかのAIに渡す文面。返ってくる形をこのフォームの項目そのものにしてあるので、
// 各入力欄に直接貼れる（＝当社のAPIを使わずに済む）。
const HANDOFF_PROMPT = `あなたは、プロの出版社のライターです。私の事業を取材し、事業者プロフィールの文章を書いてください。

これは、食品業界の事業者どうしをつなぐサイト「FOOD JAPAN NAKAMA」のプロフィールです。読むのは、一緒に組む相手を探している生産者・食品メーカー・小売・飲食店などです。

【守ってほしいこと】
・これまでの会話や、私が渡した資料から分かることだけを書く。
・分からない項目は、想像で埋めずに「不明」とだけ書く。空欄のほうが、間違いを載せるよりよい。
・取引先や仕入先の企業名は書かない（相手の同意が要るため）。
・所在地・郵便番号・URL・設立年・人数は、分かっているものだけをそのまま書く。似た値を作らない。
・「日本一」「最高級」などの誇張や、健康効果をうたう表現は使わない。
・感嘆符や絵文字は使わない。落ち着いた「です・ます」調で書く。

【出力の形】
下の見出しをそのまま使い、1項目ずつ書いてください。私はこれを各入力欄にそのまま貼り付けます。前置きや感想は不要です。

事業者名
担当者名
郵便番号
都道府県
市区町村
本店所在地（番地・建物名）
ウェブサイト
設立（例：1995年）
従業員規模（1〜5名／6〜20名／21〜50名／51〜100名／101〜300名／301名以上 から1つ）
事業紹介（150〜300文字）
強み・特徴（80〜200文字）
生産品目名（品目の名前だけを読点区切りで。40文字以内）
生産量（数字が決まっていれば。40文字以内）
設備・加工能力（80〜200文字）
現在行っている販路・売り場（80〜200文字）
現在の困りごと（80〜200文字）
余っている食材や規格外品（80〜200文字）
組みたい相手・共創のイメージ（80〜200文字）
解決したい課題（80〜200文字）
共創を始めたい時期（すぐにでも／3ヶ月以内／今年度内／来年度以降／未定 から1つ）

最後に、「不明」と書いた項目について私に質問してください。`;

export function AiProfileDraftBox({
  memberName,
  category,
  area,
  /** 下書きをフォームへ入れる（親がフォーム要素へ書き込む） */
  onApply,
}: {
  memberName: string;
  category: string;
  area: string;
  onApply: (draft: ProfileDraft) => { applied: string[]; overwritten: string[] };
}) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const closePrompt = useCallback(() => setPromptOpen(false), []);
  const closeApplied = useCallback(() => {
    setApplied(false);
    setOpen(false);
  }, []);
  useCloseOnEscape(applied, closeApplied);

  function run() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("memberName", memberName);
      fd.set("category", category);
      fd.set("area", area);
      fd.set("memo", memo);
      const res = await draftProfile(fd);
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
        <div className="text-[16px] font-bold text-[var(--green-d)]">AIで下書きをつくる（任意）</div>
        <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
          事業の要点を3〜4行書くだけで、所在地や規模などの基本情報から、事業紹介・強み・設備・販路・困りごと・組みたい相手までの下書きを作ります。
          作った下書きはそのまま保存されません。内容を確かめて直してから保存してください。
        </p>
        <p className="mt-1 text-[12px] leading-5 text-[var(--ink-2)]">
          お使いのChatGPT・Gemini・Claudeなどに書いてもらうこともできます。
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
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
          <div className="mt-2">
            <button type="button" onClick={() => setPromptOpen(true)} className={btn("primary", "sm")}>
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
        maxLength={AI_PROFILE_MEMO_MAX}
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
          {memo.length}/{AI_PROFILE_MEMO_MAX}文字
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
            {AI_PROFILE_FIELDS.map((f) =>
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
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              setApplied(true);
            }}
            className={`${btn("primary", "sm")} mt-2`}
          >
            フォームに入れる
          </button>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            すでに入力済みの欄がある場合は上書きされます。
          </p>
        </div>
      ) : null}

      <AiPromptDialog
        open={promptOpen}
        onClose={closePrompt}
        prompt={HANDOFF_PROMPT}
        note="このフォームと同じ項目立てで返ってくるので、フォームにそのまま貼り付けられます。"
      />

      {/* 入れた直後の確認。押しただけで完了した気にならないよう、必ず読み直してもらう */}
      {applied ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeApplied} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-profile-applied-title"
            className="relative w-full max-w-[440px] rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
          >
            <h2 id="ai-profile-applied-title" className={h2FormCls}>
              フォームに入れました
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--ink-2)]">
              「基本情報」「事業内容」「組みたい相手」の3つのタブに入っています。内容をご確認のうえ、保存してください。
            </p>
            <p className="mt-2 text-[13px] font-bold leading-6 text-[var(--red)]">
              事実と違う記載は取引のトラブルにつながりますので、よくご確認ください。
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
