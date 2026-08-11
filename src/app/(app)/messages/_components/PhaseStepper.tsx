// 取引の進み具合の表示（案件ごとのやり取り画面の上部）。
//
// **手では動かせない**。段階は「条件に同意した」「発送を記録した」「受け取りを記録した」
// 「帳票を発行した」「入金を確認した」という実際の操作から自動で進む。
//
// 光らせるのは「次にやること」。記録は最後に済んだ段階を持っているので、
// 表示では ＋1 した段階を現在地にする（受け取りまで済んだら「納品書・請求書発行」が現在地）。
import { PHASES, activeStep } from "@/lib/deal-constants";

export function PhaseStepper({ phase }: { phase: number }) {
  const active = activeStep(phase);
  return (
    <ol className="flex flex-wrap gap-1" aria-label="取引の進み具合">
      {PHASES.map((label, i) => {
        const done = i < active;
        const isActive = i === active;
        return (
          <li
            key={label}
            aria-current={isActive ? "step" : undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isActive
                ? "bg-[var(--orange)] text-white shadow-sm"
                : done
                  ? "border border-[var(--amber-line)] bg-[var(--amber-soft)] text-[var(--amber-ink)]"
                  : "border border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {i + 1}. {label}
          </li>
        );
      })}
    </ol>
  );
}
