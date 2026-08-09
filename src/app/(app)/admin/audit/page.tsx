// 事務局：監査ログ（重要操作の記録）。追記専用・削除UIなし。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eyebrowCls, h1Cls } from "@/lib/ui";

const ACTION_LABEL: Record<string, string> = {
  "member.review.approve": "会員審査：承認",
  "member.review.reject": "会員審査：非承認",
  "member.review.require_payment": "会員審査：課金してもらう",
  "member.mark_paid": "手動で課金済みにする",
  "member.unmark_paid": "課金を解除",
  "member.suspend": "アカウント停止",
  "member.reactivate": "停止を解除",
  "member.delete": "会員を完全削除",
  "admin.create": "管理者アカウント作成",
  "admin.revoke": "管理者権限を解除",
  "project.approve": "プロジェクト掲載を承認",
  "project.send_back": "プロジェクト掲載を差し戻し",
  "project.unpublish": "プロジェクトを非公開化",
  "offering.unpublish": "台帳を非公開化",
};

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function AdminAuditPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  if (!isAdminRole(su.app.role)) redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: su.app.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrowCls}>ADMIN</p>
        <h1 className={h1Cls}>監査ログ</h1>
        <Link href="/admin" className="mt-1 inline-block text-[12px] text-[var(--green-d)] underline">← 事務局管理へ</Link>
        <p className="mt-2 text-[13px] text-[var(--ink-2)]">
          事務局の重要操作（審査・停止・削除・課金・権限変更・掲載の承認/非公開化）の記録です。直近200件を表示します。
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
          まだ記録はありません。
        </p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#EDF0EA] px-4 py-2.5 text-[12px] last:border-0">
              <span className="text-[var(--muted)]">{fmt(l.createdAt)}</span>
              <span className="font-medium text-[var(--ink)]">{ACTION_LABEL[l.action] ?? l.action}</span>
              {l.targetId ? <span className="text-[var(--muted)]">{l.targetType}:{l.targetId}</span> : null}
              {l.detail ? <span className="text-[var(--ink-2)]">{l.detail}</span> : null}
              <span className="ml-auto text-[var(--muted)]">{l.actorEmail ?? l.actorUserId}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
