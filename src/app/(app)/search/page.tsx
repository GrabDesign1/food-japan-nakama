import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORY_L1, PREFECTURES } from "@/lib/member-taxonomy";
import { OfferingCard } from "@/components/OfferingCard";
import { getSponsoredOfferings, getTopPrOffering, getActiveEffectsFor } from "@/lib/billing";
import { ProducerCard } from "@/components/ProducerCard";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { views24hMap } from "@/lib/offering-views";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";

type SP = {
  target?: string;
  area?: string;
  category?: string;
  q?: string;
  direction?: string;
  page?: string;
};

type Target = "offerings" | "coprojects" | "producers";

const PER_PAGE = 24;

const inputCls =
  "rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

function parseTarget(v: string | undefined): Target {
  if (v === "producers") return "producers";
  if (v === "coprojects") return "coprojects";
  // 旧URL（target=projects）は台帳検索として扱う
  return "offerings";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const tenantId = su.app.tenantId;

  const sp = await searchParams;
  const target = parseTarget(sp.target);
  const area = sp.area?.trim() || "";
  const category = sp.category?.trim() || "";
  const q = sp.q?.trim() || "";
  const direction = sp.direction === "GIVE" || sp.direction === "WANT" ? sp.direction : "";
  const page = Math.max(1, Math.trunc(Number(sp.page) || 1));
  const skip = (page - 1) * PER_PAGE;

  // ── 検索実行 ──
  let offerings: Awaited<ReturnType<typeof searchOfferings>>[0] = [];
  let producers: Awaited<ReturnType<typeof searchProducers>>[0] = [];
  let coprojects: Awaited<ReturnType<typeof searchProjects>>[0] = [];
  let total = 0;

  // 自分の事業者・投稿は除外せず、「あなたの会社／あなたの投稿」バッジで区別する
  const ownMemberId = su.app.memberId ?? null;

  if (target === "producers") {
    const [items, t] = await searchProducers({ tenantId, area, category, q, skip });
    producers = items;
    total = t;
  } else if (target === "coprojects") {
    const [items, t] = await searchProjects({ tenantId, area, category, q, skip });
    coprojects = items;
    total = t;
  } else {
    const [items, t] = await searchOfferings({ tenantId, area, category, q, direction, skip });
    offerings = items;
    total = t;
  }

  const count =
    target === "producers" ? producers.length : target === "coprojects" ? coprojects.length : offerings.length;
  const hasFilter = Boolean(area || category || q || direction);
  // スポンサー枠（有料掲載）。自然表示の順位には混ぜず、広告表記つきで分離表示する。
  const sponsorDirection = direction === "GIVE" || direction === "WANT" ? direction : "WANT";
  const [viewMap, topPr, sponsored, effectsMap] = await Promise.all([
    views24hMap(offerings.map((o) => o.id)),
    target === "offerings" && page === 1 ? getTopPrOffering(sponsorDirection) : Promise.resolve(null),
    target === "offerings" && page === 1 ? getSponsoredOfferings(sponsorDirection, 4) : Promise.resolve([]),
    getActiveEffectsFor(offerings.map((o) => o.id)),
  ]);

  // 共創プロジェクトの掲載者名
  const projMemberIds = Array.from(new Set(coprojects.map((p) => p.memberId)));
  const projMembers = projMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
    : [];
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageQuery = (p: number) => {
    const params = new URLSearchParams();
    params.set("target", target);
    if (area) params.set("area", area);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (direction) params.set("direction", direction);
    if (p > 1) params.set("page", String(p));
    return `/search?${params.toString()}`;
  };

  const toggleCls = (active: boolean) =>
    `flex-1 whitespace-nowrap px-3 py-2 text-center ${active ? "bg-[var(--green)] text-white" : "text-[var(--ink-2)]"}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={eyebrowCls}>SEARCH</p>
        <h1 className={h1Cls}>共創パートナーを探す</h1>
      </div>

      {/* 検索バー */}
      <form
        method="GET"
        className="rounded-xl border border-[var(--line)] bg-[var(--green-soft)] p-4"
      >
        {/* 対象トグル */}
        <div className="mb-3 flex w-full max-w-[560px] overflow-hidden rounded-lg border border-[var(--line)] bg-white text-[13px]">
          <button name="target" value="offerings" className={toggleCls(target === "offerings")}>
            売りたい・探している
          </button>
          <button name="target" value="coprojects" className={toggleCls(target === "coprojects")}>
            共創プロジェクト
          </button>
          <button name="target" value="producers" className={toggleCls(target === "producers")}>
            登録事業者
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

          {target === "offerings" ? (
            <select name="direction" defaultValue={direction} className={inputCls}>
              <option value="">売り・買い両方</option>
              <option value="GIVE">売りたい（提供したい）</option>
              <option value="WANT">探している（調達したい）</option>
            </select>
          ) : null}

          <button className={btn("primary")}>
            検索
          </button>
        </div>
      </form>

      <p className="text-[13px] text-[var(--ink-2)]">
        {total} 件見つかりました
        {totalPages > 1 ? `（${page} / ${totalPages}ページ）` : ""}
      </p>

      {/* 結果 */}
      {count === 0 ? (
        <Empty target={target} hasFilter={hasFilter} />
      ) : target === "producers" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {producers.map((p) => (
            <ProducerCard key={p.id} p={p} isOwn={p.id === ownMemberId} />
          ))}
        </div>
      ) : target === "coprojects" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {coprojects.map((p) => (
            <ProjectCard
              key={p.id}
              p={{ id: p.id, title: p.title, imageUrls: p.imageUrls, memberName: projNameMap.get(p.memberId), budget: p.budget }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* 最上部PR（スポンサー枠・広告表記必須） */}
          {topPr ? (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-[var(--ink)] px-2 py-0.5 text-[10px] font-bold text-white">広告</span>
                <span className="text-[11px] text-[var(--muted)]">スポンサー（最上部PR）</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <OfferingCard
                  o={{ ...topPr, memberName: topPr.member.name, memberLogoUrl: topPr.member.companyLogoUrl }}
                  isOwn={topPr.memberId === ownMemberId}
                />
              </div>
            </div>
          ) : null}
          {/* 注目表示（スポンサー枠） */}
          {sponsored.length ? (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-[var(--ink)] px-2 py-0.5 text-[10px] font-bold text-white">広告</span>
                <span className="text-[11px] text-[var(--muted)]">スポンサー（注目表示）</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {sponsored.map((o) => (
                  <OfferingCard
                    key={`sp-${o.id}`}
                    o={{ ...o, memberName: o.member.name, memberLogoUrl: o.member.companyLogoUrl }}
                    isOwn={o.memberId === ownMemberId}
                    featured
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {offerings.map((o) => (
              <OfferingCard
                key={o.id}
                o={{ ...o, memberName: o.member.name, memberLogoUrl: o.member.companyLogoUrl, views24h: viewMap.get(o.id) ?? 0 }}
                isOwn={o.memberId === ownMemberId}
                urgent={effectsMap.get(o.id)?.has("urgent") ?? false}
              />
            ))}
          </div>
        </>
      )}

      {/* ページネーション */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={pageQuery(page - 1)} className={btn("secondary", "sm")}>← 前のページ</Link>
          ) : null}
          <span className="text-[12px] text-[var(--muted)]">{page} / {totalPages}</span>
          {page < totalPages ? (
            <Link href={pageQuery(page + 1)} className={btn("secondary", "sm")}>次のページ →</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Empty({ target, hasFilter }: { target: Target; hasFilter: boolean }) {
  const crossLinks: { label: string; href: string }[] = [];
  if (target !== "offerings") crossLinks.push({ label: "売りたい・探しているから探す", href: "/search?target=offerings" });
  if (target !== "coprojects") crossLinks.push({ label: "共創プロジェクトから探す", href: "/search?target=coprojects" });
  if (target !== "producers") crossLinks.push({ label: "登録事業者から探す", href: "/search?target=producers" });
  return (
    <EmptyState
      title="条件に合うものが見つかりませんでした"
      description={
        hasFilter
          ? "条件を減らすか、別の言葉でお試しください。逆の立場（売りたい（提供したい）⇄探している（調達したい））で探すと見つかることもあります。"
          : "掲載は順次増えています。先にあなたの「売りたい・探している」を登録しておくと、相手から見つけてもらえます。"
      }
      actions={[
        ...(hasFilter ? [{ label: "条件をクリアして再検索", href: `/search?target=${target}` }] : []),
        ...crossLinks,
        { label: "売りたい・探しているを登録する", href: "/ledger", variant: "primary" as const },
      ]}
    />
  );
}

async function searchOfferings(f: {
  tenantId: string;
  area: string;
  category: string;
  q: string;
  direction: string;
  skip: number;
}) {
  const where = {
    isPublic: true,
    visibility: "public", // 非公開募集・応募者限定は検索に出さない
    title: { not: "" },
    member: {
      tenantId: f.tenantId,
      status: "APPROVED" as const, // 停止・未承認会員の掲載は出さない
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
  };
  return Promise.all([
    prisma.offering.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: f.skip,
      take: PER_PAGE,
      include: { member: { select: { name: true, companyLogoUrl: true } } },
    }),
    prisma.offering.count({ where }),
  ]);
}

async function searchProjects(f: {
  tenantId: string;
  area: string;
  category: string;
  q: string;
  skip: number;
}) {
  const where = {
    tenantId: f.tenantId,
    status: "published",
    ...(f.category ? { fromRole: f.category } : {}),
    ...(f.area ? { area: { contains: f.area } } : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" as const } },
            { body: { contains: f.q, mode: "insensitive" as const } },
            { tags: { has: f.q } },
          ],
        }
      : {}),
  };
  return Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: f.skip,
      take: PER_PAGE,
    }),
    prisma.project.count({ where }),
  ]);
}

async function searchProducers(f: {
  tenantId: string;
  area: string;
  category: string;
  q: string;
  skip: number;
}) {
  const where = {
    tenantId: f.tenantId,
    status: "APPROVED" as const,
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
  };
  return Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { completionRate: "desc" },
      skip: f.skip,
      take: PER_PAGE,
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
    }),
    prisma.member.count({ where }),
  ]);
}
