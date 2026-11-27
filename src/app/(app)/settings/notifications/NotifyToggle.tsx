"use client";

/**
 * 通知の ON/OFF ボタン（2026-11-28）。
 * ⚠️⚠️ `startTransition` は async にして await する。void のままだと `revalidatePath` が
 *    画面に反映されず、**押したのに戻って見える**（2026-11-27 にリアクションで踏んだ罠）。
 * ⚠️ 押した瞬間に見た目を変える（サーバーの返事を待たせない）。失敗したら元に戻す。
 */
import { useState, useTransition } from "react";
import { toggleNotify } from "./actions";

export function NotifyToggle({
  kind,
  enabled,
  label,
}: {
  kind: string;
  enabled: boolean;
  label: string;
}) {
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();

  const flip = () => {
    const next = !on;
    setOn(next); // 先に見た目を変える
    start(async () => {
      try {
        await toggleNotify(kind, next);
      } catch {
        setOn(!next); // 失敗したら戻す
      }
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}のお知らせ`}
      onClick={flip}
      disabled={pending}
      className="flex shrink-0 items-center gap-2.5 disabled:opacity-60"
    >
      <span
        className={`relative inline-flex h-[28px] w-[48px] items-center rounded-full transition ${
          on ? "bg-[var(--green)]" : "bg-[var(--outline, #807775)]"
        }`}
      >
        <span
          className={`absolute h-[22px] w-[22px] rounded-full bg-white transition-all ${
            on ? "left-[23px]" : "left-[3px]"
          }`}
        />
      </span>
      <span className="w-[56px] text-left text-[14px] font-bold text-[var(--ink)]">
        {on ? "受け取る" : "止める"}
      </span>
    </button>
  );
}
