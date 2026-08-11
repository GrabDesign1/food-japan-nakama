import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { OfferingCard } from "@/components/OfferingCard";
import { EmptyState } from "@/components/EmptyState";
import { views24hMap } from "@/lib/offering-views";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

export default async function LedgerPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = await getOrCreateMemberForUser(su);

  const offerings = await prisma.offering.findMany({
    where: { memberId: member.id },
    orderBy: { updatedAt: "desc" },
  });

  const viewMap = await views24hMap(offerings.map((o) => o.id));
  // 案件ごとに届いた提案・問い合わせの件数（相手から1通以上あるスレッド）
  const receivedGroups = offerings.length
    ? await prisma.thread.groupBy({
        by: ["offeringId"],
        where: {
          offeringId: { in: offerings.map((o) => o.id) },
          OR: [{ fromMemberId: member.id }, { toMemberId: member.id }],
          messages: { some: { senderMemberId: { not: member.id } } },
        },
        _count: { _all: true },
      })
    : [];
  const receivedMap = new Map(
    receivedGroups.filter((g) => g.offeringId).map((g) => [g.offeringId as string, g._count._all])
  );
  const withViews = offerings.map((o) => ({ ...o, views24h: viewMap.get(o.id) ?? 0 }));
  const gives = withViews.filter((o) => o.direction === "GIVE");
  const wants = withViews.filter((o) => o.direction === "WANT");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className={eyebrowCls}>LISTINGS</p>
          <h1 className={h1Cls}>案件を登録する（売りたい・探している）</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            商品・原料・食品副産物・協業テーマなど、「売りたい（提供したい）」「探している（調達したい）」を1件ずつ登録します。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ledger/new?direction=GIVE" className={btn("primary")}>
            ＋ 売りたい（提供したい）を登録
          </Link>
          <Link href="/ledger/new?direction=WANT" className={btn("amber")}>
            ＋ 探している（調達したい）を登録する
          </Link>
        </div>
      </div>

      <Section title="売りたい（提供したい）" direction="GIVE" items={gives} receivedMap={receivedMap} />
      <Section title="探している（調達したい）" direction="WANT" items={wants} receivedMap={receivedMap} />
    </div>
  );
}

function Section({
  title,
  direction,
  items,
  receivedMap,
}: {
  title: string;
  direction: "GIVE" | "WANT";
  /** 案件ID → 届いた提案・問い合わせの件数 */
  receivedMap: Map<string, number>;
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
      <h2 className={`${h2Cls} mb-3`}>
        {title}
      </h2>
      {items.length === 0 ? (
        <EmptyState
          compact
          title={direction === "GIVE" ? "「売りたい（提供したい）」はまだ登録がありません" : "探している（調達したい）商品・原料はまだ登録がありません"}
          description={
            direction === "GIVE"
              ? "商品・食材・規格外品など、動かせるものを1件ずつ登録すると、買いたい相手から見つけてもらえます。"
              : "商品名が決まっていなくても、用途や希望条件から募集できます。登録すると、対応できる生産者や食品事業者から提案を受けられます。"
          }
        >
          <Link
            href={`/ledger/new?direction=${direction}`}
            className={btn(direction === "GIVE" ? "primary" : "amber", "sm")}
          >
            {direction === "GIVE" ? "＋ 売りたい（提供したい）を登録" : "＋ 探している（調達したい）を登録する"}
          </Link>
        </EmptyState>
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
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Link href={`/ledger/${o.id}/edit`} className={btn("secondary", "sm")}>
                  編集
                </Link>
                <Link href={`/ledger/${o.id}/proposals`} className={btn("secondary", "sm")}>
                  届いた{o.direction === "GIVE" ? "問い合わせ" : "提案"}
                  {(receivedMap.get(o.id) ?? 0) > 0 ? `（${receivedMap.get(o.id)}）` : ""}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
