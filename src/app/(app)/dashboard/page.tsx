// ダッシュボード（最初のログイン後ページ）。
// UX方針：開いた瞬間に「次の一手」が分かること。
//  1. クイック操作（探す/台帳/メッセージ/商談）
//  2. あなたのやること（未読・停滞商談・記入率・支払い等、対応が必要な時だけ）
//  3. はじめの3ステップ（新規会員のみ）
//  4. お知らせ（コンパクト）→ バナー → 数字 → 発見系
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OfferingCard } from "@/components/OfferingCard";
import { views24hMap } from "@/lib/offering-views";
import { ProducerCard, type ProducerCardData } from "@/components/ProducerCard";
import { ProjectCard } from "@/components/ProjectCard";

// 商談が「停滞中」とみなす日数（最終活動からの経過）
const STALL_DAYS = 14;

// クイック操作ボタン（丸アイコンバッジ＋太字ラベル）
const QUICK_ACTIONS = [
  { href: "/search", icon: "🔍", label: "パートナーを探す", bg: "bg-[var(--green-soft)]" },
  { href: "/ledger", icon: "📝", label: "台帳を登録", bg: "bg-[#FAF0D6]" },
  { href: "/messages", icon: "💬", label: "メッセージ", bg: "bg-[#E4EEF7]" },
  { href: "/deals", icon: "🤝", label: "商談を見る", bg: "bg-[#F3E7DA]" },
];

