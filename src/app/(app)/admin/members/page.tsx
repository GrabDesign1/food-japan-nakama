// 事務局：会員管理（/adminから分離。審査・停止・削除・手動でのビジネス会員化）。
import { requireAdmin } from "@/lib/auth";
import { listReviewMembers } from "@/lib/member";
import { prisma } from "@/lib/db";
import { AdminTable, type AdminRow } from "../_components/AdminTable";
import { AdminNav } from "../_components/AdminNav";
import { aEyebrow, aH1 } from "../_components/adminUi";

export default async function AdminMembersPage() {
  const su = await requireAdmin();
  const [members, withdrawals, jobs] = await Promise.all([
    listReviewMembers(su.app.tenantId),
    prisma.member.findMany({
      where: { tenantId: su.app.tenantId, withdrawalRequestedAt: { not: null } },
      select: {
        id: true,
        name: true,
        withdrawalRequestedAt: true,
        withdrawalReason: true,
        paymentStatus: true,
      },
      orderBy: { withdrawalRequestedAt: "asc" },
    }),
    // 直近の一括送信（送信は応答後に進むため、状況を画面で見えるようにする）
    prisma.emailJob.findMany({
      where: { tenantId: su.app.tenantId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        subject: true,
        kind: true,
        status: true,
        sentCount: true,
        failedCount: true,
        skippedCount: true,
        targets: true,
        createdAt: true,
        createdByName: true,
      },
    }),
  ]);
  const pendingCount = members.filter((m) => m.status === "PENDING").length;

  // 未提出（DRAFT）も一覧に出すようにしたため、審査中が下に埋もれないよう対応の優先度で並べ直す。
  // 同じ状態の中の並び（更新の新しい順）はクエリの orderBy のまま。
  const STATUS_ORDER = ["PENDING", "AWAITING_PAYMENT", "APPROVED", "DRAFT", "REJECTED", "SUSPENDED"];
  const sorted = [...members].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  const rows: AdminRow[] = sorted.map((m) => ({
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
    // 一覧の列（事務局CRMの項目。2026-08-16）
    crmDepartment: m.crmDepartment,
    crmPhone: m.crmPhone,
    crmTags: m.crmTags,
    crmMemo: m.crmMemo,
    createdAt: m.createdAt.toLocaleDateString("ja-JP"),
    optIn: m.users.some((u) => u.marketingOptInAt),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={aEyebrow}>ADMIN ・ MEMBERS</p>
          <h1 className={aH1}>会員管理（審査中 {pendingCount} 件）</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            会社名をクリックすると、詳細の確認・審査（承認/非承認）・アカウントの停止や削除ができます。
            承認すると、その会員に紹介クレジット3件が自動付与されます（組織単位で一度だけ）。
          </p>
        </div>
      </div>
      <AdminNav current="members" />
      {withdrawals.length > 0 ? (
        <section className="rounded-[10px] border-2 border-[var(--red)] bg-[var(--red-soft)] p-4">
          <h2 className="text-[14px] font-bold text-[var(--red)]">
            退会のお申し出（{withdrawals.length}件）
          </h2>
          <p className="mt-1 text-[12px] leading-6 text-[var(--ink-2)]">
            下の一覧で会社名を開き、ビジネス会員の解約状況を確認してから「完全に削除する」を実行してください。
            削除するとStorageの画像・添付ファイルもまとめて消えます。
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-[12px] text-[var(--ink)]">
            {withdrawals.map((w) => (
              <li key={w.id}>
                <b>{w.name || "（名称未設定）"}</b>
                <span className="ml-2 text-[var(--muted)]">
                  申請 {w.withdrawalRequestedAt?.toLocaleDateString("ja-JP")}
                </span>
                {w.paymentStatus === "PAID" ? (
                  <span className="ml-2 rounded bg-white px-2 py-0.5 text-[10px] font-bold text-[var(--gold-d)]">
                    ビジネス会員 課金中（先に解約が必要）
                  </span>
                ) : null}
                {w.withdrawalReason ? (
                  <span className="ml-2 text-[var(--ink-2)]">理由：{w.withdrawalReason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {jobs.length > 0 ? (
        <section className="rounded-[6px] border border-[#E3E6E8] bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E3E6E8] px-4 py-2.5">
            <h2 className="text-[14px] font-bold text-[var(--ink)]">直近の一括送信</h2>
            <span className="text-[12px] leading-6 text-[var(--muted)]">
              送信は画面を閉じても進みます。件数は自動では更新されないので、確認するときは再読み込みしてください。
            </span>
          </div>
          <div>
            {jobs.map((j) => {
              const total = Array.isArray(j.targets) ? j.targets.length : 0;
              return (
                <div
                  key={j.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#EDF0F2] px-4 py-2.5 text-[12px] last:border-0"
                >
                  <span className="text-[var(--muted)]">{j.createdAt.toLocaleString("ja-JP")}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">{j.subject}</span>
                  <span className="text-[var(--ink-2)]">{j.kind === "ad" ? "広告あり" : "利用案内"}</span>
                  <span className="text-[var(--ink-2)]">
                    {j.sentCount}/{total}件
                    {j.failedCount > 0 ? `（失敗${j.failedCount}）` : ""}
                    {j.skippedCount > 0 ? `（対象外${j.skippedCount}）` : ""}
                  </span>
                  <span
                    className={
                      j.status === "done"
                        ? "rounded bg-[var(--green-soft)] px-1.5 py-0.5 font-bold text-[var(--green-d)]"
                        : "rounded bg-[var(--amber-soft)] px-1.5 py-0.5 font-bold text-[var(--amber-ink)]"
                    }
                  >
                    {j.status === "done" ? "完了" : "送信中"}
                  </span>
                  <span className="text-[var(--muted)]">{j.createdByName}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <AdminTable rows={rows} />
    </div>
  );
}
