// 事務局：会員管理（/adminから分離。審査・停止・削除・手動Premium化）。
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listReviewMembers } from "@/lib/member";
import { AdminTable, type AdminRow } from "../_components/AdminTable";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";

export default async function AdminMembersPage() {
  const su = await requireAdmin();
  const members = await listReviewMembers(su.app.tenantId);
  const pendingCount = members.filter((m) => m.status === "PENDING").length;

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={eyebrowCls}>ADMIN ・ MEMBERS</p>
          <h1 className={h1Cls}>会員管理（審査中 {pendingCount} 件）</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            会社名をクリックすると、詳細の確認・審査（承認/非承認）・アカウントの停止や削除ができます。
            承認すると、その会員に紹介クレジット3件が自動付与されます（組織単位で一度だけ）。
          </p>
        </div>
        <Link href="/admin" className={btn("secondary", "sm")}>← 事務局管理へ戻る</Link>
      </div>
      <AdminTable rows={rows} />
    </div>
  );
}