export default async function DashboardPage() {
  const su = await getSessionUser();

  const member = su?.app.memberId
    ? await prisma.member.findUnique({ where: { id: su.app.memberId } })
    : null;

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

  // 進行中の商談（フェーズ1〜4）と、そのうち停滞中の件数
  let activeDeals = 0;
  let stalledDeals = 0;
  if (member) {
    const dealWhere = {
      OR: [{ ownerMemberId: member.id }, { counterpartMemberId: member.id }],
      phase: { gte: 1, lte: 4 },
    };
    activeDeals = await prisma.deal.count({ where: dealWhere });
    stalledDeals = await prisma.deal.count({
      where: {
        ...dealWhere,
        lastActivityAt: { lt: new Date(Date.now() - STALL_DAYS * 86_400_000) },
      },
    });
  }

  // 未読メッセージ数 ＆ 自分の会話数（3ステップ判定に使う）
  let unreadCount = 0;
  let myThreadCount = 0;
  if (member) {
    const myThreads = await prisma.thread.findMany({
      where: { OR: [{ fromMemberId: member.id }, { toMemberId: member.id }] },
      select: { id: true },
    });
    myThreadCount = myThreads.length;
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

  // ── はじめの3ステップ（新規会員向けオンボーディング）─────────
  const offeringCount = giveCount + wantCount;
  const step1 = (member?.completionRate ?? 0) >= 80; // プロフィール
  const step2 = offeringCount > 0; // 持ち寄り
  const step3 = myThreadCount > 0; // パートナーへコンタクト
  const showOnboarding = !!member && !(step1 && step2 && step3);

  // ── あなたのやること（対応が必要な時だけ）───────────────
  type Todo = { icon: string; label: string; cta: string; href: string; cls: string };
  const todos: Todo[] = [];
  const st = member?.status;
  const AMBER = "border-[#E7D9A6] bg-[#FAF0D6] text-[#7A5A0B]";
  const RED = "border-[#E7C7BE] bg-[var(--red-soft)] text-[var(--red)]";
  const GREEN = "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-d)]";

  if (st === "REJECTED") {
    todos.push({ icon: "⚠️", label: "プロフィールに修正が必要です", cta: "見直して再申請", href: "/profile", cls: RED });
  }
  if (st === "AWAITING_PAYMENT" || member?.paymentStatus === "UNPAID") {
    todos.push({ icon: "💳", label: "お支払いのお手続きが必要です", cta: "手続きへ", href: "/billing", cls: AMBER });
  }
  if (st === "PENDING") {
    todos.push({ icon: "🕒", label: "事務局の審査をお待ちください", cta: "プロフィールを見る", href: "/profile", cls: AMBER });
  }
  if (unreadCount > 0) {
    todos.push({ icon: "✉️", label: `未読メッセージが ${unreadCount}件`, cta: "返信する", href: "/messages", cls: GREEN });
  }
  if (stalledDeals > 0) {
    todos.push({ icon: "⏳", label: `停滞している商談が ${stalledDeals}件（${STALL_DAYS}日以上）`, cta: "確認する", href: "/deals", cls: AMBER });
  }
  // 記入率は「まだ十分でない」ときだけ促す（ほぼ埋まっている人を催促しない）。
  // 3ステップ表示中は重複するので出さない。
  if (!showOnboarding && member && member.completionRate < 80) {
    todos.push({ icon: "📋", label: `プロフィールをあと少しで完成（記入率 ${member.completionRate}%）`, cta: "続きを入力", href: "/profile", cls: AMBER });
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

  const [newest, ...restAnnouncements] = announcements;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">DASHBOARD</p>
        <h1 className="font-serif text-[22px] text-[var(--ink)]">
          ようこそ、{su?.app.name} さん
        </h1>
      </div>

      {/* ① クイック操作 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-white px-3.5 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--green)] hover:shadow-md"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[19px] ${a.bg}`}>
              {a.icon}
            </span>
            <span className="text-[14px] font-bold text-[var(--ink)]">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* ② あなたのやること */}
      {todos.length > 0 ? (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-[18px] text-[var(--ink)]">
            <span>✅</span> あなたのやること
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {todos.map((t, i) => (
              <Link
                key={i}
                href={t.href}
                className={`group flex items-center gap-3 rounded-[10px] border px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${t.cls}`}
              >
                <span className="text-[18px]">{t.icon}</span>
                <span className="min-w-0 flex-1 text-[13px] font-semibold leading-5">{t.label}</span>
                <span className="shrink-0 rounded-md bg-white/70 px-3 py-1.5 text-[12px] font-bold">
                  {t.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* ③ はじめの3ステップ（新規会員向け）*/}
      {showOnboarding ? (
        <div className="rounded-[12px] border border-[var(--green)] bg-white p-5">
          <h2 className="flex items-center gap-2 font-serif text-[17px] text-[var(--ink)]">
            <span>🌱</span> はじめの3ステップ
          </h2>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            この3つを終えると、共創パートナー探しがスムーズになります。
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <OnboardingStep n={1} done={step1} title="プロフィールを完成" desc="事業内容を登録して信頼されるページに" href="/profile" cta="編集する" />
            <OnboardingStep n={2} done={step2} title="持ち寄りを登録" desc="売りたい・買いたいを掲載" href="/ledger" cta="登録する" />
            <OnboardingStep n={3} done={step3} title="パートナーを探す" desc="気になる事業者へ問い合わせ" href="/search" cta="探す" />
          </div>
        </div>
      ) : null}

      {/* ④ お知らせ（コンパクト：最新1件＋折りたたみ）*/}
      {newest ? (
        <div>
          <details className="group rounded-[10px] border border-[var(--line)] bg-white" open={newest.pinned}>
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 marker:hidden">
              <span className="shrink-0">📣</span>
              {newest.pinned ? (
                <span className="shrink-0 rounded bg-[#FAF0D6] px-1.5 py-0.5 text-[10px] font-bold text-[#B77F0B]">重要</span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--ink)]">
                {newest.title}
              </span>
              <span className="hidden shrink-0 text-[11px] text-[var(--muted)] sm:block">
                {newest.createdAt.getFullYear()}/{newest.createdAt.getMonth() + 1}/{newest.createdAt.getDate()}
              </span>
              {newest.body ? (
                <span className="shrink-0 text-[var(--muted)] transition group-open:rotate-90">›</span>
              ) : null}
            </summary>
            {newest.body ? (
              <p className="whitespace-pre-wrap border-t border-[var(--line)] px-5 py-3 text-[13px] leading-7 text-[var(--ink-2)]">
                {newest.body}
              </p>
            ) : null}
          </details>
          {restAnnouncements.length > 0 ? (
            <details className="group mt-2 rounded-[10px] border border-[var(--line)] bg-white">
              <summary className="cursor-pointer list-none px-5 py-2.5 text-[12px] text-[var(--green-d)] marker:hidden">
                他 {restAnnouncements.length}件のお知らせを見る
                <span className="ml-1 inline-block transition group-open:rotate-90">›</span>
              </summary>
              <div className="flex flex-col divide-y divide-[#EDF0EA] border-t border-[var(--line)]">
                {restAnnouncements.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {a.pinned ? (
                        <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 text-[10px] text-[#B77F0B]">重要</span>
                      ) : null}
                      <span className="text-[11px] text-[var(--muted)]">
                        {a.createdAt.getFullYear()}年{a.createdAt.getMonth() + 1}月{a.createdAt.getDate()}日
                      </span>
                    </div>
                    <h3 className="mt-1 text-[14px] font-semibold text-[var(--ink)]">{a.title}</h3>
                    {a.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-[var(--ink-2)]">{a.body}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

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

      {/* 数字カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-5">
          <div className="text-[11px] text-[var(--muted)]">登録した持ち寄り</div>
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
          className="group rounded-[10px] border border-[var(--line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--green)] hover:shadow-md"
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
          className="group rounded-[10px] border border-[var(--line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--green)] hover:shadow-md"
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
          <h2 className="font-serif text-[18px] text-[var(--ink)]">新着の共創プロジェクト</h2>
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

      {/* あなたの共創プロジェクト（自分の掲載） */}
      {myProjects.length > 0 ? (
        <div>
          <h2 className="mb-3 font-serif text-[18px] text-[var(--ink)]">あなたの共創プロジェクト</h2>
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

// はじめの3ステップの各ステップ
function OnboardingStep({
  n,
  done,
  title,
  desc,
  href,
  cta,
}: {
  n: number;
  done: boolean;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-[10px] border p-4 ${
        done ? "border-[var(--green)] bg-[var(--green-soft)]" : "border-[var(--line)] bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
            done ? "bg-[var(--green)] text-white" : "bg-[var(--canvas)] text-[var(--ink-2)]"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <span className="text-[14px] font-semibold text-[var(--ink)]">{title}</span>
      </div>
      <p className="mt-1.5 flex-1 text-[12px] leading-5 text-[var(--muted)]">{desc}</p>
      {done ? (
        <span className="mt-2 text-[12px] font-semibold text-[var(--green-d)]">完了 ✓</span>
      ) : (
        <Link href={href} className="mt-2 text-[12px] font-bold text-[var(--green-d)] underline">
          {cta} →
        </Link>
      )}
    </div>
  );
}
