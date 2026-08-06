"use client";

import { useTransition } from "react";
import { setDealPhase } from "../actions";
import { PHASES } from "@/lib/deal-constants";

export function PhaseSelect({ dealId, phase }: { dealId: string; phase: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={phase}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await setDealPhase(dealId, Number(e.target.value));
        })
      }
      className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--green)] disabled:opacity-60"
    >
      {PHASES.map((label, i) => (
        <option key={i} value={i}>
          {i}. {label}
        </option>
      ))}
    </select>
  );
}
