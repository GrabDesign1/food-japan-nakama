"use client";

/**
 * 【この端末にお知らせを届ける】2026-11-28（PWA・Web Push）。
 *
 * ⚠️⚠️ **iPhone はホーム画面に追加していないと、許可を聞くことすらできない**（iOS 16.4〜）。
 *    その状態では「先にホーム画面へ追加してください」と出す。いきなり許可を求めない。
 * ⚠️⚠️ **一度「許可しない」を押されると、こちらからは二度と聞けない。**
 *    ブラウザの設定から戻してもらうしかないので、押す前に何のための通知かを書いておく。
 * ⚠️ 端末ごとの設定。スマホで入れてもパソコンには届かない（そう書いてある）。
 */
import { useEffect, useState } from "react";
import { btn } from "@/lib/ui";
import { savePushSubscription, removePushSubscription } from "./push-actions";

/**
 * base64url の公開鍵を、ブラウザが欲しがる形に直す。
 * ⚠️ 戻り値を `Uint8Array<ArrayBuffer>` と書いているのは型のため
 *    （既定の `ArrayBufferLike` だと applicationServerKey に渡せない）。
 */
function toUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "checking" | "unsupported" | "need-install" | "off" | "on" | "blocked";

export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicKey) return setStatus("unsupported");
      if (typeof window === "undefined") return;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // ⚠️ iPhone でホーム画面に未追加だと、そもそも PushManager が無い
        return setStatus(isIOS && !standalone ? "need-install" : "unsupported");
      }
      if (isIOS && !standalone) return setStatus("need-install");
      if (Notification.permission === "denied") return setStatus("blocked");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, [publicKey]);

  const turnOn = async () => {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true, // ⚠️ 黙って情報だけ取る使い方は禁止されている
        applicationServerKey: toUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const res = await savePushSubscription(
        json.endpoint ?? "",
        json.keys?.p256dh ?? "",
        json.keys?.auth ?? "",
        navigator.userAgent
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      setStatus("on");
    } catch {
      setError("この端末では通知を受け取れませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
      <h2 className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
        この端末にお知らせを届ける
      </h2>
      <p className="mt-1 text-[14px] leading-[21px] text-[var(--muted)]">
        メールを待たずに、画面に出るお知らせが届きます。
        <b className="text-[var(--ink)]">端末ごとの設定です。</b>
        スマホで入れても、パソコンには届きません。
        {/* ⚠️ この一文を消さないこと。ロック画面に中身が出ると誤解されないように */}
        <br />
        お知らせに出るのは「誰から」「どの画面か」までで、
        <b className="text-[var(--ink)]">やり取りの中身は出ません。</b>
      </p>

      <div className="mt-3">
        {status === "checking" ? (
          <p className="text-[14px] text-[var(--muted)]">確認しています…</p>
        ) : status === "on" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] font-bold text-[var(--green-d)]">✓ 届く設定です</span>
            <button type="button" onClick={turnOff} disabled={busy} className={btn("secondary", "sm")}>
              この端末では止める
            </button>
          </div>
        ) : status === "off" ? (
          <button type="button" onClick={turnOn} disabled={busy} className={btn("primary", "md")}>
            {busy ? "設定しています…" : "この端末で受け取る"}
          </button>
        ) : status === "need-install" ? (
          <p className="text-[14px] leading-[21px] text-[var(--amber-ink)]">
            iPhone・iPad では、<b>先に下の「ホーム画面に置く」を済ませてから</b>、
            ホーム画面のアイコンで開き直してください。Safari のタブのままでは届きません。
          </p>
        ) : status === "blocked" ? (
          <p className="text-[14px] leading-[21px] text-[var(--amber-ink)]">
            この端末では通知が拒否されています。ブラウザの設定（サイトの権限 → 通知）から
            許可に戻してください。
            {/* ⚠️ 一度 denied になると、こちらからは二度と聞けない */}
          </p>
        ) : (
          <p className="text-[14px] text-[var(--muted)]">
            この端末・ブラウザは、画面に出るお知らせに対応していません。メールでお届けします。
          </p>
        )}
        {error ? <p className="mt-2 text-[14px] text-[var(--red)]">{error}</p> : null}
      </div>
    </div>
  );
}
