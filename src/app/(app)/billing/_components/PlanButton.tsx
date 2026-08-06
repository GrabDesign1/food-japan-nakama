"use client";

import { useActionState } from "react";
import { startCheckout, type CheckoutState } from "../actions";

export function PlanButton({ planCode, label }: { planCode: string; label: string }) {
  const action = startCheckout.bind(null, planCode);
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <button
        disabled={pending}
        className="w-full rounded-md bg-[var(--green)] py-2 text-[13px] font-medium text-white hover:bg-[var(--green-d)] disabled:opacity-60"
      >
        {pending ? "処理中…" : label}
      </button>
      {state.error ? <p className="text-[11px] text-[var(--red)]">{state.error}</p> : null}
    </form>
  );
}
