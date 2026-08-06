// ダッシュボード（最初のログイン後ページ）。指標などは後続タスクで実装。
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OfferingCard } from "@/components/OfferingCard";
import { views24hMap } from "@/lib/offering-views";
import { ProducerCard, type ProducerCardData } from "@/components/ProducerCard";
import { ProjectCard } from "@/components/ProjectCard";

// 会員状態に応じたお知らせバナー
const BANNERS: Record<
  string,
  { title: string; body: string; cls: string }
> = {
  PENDING: {
    title: "審査中",
    body: "事務局の承認をお待ちください。",
    cls: "border-[#E7D9A6] bg-[#FAF0D6] text-[#7A5A0B]",
  },
  AWAITING_PAYMENT: {
    title: "お支払い待ち",
    body: "事務局よりお支払いのご案内をします（オンライン決済は準備中です）。",
    cls: "border-[#E7D9A6] bg-[#FAF0D6] text-[#7A5A0B]",
  },
  REJECTED: {
    title: "要修正",
    body: "プロフィールを見直し、再度「審査を申請」してください。",
    cls: "border-[#E7C7BE] bg-[var(--red-soft)] text-[var(--red)]",
  },
};

export default async function DashboardPage() {
  const su = await getSessionUser();

  const member = su?.app.memberId
    ? await prisma.member.findUnique({ where: { id: su.app.memberId } })
    : null;

  const banner = member ? BANNERS[member.status] : undefined;

  // お知らせ（事務局投稿）
  const announcements = su
    ? await prisma.announcement.findMany({
        where: { tenantId: su.app.tenantId },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 5,
      })
    : [];

  // バナー（事務局が登録）
  const banners = su
    ? await prisma.banner.findMany({
        where: { tenantId: su.app.tenantId, active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    : [];

  // 登録した売りたい・買いたいの件数
  const giveCount = member
    ? await prisma.offering.count({ where: { memberId: member.id, direction: "GIVE" } })
    : 0;
  const wantCount = member
    ? await prisma.offering.count({ where: { memberId: member.id, direction: "WANT" } })
    : 0;

  // 進行中の商談（フェーズ1〜4）
  const activeDeals = member
    ? await prisma.deal.count({
        where: {
          OR: [{ ownerMemberId: member.id }, { counterpartMemberId: member.id }],
          phase: { gte: 1, lte: 4 },
        },
      })
    : 0;

  // 未読メッセージ数
  let unreadCount = 0;
  if (member) {
    const myThreads = await prisma.thread.findMany({
      where: { OR: [{ fromMemberId: member.id }, { toMemberId: member.id }] },
      select: { id: true },
    });
    if (myThreads.length) {
      unreadCount = await prisma.message.count({
        where: {
          threadId: { in: myThreads.map((t) => t.id) },
          senderMemberId: { not: member.id },
          readAt: null,
        },
      });
    }
  }

  // お気に入りの企業
  let favoriteMembers: ProducerCardData[] = [];
  if (member) {
    const favs = await prisma.favorite.findMany({
      where: { memberId: member.id, targetType: "member" },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    if (favs.length) {
      const ids = favs.map((f) => f.targetId);
      const rows = await prisma.member.findMany({
        where: { id: { in: ids } },
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
      const map = new Map(rows.map((r) => [r.id, r]));
      favoriteMembers = ids
        .map((id) => map.get(id))
        .filter((r): r is ProducerCardData => !!r);
    }
  }

  // 最近閲覧した共創パートナー（自分が見た公開中のプロジェクト。重複除外）
  const recentlyViewed: {
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
    createdAt: Date;
    memberName: string | null;
    tags: string[];
    views24h?: number;
  }[] = [];
  if (su) {
    const views = await prisma.offeringView.findMany({
      where: {
        viewerUserId: su.app.id,
        offering: { isPublic: true, title: { not: "" } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { offering: { include: { member: { select: { name: true } } } } },
    });
    const seen = new Set<string>();
    for (const v of views) {
      if (seen.has(v.offeringId)) continue;
      seen.add(v.offeringId);
      recentlyViewed.push({ ...v.offering, memberName: v.offering.member.name });
      if (recentlyViewed.length >= 4) break;
    }
  }

  // 自分が登録した共創プロジェクト
  const myProjects = member
    ? await prisma.project.findMany({
        where: { memberId: member.id },
        orderBy: { updatedAt: "desc" },
        take: 4,
      })
    : [];

  // 新着の共創プロジェクト（掲載中）
  const publishedProjects = su
    ? await prisma.project.findMany({
        where: { tenantId: su.app.tenantId, status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 4,
      })
    : [];
  const projMemberIds = Array.from(new Set(publishedProjects.map((p) => p.memberId)));
  const projMembers = projMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
    : [];
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  // 新着の持ち寄り台帳（公開中）
  const recentOfferings = su
    ? await prisma.offering.findMany({
        where: {
          isPublic: true,
          title: { not: "" },
          member: { tenantId: su.app.tenantId },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { member: { select: { name: true } } },
      })
    : [];

  // 一覧カード用：直近24時間の閲覧数
  const dashViewMap = await views24hMap([
    ...recentlyViewed.map((o) => o.id),
    ...recentOfferings.map((o) => o.id),
  ]);

  // 売りたい(GIVE)・買いたい(WANT)で分けて、ダッシュボードで明確に見せる
  const recentGives = recentOfferings.filter((o) => o.direction === "GIVE");
  const recentWants = recentOfferings.filter((o) => o.direction === "WANT");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">DASHBOARD</p>
        <h1 className="font-serif text-[22px] text-[var(--ink)]">
          ようこそ、{su?.app.name} さん
        </h1>
      </div>

      {unreadCount > 0 ? (
        <Link
          href="/messages"
          className="flex items-center gap-2 rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-3 text-[14px] font-semibold text-[var(--green-d)] hover:bg-[#d9e8df]"
        >
          <span>✉️</span>
          メッセージが入ってます。（未読 {unreadCount}件）
          <span className="ml-auto">→</span>
        </Link>
      ) : null}

      {banner ? (
        <div className={`rounded-[10px] border px-5 py-4 ${banner.cls}`}>
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="rounded-full bg-white/60 px-2.5 py-0.5 text-[11px]">
              {banner.title}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-6">{banner.body}</p>
          <Link
            href="/profile"
            className="mt-2 inline-block text-[12px] underline underline-offset-2"
          >
            会員プロフィールを確認する
          </Link>
        </div>
      ) : null}

      {/* お知らせ */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-[18px] text-[var(--ink)]">
          <span>📣</span> お知らせ
        </h2>
        {announcements.length === 0 ? (
          <div className="rounded-[10px] border border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
            現在、お知らせはありません。
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {announcements.map((a) => (
              <article key={a.id} className="rounded-[10px] border border-[var(--line)] bg-white p-5">
                <div className="flex items-center gap-2">
                  {a.pinned ? (
                    <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 text-[10px] text-[#B77F0B]">重要</span>
                  ) : null}
                  <span className="text-[11px] text-[var(--muted)]">
                    {a.createdAt.getFullYear()}年{a.createdAt.getMonth() + 1}月{a.createdAt.getDate()}日
                  </span>
                </div>
                <h3 className="mt-1 text-[15px] font-semibold text-[var(--ink)]">{a.title}</h3>
                {a.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-7 text-[var(--ink-2)]">{a.body}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* バナー */}
      {banners.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {banners.map((b) => {
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.imageUrl}
                alt={b.title ?? ""}
                className="w-full rounded-xl border border-[var(--line)]"
              />
            );
            if (!b.linkUrl) return <div key={b.id}>{img}</div>;
            const external = /^https?:\/\//i.test(b.linkUrl);
            return (
              <a
                key={b.id}
                href={b.linkUrl}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="block transition hover:opacity-90"
              >
                {img}
              </a>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
          <div className="text-[11px] text-[var(--muted)]">登録したプロジェクト</div>
          <div className="mt-2 flex items-baseline gap-5">
            <div className="flex items-baseline gap-1">
              <span className="text-[12px] text-[var(--muted)]">売りたい</span>
              <span className="font-serif text-[26px] text-[var(--green-d)]">
                {giveCount}
              </span>
              <span className="text-[12px] text-[var(--ink-2)]">件</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[12px] text-[var(--muted)]">買いたい</span>
              <span className="font-serif text-[26px] text-[#B77F0B]">
                {wantCount}
              </span>
              <span className="text-[12px] text-[var(--ink-2)]">件</span>
            </div>
          </div>
        </div>
        <Link
          href="/deals"
          className="group rounded-[10px] border border-[var(--line)] bg-white p-5 transition hover:border-[var(--green)]"
        >
          <div className="flex items-center text-[11px] text-[var(--muted)]">
            進行中の商談
            <span className="ml-auto text-[var(--green-d)] opacity-0 transition group-hover:opacity-100">
              商談管理へ →
            </span>
          </div>
          <div className="mt-2 font-serif text-[26px] text-[var(--ink)]">
            {activeDeals}
            {activeDeals > 0 ? <span className="ml-1 text-[13px] text-[var(--muted)]">件</span> : null}
          </div>
        </Link>

        <Link
          href="/messages"
          className="group rounded-[10px] border border-[var(--line)] bg-white p-5 transition hover:border-[var(--green)]"
        >
          <div className="flex items-center text-[11px] text-[var(--muted)]">
            未読メッセージ
            <span className="ml-auto text-[var(--green-d)] opacity-0 transition group-hover:opacity-100">
              一覧へ →
            </span>
          </div>
          <div
            className={`mt-2 font-serif text-[26px] ${
              unreadCount > 0 ? "text-[var(--red)]" : "text-[var(--ink)]"
            }`}
          >
            {unreadCount}
            {unreadCount > 0 ? (
              <span className="ml-1 text-[13px] text-[var(--muted)]">件</span>
            ) : null}
          </div>
        </Link>
      </div>

      {/* 最近閲覧した共創パートナー */}
      {recentlyViewed.length > 0 ? (
        <div>
          <h2 className="mb-3 font-serif text-[18px] text-[var(--ink)]">
            最近閲覧した共創パートナー
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentlyViewed.map((o) => (
              <OfferingCard key={o.id} o={{ ...o, views24h: dashViewMap.get(o.id) ?? 0 }} />
            ))}
          </div>
        </div>
      ) : null}

      {/* 新着の持ち寄り台帳（売りたい・買いたいで明確に分ける） */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-serif text-[18px] text-[var(--ink)]">
            持ち寄り（売りたい・買いたい）
          </h2>
          <Link
            href="/ledger"
            className="text-[12px] text-[var(--green-d)] underline"
          >
            台帳を登録する →
          </Link>
        </div>
        {recentOfferings.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
            まだ公開された台帳がありません。「持ち寄り台帳」から登録してみましょう。
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 売りたい */}
            {recentGives.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-[var(--green)] px-2.5 py-0.5 text-[12px] font-bold text-white">売りたい</span>
                  <span className="text-[12px] text-[var(--muted)]">提供できるもの（{recentGives.length}件）</span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {recentGives.map((o) => (
                    <OfferingCard key={o.id} o={{ ...o, memberName: o.member.name, views24h: dashViewMap.get(o.id) ?? 0 }} />
                  ))}
                </div>
              </div>
            ) : null}

            {/* 買いたい */}
            {recentWants.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-[#B77F0B] px-2.5 py-0.5 text-[12px] font-bold text-white">買いたい</span>
                  <span className="text-[12px] text-[var(--muted)]">探しているもの（{recentWants.length}件）</span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {recentWants.map((o) => (
                    <OfferingCard key={o.id} o={{ ...o, memberName: o.member.name, views24h: dashViewMap.get(o.id) ?? 0 }} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 新着の共創プロジェクト */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-serif text-[18px] text-[var(--ink)]">共創プロジェクト</h2>
          <Link href="/projects" className="text-[12px] text-[var(--green-d)] underline">企画する →</Link>
        </div>
        {publishedProjects.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
            まだ掲載中の共創プロジェクトはありません。「共創プロジェクトを企画する」から募集できます。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {publishedProjects.map((p) => (
              <ProjectCard key={p.id} p={{ id: p.id, title: p.title, imageUrls: p.imageUrls, memberName: projNameMap.get(p.memberId), budget: p.budget }} />
            ))}
          </div>
        )}
      </div>

      {/* 登録した共創プロジェクト（自分の掲載） */}
      {myProjects.length > 0 ? (
        <div>
          <h2 className="mb-3 font-serif text-[18px] text-[var(--ink)]">登録した共創プロジェクト</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {myProjects.map((p) => (
              <ProjectCard key={p.id} p={{ id: p.id, title: p.title, imageUrls: p.imageUrls, status: p.status, budget: p.budget }} />
            ))}
          </div>
        </div>
      ) : null}

      {/* お気に入りの企業（一番下） */}
      {favoriteMembers.length > 0 ? (
        <div>
          <h2 className="mb-3 font-serif text-[18px] text-[var(--ink)]">
            お気に入りの企業
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {favoriteMembers.map((p) => (
              <ProducerCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
