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
import { EmptyState } from "@/components/EmptyState";
import { countMissingProfileFields } from "@/lib/member";
import { btn, eyebrowCls, h1Cls, h2Cls, h3Cls } from "@/lib/ui";

// 商談が「停滞中」とみなす日数（最終活動からの経過）
const STALL_DAYS = 14;

// 「最近閲覧した共創パートナー」カード用の型
type RecentlyViewed = {
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
};

// 主要4アクション（利用者の目的で表示。機能名を覚えなくても選べるように）
const MAIN_ACTIONS = [
  {
    href: "/ledger",
    icon: "＋",
    label: "売りたい・買いたい・相談したい",
    desc: "商品、原料、食品副産物、協業テーマなどの案件を登録します。",
    bg: "bg-[var(--green-soft)]",
  },
  {
    href: "/search",
    icon: "🔍",
    label: "一緒に取り組む相手を探す",
    desc: "業種、地域、フリーワードからパートナーを探します。",
    bg: "bg-[#FAF0D6]",
  },
  {
    href: "/messages",
    icon: "✉️",
    label: "届いた連絡を確認する",
    desc: "問い合わせを確認し、返信します。",
    bg: "bg-[#E4EEF7]",
  },
  {
    href: "/deals",
    icon: "🤝",
    label: "共創プロジェクトを進める",
    desc: "商談・共創プロジェクトの進捗と次の行動を管理します。",
    bg: "bg-[#F3E7DA]",
  },
];

// 事務局への相談入口（相談種別つきで既存フォームへ）
const CONSULT_LINKS = [
  { href: "/consultation?type=unsure", label: "相手探しを依頼する" },
  { href: "/consultation?type=produce", label: "共創企画を相談する" },
  { href: "/consultation?type=food-loss", label: "食品ロス活用を相談する" },
  { href: "/consultation?type=crowdfunding", label: "クラウドファンディングを相談する" },
];

// 「最近の動き」の1イベント
type ActivityEvent = { at: Date; icon: string; text: string; href: string };

