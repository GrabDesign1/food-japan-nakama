"use client";

/**
 * 【上部バーのメッセージ】2026-11-27 ユーザーご指示
 *   「マイページのアイコン　右　下　に　メッセージのアイコンをつけて、バッチで届いた件数だすようにして」
 *   「右上ね」「クリックしたらこんな風に表示するようにして」（Messenger の吹き出しの画像）。
 *
 * ⚠️ 件数（`unread`）はレイアウトが数えた値をもらう（⚠️ ここで数え直さない）。
 * ⚠️⚠️ **中身は開いたときに1回だけ読む**。閉じている人のぶんまで全ページで読みに行かない。
 * ⚠️ 本文の伏せ字（未開封のリード）は `loadMessagePeek()` の側で済ませてある。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadMessagePeek, type PeekRow } from "./message-peek-actions";

export function MessagePeek({
  unread,
  avatarUrl,
  initial,
}: {
  unread: number;
  avatarUrl: string | null;
  /** ⚠️ 写真が無い方の頭文字（レイアウト側で作っている値をそのままもらう） */
  initial: string;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PeekRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await loadMessagePeek());
    } catch {
      // ⚠️ 読めなくても画面は止めない。「すべて見る」から一覧へ行ける
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ⚠️ 開くたびに読み直す（⚠️⚠️ 一度読んで固定すると、既読にしてきても古いままになる）
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  // 外側を押す・Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    /* ⚠️ 吹き出しの位置の基準はこの箱（＝アバター）。⚠️⚠️ ここの relative を外すと、吹き出しが画面の隅へ飛ぶ */
    <div ref={boxRef} className="relative h-9 w-9 shrink-0">
      <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white font-serif text-[15px] text-[var(--green-d)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `メッセージ（届いています ${unread}件）` : "メッセージ"}
        className={`absolute -bottom-1 -right-1 flex h-[20px] items-center gap-[2px] rounded-full border-2 border-white px-[4px] text-[10px] font-bold leading-none text-white transition ${
          unread > 0 ? "bg-[var(--red)]" : "bg-[var(--ink)] hover:bg-[var(--green-d)]"
        }`}
      >
        {/* Material Symbols の「chat」相当（Apache License 2.0） */}
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden className="shrink-0">
          <path
            fill="currentColor"
            d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"
          />
        </svg>
        {/* ⚠️ 3桁は丸に収まらないので 99+ で止める */}
        {unread > 0 ? <span>{unread > 99 ? "99+" : unread}</span> : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="メッセージ"
          /**
           * 置き場所——
           * ⚠️⚠️ **スマホは画面に貼る（fixed）**。アバターの右はまだ「ログアウト」があるので、
           *    ⚠️ `right-0`（＝アバターの右端にそろえる）だけだと、⚠️⚠️ **左が画面の外へ 100px はみ出す**（375px で実測）。
           *    ⚠️ `top-16` は上の帯の高さ（64px・実測）。
           * ⚠️ sm 以上はアバターのすぐ下に吊るす。
           */
          className="fixed inset-x-4 top-16 z-50 overflow-hidden rounded-[14px] border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[340px]"
        >
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
            <span className="text-[18px] font-bold text-[var(--ink)]">メッセージ</span>
            {unread > 0 ? (
              <span className="rounded-full bg-[var(--red)] px-2 py-0.5 text-[10px] font-bold text-white">
                新着 {unread}
              </span>
            ) : null}
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {loading && rows === null ? (
              <Skeleton />
            ) : (
              <PeekList rows={rows ?? []} onPick={() => setOpen(false)} />
            )}
          </div>

          <Link
            href="/messages"
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--line)] px-4 py-3 text-center text-[13px] font-semibold text-[var(--green-d)] transition hover:bg-[var(--canvas)]"
          >
            すべて見る
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 吹き出しの中身（見た目だけ）。⚠️ 読み込みと開け閉めは上の `MessagePeek` が持つ。
 * ⚠️ 本文はここで伏せない——`loadMessagePeek()` の時点で伏せ字にしてある。
 */
export function PeekList({ rows, onPick }: { rows: PeekRow[]; onPick?: () => void }) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[13px] text-[var(--muted)]">
        まだメッセージはありません。
        <br />
        気になる相手に「興味を送る」と、ここから始まります。
      </p>
    );
  }
  return (
    <>
      {rows.map((r) => (
        <Link
          key={r.id}
          href={`/messages/${r.id}`}
          onClick={onPick}
          className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--canvas)]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--canvas)] font-serif text-[16px] text-[var(--green-d)]">
            {r.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (r.name[0] ?? "?").toUpperCase()
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-[14px] text-[var(--ink)] ${
                r.unread > 0 ? "font-bold" : "font-semibold"
              }`}
            >
              {r.name}
            </span>
            <span className="mt-0.5 flex items-center gap-2">
              <span
                className={`min-w-0 flex-1 truncate text-[12px] ${
                  r.unread > 0 ? "font-bold text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                {r.preview}
              </span>
              <span className="shrink-0 text-[11px] text-[var(--muted)]">{r.timeLabel}</span>
            </span>
          </span>
          {/* ⚠️ 色だけで伝えない——点には読み上げ用の文字を添える */}
          {r.unread > 0 ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--red)]">
              <span className="sr-only">未読</span>
            </span>
          ) : null}
        </Link>
      ))}
    </>
  );
}

/** 読み込み中の行（⚠️ 空白のまま待たせない） */
function Skeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[var(--line-soft)]" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--line-soft)]" />
            <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[var(--line-soft)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
