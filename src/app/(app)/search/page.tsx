import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORY_L1, PREFECTURES } from "@/lib/member-taxonomy";
import { OfferingCard } from "@/components/OfferingCard";
import { loadReplyRates } from "@/lib/reply-rate";
import { getSponsoredOfferings, getTopPrOffering, getActiveEffectsFor } from "@/lib/billing";
import { ProducerCard } from "@/components/ProducerCard";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { views24hMap } from "@/lib/offering-views";
import { btn, eyebrowCls, h1Cls, h2Cls, input } from "@/lib/ui";

type SP = {
  target?: string;
  /** 検索タブ（want/give/coprojects/producers） */
  t?: string;
  area?: string;
  category?: string;
  q?: string;
  direction?: string;
  page?: string;
};

type Target = "offerings" | "coprojects" | "producers";

const PER_PAGE = 24;

const inputCls =
  input();

// 検索タブ。「売りたい」と「探している」は性質が違う（写真の有無・見る人が逆）ので分ける
// （2026-08-11 ユーザー指示。従来は1つのタブ＋「売り・買い両方」のプルダウンだった）
const TABS = [
  {
    key: "want",
    label: "探している",
    hint: "買い手が求めているもの",
    icon: "🔎",
    target: "offerings" as Target,
    direction: "WANT",
  },
  {
    key: "give",
    label: "売りたい",
    hint: "売り手が提供できるもの",
    icon: "📦",
    target: "offerings" as Target,
    direction: "GIVE",
  },
  {
    key: "coprojects",
    label: "共創プロジェクト",
    hint: "一緒に事業をつくる",
    icon: "🤝",
    target: "coprojects" as Target,
    direction: "",
  },
  {
    key: "producers",
    label: "登録事業者",
    hint: "会社から探す",
    icon: "🏢",
    target: "producers" as Target,
    direction: "",
  },
];

