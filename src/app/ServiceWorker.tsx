"use client";

/**
 * 【Service Worker の登録】2026-11-28。
 * これを読み込まないと「ホーム画面に追加」も、プッシュ通知も動かない。
 *
 * ⚠️ 画面には何も出さない（null を返す）。
 * ⚠️ localhost でも動く（Service Worker は https か localhost でだけ使える）。
 * ⚠️ 失敗しても黙って諦める。古いブラウザや、プライベートモードでは登録できないため。
 */
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // ⚠️ 読み込み直後に登録すると最初の表示が重くなるので、落ち着いてから
    const t = setTimeout(() => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* 登録できない環境は、ふつうのサイトとして動けばよい */
      });
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
