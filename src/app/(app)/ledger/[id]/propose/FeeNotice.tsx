"use client";

// 紹介料の説明。初回は開いた状態、2回目以降は畳んだ状態で表示する（2026-08-11）。
// 毎回読むものではないが、初めての人には必ず見せる必要がある（料金の事前明示）。
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

const SEEN_KEY = "nakama.proposeFeeNotice.seen";

// 既読かどうか（サーバー描画時は false ＝開いた状態で描く）。
// useEffect 内で setState すると再レンダーが連鎖するため、外部ストアとして読む。
const subscribe = () => () => {};
const getSeen = () => {
  try {
    return !!localStorage.getItem(SEEN_KEY);
  } catch {
    return false; // プライベートモード等では毎回開いたままにする
  }
};

export function FeeNotice({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const seen = useSyncExternalStore(subscribe, getSeen, () => false);
  // ユーザーが自分で開閉したらそちらを優先する
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? !seen;

  // 一度表示したら既読にする（表示のたびに畳まれるようになる）
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // 失敗しても表示に影響はない
    }
  }, []);

  return (
    <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">初回紹介料について</h2>
        <button
          type="button"
          onClick={() => setManual(!open)}
          aria-expanded={open}
          className="text-[12px] text-[var(--green-d)] underline"
        >
          {open ? "説明を閉じる" : "料金の詳しい条件を見る"}
        </button>
      </div>

      {open ? <div className="mt-2">{children}</div> : null}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-3 text-[13px]">
        {summary}
      </div>
    </div>
  );
}
