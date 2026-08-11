import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eyebrowCls, h1Cls } from "@/lib/ui";
import { updateConsultationStatus } from "../consultation-actions";

const SERVICE_LABEL: Record<string, string> = {
  theme: "共創テーマ相談",
  produce: "共創プロデュース",
  "food-loss": "フードロス",
  crowdfunding: "クラファン支援",
  project: "共創PJ伴走",
  strategy_session: "商品・販路戦略セッション",
  channel_trial: "販路開拓トライアル",
  promotion_plan: "販促プラン",
  sales_growth: "販売強化プラン",
  solution_build: "売れる仕組み構築",
  success_fee: "販売成果報酬",
  co_creation: "共創・商品開発",
  unsure: "どちらか相談",
};
const STATUS_OPTIONS: [string, string][] = [
  ["new", "新規"], ["reviewing", "確認中"], ["contacted", "連絡済み"],
  ["proposed", "提案済み"], ["won", "受注"], ["lost", "見送り"],
];

export default async function AdminConsultationsPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  if (!isAdminRole(su.app.role)) redirect("/dashboard");

  const rows = await prisma.consultation.findMany({
    where: { tenantId: su.app.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrowCls}>ADMIN</p>
        <h1 className={h1Cls}>個別相談の管理</h1>
        <Link href="/admin" className="mt-1 inline-block text-[12px] text-[var(--green-d)] underline">← 事務局管理へ</Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
          相談はまだありません。
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((c) => (
            <div key={c.id} className="rounded-[10px] border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--green-d)]">
                  {SERVICE_LABEL[c.serviceType] ?? c.serviceType}
                </span>
                <span className="text-[13px] font-semibold text-[var(--ink)]">{c.company}</span>
                <span className="text-[12px] text-[var(--muted)]">{c.name}</span>
                <span className="text-[11px] text-[var(--muted)]">{c.refNo}</span>
                <span className="ml-auto text-[11px] text-[var(--muted)]">
                  {c.createdAt.getFullYear()}/{c.createdAt.getMonth() + 1}/{c.createdAt.getDate()}
                </span>
              </div>
              <div className="mt-2 grid gap-1 text-[12px] text-[var(--ink-2)] sm:grid-cols-2">
                <div>✉️ {c.email}{c.phone ? `／☎ ${c.phone}` : ""}</div>
                <div>{[c.area, c.industry].filter(Boolean).join("・")}</div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[var(--ink)]">
                <b>概要：</b>{c.productSummary}{"\n"}<b>課題：</b>{c.challenge}
                {c.desiredOutcome ? `\n成果：${c.desiredOutcome}` : ""}
                {c.desiredTiming ? `\n時期：${c.desiredTiming}` : ""}
                {c.budget ? `\n予算：${c.budget}` : ""}
              </div>
              <form action={async (fd: FormData) => { "use server"; await updateConsultationStatus(c.id, String(fd.get("status") ?? "")); }} className="mt-3 flex items-center gap-2">
                <select name="status" defaultValue={c.status} className="rounded-md border border-[var(--line)] px-2 py-1 text-[12px]">
                  {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="rounded-md bg-[var(--green)] px-3 py-1 text-[12px] font-medium text-white">更新</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
