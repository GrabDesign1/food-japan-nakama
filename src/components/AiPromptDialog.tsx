"use client";

// 「ほかのAIに渡す文面」を見せて、そのままコピーできるようにするダイアログ（2026-08-14）。
// 台帳（売りたい）とプロフィールの両方で使うため、文面だけ差し替えられる共通部品にしてある。
//
// 開閉の状態は**親が持つ**。押したときに親側の枠も開く作りにしていると、
// ここが自前で状態を持つと開いた直後に自分ごと消えてしまうため。
import { useRef, useState } from "react";
import { btn, h2FormCls, input } from "@/lib/ui";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";

export function AiPromptDialog({
  open,
  onClose,
  prompt,
  /** 「このフォームと同じ項目立てで…」の下に出す補足（画面ごとに変える） */
  note,
}: {
  open: boolean;
  onClose: () => void;
  prompt: string;
  note: string;
}) {
  // "idle" | "copied" | "failed"。クリップボードが使えない環境（権限を切っている等）もあるため状態を分ける
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  useCloseOnEscape(open, onClose);

  async function copy() {
    // navigator.clipboard は環境によって拒否される（権限を切っている、埋め込みブラウザ等）。
    // 落ちたら、欄を選択して execCommand で写す昔ながらの手を試す。
    let ok = false;
    try {
      await navigator.clipboard.writeText(prompt);
      ok = true;
    } catch {
      try {
        const el = promptRef.current;
        if (el) {
          el.focus();
          el.select();
          ok = document.execCommand("copy");
        }
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } else {
      // どちらも駄目なときは、手で選択してコピーできるように選択状態にしておく
      setCopyState("failed");
      promptRef.current?.select();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-prompt-title"
        className="relative max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-[var(--line)] bg-white p-6 shadow-xl"
      >
        <h2 id="ai-prompt-title" className={h2FormCls}>
          ほかのAIに渡す文面（プロンプト）
        </h2>
        {/* ここが一番伝えたい手順なので、本文より大きく太く出す（2026-08-14 ユーザー指定） */}
        <p className="mt-2 text-[14px] font-bold leading-6 text-[var(--ink)]">
          下の文面をコピーして、普段お使いのAI（ChatGPT・Gemini・Claude など）に貼り付けてください。
        </p>
        <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">{note}</p>
        {/* 文面が長くスクロールするので、下のボタンまで行かなくても押せるよう欄の上にも置く */}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={copy}
            aria-label="文面をコピーする"
            title="文面をコピーする"
            className="flex items-center gap-1 rounded-[8px] border border-[var(--line)] bg-white px-2 py-1 text-[11px] text-[var(--ink-2)] transition hover:border-[var(--green)] hover:text-[var(--green-d)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            コピー
          </button>
        </div>
        <textarea
          ref={promptRef}
          readOnly
          rows={6}
          value={prompt}
          onFocus={(e) => e.currentTarget.select()}
          // field-sizing: 対応ブラウザでは中身の行数に合わせて伸びる（未対応でも rows 分は見える）。
          // ただし文面が長いので、画面の4割までで止めて中をスクロールさせる（ボタンが画面外に出ないように）
          className={`${input()} mt-1 max-h-[40vh] w-full overflow-y-auto bg-[#FAFBF9] [field-sizing:content]`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={copy} className={btn("primary", "sm")}>
            コピーする
          </button>
          <button type="button" onClick={onClose} className={btn("secondary", "sm")}>
            閉じる
          </button>
        </div>
        {copyState === "failed" ? (
          <p className="mt-2 text-[11px] text-[var(--red)]">
            自動コピーできませんでした。上の文面を選択してコピーしてください。
          </p>
        ) : null}
      </div>

      {/* コピーできたことをはっきり伝える（押しても何も起きないように見えるのを防ぐ）。
          2.5秒で自動的に消える。読み上げにも伝わるよう role="status" を付ける。 */}
      {copyState === "copied" ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
        >
          <div className="flex items-center gap-2 rounded-[12px] bg-[var(--ink)] px-6 py-4 text-[15px] font-bold text-white shadow-xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            コピーしました
          </div>
        </div>
      ) : null}
    </div>
  );
}