export default async function DashboardPage() {
  const su = await getSessionUser();

  const member = su?.app.memberId
    ? await prisma.member.findUnique({ where: { id: su.app.memberId } })
    : null;

  const tenantId = su?.app.tenantId;
  const memberId = member?.id;
  const stallCutoff = new Date(Date.now() - STALL_DAYS * 86_400_000);

  // ── 表示に必要なデータは一括で並列取得（着地時のもたつきを軽減）──
  const [
    announcements,
    banners,
    giveCount,
    wantCount,
    dealCounts,
    unreadInfo,
    favoriteMembers,
    recentlyViewed,
    myProjects,
    published,
    recentOfferings,
    recentActivity,
  ] = await Promise.all([
    tenantId
      ? prisma.announcement.findMany({
          where: { tenantId },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
          take: 5,
        })
      : Promise.resolve([]),
    tenantId
      ? prisma.banner.findMany({
          where: { tenantId, active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    memberId
      ? prisma.offering.count({ where: { memberId, direction: "GIVE" } })
      : Promise.resolve(0),
    memberId
      ? prisma.offering.count({ where: { memberId, direction: "WANT" } })
      : Promise.resolve(0),
    // 進行中の商談（フェーズ1〜4）と、そのうち停滞中の件数
    (async () => {
      if (!memberId) return { activeDeals: 0, stalledDeals: 0 };
      const dealWhere = {
        OR: [{ ownerMemberId: memberId }, { counterpartMemberId: memberId }],
        phase: { gte: 1, lte: 4 },
      };
      const [activeDeals, stalledDeals] = await Promise.all([
        prisma.deal.count({ where: dealWhere }),
        prisma.deal.count({ where: { ...dealWhere, lastActivityAt: { lt: stallCutoff } } }),
      ]);
      return { activeDeals, stalledDeals };
    })(),
    // 未読メッセージ数 ＆ 自分の会話数（3ステップ判定に使う）
    (async () => {
      if (!memberId) return { unreadCount: 0, myThreadCount: 0 };
      const myThreads = await prisma.thread.findMany({
        where: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] },
        select: { id: true },
      });
      if (!myThreads.length) return { unreadCount: 0, myThreadCount: 0 };
      const unreadCount = await prisma.message.count({
        where: {
          threadId: { in: myThreads.map((t) => t.id) },
          senderMemberId: { not: memberId },
          readAt: null,
        },
      });
      return { unreadCount, myThreadCount: myThreads.length };
    })(),
    // お気に入りの企業
    (async (): Promise<ProducerCardData[]> => {
      if (!memberId) return [];
      const favs = await prisma.favorite.findMany({
        where: { memberId, targetType: "member" },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      if (!favs.length) return [];
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
      return ids.map((id) => map.get(id)).filter((r): r is ProducerCardData => !!r);
    })(),
    // 最近閲覧した共創パートナー（自分が見た公開中の台帳。重複除外）
    (async (): Promise<RecentlyViewed[]> => {
      if (!su) return [];
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
      const out: RecentlyViewed[] = [];
      for (const v of views) {
        if (seen.has(v.offeringId)) continue;
        seen.add(v.offeringId);
        out.push({ ...v.offering, memberName: v.offering.member.name });
        if (out.length >= 4) break;
      }
      return out;
    })(),
    memberId
      ? prisma.project.findMany({
          where: { memberId },
          orderBy: { updatedAt: "desc" },
          take: 4,
        })
      : Promise.resolve([]),
    // 新着の共創プロジェクト（掲載中）＋掲載者名
    (async () => {
      if (!tenantId) return { projects: [] as Awaited<ReturnType<typeof prisma.project.findMany>>, nameMap: new Map<string, string>() };
      const projects = await prisma.project.findMany({
        where: { tenantId, status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 4,
      });
      const ids = Array.from(new Set(projects.map((p) => p.memberId)));
      const members = ids.length
        ? await prisma.member.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
        : [];
      return { projects, nameMap: new Map(members.map((m) => [m.id, m.name])) };
    })(),
    // 新着の持ち寄り台帳（公開中）
    tenantId
      ? prisma.offering.findMany({
          where: { isPublic: true, title: { not: "" }, member: { tenantId, status: "APPROVED" } },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { member: { select: { name: true } } },
        })
      : Promise.resolve([]),
    // 最近の動き（未読メッセージ・商談更新・プロジェクト応募を統合）
    (async (): Promise<ActivityEvent[]> => {
      if (!memberId) return [];
      const [unreadMsgs, recentDeals, apps] = await Promise.all([
        prisma.message.findMany({
          where: {
            thread: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }] },
            senderMemberId: { not: memberId },
            readAt: null,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.deal.findMany({
          where: { OR: [{ ownerMemberId: memberId }, { counterpartMemberId: memberId }] },
          orderBy: { lastActivityAt: "desc" },
          take: 3,
        }),
        prisma.projectApplication.findMany({
          where: { project: { memberId } },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { project: { select: { id: true, title: true } } },
        }),
      ]);
      const nameIds = new Set<string>();
      unreadMsgs.forEach((m) => nameIds.add(m.senderMemberId));
      recentDeals.forEach((d) =>
        nameIds.add(d.ownerMemberId === memberId ? d.counterpartMemberId : d.ownerMemberId)
      );
      apps.forEach((a) => nameIds.add(a.applicantMemberId));
      const names = nameIds.size
        ? await prisma.member.findMany({
            where: { id: { in: Array.from(nameIds) } },
            select: { id: true, name: true },
          })
        : [];
      const nmap = new Map(names.map((n) => [n.id, n.name]));
      const events: ActivityEvent[] = [
        ...unreadMsgs.map((m) => ({
          at: m.createdAt,
          icon: "✉️",
          text: `${nmap.get(m.senderMemberId) ?? "会員"}さんから新しいメッセージが届いています`,
          href: `/messages/${m.threadId}`,
        })),
        ...recentDeals.map((d) => {
          const other = d.ownerMemberId === memberId ? d.counterpartMemberId : d.ownerMemberId;
          return {
            at: d.lastActivityAt,
            icon: "🤝",
            text: `${nmap.get(other) ?? "会員"}さんとの商談が更新されました`,
            href: "/deals",
          };
        }),
        ...apps.map((a) => ({
          at: a.createdAt,
          icon: "📩",
          text: `「${a.project.title || "（無題）"}」に ${nmap.get(a.applicantMemberId) ?? "会員"}さんから応募がありました`,
          href: `/projects/${a.project.id}`,
        })),
      ];
      return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8);
    })(),
  ]);

  const { activeDeals, stalledDeals } = dealCounts;
  const { unreadCount, myThreadCount } = unreadInfo;
  const publishedProjects = published.projects;
  const projNameMap = published.nameMap;

  // 一覧カード用：直近24時間の閲覧数
  const dashViewMap = await views24hMap([
    ...recentlyViewed.map((o) => o.id),
    ...recentOfferings.map((o) => o.id),
  ]);

  // ── 初回セットアップ（4ステップ）とプラン状態 ─────────
  const isPaid = member?.paymentStatus === "PAID";
  const planTag = isPaid
    ? { label: "NAKAMA会員", cls: "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-d)]" }
    : member?.paymentStatus === "UNPAID" || member?.status === "AWAITING_PAYMENT"
      ? { label: "お支払い待ち", cls: "border-[#E7D9A6] bg-[#FAF0D6] text-[#7A5A0B]" }
      : { label: "未加入", cls: "border-[#E7D9A6] bg-[#FAF0D6] text-[#7A5A0B]" };
  const rate = member?.completionRate ?? 0;
  const missingCount = member ? countMissingProfileFields(member) : 0;
  const setup2 = !!(member?.name && member?.contactName && member?.categoryL1); // 基本情報
  const setup3 = rate >= 80; // 会社情報の充実
  const setup4 = !!member && member.status !== "DRAFT" && member.status !== "REJECTED"; // 審査申請
  const showSetup = !!member && !(setup2 && setup3 && setup4);
  // 3ステップ判定の名残（未使用警告回避のため参照を残す）
  void myThreadCount;

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
  // セットアップ表示中は重複するので出さない。
  if (!showSetup && member && member.completionRate < 80) {
    todos.push({ icon: "📋", label: `プロフィールをあと少しで完成（記入率 ${member.completionRate}%）`, cta: "続きを入力", href: "/profile", cls: AMBER });
  }

  // 売りたい(GIVE)・買いたい(WANT)で分けて、ダッシュボードで明確に見せる
  const recentGives = recentOfferings.filter((o) => o.direction === "GIVE");
  const recentWants = recentOfferings.filter((o) => o.direction === "WANT");

  const [newest, ...restAnnouncements] = announcements;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={eyebrowCls}>MY PAGE</p>
          <h1 className={h1Cls}>
            {su?.app.name} さん、今日は何を進めますか？
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            出会いを、具体的な商談や共創事業につなげましょう。
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${planTag.cls}`}>
          現在：{planTag.label}
        </span>
      </div>

      {/* ① あなたのやること */}
      {todos.length > 0 ? (
        <div>
          <h2 className={`${h2Cls} mb-3 flex items-center gap-2`}>
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

      {/* ② 初回セットアップ（4ステップ・完成度つき）*/}
      {showSetup ? (
        <div className="rounded-[12px] border border-[var(--green)] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className={`${h2Cls} flex items-center gap-2`}>
              <span>🌱</span> まずは利用準備を完了しましょう
            </h2>
            <span className="shrink-0 text-[15px] font-bold text-[var(--green-d)]">{rate}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-[var(--green)]" style={{ width: `${rate}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SetupStep done title="アカウント登録" desc="完了しました" href="/profile" />
            <SetupStep
              done={setup2}
              title="基本情報を入力"
              desc={setup2 ? "入力済み" : "事業者名・担当者名・会員種別"}
              href="/profile"
            />
            <SetupStep
              done={setup3}
              title="会社情報を充実"
              desc={setup3 ? "入力済み" : `あと${missingCount}項目です`}
              href="/profile"
            />
            <SetupStep
              done={setup4}
              title="審査を申請"
              desc={
                setup4
                  ? member?.status === "PENDING"
                    ? "審査中です"
                    : "申請済み"
                  : "公開前に事務局が確認します"
              }
              href="/profile"
            />
          </div>
        </div>
      ) : null}

      {/* ③ 主要アクション＋事務局相談（2カラム） */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* NAKAMAでできること */}
          <div className="rounded-[12px] border border-[var(--line)] bg-white p-5">
            <h2 className={h2Cls}>NAKAMAでできること</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">目的から選んでください。</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MAIN_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-[10px] border border-[var(--line)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--green)] hover:shadow-md"
                >
                  <span className={`relative grid h-9 w-9 place-items-center rounded-[9px] text-[16px] ${a.bg}`}>
                    {a.icon}
                    {a.href === "/messages" && unreadCount > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--red)] px-1 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2.5 block text-[14px] font-bold text-[var(--ink)]">{a.label}</span>
                  <span className="mt-1 block text-[12px] leading-5 text-[var(--muted)]">{a.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 最近の動き */}
          <div className="rounded-[12px] border border-[var(--line)] bg-white p-5">
            <h2 className={h2Cls}>最近の動き</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              メッセージ・商談・プロジェクトの更新をまとめて表示します。
            </p>
            {recentActivity.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  compact
                  title="まだ新しい動きはありません"
                  description="まずはプロフィールを完成させるか、パートナーを探してみましょう。"
                  actions={[{ label: "パートナーを探す", href: "/search", variant: "primary" }]}
                />
              </div>
            ) : (
              <div className="mt-2 flex flex-col divide-y divide-[#EDF0EA]">
                {recentActivity.map((e, i) => (
                  <Link key={i} href={e.href} className="flex items-center gap-3 py-2.5 transition hover:bg-[var(--green-soft)]">
                    <span className="text-[15px]">{e.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink)]">{e.text}</span>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">{fmtShortDate(e.at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {/* 事務局と一緒に進める */}
          <div className="rounded-[12px] bg-[var(--green)] p-5 text-white">
            <h2 className="font-serif text-[17px]">事務局と一緒に進める</h2>
            <p className="mt-1 text-[12px] text-white/70">まだ内容が固まっていなくても相談できます。</p>
            <div className="mt-3 flex flex-col gap-2">
              {CONSULT_LINKS.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="rounded-[9px] bg-white px-3.5 py-2.5 text-[13px] font-bold text-[var(--green-d)] transition hover:opacity-90"
                >
                  {c.label} →
                </Link>
              ))}
            </div>
          </div>

          {/* ご利用プラン */}
          <div className="rounded-[12px] border border-[var(--line)] bg-white p-5">
            <h2 className={h2Cls}>ご利用プラン</h2>
            <div className="mt-2 flex items-center justify-between text-[13px]">
              <span className="text-[var(--muted)]">現在の状態</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-bold ${planTag.cls}`}>
                {planTag.label}
              </span>
            </div>
            {isPaid ? (
              <>
                <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
                  案件の公開・メッセージ・商談をご利用いただけます。
                </p>
                <Link href="/billing" className={`${btn("secondary", "sm")} mt-3 block w-full text-center`}>
                  プラン・お支払いを確認する
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
                  案件の公開・相手への連絡・商談開始には、NAKAMA会員（月額22,000円 税込）への加入が必要です。
                </p>
                <Link href="/billing" className={`${btn("amber", "sm")} mt-3 block w-full text-center`}>
                  会員プランを確認する
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>

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
                    <h3 className={`${h3Cls} mt-1`}>{a.title}</h3>
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
          <h2 className={`${h2Cls} mb-3`}>
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
          <h2 className={h2Cls}>
            みんなの案件（売りたい・買いたい）
          </h2>
          <Link
            href="/ledger"
            className="text-[12px] text-[var(--green-d)] underline"
          >
            案件を登録する →
          </Link>
        </div>
        {recentOfferings.length === 0 ? (
          <EmptyState
            compact
            title="公開中の「売りたい・買いたい」はまだありません"
            description="あなたの1件が最初の出会いになります。商品・食材・探しているものを登録してみましょう。"
            actions={[{ label: "＋ 売りたい・買いたいを登録する", href: "/ledger", variant: "primary" }]}
          />
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
          <h2 className={h2Cls}>新着の共創プロジェクト</h2>
          <Link href="/projects" className="text-[12px] text-[var(--green-d)] underline">企画する →</Link>
        </div>
        {publishedProjects.length === 0 ? (
          <EmptyState
            compact
            title="掲載中の共創プロジェクトはまだありません"
            description="困っていること・実現したいことを書いて掲載すると、共創パートナー候補に届きます。"
            actions={[{ label: "＋ 共創プロジェクトを企画する", href: "/projects", variant: "primary" }]}
          />
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
          <h2 className={`${h2Cls} mb-3`}>あなたの共創プロジェクト</h2>
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
          <h2 className={`${h2Cls} mb-3`}>
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

// 初回セットアップの各ステップ（クリックで該当画面へ）
function SetupStep({
  done,
  title,
  desc,
  href,
}: {
  done?: boolean;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[10px] border p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm ${
        done ? "border-[var(--green-soft)] bg-[var(--green-soft)]" : "border-[var(--line)] bg-white"
      }`}
    >
      <span className={`block text-[13px] font-bold ${done ? "text-[var(--green-d)]" : "text-[var(--ink)]"}`}>
        {done ? "✓ " : ""}
        {title}
      </span>
      <span className="mt-1 block text-[12px] leading-5 text-[var(--muted)]">{desc}</span>
    </Link>
  );
}

// 今日なら時刻、それ以外は 月/日
function fmtShortDate(d: Date): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}
