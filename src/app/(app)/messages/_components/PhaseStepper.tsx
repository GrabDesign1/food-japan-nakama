"use client";

// 商談の進捗ステッパー（案件ごとのやり取り画面の上部）。
// 段階を押すとその場で進捗が変わる（押した瞬間に見た目を変え、失敗したら戻す）。
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDealPhase } from "../../deals/actions";
import { PHASES } from "@/lib/deal-constants";

export function PhaseStepper({ dealId, phase }: { dealId: string; phase: number }) {
  const [current, setCurrent] = useState(phase);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-1">
      {PHASES.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <button
            key={label}
            type="button"
            disabled={pending}
            aria-current={active ? "step" : undefined}
            onClick={() => {
              if (i === current) return;
              const prev = current;
              setCurrent(i);
              startTransition(async () => {
                try {
                  await setDealPhase(dealId, i);
                  router.refresh();
                } catch {
                  setCurrent(prev);
                }
              });
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-60 ${
              active
                ? "bg-[var(--green)] text-white"
                : done
                  ? "bg-[var(--green-soft)] text-[var(--green-d)]"
                  : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--green)]"
            }`}
          >
            {i + 1}. {label}
          </button>
        );
      })}
    </div>
  );
}
