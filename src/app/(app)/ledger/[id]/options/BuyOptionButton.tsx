"use client";

import { useActionState } from "react";
import { buyListingOption, type OptionState } from "./actions";
import { btn } from "@/lib/ui";

export function BuyOptionButton({
  offeringId,
  code,
  label,
}: {
  offeringId: string;
  code: string;
  label: string;
}) {
  const [state, action, pending] = useActionState<OptionState, FormData>(
    buyListingOption.bind(null, offeringId, code),
    {}
  );
  return (
    <form action={action} className="mt-3">
      {state.error ? <p className="mb-1 text-[12px] text-[var(--red)]">{state.error}</p> : null}
      <button disabled={pending} className={`${btn("primary", "sm")} w-full disabled:opacity-50`}>
        {pending ? "決済画面へ移動中…" : label}
      </button>
    </form>
  );
}
