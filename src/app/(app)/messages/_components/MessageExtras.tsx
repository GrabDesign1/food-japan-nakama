"use client";

/**
 * 【発言に付くもの】2026-11-27 ユーザー指示「Slack相当の5機能」。
 *   ① 絵文字リアクション ② スレッド返信 を、発言の下にまとめて出す。
 *
 * ⚠️⚠️ **本文の流れを汚さないこと。** スレッドの返信は本文に混ざらず、ここを開いたときだけ出る。
 *    これが無いと、商談の記録（提案→条件→契約）が細かいやり取りで埋まる。
 * ⚠️⚠️ **リアクションでは通知しない。** 設計の「黙る」段。
 *    ⚠️ 「了解」だけの往復を減らすための機能なので、ここで鳴らすと本末転倒。
 * ⚠️ 絵文字の一覧は `src/lib/reactions.ts` が唯一の定義。ここで増やさない。
 * ⚠️ 吹き出し（/messages）と全幅カード（案件ごとの画面）の両方から使う。
 *    ⚠️ どちらでも崩れないよう、自前の幅を持たず、親の幅に従うこと。
 */
import { useState, useTransition } from "react";
import { REACTIONS } from "@/lib/reactions";
import { toggleReaction, sendThreadReply } from "../actions";

export type ReactionSummary = { emoji: string; count: number; mine: boolean };
export type ThreadReply = {
  id: string;
  body: string;
  createdAt: Date;
  mine: boolean;
  name: string;
};

function timeStr(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export function MessageExtras({
  messageId,
  reactions,
  replies,
}: {
  messageId: string;
  reactions: ReactionSummary[];
  replies: ThreadReply[];
}) {
  const [pending, start] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  // ⚠️ 既定は閉じる。開いた状態が既定だと、本文が返信で埋まって読めなくなる
  const [open, setOpen] = useState(false);

  // ⚠️⚠️ **await すること。** `start(() => { void action() })` だと React が完了を待たず、
  //    サーバー側の revalidatePath が画面に反映されない（書き込みは成功しているのに
  //    チップが出ない、という状態になる。2026-11-27 に実機で踏んだ）。
  const react = (emoji: string) => {
    setPickerOpen(false);
    start(async () => {
      await toggleReaction(messageId, emoji);
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      {/* リアクション */}
      <div className="flex flex-wrap items-center gap-1.5">
        {reactions.map((r) => (
          <button
            key={r.emoji}
            type="button"
            onClick={() => react(r.emoji)}
            disabled={pending}
            aria-pressed={r.mine}
            title={r.mine ? "取り消す" : "同じ反応をする"}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-bold transition disabled:opacity-60 ${
              r.mine
                ? "border-[var(--red-soft)] bg-[var(--red-soft)] text-[var(--ink)]"
                : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:border-[var(--ink-2)]"
            }`}
          >
            <span aria-hidden className="text-[13px] leading-none">
              {r.emoji}
            </span>
            {r.count}
          </button>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            aria-label="反応を足す"
            title="反応を足す"
            className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--ink-2)] hover:text-[var(--ink-2)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
          {pickerOpen ? (
            // ⚠️ 6つだけ。⚠️ 全絵文字のパレットは出さない（商談の場）
            <div className="absolute bottom-9 left-0 z-10 flex gap-1 rounded-full border border-[var(--line)] bg-white p-1.5 shadow-md">
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => react(e)}
                  disabled={pending}
                  aria-label={`${e} で反応する`}
                  className="grid h-8 w-8 place-items-center rounded-full text-[17px] leading-none transition hover:bg-[var(--green-soft)] disabled:opacity-60"
                >
                  {e}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* スレッドの入口。⚠️ 0件のときも出す（押す場所が動かないように） */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`ml-auto inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold transition ${
            replies.length > 0
              ? "bg-[var(--red-soft)] text-[var(--green-d)] hover:brightness-95"
              : "text-[var(--muted)] hover:text-[var(--ink-2)]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10a6 6 0 0 1 6 6v5" />
          </svg>
          {replies.length > 0 ? `返信 ${replies.length}件` : "この発言に返信"}
        </button>
      </div>

      {/* スレッド本体 */}
      {open ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] p-3">
          {replies.length > 0 ? (
            <ul className="mb-2 flex flex-col gap-2.5">
              {replies.map((r) => (
                <li key={r.id} className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-bold text-[var(--ink)]">{r.name}</span>
                    <span className="text-[11px] text-[var(--muted)]">{timeStr(r.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-6 text-[var(--ink)]">{r.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-[12px] text-[var(--muted)]">
              まだ返信はありません。ここに書いたことは、本文には流れません。
            </p>
          )}

          <form
            action={sendThreadReply.bind(null, messageId)}
            className="flex items-end gap-2"
          >
            <label htmlFor={`reply-${messageId}`} className="sr-only">
              この発言に返信する
            </label>
            <textarea
              id={`reply-${messageId}`}
              name="body"
              rows={2}
              required
              placeholder="この発言に返信する"
              className="min-w-0 flex-1 resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[13px] leading-6 text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-[var(--green)] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[var(--green-d)]"
            >
              返信
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
