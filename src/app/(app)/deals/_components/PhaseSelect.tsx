"use client";

import { useTransition } from "react";
import { setDealPhase } from "../actions";
import { PHASES } from "@/lib/deal-constants";
import { input } from "@/lib/ui";

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
      className={input("sm")}
    >
      {PHASES.map((label, i) => (
        <option key={i} value={i}>
          {i}. {label}
        </option>
      ))}
    </select>
  );
}
