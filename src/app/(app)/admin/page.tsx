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
import { deleteBanner, toggleBanner } from "./banner-actions";
import { BannerManager } from "./_components/BannerManager";
import { deleteArticle, toggleArticle } from "./article-actions";
import { ArticleManager } from "./_components/ArticleManager";
import { btn, eyebrowCls, h1Cls, h2Cls, input } from "@/lib/ui";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={eyebrowCls}>ADMIN ・ 事務局ダッシュボード</p>
          <h1 className={h1Cls}>事務局管理</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/members" className={`${btn("secondary", "sm")} relative`}>
            会員管理 →
            {pendingCount > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--red)] px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            ) : null}
          </Link>
          <Link href="/admin/listings" className={btn("secondary", "sm")}>掲載の監視 →</Link>
          <Link href="/admin/inquiries" className={btn("secondary", "sm")}>問い合わせ・応募の状況 →</Link>
          <Link href="/admin/consultations" className={btn("secondary", "sm")}>個別相談の管理 →</Link>
          <Link href="/admin/billing" className={btn("secondary", "sm")}>課金管理 →</Link>
          <Link href="/admin/reports" className={btn("secondary", "sm")}>違反報告 →</Link>
          <Link href="/admin/audit" className={btn("secondary", "sm")}>監査ログ →</Link>
        </div>
      </div>

      {/* 指標サマリ（要対応の指標は1件以上で赤くアラート） */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {metrics.map((m) => {
          const alerting = !!m.alert && m.v > 0;
          const inner = (
            <>
              <div className={`flex items-center gap-1.5 text-[10px] ${alerting ? "font-bold text-[var(--red)]" : "text-[var(--muted)]"}`}>
                {m.k}
                {alerting ? (
                  <span className="rounded bg-[var(--red)] px-1 py-0.5 text-[9px] font-bold text-white">要対応</span>
                ) : null}
              </div>
              <div className={`mt-1 font-serif text-[22px] ${alerting ? "font-bold text-[var(--red)]" : "text-[var(--ink)]"}`}>
                {m.v}
              </div>
            </>
          );
          const cls = `rounded-[10px] border bg-white p-4 ${
            alerting ? "border-2 border-[var(--red)] bg-[var(--red-soft)]" : "border-[var(--line)]"
          }`;
          return m.href && alerting ? (
            <Link key={m.k} href={m.href} className={`${cls} transition hover:-translate-y-0.5 hover:shadow-sm`}>
              {inner}
            </Link>
          ) : (
            <div key={m.k} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* 顧客対応の期限ぎれ（事務局CRM・Phase 11） */}
      {overdueMembers.length > 0 ? (
        <div id="crm-overdue" className="scroll-mt-6 rounded-[10px] border-2 border-[var(--red)] bg-[var(--red-soft)] p-4">
          <h2 className="text-[14px] font-bold text-[var(--red)]">
            対応期限が過ぎています（{overdueMembers.length}件）
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-[12px] text-[var(--ink)]">
            {overdueMembers.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/crm/${m.id}`} className="font-bold underline">
                  {m.name || "（名称未設定）"}
                </Link>
                <span className="ml-2 text-[var(--muted)]">
                  期限 {m.crmNextActionDue?.toLocaleDateString("ja-JP")}
                </span>
                {m.crmNextAction ? <span className="ml-2 text-[var(--ink-2)]">{m.crmNextAction}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* お知らせ投稿 */}
      <div>
        <h2 className={`${h2Cls} mb-2`}>お知らせを投稿（会員のトップに表示）</h2>
        <form action={createAnnouncement} className="flex flex-col gap-2 rounded-[10px] border border-[var(--line)] bg-white p-4">
          <input name="title" required placeholder="タイトル（例：宮崎カンファレンスの参加受付を開始しました）" className={input()} />
          <textarea name="body" rows={4} placeholder="本文（ブログのように自由に書けます）" className={`${input()} leading-6`} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--ink-2)]">
              <input type="checkbox" name="pinned" /> 上部に固定（重要）
            </label>
            <button className={`${btn("primary")} ml-auto`}>投稿する</button>
          </div>
        </form>

        {announcements.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.pinned ? <span className="rounded bg-[var(--amber-soft)] px-1.5 py-0.5 text-[10px] text-[var(--amber)]">固定</span> : null}
                    <span className="truncate text-[14px] font-medium text-[var(--ink)]">{a.title}</span>
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
      </div>

      {/* バナー管理 */}
      <div>
        <h2 className={`${h2Cls} mb-1`}>バナー管理（会員トップに表示）</h2>
        <p className="mb-3 text-[12px] text-[var(--muted)]">
          バナー画像とリンク先URLを登録すると、マイページトップのお知らせの下に表示されます。
        </p>

        <BannerManager />

        {banners.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {banners.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-white p-3"
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
      </div>

      {/* 記事キュレーション（公開トップに表示） */}
      <div>
        <h2 className={`${h2Cls} mb-1`}>記事キュレーション（公開トップに表示）</h2>
        <p className="mb-3 text-[12px] text-[var(--muted)]">
          PR TIMES・note・新聞などの食の記事を登録すると、ログイン不要の公開トップに「食の注目記事」として表示されます。
        </p>

        <ArticleManager />

        {curatedArticles.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {curatedArticles.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-white p-3"
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
                  {a.publishStart || a.publishEnd ? (
                    <div className="text-[11px] text-[var(--muted)]">
                      掲載期間：{fmtDate(a.publishStart)} 〜 {fmtDate(a.publishEnd)}
                    </div>
                  ) : null}
                </div>
                <form action={toggleArticle.bind(null, a.id, !a.active)}>
                  <button className={btn("secondary", "sm")}>
                    {a.active ? "非表示にする" : "表示する"}
                  </button>
                </form>
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
      </div>

      {/* 掲載承認 */}
      {pendingProjects.length > 0 ? (
        <div>
          <h2 id="pj-review" className={`${h2Cls} mb-2 scroll-mt-6`}>プロジェクト掲載の承認（{pendingProjects.length}）</h2>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {pendingProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
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
        </div>
      ) : null}

      {/* 差し戻し中（再申請待ち）。掲載者が修正して再申請すると上の承認リストに戻る */}
      {sentBackProjects.length > 0 ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>差し戻し中のプロジェクト（{sentBackProjects.length}）</h2>
          <p className="mb-2 text-[12px] text-[var(--muted)]">
            掲載者が修正して再申請すると「プロジェクト掲載の承認」に戻ります。長く動きがない場合は事務局からご連絡ください。
          </p>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {sentBackProjects.map((p) => (
              <div key={p.id} className="flex flex-col gap-1 border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 rounded-full bg-[var(--amber-soft)] px-2.5 py-1 text-[11px] text-[var(--amber)]">再申請待ち</span>
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
        </div>
      ) : null}

      {/* 管理者アカウント */}
      <div>
        <h2 className={`${h2Cls} mb-1`}>管理者アカウント</h2>
        <p className="mb-3 text-[12px] text-[var(--muted)]">
          事務局スタッフのログインアカウントをここで発行できます。作成すると、すぐに設定したメール・パスワードでログインできます。
        </p>

        <AdminAccountForm />

        <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
          {adminUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-[var(--ink)]">{u.name}</div>
                <div className="truncate text-[12px] text-[var(--muted)]">{u.email}</div>
              </div>
              <span className="rounded-full bg-[var(--green-soft)] px-2.5 py-1 text-[11px] text-[var(--green-d)]">
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
      </div>
    </div>
  );
}

// 掲載期間の日付表示（未設定は「—」）
function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
