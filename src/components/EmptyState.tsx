// 空状態の統一表示。タイトル＋説明＋次の行動CTA（リンク or フォームボタンをchildrenで）
import Link from "next/link";
import { btn } from "@/lib/ui";

export function EmptyState({
  title,
  description,
  actions,
  children,
  compact,
}: {
  title: string;
  description?: string;
  actions?: { label: string; href: string; variant?: "primary" | "amber" | "secondary" }[];
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-dashed border-[var(--line)] bg-white text-center ${compact ? "p-5" : "p-8"}`}
    >
      <p className="text-[14px] font-semibold text-[var(--ink)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-[520px] text-[13px] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      ) : null}
      {actions?.length || children ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions?.map((a) => (
            <Link key={`${a.href}-${a.label}`} href={a.href} className={btn(a.variant ?? "secondary", "sm")}>
              {a.label}
            </Link>
          ))}
          {children}
        </div>
      ) : null}
    </div>
  );
}
