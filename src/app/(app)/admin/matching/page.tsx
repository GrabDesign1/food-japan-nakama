// 事務局：売りたい × 探している の組み合わせ一覧（2026-11-26）。
// ⚠️⚠️ **自動では何も送らない。** 事務局が人の目で見て、人の手でつなぐための材料。
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { allMatches } from "@/lib/matching";
import { EmptyState } from "@/components/EmptyState";
import { eyebrowCls, h1Cls } from "@/lib/ui";

export const metadata: Metadata = { title: "つなぐ候補｜事務局", robots: { index: false, follow: false } };

export default async function AdminMatchingPage() {
  await requireAdmin();
  const matches = await allMatches(40);

  return (
    <div className="px-1 py-2">
      <div className={eyebrowCls}>ADMIN</div>
      <h1 className={`${h1Cls} mt-1`}>つなぐ候補</h1>
      <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
        「売りたい」と「探している」で、条件の近い組み合わせです。
        近い順に並べています。<strong className="text-[var(--ink)]">連絡は事務局が人の手で</strong>行ってください。
      </p>

      {matches.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="まだ組み合わせがありません"
            description="「売りたい」と「探している」が両方そろうと、ここに出ます。"
            actions={[{ label: "案件の一覧を見る", href: "/admin/listings", variant: "primary" }]}
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {matches.map((m) => (
            <li
              key={`${m.mine.offeringId}-${m.other.offeringId}`}
              className="rounded-[10px] border border-[var(--line)] bg-white p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--green-d)]">売りたい</p>
                  <p className="truncate text-[14px] font-semibold text-[var(--ink)]">{m.mine.title}</p>
                  <p className="truncate text-[12px] text-[var(--muted)]">
                    <Link href={`/producers/${m.mine.memberId}`} className="hover:underline">
                      {m.mine.memberName}
                    </Link>
                    {m.mine.area ? `　／　${m.mine.area}` : ""}
                  </p>
                </div>
                <div aria-hidden className="hidden text-[18px] text-[var(--muted)] sm:block">↔</div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--amber)]">探している</p>
                  <p className="truncate text-[14px] font-semibold text-[var(--ink)]">{m.other.title}</p>
                  <p className="truncate text-[12px] text-[var(--muted)]">
                    <Link href={`/producers/${m.other.memberId}`} className="hover:underline">
                      {m.other.memberName}
                    </Link>
                    {m.other.area ? `　／　${m.other.area}` : ""}
                  </p>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-2.5">
                {m.reasons.map((r) => (
                  <li key={r} className="rounded-full bg-[var(--line-soft)] px-2.5 py-1 text-[11px] text-[var(--ink-2)]">
                    {r}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
