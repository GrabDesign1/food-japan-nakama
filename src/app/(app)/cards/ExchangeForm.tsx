"use client";

import { useActionState } from "react";
import { exchange, type ExchangeState } from "./actions";
import { btn, input } from "@/lib/ui";

/**
 * カードを受け取るフォーム。2つの使い方がある。
 *  - code なし … 相手のコードを手で入れてもらう（/cards）
 *  - code あり … QRから来た人の確認ボタン（/cards/x/[code]）。コードは隠しで持つ
 *
 * ⚠️ 隠すときは**hidden input に値を入れる**こと。表示用の欄をCSSで隠すだけだと
 *    値が空のまま送信される（2026-11-14に一度やらかした）。
 * ⚠️ 会場では小文字・空白・ハイフン混じりで打たれるので、整形はサーバー側（cards.ts）で吸収する。
 *    ここで勝手に大文字化しない（打ちながら文字が変わると打ちにくい）。
 */
export function ExchangeForm({
  defaultMetAt,
  code,
  submitLabel = "カードを受け取る",
}: {
  defaultMetAt: string | null;
  code?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<ExchangeState, FormData>(exchange, {});

  return (
    <form action={action} className="mt-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {code ? (
          <input type="hidden" name="code" value={code} />
        ) : (
          <input
            name="code"
            required
            maxLength={16}
            autoComplete="off"
            placeholder="交換コード（8文字）"
            aria-label="交換コード"
            className={`${input()} font-mono tracking-[0.14em] sm:max-w-[260px]`}
          />
        )}
        <button type="submit" disabled={pending} className={btn("primary")}>
          {pending ? "確認しています…" : submitLabel}
        </button>
      </div>

      {defaultMetAt ? (
        <label className="mt-3 block">
          <span className="text-[11px] text-[var(--muted)]">どこで出会ったか</span>
          <input
            name="metAt"
            defaultValue={defaultMetAt}
            maxLength={120}
            autoComplete="off"
            className={`${input("sm")} mt-1`}
          />
        </label>
      ) : (
        <input type="hidden" name="metAt" value="" />
      )}

      {state.error ? (
        <p role="alert" className="mt-3 text-[13px] text-[#b4232a]">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p role="status" className="mt-3 text-[13px] text-[var(--green-d)]">
          {state.already ? "すでに交換済みのカードです。" : "カードを交換しました。"}
        </p>
      ) : null}
    </form>
  );
}
