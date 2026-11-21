"use client";

// 写真の拡大（2026-11-21。ユーザー指示「写真の拡大」）。
// ⚠️ 外部の部品は入れない。閉じる手段を必ず3つ用意する（×・背景・Escキー）。
//    スマホで閉じられない画面は、戻るボタンを押させることになる。
import { useCallback, useEffect } from "react";

export type LightboxState = { srcs: string[]; index: number } | null;

export function Lightbox({
  state,
  onClose,
  onMove,
}: {
  state: LightboxState;
  onClose: () => void;
  onMove: (next: number) => void;
}) {
  const count = state?.srcs.length ?? 0;
  const index = state?.index ?? 0;

  const move = useCallback(
    (step: number) => {
      if (count < 2) return;
      onMove((index + step + count) % count);
    },
    [count, index, onMove]
  );

  // Escで閉じる・矢印で送る。開いている間は後ろを動かさない
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [state, onClose, move]);

  if (!state) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="写真"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.srcs[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full object-contain"
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute right-4 top-4 h-11 w-11 rounded-full bg-white/90 text-[20px] leading-none text-[#141414]"
      >
        ×
      </button>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); move(-1); }}
            aria-label="前の写真"
            className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/90 text-[18px] leading-none text-[#141414]"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); move(1); }}
            aria-label="次の写真"
            className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white/90 text-[18px] leading-none text-[#141414]"
          >
            ›
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-[#141414]">
            {index + 1} / {count}
          </p>
        </>
      ) : null}
    </div>
  );
}
