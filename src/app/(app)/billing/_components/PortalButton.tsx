"use client";

import { useActionState } from "react";
import { openBillingPortal, type PortalState } from "../actions";

const INIT: PortalState = {};

export function PortalButton() {
  const [state, formAction, pending] = useActionState(openBillingPortal, INIT);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <button
        disabled={pending}
        className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--ink-2)] hover:bg-[var(--canvas)] disabled:opacity-60"
      >
        {pending ? "開いています…" : "お支払い情報を管理する（解約・領収書・カード変更）"}
      </button>
      {state.error ? <p className="text-[11px] text-[var(--red)]">{state.error}</p> : null}
    </form>
  );
}
