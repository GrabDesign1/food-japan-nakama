"use client";

/**
 * 【ホーム画面に追加】2026-11-28 ユーザー指示「① PWA（ホーム画面に追加）を着手」。
 *
 * ⚠️⚠️ **iPhone には「インストール」ボタンを出せない。** Safari は `beforeinstallprompt` を
 *    持っていないので、**手順を文章で案内するしかない**。ここを自動化しようとしないこと。
 * ⚠️⚠️ **iPhone でプッシュ通知が届くのは、ホーム画面に追加したときだけ**（iOS 16.4〜）。
 *    Safari のタブのままでは届かない。これを書いておかないと「通知が来ない」と言われる。
 * ⚠️ すでに追加済み（standalone で開いている）なら、案内を出さない。
 */
import { useEffect, useState } from "react";
import { btn } from "@/lib/ui";

type InstallEvent = Event & { prompt: () => Promise<void> };

export function InstallApp() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // すでにホーム画面から開いている
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // ⚠️ iOS だけ独自のフラグを持っている
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault(); // 勝手に出さず、ボタンを押したときに出す
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return (
      <div className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
        <p className="text-[14px] leading-[21px] text-[var(--ink)]">
          ✓ ホーム画面から開いています。お知らせがこの端末に届きます。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
      <h2 className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
        ホーム画面に置く
      </h2>
      <p className="mt-1 text-[14px] leading-[21px] text-[var(--muted)]">
        アプリのようにアイコンから開けます。
        <b className="text-[var(--ink)]">
          スマホにお知らせを届けるには、ホーム画面への追加が必要です。
        </b>
      </p>

      {deferred ? (
        // Android / パソコンの Chrome。ここだけボタンを出せる
        <button
          type="button"
          className={`${btn("primary", "md")} mt-3`}
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
        >
          ホーム画面に追加する
        </button>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5 text-[14px] leading-[21px] text-[var(--ink-2)]">
          {isIOS ? (
            <>
              {/* ⚠️ iPhone は Safari でしか追加できない（Chrome では項目が出ない） */}
              <li>1. 画面の下にある「共有」（↑のマーク）を押す</li>
              <li>2. 少し下にスクロールして「ホーム画面に追加」を押す</li>
              <li>3. 右上の「追加」を押す</li>
              <li className="text-[12px] text-[var(--muted)]">
                ※ iPhone は Safari で開いているときだけ追加できます。
              </li>
            </>
          ) : (
            <>
              <li>1. ブラウザのメニュー（⋮）を開く</li>
              <li>2. 「ホーム画面に追加」または「アプリをインストール」を押す</li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
