"use client";

// Onegaizar からの取り込みボタン（2026-11-25）。
// ⚠️ 押した結果（何人取り込んだか）をその場に出す。黙って終わらせない。
import { useActionState } from "react";
import { syncOnegaizar } from "../prereg-actions";
import type { PreregState } from "../prereg-actions";
import { btn } from "@/lib/ui";

export function SyncForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<PreregState, FormData>(syncOnegaizar, {});

  if (!configured) {
    return (
      <p className="text-[12px] leading-6 text-[var(--muted)]">
        連携はまだ設定されていません。Vercel の環境変数に
        <code className="mx-1 rounded bg-[#F1F4F5] px-1">ONEGAIZAR_SYNC_URL</code>と
        <code className="mx-1 rounded bg-[#F1F4F5] px-1">ONEGAIZAR_SYNC_TOKEN</code>
        を入れてください。
      </p>
    );
  }

  return (
    <form action={action}>
      <button type="submit" disabled={pending} className={btn("secondary")}>
        {pending ? "取り込んでいます…" : "イベントから取り込む"}
      </button>
      {state.error ? (
        <p className="mt-2 text-[12px] text-[var(--red)]">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="mt-2 text-[12px] leading-6 text-[var(--green-d)]">{state.message}</p>
      ) : null}
    </form>
  );
}
