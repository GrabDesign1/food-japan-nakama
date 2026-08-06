import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORY_L1, PREFECTURES } from "@/lib/member-taxonomy";
import { OfferingCard } from "@/components/OfferingCard";
import { ProducerCard } from "@/components/ProducerCard";
import { views24hMap } from "@/lib/offering-views";
import { btn } from "@/lib/ui";

type SP = {
  target?: string;
  area?: string;
  category?: string;
  q?: string;
  direction?: string;
};

const inputCls =
  "rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const tenantId = su.app.tenantId;

  const sp = await searchParams;
  const target = sp.target === "producers" ? "producers" : "projects";
  const area = sp.area?.trim() || "";
  const category = sp.category?.trim() || "";
  const q = sp.q?.trim() || "";
  const direction = sp.direction === "GIVE" || sp.direction === "WANT" ? sp.direction : "";

  // ── 検索実行 ──
  let offerings: Awaited<ReturnType<typeof searchOfferings>> = [];
  let producers: Awaited<ReturnType<typeof searchProducers>> = [];

  // 自分の事業者・投稿は除外せず、「あなたの会社／あなたの投稿」バッジで区別する
  const ownMemberId = su.app.memberId ?? null;

  if (target === "producers") {
    producers = await searchProducers({ tenantId, area, category, q });
  } else {
    offerings = await searchOfferings({ tenantId, area, category, q, direction });
  }

  const count = target === "producers" ? producers.length : offerings.length;
  const viewMap = await views24hMap(offerings.map((o) => o.id));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">SEARCH</p>
        <h1 className="font-serif text-[22px] text-[var(--ink)]">共創パートナーを探す</h1>
      </div>

      {/* 検索バー */}
      <form
        method="GET"
        className="rounded-xl border border-[var(--line)] bg-[var(--green-soft)] p-4"
      >
        {/* 対象トグル */}
        <div className="mb-3 flex w-full max-w-[440px] overflow-hidden rounded-lg border border-[var(--line)] bg-white text-[13px]">
          <button
            name="target"
            value="projects"
            className={`flex-1 whitespace-nowrap px-3 py-2 text-center ${target === "projects" ? "bg-[var(--green)] text-white" : "text-[var(--ink-2)]"}`}
          >
            プロジェクトから探す
          </button>
          <button
            name="target"
            value="producers"
            className={`flex-1 whitespace-nowrap px-3 py-2 text-center ${target === "producers" ? "bg-[var(--green)] text-white" : "text-[var(--ink-2)]"}`}
          >
            登録事業者から探す
          </button>
        </div>

        <div className="flex flex-wrap items-stretch gap-2">
          <label className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3">
            <span className="text-[var(--green-d)]">📍</span>
            <select name="area" defaultValue={area} className="bg-transparent py-2.5 text-[14px] outline-none">
              <option value="">全エリア</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3">
            <span>💼</span>
            <select name="category" defaultValue={category} className="bg-transparent py-2.5 text-[14px] outline-none">
              <option value="">すべての業種</option>
              {CATEGORY_L1.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <input
            name="q"
            defaultValue={q}
            placeholder="フリーワードで探す"
            className={`${inputCls} min-w-[180px] flex-1`}
          />

          {target === "projects" ? (
            <select name="direction" defaultValue={direction} className={inputCls}>
              <option value="">売り・買い両方</option>
              <option value="GIVE">売りたい</option>
              <option value="WANT">買いたい</option>
            </select>
          ) : null}

          <button className={btn("primary")}>
            検索
          </button>
        </div>
      </form>

      <p className="text-[13px] text-[var(--ink-2)]">
        {count} 件見つかりました
      </p>

      {/* 結果 */}
      {target === "producers" ? (
        producers.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {producers.map((p) => (
              <ProducerCard key={p.id} p={p} isOwn={p.id === ownMemberId} />
            ))}
          </div>
        )
      ) : offerings.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {offerings.map((o) => (
            <OfferingCard key={o.id} o={{ ...o, memberName: o.member.name, views24h: viewMap.get(o.id) ?? 0 }} isOwn={o.memberId === ownMemberId} />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-8 text-center text-[13px] text-[var(--muted)]">
      条件に合うものが見つかりませんでした。条件を変えてお試しください。
    </p>
  );
}

async function searchOfferings(f: {
  tenantId: string;
  area: string;
  category: string;
  q: string;
  direction: string;
}) {
  return prisma.offering.findMany({
    where: {
      isPublic: true,
      title: { not: "" },
      member: {
        tenantId: f.tenantId,
        ...(f.category ? { categoryL1: f.category } : {}),
      },
      ...(f.direction ? { direction: f.direction as "GIVE" | "WANT" } : {}),
      ...(f.area ? { area: { contains: f.area } } : {}),
      ...(f.q
        ? {
            OR: [
              { title: { contains: f.q, mode: "insensitive" as const } },
              { description: { contains: f.q, mode: "insensitive" as const } },
              { tags: { has: f.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { member: { select: { name: true } } },
  });
}

async function searchProducers(f: {
  tenantId: string;
  area: string;
  category: string;
  q: string;
}) {
  return prisma.member.findMany({
    where: {
      tenantId: f.tenantId,
      status: "APPROVED",
      ...(f.category ? { categoryL1: f.category } : {}),
      ...(f.area ? { prefecture: { contains: f.area } } : {}),
      ...(f.q
        ? {
            OR: [
              { name: { contains: f.q, mode: "insensitive" as const } },
              { description: { contains: f.q, mode: "insensitive" as const } },
              { productItems: { contains: f.q, mode: "insensitive" as const } },
              { productVolume: { contains: f.q, mode: "insensitive" as const } },
              { featureText: { contains: f.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { completionRate: "desc" },
    take: 40,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      companyLogoUrl: true,
      imageUrls: true,
      categoryL1: true,
      categoryL2: true,
      prefecture: true,
      city: true,
      productItems: true,
      description: true,
    },
  });
}
