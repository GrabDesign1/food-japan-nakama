// ダッシュボード（マイページ）。
// 方針（2026-08-10 改善版指示書 NAKAMA_dashboard_final_ClaudeCode_instructions.md）：
// 機能追加ではなく情報の削減と整理。主操作は「案件を探す」「案件を登録する」「事務局に相談する」の3つ。
// 商談と共創プロジェクトは「進行中の活動」に統合。初期設定は1行の進捗表示。
// 「未加入」表示は右カラムの利用状況に1回だけ。下部の重複ブロック（みんなの案件・新着PJ・数字カード等）は削除済み。
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { OfferingCard } from "@/components/OfferingCard";
import { views24hMap } from "@/lib/offering-views";
import { EmptyState } from "@/components/EmptyState";
import { MyListingsTable } from "@/components/MyListingsTable";
import { loadMyListingRows } from "@/lib/listing-stats";
import { countMissingProfileFields } from "@/lib/member";
import { PHASES, loadMemberDeals } from "@/lib/deal";
import {
  PROGRESS_LABEL,
  PROGRESS_STAGES,
  nextActionDueState,
  isMeetingSoon,
} from "@/lib/project-taxonomy";
import { btn, eyebrowCls, h1Cls, h2Cls, h3Cls } from "@/lib/ui";

export const metadata: Metadata = { title: "マイページ｜FOOD JAPAN NAKAMA" };

// 主操作（これ以上増やさない）。
// 「事務局に相談する」は右カラムの「事務局と一緒に進める」パネルと重複していたため、
// こちらから外した（2026-08-11 ユーザー指示。緑のパネル側を残す）。
const MAIN_ACTIONS = [
  {
    href: "/search",
    icon: "🔍",
    label: "案件を探す",
    desc: "地域・業種・目的から探す",
    primary: true,
  },
  {
    href: "/ledger",
    icon: "＋",
    label: "案件を登録する",
    desc: "売りたい（提供したい）／探している（調達したい）／共創パートナー募集",
    primary: false,
  },
];

// 進行中の活動（商談＋共創プロジェクトの統合表示）
type ActivityItem = {
  title: string;
  meta: string;
  status: string;
  statusCls: string;
  href: string;
  at: Date;
  priority: number; // 0=要返信を最優先
};

const PROJECT_STATUS: Record<string, string> = {
  draft: "下書き",
  pending: "承認待ち",
  published: "掲載中",
  closed: "終了",
};

const STATUS_ORANGE = "bg-[#FAF0D6] text-[#B77F0B]";
const STATUS_GREEN = "bg-[var(--green-soft)] text-[var(--green-d)]";

function fmtShortDate(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 次回決済日（Stripe API）は1時間キャッシュする。
// 毎回のダッシュボード表示でStripeへのHTTP呼び出し（数百ms）を待たないため。月1回しか変わらない値。
const getNextBillingTs = unstable_cache(
  async (subscriptionId: string): Promise<number | null> => {
    if (!stripe) return null;
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const s = sub as unknown as {
        current_period_end?: number;
        items?: { data?: { current_period_end?: number }[] };
      };
      const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
      return ts ? ts * 1000 : null;
    } catch (e) {
      console.error("[dashboard] 次回決済日の取得に失敗:", e);
      return null;
    }
  },
  ["dashboard-next-billing"],
  { revalidate: 3600 }
);