/** タブを決める。新パラメータ t が最優先で、無ければ旧URL（target/direction）から復元する。 */
function parseTab(sp: SP): (typeof TABS)[number] {
  const byKey = TABS.find((t) => t.key === sp.t);
  if (byKey) return byKey;
  if (sp.target === "producers") return TABS[3];
  if (sp.target === "coprojects") return TABS[2];
  if (sp.direction === "GIVE") return TABS[1];
  // 旧URLの「売り・買い両方」と既定は「探している」（トップも買い手の募集を先に見せている）
  return TABS[0];
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
  const tab = parseTab(sp);
  const target = tab.target;
  const area = sp.area?.trim() || "";
  const category = sp.category?.trim() || "";
  const q = sp.q?.trim() || "";
  const direction = tab.direction;
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
  const hasFilter = Boolean(area || category || q);
  // スポンサー枠（有料掲載）。自然表示の順位には混ぜず、広告表記つきで分離表示する。
  const sponsorDirection = direction === "GIVE" || direction === "WANT" ? direction : "WANT";
  const [viewMap, topPr, sponsored, effectsMap] = await Promise.all([
    views24hMap(offerings.map((o) => o.id)),
    target === "offerings" && page === 1 ? getTopPrOffering(sponsorDirection) : Promise.resolve(null),
    target === "offerings" && page === 1 ? getSponsoredOfferings(sponsorDirection, 4) : Promise.resolve([]),
    getActiveEffectsFor(offerings.map((o) => o.id)),
  ]);

  // 掲載者の返信率（問い合わせ・提案には紹介料がかかるため、返ってくる相手かを先に示す）
  const replyRates = await loadReplyRates([
    ...offerings.map((o) => o.memberId),
    ...sponsored.map((o) => o.memberId),
    ...(topPr ? [topPr.memberId] : []),
  ]);
  const replyRateOf = (memberId: string) => replyRates.get(memberId)?.percent ?? null;

  // 共創プロジェクトの掲載者名
  const projMemberIds = Array.from(new Set(coprojects.map((p) => p.memberId)));
  const projMembers = projMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
    : [];
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageQuery = (p: number) => {
    const params = new URLSearchParams();
    params.set("t", tab.key);
    if (area) params.set("area", area);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    return `/search?${params.toString()}`;
  };

  /** タブのリンク。いま絞り込んでいる条件は引き継ぐ（ページ番号は1に戻す）。 */
  const tabHref = (key: string) => {
    const params = new URLSearchParams();
    params.set("t", key);
    if (area) params.set("area", area);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    return `/search?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={eyebrowCls}>SEARCH</p>
        <h1 className={h1Cls}>共創パートナーを探す</h1>
      </div>

      {/* 何を探すか（検索パネルの外に出し、押せると分かる形にする・2026-08-11 ユーザー指摘） */}
      <div>
        <p className="mb-2 text-[13px] font-bold text-[var(--ink-2)]">何を探しますか？</p>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = tab.key === t.key;
            return (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-[150px] flex-col rounded-xl border px-4 py-2.5 transition ${
                  active
                    ? "border-[var(--green)] bg-[var(--green)] text-white shadow"
                    : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:border-[var(--green)] hover:text-[var(--green-d)]"
                }`}
              >
                <span className="text-[14px] font-bold">
                  <span className="mr-1">{t.icon}</span>
                  {t.label}
                </span>
                <span className={`text-[11px] ${active ? "text-white/85" : "text-[var(--muted)]"}`}>
                  {t.hint}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 検索バー */}
      <form
        method="GET"
        className="rounded-xl border border-[var(--line)] bg-[var(--green-soft)] p-4"
      >
        {/* 対象トグル */}
        {/* 絞り込みの送信でタブが外れないように、いまのタブを持たせる */}
        <input type="hidden" name="t" value={tab.key} />

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

          <button className={btn("primary")}>
            検索
          </button>
        </div>
      </form>

      <div>
        <h2 className={h2Cls}>{tab.label}</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          {total} 件見つかりました
          {totalPages > 1 ? `（${page} / ${totalPages}ページ）` : ""}
        </p>
      </div>

      {/* 結果 */}
      {count === 0 ? (
        <Empty tabKey={tab.key} hasFilter={hasFilter} />
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
                  o={{
                    ...topPr,
                    memberName: topPr.member.name,
                    memberLogoUrl: topPr.member.companyLogoUrl,
                    replyRatePercent: replyRateOf(topPr.memberId),
                  }}
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
                    o={{
                      ...o,
                      memberName: o.member.name,
                      memberLogoUrl: o.member.companyLogoUrl,
                      replyRatePercent: replyRateOf(o.memberId),
                    }}
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
                o={{
                  ...o,
                  memberName: o.member.name,
                  memberLogoUrl: o.member.companyLogoUrl,
                  views24h: viewMap.get(o.id) ?? 0,
                  replyRatePercent: replyRateOf(o.memberId),
                }}
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

function Empty({ tabKey, hasFilter }: { tabKey: string; hasFilter: boolean }) {
  const crossLinks: { label: string; href: string }[] = [];
  if (tabKey !== "want") crossLinks.push({ label: "探している案件から探す", href: "/search?t=want" });
  if (tabKey !== "give") crossLinks.push({ label: "売りたい案件から探す", href: "/search?t=give" });
  if (tabKey !== "coprojects") crossLinks.push({ label: "共創プロジェクトから探す", href: "/search?t=coprojects" });
  if (tabKey !== "producers") crossLinks.push({ label: "登録事業者から探す", href: "/search?t=producers" });
  return (
    <EmptyState
      title="条件に合うものが見つかりませんでした"
      description={
        hasFilter
          ? "条件を減らすか、別の言葉でお試しください。逆の立場（売りたい（提供したい）⇄探している（調達したい））で探すと見つかることもあります。"
          : "掲載は順次増えています。先にあなたの「売りたい・探している」を登録しておくと、相手から見つけてもらえます。"
      }
      actions={[
        ...(hasFilter ? [{ label: "条件をクリアして再検索", href: `/search?t=${tabKey}` }] : []),
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

/** 登録事業者の一覧に出す最低記入率（%）。 */
const MIN_PRODUCER_COMPLETION = 50;

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
    // プロフィールがほとんど空の会員は一覧に出さない（「（未入力）」ばかりが並ぶため・2026-08-11 ユーザー指示）。
    // しきい値は記入率50%。自分の会社も同じ基準（他社から見えている状態をそのまま見せる）。
    completionRate: { gte: MIN_PRODUCER_COMPLETION },
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
