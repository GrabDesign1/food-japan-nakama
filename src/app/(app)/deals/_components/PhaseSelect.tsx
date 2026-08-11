// 取引の段階の表示。
//
// **手では変えられない**（2026-08-12）。段階は「条件に同意した」「発送を記録した」
// 「受け取りを記録した」「帳票を発行した」「入金を確認した」という実際の操作から
// 自動で進む。手で動かせると記録された事実と食い違うため、選択式をやめた。
import { PHASES } from "@/lib/deal-constants";

export function PhaseSelect({ phase }: { phase: number }) {
  const label = PHASES[phase] ?? PHASES[0];
  const done = phase >= PHASES.length - 1;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
        done
          ? "border border-[var(--amber-line)] bg-[var(--amber-soft)] text-[var(--amber-ink)]"
          : "bg-[var(--orange)] text-white"
      }`}
    >
      {phase + 1}. {label}
    </span>
  );
}