export default async function DashboardPage() {
  const su = await getSessionUser();

  const member = su?.app.memberId
    ? await prisma.member.findUnique({ where: { id: su.app.memberId } })
    : null;

  const tenantId = su?.app.tenantId;
  const memberId = member?.id;

  const [announcements, banners, dealsWithOther, myProjects, recommended, myProjectApps, nextBillingTs] = await Promise.all([
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
    memberId ? loadMemberDeals(memberId) : Promise.resolve([]),
    memberId
      ? prisma.project.findMany({ where: { memberId }, orderBy: { updatedAt: "desc" }, take: 5 })
      : Promise.resolve([]),
    // おすすめ案件：おすすめ条件（希望地域・業種・目的タグ）のロジックは未実装のため、暫定で新着を表示。
    // TODO: 会員のprefecture/categoryL1/検索タグに基づくスコアリングに置き換える（仕様書5章）。
    tenantId
      ? prisma.offering.findMany({
          where: {
            isPublic: true,
            visibility: "public",
            title: { not: "" },
            member: { tenantId, status: "APPROVED" },
            ...(memberId ? { memberId: { not: memberId } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 4,
          include: { member: { select: { name: true, companyLogoUrl: true } } },
        })
      : Promise.resolve([]),
    // 自分が主催する共創プロジェクトの進行中の応募（次の行動・期限を「進行中の活動」に反映）
    memberId
      ? prisma.projectApplication.findMany({
          where: {
            project: { memberId },
            progressStage: { in: PROGRESS_STAGES.map(([v]) => v) },
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
          include: { project: { select: { id: true, title: true } } },
        })
      : Promise.resolve([]),
    // 次回決済日（1時間キャッシュ。失敗時はnull＝非表示）
    member?.paymentStatus === "PAID" && member.stripeSubscriptionId
      ? getNextBillingTs(member.stripeSubscriptionId)
      : Promise.resolve(null),
  ]);

  // ── 2段目：1段目の結果に依存するクエリはまとめて並列実行（直列4往復→1往復に）──
  const dealThreadIds = dealsWithOther
    .map((d) => d.deal.threadId)
    .filter((v): v is string => !!v);
  const appMemberIds = Array.from(new Set(myProjectApps.map((a) => a.applicantMemberId)));

  const [unreadGroups, appMembers, viewMap, dealThreads] = await Promise.all([
    // 商談スレッドごとの未読数（「要返信」判定）
    memberId && dealThreadIds.length
      ? prisma.message.groupBy({
          by: ["threadId"],
          where: {
            threadId: { in: dealThreadIds },
            senderMemberId: { not: memberId },
            readAt: null,
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    // 応募者名（進行中の活動の行表示用）
    appMemberIds.length
      ? prisma.member.findMany({ where: { id: { in: appMemberIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    // 24時間以内の閲覧数（おすすめ＋自分の公開中案件のカード表示用）
    views24hMap(recommended.map((o) => o.id)),
    // 商談のスレッドが「どの案件のものか」（進行中の活動をカードで出すため）
    dealThreadIds.length
      ? prisma.thread.findMany({
          where: { id: { in: dealThreadIds }, offeringId: { not: null } },
          select: { id: true, offeringId: true },
        })
      : Promise.resolve([]),
  ]);
  // 自分が出した案件の管理表（届いた件数・未返信・放置が一目で分かる）
  const myListingRows = memberId ? await loadMyListingRows(memberId) : [];
  const unreadByThread = new Map(unreadGroups.map((g) => [g.threadId, g._count._all]));
  const appNameMap = new Map(appMembers.map((m) => [m.id, m.name]));

  // ── 進行中の活動：案件に紐づく商談はカードで出す（案件が一目で分かるように・2026-08-11 ユーザー指示）──
  // クリック先は案件ごとのやり取り画面（案件＋履歴＋返信が1画面）。
  const dealOfferingIds = Array.from(
    new Set(dealThreads.map((t) => t.offeringId).filter((v): v is string => !!v))
  );
  const dealOfferings = dealOfferingIds.length
    ? await prisma.offering.findMany({
        where: { id: { in: dealOfferingIds } },
        select: {
          id: true,
          direction: true,
          category: true,
          title: true,
          area: true,
          imageUrls: true,
          description: true,
          amountValue: true,
          amountUnit: true,
          amountPeriod: true,
          amountText: true,
          priceType: true,
          priceAmount: true,
          priceUnit: true,
          priceTaxType: true,
          minOrderText: true,
          itemCondition: true,
          supplyFrequency: true,
          applicationDeadline: true,
          tagline: true,
          listingPurpose: true,
          seekingType: true,
          createdAt: true,
          member: { select: { name: true, companyLogoUrl: true } },
        },
      })
    : [];
  const offeringById = new Map(dealOfferings.map((o) => [o.id, o]));
  const threadOfferingMap = new Map(
    dealThreads.map((t) => [t.id, t.offeringId ? offeringById.get(t.offeringId) ?? null : null])
  );
  const activityCards = dealsWithOther
    .map(({ deal }) => {
      const offering = deal.threadId ? threadOfferingMap.get(deal.threadId) : null;
      if (!offering || !deal.threadId) return null;
      const unread = unreadByThread.get(deal.threadId) ?? 0;
      return {
        offering,
        threadId: deal.threadId,
        unread,
        status: unread > 0 ? `要返信${unread > 1 ? ` ${unread}件` : ""}` : PHASES[deal.phase] ?? "商談中",
        tone: (unread > 0 ? "orange" : "green") as "orange" | "green",
        at: deal.lastActivityAt,
      };
    })
    .filter((v): v is NonNullable<typeof v> => !!v)
    .sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.at.getTime() - a.at.getTime())
    .slice(0, 4);
  const cardThreadIds = new Set(activityCards.map((c) => c.threadId));

  // ── 進行中の活動（商談＋共創PJ＋応募進捗を統合・最大3件）──
  // 優先順位（指示書§13）: 0=要返信・未読 / 1=期限超過・間近 / 2=次回打合せが近い / 3=最終更新の新しい順
  const activities: ActivityItem[] = [
    ...dealsWithOther
      .filter(({ deal }) => !(deal.threadId && cardThreadIds.has(deal.threadId)))
      .map(({ deal, other }) => {
      const unread = deal.threadId ? (unreadByThread.get(deal.threadId) ?? 0) : 0;
      // カードにできるのは案件に紐づく商談だけ。ここに残るのは案件なしの直接のやり取りなので、
      // 「同じ相手が2つ出ている」と誤解されないよう、案件に紐づかないことを明示する（2026-08-11）。
      const noListing = !deal.threadId || !threadOfferingMap.get(deal.threadId);
      return {
        title: deal.nextAction || `${other?.name ?? "会員"}さんとの商談`,
        meta: `${noListing ? "案件に紐づかないメッセージ" : (other?.name ?? "（不明）")} ・ 最終更新 ${fmtShortDate(deal.lastActivityAt)}`,
        status: unread > 0 ? `要返信${unread > 1 ? ` ${unread}件` : ""}` : PHASES[deal.phase] ?? "商談中",
        statusCls: unread > 0 ? STATUS_ORANGE : STATUS_GREEN,
        href: deal.threadId ? `/messages/${deal.threadId}` : "/deals",
        at: deal.lastActivityAt,
        priority: unread > 0 ? 0 : 3,
      };
    }),
    // 主催プロジェクトの応募進捗（次の行動・期限つき）
    ...myProjectApps.map((a) => {
      const name = appNameMap.get(a.applicantMemberId) ?? "会員";
      const dueState = nextActionDueState(a.progressStage, a.nextActionDue);
      const meetingSoon = isMeetingSoon(a.nextMeetingAt);
      const dueText = a.nextActionDue ? ` ・ 期限 ${fmtShortDate(a.nextActionDue)}` : "";
      return {
        title: a.nextAction || `${name}さんの応募に対応する`,
        meta: `${a.project.title || "（無題）"} ・ ${name}${dueText}`,
        status: dueState === "overdue" ? "期限超過" : PROGRESS_LABEL[a.progressStage] ?? a.progressStage,
        statusCls: dueState === "overdue" || dueState === "soon" ? STATUS_ORANGE : STATUS_GREEN,
        href: `/projects/${a.project.id}/applicants`,
        at: a.updatedAt,
        priority: dueState === "overdue" || dueState === "soon" ? 1 : meetingSoon ? 2 : 3,
      };
    }),
    ...myProjects.map((p) => ({
      title: p.title || "（無題の共創プロジェクト）",
      meta: `共創プロジェクト ・ 最終更新 ${fmtShortDate(p.updatedAt)}`,
      status: PROJECT_STATUS[p.status] ?? p.status,
      statusCls: p.status === "published" ? STATUS_GREEN : STATUS_ORANGE,
      href: `/projects/${p.id}`,
      at: p.updatedAt,
      priority: 3,
    })),
  ]
    .sort((a, b) => a.priority - b.priority || b.at.getTime() - a.at.getTime())
    .slice(0, 3);

  // ── プロフィール進捗（100%かつ審査済みなら非表示）──
  // 完成度が低いうち（40%未満）は1行ではなく目立つカードで促す（ユーザー指示 2026-08-10）。
  const rate = member?.completionRate ?? 0;
  const missingCount = member ? countMissingProfileFields(member) : 0;
  const showSetupLine = !!member && !(rate >= 100 && member.status === "APPROVED");
  const emphasizeSetup = showSetupLine && rate < 40;

  // ── 会員状態（表示は右カラムの利用状況1か所のみ。登録・掲載・応募は無料＝2026-08-10 最終決定書）──
  const isPaid = member?.paymentStatus === "PAID";
  const memberStateLabel = isPaid ? "NAKAMAビジネス会員" : "無料会員";

  // 事務局アカウントは、担当できる範囲が分かるように役割バッジを出す
  const STAFF_ROLE: Record<string, { label: string; icon: string; description: string }> = {
    TENANT_ADMIN: { label: "事務局管理者", icon: "🛡", description: "すべての管理機能" },
    ADMIN: { label: "事務局管理者", icon: "🛡", description: "すべての管理機能" },
    REVIEWER: { label: "事務局審査担当", icon: "✓", description: "会員審査・お知らせ投稿" },
  };
  const staffRole = su ? STAFF_ROLE[su.app.role] : undefined;
  const reviewLabel =
    member?.status === "APPROVED"
      ? "承認済み"
      : member?.status === "PENDING"
        ? "審査中"
        : member?.status === "REJECTED"
          ? "要修正"
          : member?.status === "AWAITING_PAYMENT"
            ? "お支払い待ち"
            : "未申請";

  // 有料会員には次回決済日を表示（1段目で並列取得済み・1時間キャッシュ。取得失敗時は非表示のまま進める）
  const nextBillingDate: Date | null = isPaid && nextBillingTs ? new Date(nextBillingTs) : null;

  // ── 状態アラート（審査・支払いまわりのみ。他の重複案内は出さない）──
  const alerts: { icon: string; label: string; cta: string; href: string }[] = [];
  if (member?.status === "REJECTED") {
    alerts.push({ icon: "⚠️", label: "プロフィールに修正が必要です", cta: "見直して再申請", href: "/profile" });
  }
  // 支払い関連のアラートは出さない（登録・掲載・応募・メッセージは無料）

  // viewMap は2段目の並列取得で取得済み
  const [newest, ...restAnnouncements] = announcements;

  return (
    <div className="flex flex-col gap-6">
      {/* あいさつ */}
      <div>
        <p className={eyebrowCls}>MY PAGE</p>
        {/* 会員バッジと、事務局の場合は担当の役割バッジ（ユーザー名の上に表示） */}
        <div className="mb-1 mt-0.5 flex flex-wrap items-center gap-2">
          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A053] bg-[#FDF9EF] px-3 py-1 text-[11px] font-bold tracking-wide text-[#A87F2F]">
              NAKAMA <span className="font-normal">ビジネス会員</span>
            </span>
          ) : null}
          {staffRole ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green)] bg-[var(--green-soft)] px-3 py-1 text-[11px] font-bold text-[var(--green-d)]"
              title={staffRole.description}
            >
              <span aria-hidden>{staffRole.icon}</span>
              {staffRole.label}
            </span>
          ) : null}
        </div>
        <h1 className={h1Cls}>{su?.app.name} さん、こんにちは</h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">今日も新しい食のつながりを見つけましょう。</p>
      </div>

      {/* 状態アラート（必要なときだけ） */}
      {alerts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className="flex items-center gap-3 rounded-[10px] border border-[#E7D9A6] bg-[#FAF0D6] px-4 py-3 text-[#7A5A0B] transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span>{a.icon}</span>
              <span className="min-w-0 flex-1 text-[13px] font-semibold">{a.label}</span>
              <span className="shrink-0 rounded-md bg-white/70 px-3 py-1.5 text-[12px] font-bold">{a.cta} →</span>
            </Link>
          ))}
        </div>
      ) : null}

      {/* プロフィール進捗。完成度が低いうちは目立つカード、進んだら1行表示 */}
      {emphasizeSetup ? (
        <div className="rounded-[14px] border-2 border-[var(--green)] bg-[var(--green-soft)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={h2Cls}>🌱 まずはプロフィールを入力しましょう</h2>
              {/* 1文目は「表示されない」という不利益なので、太字・大きめで先に目に入るようにする */}
              <p className="mt-1.5 text-[16px] font-bold leading-7 text-[var(--ink)]">
                プロフィールの入力内容が50%未満の場合、相手の「案件を探す」の登録事業者に表示されません。
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
                プロフィールが空のままだと、相手から見つけてもらえず、審査の申請もできません。
                事業者名や事業内容など、まずは基本の項目から入力ください。
              </p>
            </div>
            <Link href="/profile" className={`${btn("primary")} shrink-0`}>
              プロフィールを入力する →
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-[8px] max-w-[360px] flex-1 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[var(--green)]" style={{ width: `${Math.max(rate, 2)}%` }} />
            </div>
            <span className="shrink-0 text-[13px] font-bold text-[var(--green-d)]">
              {rate}%{missingCount > 0 ? `・あと${missingCount}項目` : ""}
            </span>
          </div>
        </div>
      ) : showSetupLine ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-[var(--line)] bg-white px-5 py-3.5">
          <span className="text-[13px] font-bold text-[var(--ink)]">プロフィール完成度</span>
          <div className="h-[7px] min-w-[120px] max-w-[300px] flex-1 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full rounded-full bg-[var(--green)]" style={{ width: `${rate}%` }} />
          </div>
          <span className="text-[13px] text-[var(--muted)]">
            {rate}%{missingCount > 0 ? `・あと${missingCount}項目` : ""}
          </span>
          <Link href="/profile" className="ml-auto text-[13px] font-bold text-[var(--green-d)]">
            続きを入力する →
          </Link>
        </div>
      ) : null}

      {/* 主操作（探す・登録する。相談は右カラムのパネルに集約） */}
      <section aria-label="主な操作" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {MAIN_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`flex min-h-[44px] items-center gap-3.5 rounded-[14px] border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
              a.primary
                ? "border-[var(--green)] bg-[var(--green)] text-white"
                : "border-[var(--line)] bg-white hover:border-[var(--green)]"
            }`}
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-[19px] ${
                a.primary ? "bg-white/15 text-white" : "bg-[var(--green-soft)] text-[var(--green-d)]"
              }`}
            >
              {a.icon}
            </span>
            <span className="min-w-0">
              <span className={`block text-[15px] font-bold ${a.primary ? "text-white" : "text-[var(--ink)]"}`}>
                {a.label}
              </span>
              <span className={`block text-[12px] ${a.primary ? "text-white/75" : "text-[var(--muted)]"}`}>
                {a.desc}
              </span>
            </span>
          </Link>
        ))}
      </section>

      {/* 本文2カラム（モバイルは相談カードを主操作の直後へ） */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
          {/* 進行中の活動（商談＋共創プロジェクト統合） */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={h2Cls}>進行中の活動</h2>
              <Link href="/deals" className="text-[13px] font-bold text-[var(--green-d)]">
                すべて見る →
              </Link>
            </div>
            {/* 案件に紐づく商談はカードで（クリックで案件＋やり取りの画面へ） */}
            {activityCards.length > 0 ? (
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activityCards.map((c) => (
                  <div key={c.threadId}>
                    <OfferingCard
                      o={{
                        ...c.offering,
                        memberName: c.offering.member?.name ?? null,
                        memberLogoUrl: c.offering.member?.companyLogoUrl ?? null,
                      }}
                      href={`/ledger/${c.offering.id}/proposals/${c.threadId}`}
                      statusLabel={c.status}
                      statusTone={c.tone}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {activities.length === 0 && activityCards.length === 0 ? (
              <EmptyState
                compact
                title="まだ進行中の活動はありません"
                description="案件を探して、気になる相手に連絡してみましょう。"
                actions={[{ label: "案件を探す", href: "/search", variant: "primary" }]}
              />
            ) : activities.length > 0 ? (
              <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-white">
                {activities.map((a, i) => (
                  <Link
                    key={i}
                    href={a.href}
                    className="flex items-start gap-3 border-b border-[#EDF0EA] px-5 py-4 transition last:border-0 hover:bg-[var(--green-soft)]/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{a.title}</span>
                      <span className="mt-0.5 block text-[12px] text-[var(--muted)]">{a.meta}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${a.statusCls}`}>
                      {a.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>

          {/* 自分が出した案件（クラウドワークスの「登録中のお仕事」に相当）。
              カードだと「問い合わせが来ているか・返していないか・放置していないか」が読み取れないため表にした。 */}
          {myListingRows.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className={h2Cls}>自分が出した案件</h2>
                <Link href="/ledger" className="text-[13px] font-bold text-[var(--green-d)]">
                  すべて見る →
                </Link>
              </div>
              <MyListingsTable rows={myListingRows.slice(0, 5)} now={new Date()} />
            </section>
          ) : null}

          {/* おすすめ案件 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={h2Cls}>あなたへのおすすめ案件</h2>
              <Link href="/search" className="text-[13px] font-bold text-[var(--green-d)]">
                条件を絞って探す →
              </Link>
            </div>
            {recommended.length === 0 ? (
              <EmptyState
                compact
                title="表示できる案件はまだありません"
                description="あなたの1件が最初の出会いになります。案件を登録してみましょう。"
                actions={[{ label: "＋ 案件を登録する", href: "/ledger", variant: "primary" }]}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {recommended.map((o) => (
                  <OfferingCard
                    key={o.id}
                    o={{ ...o, memberName: o.member.name, memberLogoUrl: o.member.companyLogoUrl, views24h: viewMap.get(o.id) ?? 0 }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* お知らせ（コンパクト） */}
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

          {/* バナー（事務局が設定した告知） */}
          {banners.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {banners.map((b) => {
                const img = (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.imageUrl} alt={b.title ?? ""} className="w-full rounded-xl border border-[var(--line)]" />
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
        </div>

        {/* 右カラム（モバイルでは相談カードを主操作の直後に表示。利用状況はモバイル非表示） */}
        <aside className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
          <div className="rounded-[14px] border border-[#D5E5DB] bg-[var(--green-soft)] p-5">
            <h2 className={h2Cls}>事務局と一緒に進める</h2>
            <p className="mt-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
              相手探し、企画づくり、実証、事業化まで。まだ内容が固まっていなくても相談できます。
            </p>
            <Link href="/consultation" className={`${btn("primary")} mt-4 block w-full text-center`}>
              事務局に相談する
            </Link>
          </div>

          <div className="hidden rounded-[14px] border border-[var(--line)] bg-white p-5 lg:block">
            <h2 className={h2Cls}>ご利用状況</h2>
            <div className="mt-1 flex items-center justify-between border-b border-[var(--line)] py-2.5 text-[13px]">
              <span className="text-[var(--muted)]">会員状態</span>
              <b className={isPaid ? "text-[#A87F2F]" : "text-[#B77F0B]"}>{memberStateLabel}</b>
            </div>
            <div className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-[var(--muted)]">プロフィール審査</span>
              <b className="text-[var(--ink)]">{reviewLabel}</b>
            </div>
            {isPaid ? (
              <>
                {nextBillingDate ? (
                  <div className="flex items-center justify-between border-t border-[var(--line)] py-2.5 text-[13px]">
                    <span className="text-[var(--muted)]">次回決済日</span>
                    <b className="text-[var(--ink)]">
                      {nextBillingDate.getFullYear()}/{nextBillingDate.getMonth() + 1}/{nextBillingDate.getDate()}
                    </b>
                  </div>
                ) : null}
                <Link href="/billing" className="mt-2 inline-block text-[12px] font-bold text-[var(--green-d)]">
                  プラン・お支払いを確認する →
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 rounded-[8px] bg-[var(--green-soft)] p-2.5 text-[12px] leading-5 text-[var(--green-d)]">
                  登録・掲載・応募は無料でご利用いただけます。
                </p>
                {/* ビジネス会員へのアップグレード（ゴールド） */}
                <Link
                  href="/billing"
                  className="mt-3 block rounded-md bg-[#C9A053] py-2.5 text-center text-[13px] font-bold text-white transition hover:bg-[#B58C3D]"
                >
                  ビジネス会員になる
                </Link>
                <p className="mt-1.5 text-[11px] leading-5 text-[var(--muted)]">
                  毎月50クレジット（1クレジットあたり440円）・追加クレジットと掲載オプションが20%OFF（月額22,000円・税込）
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
