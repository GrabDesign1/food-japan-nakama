"use client";

/**
 * 【チャンネルの発言に付くもの】2026-11-27。リアクションとスレッド返信。
 *
 * ⚠️ 商談用の `messages/_components/MessageExtras.tsx` と**双子**。
 *    中身はほぼ同じだが、呼ぶサーバー操作と表が違う（商談＝messages／チャンネル＝channel_posts）。
 *    ⚠️⚠️ **片方を直したら、もう片方も見ること。**
 *    ⚠️ 1つに統合しなかったのは、チャンネルを threads に相乗りさせなかったため
 *       （相乗りさせると、他人の商談一覧にチャンネルが漏れる）。
 * ⚠️⚠️ **リアクションでは通知しない。** 「了解」だけの往復を減らすための機能。
 * ⚠️⚠️ `startTransition` は async にして await する。void のままだと revalidatePath が
 *    画面に反映されない（書き込みは成功しているのにチップが出ない）。
 */
import { useState, useTransition } from "react";
import { REACTIONS } from "@/lib/reactions";
import { toggleChannelReaction, postToChannel } from "../actions";

export type PostReaction = { emoji: string; count: number; mine: boolean };
export type PostReply = { id: string; body: string; createdAt: Date; name: string; mine: boolean };

function timeStr(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export function PostExtras({
  channelId,
  postId,
  reactions,
  replies,
  canPost,
}: {
  channelId: string;
  postId: string;
  reactions: PostReaction[];
  replies: PostReply[];
  /** 参加していない人は読めるが書けない。⚠️ ボタンも出さない（押せないものを見せない） */
  canPost: boolean;
}) {
  const [pending, start] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const react = (emoji: string) => {
    setPickerOpen(false);
    start(async () => {
      await toggleChannelReaction(postId, emoji);
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {reactions.map((r) => (
          <button
            key={r.emoji}
            type="button"
            onClick={() => react(r.emoji)}
            disabled={pending || !canPost}
            aria-pressed={r.mine}
            title={canPost ? (r.mine ? "取り消す" : "同じ反応をする") : "参加すると反応できます"}
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

        {canPost ? (
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
        ) : null}

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

      {open ? (
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--green-soft)] p-3">
          {replies.length > 0 ? (
            <ul className="mb-2 flex flex-col gap-2.5">
              {replies.map((r) => (
                <li key={r.id} className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-bold text-[var(--ink)]">{r.name}</span>
                    <span className="text-[12px] text-[var(--muted)]">{timeStr(r.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[14px] leading-[21px] text-[var(--ink)]">
                    {r.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-[12px] text-[var(--muted)]">
              まだ返信はありません。ここに書いたことは、本文には流れません。
            </p>
          )}

          {canPost ? (
            <form action={postToChannel.bind(null, channelId, postId)} className="flex items-end gap-2">
              <label htmlFor={`creply-${postId}`} className="sr-only">
                この発言に返信する
              </label>
              <textarea
                id={`creply-${postId}`}
                name="body"
                rows={2}
                required
                placeholder="この発言に返信する"
                className="min-w-0 flex-1 resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] leading-[21px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[var(--green)] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[var(--green-d)]"
              >
                返信
              </button>
            </form>
          ) : (
            <p className="text-[12px] text-[var(--muted)]">参加すると返信できます。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
