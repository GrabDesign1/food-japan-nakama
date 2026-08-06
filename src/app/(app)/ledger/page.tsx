import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { OfferingCard } from "@/components/OfferingCard";
import { views24hMap } from "@/lib/offering-views";
import { createDraftOffering } from "./actions";

export default async function LedgerPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = await getOrCreateMemberForUser(su);

  const offerings = await prisma.offering.findMany({
    where: { memberId: member.id },
    orderBy: { updatedAt: "desc" },
  });

  const viewMap = await views24hMap(offerings.map((o) => o.id));
  const withViews = offerings.map((o) => ({ ...o, views24h: viewMap.get(o.id) ?? 0 }));
  const gives = withViews.filter((o) => o.direction === "GIVE");
  const wants = withViews.filter((o) => o.direction === "WANT");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">MOCHIYORI</p>
          <h1 className="font-serif text-[22px] text-[var(--ink)]">持ち寄り（売りたい・買いたい）</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            「売りたい」「買いたい」を1件ずつ登録します。
          </p>
        </div>
        <div className="flex gap-2">
          <form action={createDraftOffering.bind(null, "GIVE")}>
            <button className="rounded-md bg-[var(--green)] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[var(--green-d)]">
              ＋ 売りたいを登録
            </button>
          </form>
          <form action={createDraftOffering.bind(null, "WANT")}>
            <button className="rounded-md bg-[#B77F0B] px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90">
              ＋ 買いたいを登録
            </button>
          </form>
        </div>
      </div>

      <Section title="売りたい" empty="まだ登録がありません。" items={gives} />
      <Section title="買いたい" empty="まだ登録がありません。" items={wants} />
    </div>
  );
}

function Section({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: {
    id: string;
    direction: string;
    category: string;
    title: string;
    area: string | null;
    imageUrls: string[];
    amountValue: number | null;
    amountUnit: string | null;
    amountPeriod: string | null;
    amountText: string | null;
    isPublic: boolean;
    tags: string[];
    views24h?: number;
  }[];
}) {
  return (
    <div>
      <h2 className="mb-3 font-serif text-[22px] font-semibold text-[var(--ink)]">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
          {empty}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((o) => (
            <div key={o.id} className="relative">
              {!o.isPublic ? (
                <span className="absolute left-2 top-2 z-10 rounded bg-[var(--ink)]/80 px-2 py-0.5 text-[10px] text-white">
                  下書き
                </span>
              ) : null}
              <OfferingCard o={o} />
              <Link
                href={`/ledger/${o.id}/edit`}
                className="mt-1 inline-block text-[11px] text-[var(--green-d)] underline"
              >
                編集
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
