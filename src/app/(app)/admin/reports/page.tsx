// 事務局：違反報告の一覧と対応状況の更新（上位管理者のみ）。
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateViolationReport } from "../../report/actions";
import { VIOLATION_KIND_LABEL, VIOLATION_STATUS_LABEL } from "@/lib/violation";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";

const TYPE_LABEL: Record<string, string> = {
  member: "事業者",
  offering: "案件",
  thread: "やり取り",
};

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function AdminReportsPage() {
  const su = await requireSuperAdmin();
  const reports = await prisma.violationReport.findMany({
    where: { tenantId: su.app.tenantId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const memberIds = Array.from(new Set(reports.map((r) => r.reporterMemberId)));
  const members = memberIds.length
    ? await prisma.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const newCount = reports.filter((r) => r.status === "new").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={eyebrowCls}>ADMIN ・ REPORTS</p>
          <h1 className={h1Cls}>違反報告（新規 {newCount} 件）</h1>
          <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
            会員から届いた報告です。内容を確認し、必要に応じて掲載の非公開化・会員の停止などを行ってください。
            報告者への個別回答は行わない運用です（報告フォームにもその旨を明記しています）。
          </p>
        </div>
        <Link href="/admin" className={btn("secondary", "sm")}>← 事務局管理へ戻る</Link>
      </div>

      {reports.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-8 text-center text-[13px] text-[var(--muted)]">
          違反報告はまだありません。
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`rounded-[10px] border bg-white p-4 ${
                r.status === "new" ? "border-2 border-[var(--red)]" : "border-[var(--line)]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    r.status === "new"
                      ? "bg-[var(--red-soft)] text-[var(--red)]"
                      : "bg-[var(--line)] text-[var(--ink-2)]"
                  }`}
                >
                  {VIOLATION_STATUS_LABEL[r.status] ?? r.status}
                </span>
                <span className="text-[14px] font-bold text-[var(--ink)]">
                  {VIOLATION_KIND_LABEL[r.kind] ?? r.kind}
                </span>
                <span className="text-[11px] text-[var(--muted)]">{fmt(r.createdAt)}</span>
              </div>

              <div className="mt-1 text-[12px] text-[var(--ink-2)]">
                報告者：{nameById.get(r.reporterMemberId) || "（名称未設定）"}　/　
                対象：{TYPE_LABEL[r.targetType] ?? r.targetType}
                {r.targetType === "offering" ? (
                  <Link href={`/ledger/${r.targetId}`} className="ml-1 text-[var(--green-d)] underline">
                    案件を開く
                  </Link>
                ) : r.targetType === "member" ? (
                  <Link href={`/producers/${r.targetId}`} className="ml-1 text-[var(--green-d)] underline">
                    事業者を開く
                  </Link>
                ) : (
                  <span className="ml-1 text-[var(--muted)]">
                    （やり取りの本文は規約17条により事務局も閲覧しません。ID：{r.targetId}）
                  </span>
                )}
              </div>

              {r.detail ? (
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-[var(--canvas)] p-3 text-[13px] leading-6 text-[var(--ink-2)]">
                  {r.detail}
                </p>
              ) : null}

              <form action={updateViolationReport.bind(null, r.id)} className="mt-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
                  対応状況
                  <select
                    name="status"
                    defaultValue={r.status}
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[13px]"
                  >
                    {Object.entries(VIOLATION_STATUS_LABEL).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1 text-[11px] text-[var(--muted)]">
                  事務局メモ
                  <input
                    name="adminNote"
                    defaultValue={r.adminNote ?? ""}
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-[13px]"
                  />
                </label>
                <button className={btn("primary", "sm")}>保存</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
