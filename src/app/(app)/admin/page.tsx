import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { listReviewMembers } from "@/lib/member";
import { prisma } from "@/lib/db";
import { AdminTable, type AdminRow } from "./_components/AdminTable";
import { adminReviewProject } from "../projects/actions";
import { createAnnouncement, deleteAnnouncement } from "./announcement-actions";
import { revokeAdmin } from "./admin-account-actions";
import { AdminAccountForm } from "./_components/AdminAccountForm";
import { deleteBanner, toggleBanner } from "./banner-actions";
import { BannerManager } from "./_components/BannerManager";

export default async function AdminPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  if (!isAdminRole(su.app.role)) redirect("/dashboard");
  const tenantId = su.app.tenantId;

  const [
    members,
    memberApproved,
    offeringCount,
    projectPublished,
    dealCount,
    dealClosed,
    pendingProjects,
  ] = await Promise.all([
    listReviewMembers(tenantId),
    prisma.member.count({ where: { tenantId, status: "APPROVED" } }),
    prisma.offering.count({ where: { isPublic: true, member: { tenantId } } }),
    prisma.project.count({ where: { tenantId, status: "published" } }),
    prisma.deal.count({ where: { tenantId } }),
    prisma.deal.count({ where: { tenantId, phase: 5 } }),
    prisma.project.findMany({ where: { tenantId, status: "pending" }, orderBy: { updatedAt: "desc" } }),
  ]);

  const announcements = await prisma.announcement.findMany({
    where: { tenantId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  const banners = await prisma.banner.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const adminUsers = await prisma.user.findMany({
    where: { tenantId, role: { in: ["TENANT_ADMIN", "ADMIN", "REVIEWER"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  const pendingCount = members.filter((m) => m.status === "PENDING").length;

  const projMemberIds = Array.from(new Set(pendingProjects.map((p) => p.memberId)));
  const projMembers = projMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
    : [];
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  const rows: AdminRow[] = members.map((m) => ({
    id: m.id, name: m.name,
    contactName: m.contactName || m.users[0]?.name || "—",
    contactKana: m.contactKana, contactEmail: m.users[0]?.email ?? "—",
    categoryL1: m.categoryL1, categoryL2: m.categoryL2, prefecture: m.prefecture,
    city: m.city, postalCode: m.postalCode, address: m.address, website: m.website,
    founded: m.founded, size: m.size, description: m.description, imageUrls: m.imageUrls,
    featureText: m.featureText, hasLicense: m.hasLicense, licenseName: m.licenseName,
    equipmentText: m.equipmentText, salesAreaText: m.salesAreaText, logisticsText: m.logisticsText,
    foodlossText: m.foodlossText, challengeText: m.challengeText, collabStyle: m.collabStyle,
    startTiming: m.startTiming, completionRate: m.completionRate, status: m.status,
    paymentStatus: m.paymentStatus,
    users: m.users,
  }));

  const ROLE_LABEL: Record<string, string> = {
    TENANT_ADMIN: "統括管理者",
    ADMIN: "事務局管理者",
    REVIEWER: "審査担当",
  };
  const myUserId = su.app.id;

  const metrics = [
    { k: "承認済み会員", v: memberApproved },
    { k: "審査中の会員", v: pendingCount },
    { k: "公開中の台帳", v: offeringCount },
    { k: "掲載中プロジェクト", v: projectPublished },
    { k: "商談数", v: dealCount },
    { k: "成約（商品化）", v: dealClosed },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">ADMIN ・ 事務局ダッシュボード</p>
        <h1 className="font-serif text-[22px] text-[var(--ink)]">事務局管理</h1>
      </div>

      {/* 指標サマリ */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.k} className="rounded-[10px] border border-[var(--line)] bg-white p-4">
            <div className="text-[10px] text-[var(--muted)]">{m.k}</div>
            <div className="mt-1 font-serif text-[22px] text-[var(--ink)]">{m.v}</div>
          </div>
        ))}
      </div>

      {/* お知らせ投稿 */}
      <div>
        <h2 className="mb-2 text-[15px] font-semibold text-[var(--ink)]">お知らせを投稿（会員のトップに表示）</h2>
        <form action={createAnnouncement} className="flex flex-col gap-2 rounded-[10px] border border-[var(--line)] bg-white p-4">
          <input name="title" required placeholder="タイトル（例：宮崎カンファレンスの参加受付を開始しました）" className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]" />
          <textarea name="body" rows={4} placeholder="本文（ブログのように自由に書けます）" className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] leading-6 outline-none focus:border-[var(--green)]" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--ink-2)]">
              <input type="checkbox" name="pinned" /> 上部に固定（重要）
            </label>
            <button className="ml-auto rounded-md bg-[var(--green)] px-5 py-2 text-[13px] font-medium text-white hover:bg-[var(--green-d)]">投稿する</button>
          </div>
        </form>

        {announcements.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.pinned ? <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 text-[10px] text-[#B77F0B]">固定</span> : null}
                    <span className="truncate text-[14px] font-medium text-[var(--ink)]">{a.title}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {a.createdAt.getFullYear()}/{String(a.createdAt.getMonth() + 1).padStart(2, "0")}/{String(a.createdAt.getDate()).padStart(2, "0")}
                  </div>
                </div>
                <form action={deleteAnnouncement.bind(null, a.id)}>
                  <button className="text-[12px] text-[var(--red)] underline">削除</button>
                </form>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* バナー管理 */}
      <div>
        <h2 className="mb-1 text-[15px] font-semibold text-[var(--ink)]">バナー管理（会員トップに表示）</h2>
        <p className="mb-3 text-[12px] text-[var(--muted)]">
          バナー画像とリンク先URLを登録すると、ダッシュボードのお知らせの下に表示されます。
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
                  <button className="rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] hover:bg-[var(--canvas)]">
                    {b.active ? "非表示にする" : "表示する"}
                  </button>
                </form>
                <form action={deleteBanner.bind(null, b.id)}>
                  <button className="text-[12px] text-[var(--red)] underline">削除</button>
                </form>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 掲載承認 */}
      {pendingProjects.length > 0 ? (
        <div>
          <h2 className="mb-2 text-[15px] font-semibold text-[var(--ink)]">プロジェクト掲載の承認（{pendingProjects.length}）</h2>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {pendingProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
                <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)] hover:underline">
                  {p.title || "（無題）"}
                </Link>
                <span className="text-[12px] text-[var(--muted)]">{projNameMap.get(p.memberId)}</span>
                <form action={adminReviewProject.bind(null, p.id, true)}>
                  <button className="rounded-md bg-[var(--green)] px-3 py-1.5 text-[12px] text-white hover:bg-[var(--green-d)]">承認</button>
                </form>
                <form action={adminReviewProject.bind(null, p.id, false)}>
                  <button className="rounded-md border border-[var(--red)] px-3 py-1.5 text-[12px] text-[var(--red)] hover:bg-[var(--red-soft)]">差し戻し</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 会員管理 */}
      <div>
        <h2 className="mb-2 text-[15px] font-semibold text-[var(--ink)]">会員管理（審査中 {pendingCount} 件）</h2>
        <p className="mb-3 text-[12px] text-[var(--muted)]">会社名をクリックすると、詳細の確認・審査（承認/非承認/課金）・アカウントの停止や削除ができます。</p>
        <AdminTable rows={rows} />
      </div>

      {/* 管理者アカウント */}
      <div>
        <h2 className="mb-1 text-[15px] font-semibold text-[var(--ink)]">管理者アカウント</h2>
        <p className="mb-3 text-[12px] text-[var(--muted)]">
          事務局スタッフのログインアカウントをここで発行できます。作成すると、すぐに設定したメール・パスワードでログインできます。
        </p>

        <AdminAccountForm />

        <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
          {adminUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
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
                  <button className="text-[12px] text-[var(--red)] underline">権限解除</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
