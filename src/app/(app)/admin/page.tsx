import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PHASE_CONTRACTED } from "@/lib/deal-constants";
import { adminApproveProject } from "../projects/actions";
import { SendBackButton } from "../projects/_components/SendBackButton";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createAnnouncement, deleteAnnouncement } from "./announcement-actions";
import { revokeAdmin } from "./admin-account-actions";
import { AdminAccountForm } from "./_components/AdminAccountForm";
import { AdminNav } from "./_components/AdminNav";
import { deleteBanner, toggleBanner } from "./banner-actions";
import { BannerManager } from "./_components/BannerManager";
import { deleteArticle } from "./article-actions";
import { ArticleEditButton } from "./_components/ArticleEditButton";
import { ArticleManager } from "./_components/ArticleManager";
import { btn, input } from "@/lib/ui";
import { aBadge, aCard, aCardBody, aCardHead, aEyebrow, aH1, aH2, aLink, aNote } from "./_components/adminUi";

// レンダー内で new Date() を直接呼ばないためのヘルパー（react-hooks/purity 対応。/admin/inquiries と同じ）
function nowDate(): Date {
  return new Date();
}

export default async function AdminPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  if (!isAdminRole(su.app.role)) redirect("/dashboard");
  const tenantId = su.app.tenantId;

  const [
    pendingCount,
    memberApproved,
    offeringCount,
    projectPublished,
    dealCount,
    dealClosed,
    pendingProjects,
    sentBackProjects,
    threadCount,
    applicationCount,
    pendingPromoCount,
    pendingNoticeCount,
    newConsultCount,
    overdueMembers,
    announcements,
    banners,
    curatedArticles,
    adminUsers,
  ] = await Promise.all([
    prisma.member.count({ where: { tenantId, status: "PENDING" } }),
    prisma.member.count({ where: { tenantId, status: "APPROVED" } }),
    prisma.offering.count({ where: { isPublic: true, member: { tenantId } } }),
    prisma.project.count({ where: { tenantId, status: "published" } }),
    prisma.deal.count({ where: { tenantId } }),
    prisma.deal.count({ where: { tenantId, phase: { gte: PHASE_CONTRACTED } } }),
    prisma.project.findMany({ where: { tenantId, status: "pending" }, orderBy: { updatedAt: "desc" } }),
    // 差し戻し中（再申請待ち）。reviewNote は再申請時にクリアされるため、これで追跡できる
    prisma.project.findMany({
      where: { tenantId, status: "draft", reviewNote: { not: null } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.thread.count({ where: { tenantId } }),
    prisma.projectApplication.count({ where: { project: { tenantId } } }),
    prisma.listingPromotion.count({ where: { tenantId, status: "pending_review" } }),
    prisma.matchedNotice.count({ where: { tenantId, status: "pending_review" } }),
    prisma.consultation.count({ where: { tenantId, status: "new" } }),
    // 事務局CRM（Phase 11）：次にやることの期限が過ぎている会員
    prisma.member.findMany({
      where: { tenantId, crmNextActionDue: { lt: nowDate() } },
      orderBy: { crmNextActionDue: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        crmNextAction: true,
        crmNextActionDue: true,
        crmOwnerUserId: true,
      },
    }),
    prisma.announcement.findMany({
      where: { tenantId },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.banner.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.curatedArticle.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { tenantId, role: { in: ["TENANT_ADMIN", "ADMIN", "REVIEWER"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  const projMemberIds = Array.from(
    new Set([...pendingProjects, ...sentBackProjects].map((p) => p.memberId))
  );
  const projMembers = projMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
    : [];
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  const ROLE_LABEL: Record<string, string> = {
    TENANT_ADMIN: "統括管理者",
    ADMIN: "事務局管理者",
    REVIEWER: "審査担当",
  };
  const myUserId = su.app.id;

  const billingPending = pendingPromoCount + pendingNoticeCount;
  // alert: 1件以上で「要対応」＝赤くアラート表示する指標
  const metrics: { k: string; v: number; alert?: boolean; href?: string }[] = [
    { k: "審査中の会員", v: pendingCount, alert: true, href: "/admin/members" },
    { k: "PJ承認待ち", v: pendingProjects.length, alert: true, href: "#pj-review" },
    { k: "課金の審査待ち", v: billingPending, alert: true, href: "/admin/billing" },
    { k: "新規の個別相談", v: newConsultCount, alert: true, href: "/admin/consultations" },
    { k: "対応期限ぎれ", v: overdueMembers.length, alert: true, href: "#crm-overdue" },
    { k: "承認済み会員", v: memberApproved },
    { k: "公開中の台帳", v: offeringCount },
    { k: "掲載中プロジェクト", v: projectPublished },
    { k: "商談数", v: dealCount },
    { k: "成約（商品化）", v: dealClosed },
    { k: "問い合わせ", v: threadCount },
    { k: "プロジェクト応募", v: applicationCount },
  ];

  const todoMetrics = metrics.filter((m) => m.alert);
  const statMetrics = metrics.filter((m) => !m.alert);
  const todoTotal = todoMetrics.reduce((n, m) => n + m.v, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={aEyebrow}>ADMIN ・ 事務局ダッシュボード</p>
        <h1 className={`${aH1} mt-0.5`}>事務局管理</h1>
      </div>

      <AdminNav current="top" />

      {/* 対応が必要なもの（この画面で最初に見る場所） */}
      <section className={aCard}>
        <div className={aCardHead}>
          <h2 className={aH2}>対応が必要なもの</h2>
          <span className={todoTotal > 0 ? aBadge("red") : aBadge("neutral")}>
            {todoTotal > 0 ? `${todoTotal}件` : "なし"}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {todoMetrics.map((m) => {
            const alerting = m.v > 0;
            const inner = (
              <>
                <div className={`text-[11px] ${alerting ? "font-bold text-[var(--red)]" : "text-[var(--muted)]"}`}>
                  {m.k}
                </div>
                <div className={`mt-0.5 text-[20px] font-bold ${alerting ? "text-[var(--red)]" : "text-[#C3CAD1]"}`}>
                  {m.v}
                </div>
              </>
            );
            const cls =
              "border-b border-r border-[#EDF0F2] px-4 py-3 last:border-r-0 sm:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n)]:border-r lg:[&:nth-child(5n)]:border-r-0";
            return m.href && alerting ? (
              <Link key={m.k} href={m.href} className={`${cls} transition hover:bg-[#FFF6F4]`}>
                {inner}
              </Link>
            ) : (
              <div key={m.k} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* 現在の数字（見るだけ。対応が必要なものと大きさで差をつける） */}
      <section className={aCard}>
        <div className="flex flex-wrap">
          {statMetrics.map((m) => (
            <div key={m.k} className="min-w-[104px] flex-1 border-r border-[#EDF0F2] px-4 py-2.5 last:border-r-0">
              <div className="text-[10px] text-[var(--muted)]">{m.k}</div>
              <div className="text-[15px] font-bold text-[var(--ink)]">{m.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 顧客対応の期限ぎれ（事務局CRM・Phase 11） */}
      {overdueMembers.length > 0 ? (
        <section id="crm-overdue" className={`${aCard} scroll-mt-6 border-l-[3px] border-l-[var(--red)]`}>
          <div className={aCardHead}>
            <h2 className={aH2}>対応期限が過ぎています</h2>
            <span className={aBadge("red")}>{overdueMembers.length}件</span>
          </div>
          <div>
            {overdueMembers.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#EDF0F2] px-4 py-2.5 text-[12px] last:border-0"
              >
                <Link href={`/admin/crm/${m.id}`} className={`${aLink} font-bold`}>
                  {m.name || "（名称未設定）"}
                </Link>
                <span className={aBadge("red")}>
                  期限 {m.crmNextActionDue?.toLocaleDateString("ja-JP")}
                </span>
                {m.crmNextAction ? <span className="text-[var(--ink-2)]">{m.crmNextAction}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* お知らせ投稿 */}
      <section id="announcements" className={`${aCard} scroll-mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>お知らせ</h2>
          <span className={aNote}>会員のマイページトップに表示されます</span>
        </div>
        <form action={createAnnouncement} className={`${aCardBody} flex flex-col gap-2`}>
          <input name="title" required placeholder="タイトル（例：宮崎カンファレンスの参加受付を開始しました）" className={input()} />
          <textarea name="body" rows={4} placeholder="本文（ブログのように自由に書けます）" className={`${input()} leading-6`} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--ink-2)]">
              <input type="checkbox" name="pinned" /> 上部に固定（重要）
            </label>
            <button className={`${btn("primary", "sm")} ml-auto`}>投稿する</button>
          </div>
        </form>

        {announcements.length > 0 ? (
          <div className="border-t border-[#E3E6E8]">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-[#EDF0F2] px-4 py-2.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.pinned ? <span className={aBadge("amber")}>固定</span> : null}
                    <span className="truncate text-[13px] font-medium text-[var(--ink)]">{a.title}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {a.createdAt.getFullYear()}/{String(a.createdAt.getMonth() + 1).padStart(2, "0")}/{String(a.createdAt.getDate()).padStart(2, "0")}
                  </div>
                </div>
                <ConfirmDeleteButton
                  action={deleteAnnouncement.bind(null, a.id)}
                  buttonLabel="削除"
                  buttonClassName={btn("danger", "sm")}
                  title="本当に削除しますか？"
                  description={`お知らせ「${a.title}」を削除します。会員のトップからも消えます。この操作は元に戻せません。`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* バナー管理 */}
      <section id="banners" className={`${aCard} scroll-mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>バナー</h2>
          <span className={aNote}>マイページトップのお知らせの下に表示されます</span>
        </div>
        <div className={aCardBody}>
          <BannerManager />
        </div>

        {banners.length > 0 ? (
          <div className="flex flex-col border-t border-[#E3E6E8]">
            {banners.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 border-b border-[#EDF0F2] px-4 py-2.5 last:border-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.imageUrl}
                  alt={b.title ?? ""}
                  className="h-14 w-[160px] shrink-0 rounded-md border border-[var(--line)] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[var(--ink)]">
                    {b.title || "（名前なし）"}
                    {!b.active ? (
                      <span className="ml-2 rounded bg-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--ink-2)]">非表示</span>
                    ) : null}
                  </div>
                  {b.linkUrl ? (
                    <div className="truncate text-[11px] text-[var(--muted)]">{b.linkUrl}</div>
                  ) : (
                    <div className="text-[11px] text-[var(--muted)]">リンクなし</div>
                  )}
                </div>
                <form action={toggleBanner.bind(null, b.id, !b.active)}>
                  <button className={btn("secondary", "sm")}>
                    {b.active ? "非表示にする" : "表示する"}
                  </button>
                </form>
                <ConfirmDeleteButton
                  action={deleteBanner.bind(null, b.id)}
                  buttonLabel="削除"
                  buttonClassName={btn("danger", "sm")}
                  title="本当に削除しますか？"
                  description={`バナー「${b.title || "（名前なし）"}」と画像を削除します。この操作は元に戻せません。`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* 記事キュレーション（公開トップに表示） */}
      <section id="articles" className={`${aCard} scroll-mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>記事キュレーション</h2>
          <span className={aNote}>公開トップの「食の注目記事」に表示されます</span>
        </div>
        <div className={aCardBody}>
          <ArticleManager />
        </div>

        {curatedArticles.length > 0 ? (
          <div className="flex flex-col border-t border-[#E3E6E8]">
            {curatedArticles.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border-b border-[#EDF0F2] px-4 py-2.5 last:border-0"
              >
                {a.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.imageUrl}
                    alt=""
                    className="h-14 w-[100px] shrink-0 rounded-md border border-[var(--line)] object-cover"
                  />
                ) : (
                  <div className="grid h-14 w-[100px] shrink-0 place-items-center rounded-md border border-[var(--line)] bg-[var(--green-soft)] text-[20px]">📰</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[var(--ink)]">
                    {a.title}
                    {!a.active ? (
                      <span className="ml-2 rounded bg-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--ink-2)]">非表示</span>
                    ) : (
                      (() => {
                        const now = new Date();
                        if (a.publishStart && a.publishStart > now)
                          return <span className="ml-2 rounded bg-[var(--amber-soft)] px-1.5 py-0.5 text-[10px] text-[var(--amber)]">掲載前</span>;
                        if (a.publishEnd && a.publishEnd < now)
                          return <span className="ml-2 rounded bg-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--ink-2)]">掲載終了</span>;
                        return <span className="ml-2 rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] text-[var(--green-d)]">掲載中</span>;
                      })()
                    )}
                  </div>
                  <div className="truncate text-[11px] text-[var(--muted)]">
                    {a.source} ・ {a.url}
                  </div>
                  {a.fromSummit ? (
                    <span className="mt-0.5 inline-block rounded bg-[var(--amber-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--amber-ink)]">
                      FoodJapanSummit共創
                    </span>
                  ) : null}
                  {a.publishStart || a.publishEnd ? (
                    <div className="text-[11px] text-[var(--muted)]">
                      掲載期間：{fmtDate(a.publishStart)} 〜 {fmtDate(a.publishEnd)}
                    </div>
                  ) : null}
                </div>
                {/* 表示・非表示と共創タグは編集モーダルの中に入れて、行のボタンを2つに絞った */}
                <ArticleEditButton
                  id={a.id}
                  title={a.title}
                  active={a.active}
                  defaults={{
                    source: a.source,
                    author: a.author,
                    url: a.url,
                    title: a.title,
                    imageUrl: a.imageUrl,
                    excerpt: a.excerpt,
                    fromSummit: a.fromSummit,
                    publishStart: toDateInput(a.publishStart),
                    publishEnd: toDateInput(a.publishEnd),
                  }}
                />
                <ConfirmDeleteButton
                  action={deleteArticle.bind(null, a.id)}
                  buttonLabel="削除"
                  buttonClassName={btn("danger", "sm")}
                  title="本当に削除しますか？"
                  description={`記事「${a.title}」を削除します。公開トップの「食の注目記事」からも消えます。この操作は元に戻せません。`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* 掲載承認 */}
      {pendingProjects.length > 0 ? (
        <section id="pj-review" className={`${aCard} scroll-mt-6`}>
          <div className={aCardHead}>
            <h2 className={aH2}>プロジェクト掲載の承認</h2>
            <span className={aBadge("red")}>{pendingProjects.length}件</span>
          </div>
          <div>
            {pendingProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-[#EDF0F2] px-4 py-2.5 last:border-0">
                <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)] hover:underline">
                  {p.title || "（無題）"}
                </Link>
                <span className="text-[12px] text-[var(--muted)]">{projNameMap.get(p.memberId)}</span>
                <form action={adminApproveProject.bind(null, p.id)}>
                  <button className={btn("primary", "sm")}>承認</button>
                </form>
                <SendBackButton projectId={p.id} projectTitle={p.title} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 差し戻し中（再申請待ち）。掲載者が修正して再申請すると上の承認リストに戻る */}
      {sentBackProjects.length > 0 ? (
        <section id="pj-sentback" className={`${aCard} scroll-mt-6`}>
          <div className={aCardHead}>
            <h2 className={aH2}>差し戻し中のプロジェクト</h2>
            <span className={aBadge("amber")}>{sentBackProjects.length}件</span>
            <span className={aNote}>再申請されると「プロジェクト掲載の承認」に戻ります</span>
          </div>
          <div>
            {sentBackProjects.map((p) => (
              <div key={p.id} className="flex flex-col gap-1 border-b border-[#EDF0F2] px-4 py-2.5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`${aBadge("amber")} shrink-0`}>再申請待ち</span>
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)] hover:underline">
                    {p.title || "（無題）"}
                  </Link>
                  <span className="shrink-0 text-[12px] text-[var(--muted)]">{projNameMap.get(p.memberId)}</span>
                  <span className="shrink-0 text-[12px] text-[var(--muted)]">
                    差し戻し {p.updatedAt.getMonth() + 1}月{p.updatedAt.getDate()}日
                  </span>
                </div>
                {p.reviewNote ? (
                  <p className="line-clamp-2 pl-1 text-[12px] leading-5 text-[var(--ink-2)]">
                    理由：{p.reviewNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 管理者アカウント */}
      <section id="admin-accounts" className={`${aCard} scroll-mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>管理者アカウント</h2>
          <span className={aNote}>作成すると、そのメール・パスワードですぐログインできます</span>
        </div>
        <div className={aCardBody}>
          <AdminAccountForm />
        </div>

        <div className="border-t border-[#E3E6E8]">
          {adminUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-b border-[#EDF0F2] px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[var(--ink)]">{u.name}</div>
                <div className="truncate text-[12px] text-[var(--muted)]">{u.email}</div>
              </div>
              <span className={aBadge("green")}>
                {ROLE_LABEL[u.role] ?? u.role}
              </span>
              {u.id === myUserId || u.role === "TENANT_ADMIN" ? (
                <span className="w-[72px] text-right text-[11px] text-[var(--muted)]">
                  {u.id === myUserId ? "あなた" : "—"}
                </span>
              ) : (
                <form action={revokeAdmin.bind(null, u.id)} className="w-[72px] text-right">
                  <button className={btn("danger", "sm")}>権限解除</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * <input type="date"> に渡す YYYY-MM-DD。未設定は空文字。
 *
 * ⚠️ **必ずJSTで出す**。保存時は `new Date("YYYY-MM-DDT00:00:00")`（サーバーのローカル時刻）で
 *    入れているが、サーバーはUTCで動くので素の toISOString() を使うと日付が1日前にずれる。
 *    ずれたまま保存し直すと掲載開始日が毎回1日ずつ早まっていく。
 */
function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// 掲載期間の日付表示（未設定は「—」）
function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
