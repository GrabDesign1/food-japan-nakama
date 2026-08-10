// 事務局：掲載の監視（事後チェック）。公開中の台帳・プロジェクトを一覧し、必要なら理由つきで非公開化する。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";
import { adminUnpublishOffering, adminUnpublishProject } from "../listing-actions";

function fmt(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const inputCls =
  "min-w-[220px] flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

export default async function AdminListingsPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  if (!isAdminRole(su.app.role)) redirect("/dashboard");
  const tenantId = su.app.tenantId;

  const [offerings, projects] = await Promise.all([
    prisma.offering.findMany({
      where: { isPublic: true, title: { not: "" }, member: { tenantId } },
      orderBy: { updatedAt: "desc" },
      include: { member: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { tenantId, status: "published" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const projMemberIds = Array.from(new Set(projects.map((p) => p.memberId)));
  const projMembers = projMemberIds.length
    ? await prisma.member.findMany({ where: { id: { in: projMemberIds } }, select: { id: true, name: true } })
    : [];
  const projNameMap = new Map(projMembers.map((m) => [m.id, m.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrowCls}>ADMIN</p>
        <h1 className={h1Cls}>掲載の監視（事後チェック）</h1>
        <Link href="/admin" className="mt-1 inline-block text-[12px] text-[var(--green-d)] underline">← 事務局管理へ</Link>
        <p className="mt-2 text-[13px] text-[var(--ink-2)]">
          掲載は即時公開です。問題のある掲載は、ここから理由を添えて非公開にできます（掲載者へ自動でメール通知されます）。
        </p>
      </div>

      {/* 台帳 */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>公開中の台帳（売りたい・探している）（{offerings.length}）</h2>
        {offerings.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
            公開中の台帳はありません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {offerings.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold text-white ${o.direction === "GIVE" ? "bg-[var(--green)]" : "bg-[#B77F0B]"}`}>
                  {o.direction === "GIVE" ? "売りたい" : "探している"}
                </span>
                <Link href={`/ledger/${o.id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink)] hover:underline">
                  {o.title}
                </Link>
                <span className="text-[12px] text-[var(--muted)]">{o.member.name}</span>
                <span className="text-[11px] text-[var(--muted)]">{fmt(o.updatedAt)}</span>
                <form action={adminUnpublishOffering.bind(null, o.id)} className="flex w-full items-center gap-2 sm:w-auto">
                  <input name="reason" placeholder="非公開にする理由（掲載者へ通知）" className={inputCls} />
                  <button className="whitespace-nowrap rounded-md border border-[#E8341F] px-3 py-1.5 text-[12px] text-[#E8341F]">
                    非公開にする
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* プロジェクト */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>掲載中の共創プロジェクト（{projects.length}）</h2>
        {projects.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
            掲載中のプロジェクトはありません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {projects.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
                <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink)] hover:underline">
                  {p.title || "（無題）"}
                </Link>
                <span className="text-[12px] text-[var(--muted)]">{projNameMap.get(p.memberId) ?? "（不明）"}</span>
                <span className="text-[11px] text-[var(--muted)]">{fmt(p.updatedAt)}</span>
                <form action={adminUnpublishProject.bind(null, p.id)} className="flex w-full items-center gap-2 sm:w-auto">
                  <input name="reason" placeholder="非公開にする理由（掲載者へ通知）" className={inputCls} />
                  <button className="whitespace-nowrap rounded-md border border-[#E8341F] px-3 py-1.5 text-[12px] text-[#E8341F]">
                    非公開にする
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
