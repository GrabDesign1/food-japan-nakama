"use client";

// 開いているものを Esc で閉じる（モーダル・ドロワー共通・2026-08-12）。
//
// マウスなら背景をクリックして閉じられるが、キーボードだけだと閉じる手段が
// 「閉じるボタンまでTabする」しかなかった。モーダルは数が多いので、
// 各画面に書かずここへ集約する（`role="dialog"` と対で使うこと）。
import { useEffect } from "react";

export function useCloseOnEscape(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}
