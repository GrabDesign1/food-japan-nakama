"use client";

// スレッドを開いたとき・新しいメッセージが増えたときに、最新の1通まで自動でスクロールする。
// これが無いと、いちばん新しい吹き出しが入力欄の下に隠れて見えない。
import { useEffect, useRef } from "react";

export function ScrollToLatest({ latestId }: { latestId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // レイアウト確定後に一番下へ寄せる（画像の読み込みで高さが変わるため次フレームで実行）
    const id = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: "end" });
    });
    return () => cancelAnimationFrame(id);
  }, [latestId]);

  return <div ref={ref} aria-hidden />;
}
