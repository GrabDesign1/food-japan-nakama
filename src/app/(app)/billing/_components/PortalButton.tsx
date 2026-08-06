"use client";

import { useActionState } from "react";
import { openBillingPortal, type PortalState } from "../actions";
import { btn } from "@/lib/ui";

const INIT: PortalState = {};

export function PortalButton() {
  const [state, formAction, pending] = useActionState(openBillingPortal, INIT);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <button
        disabled={pending}
        className={btn("secondary")}
      >
        {pending ? "開いています…" : "お支払い情報を管理する（解約・領収書・カード変更）"}
      </button>
      {state.error ? <p className="text-[11px] text-[var(--red)]">{state.error}</p> : null}
    </form>
  );
}
