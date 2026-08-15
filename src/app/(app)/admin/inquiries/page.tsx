// 事務局：問い合わせ・応募の可視化。
// 注意：利用規約17条（通信の秘密）により、会員間メッセージの本文はここに表示しない（件数・日時などのメタ情報のみ）。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminNav } from "../_components/AdminNav";
import { eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

const APPLICATION_STATUS: Record<string, string> = {
  applied: "応募中",
  accepted: "承諾",
  declined: "見送り",
};

function fmt(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// レンダー内で Date.now() を直接呼ばないためのヘルパー（react-hooks/purity 対応）
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminInquiriesPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  if (!isAdminRole(su.app.role)) redirect("/dashboard");
  const tenantId = su.app.tenantId;

  const since30d = daysAgo(30);

  const [threads, applications, threadCount, messageCount30d] = await Promise.all([
    prisma.thread.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      include: { _count: { select: { messages: true } } },
    }),
    prisma.projectApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { project: { select: { id: true, title: true, memberId: true, tenantId: true } } },
    }),
    prisma.thread.count({ where: { tenantId } }),
    prisma.message.count({
      where: { thread: { tenantId }, createdAt: { gte: since30d } },
    }),
  ]);

  const apps = applications.filter((a) => a.project.tenantId === tenantId);

  // 表示用の会員名をまとめて取得
  const memberIds = new Set<string>();
  for (const t of threads) {
    memberIds.add(t.fromMemberId);
    memberIds.add(t.toMemberId);
  }
  for (const a of apps) {
    memberIds.add(a.applicantMemberId);
    memberIds.add(a.project.memberId);
  }
  const members = memberIds.size
    ? await prisma.member.findMany({
        where: { id: { in: Array.from(memberIds) } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  // スレッドに紐づく台帳タイトル
  const offeringIds = Array.from(new Set(threads.map((t) => t.offeringId).filter((v): v is string => !!v)));
  const offerings = offeringIds.length
    ? await prisma.offering.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true } })
    : [];
  const offeringMap = new Map(offerings.map((o) => [o.id, o.title]));

  const metrics = [
    { k: "問い合わせ（スレッド）", v: threadCount },
    { k: "メッセージ数（30日）", v: messageCount30d },
    { k: "プロジェクト応募", v: apps.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrowCls}>ADMIN</p>
        <h1 className={h1Cls}>問い合わせ・応募の状況</h1>
      </div>
      <AdminNav current="inquiries" />

      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.k} className="rounded-[10px] border border-[var(--line)] bg-white p-4">
            <div className="text-[10px] text-[var(--muted)]">{m.k}</div>
            <div className="mt-1 font-serif text-[22px] text-[var(--ink)]">{m.v}</div>
          </div>
        ))}
      </div>

      <p className="rounded-md bg-[var(--green-soft)] px-4 py-3 text-[12px] leading-relaxed text-[var(--ink-2)]">
        利用規約17条（通信の秘密）にもとづき、会員間メッセージの本文はここには表示されません。表示されるのは件数・日時などのメタ情報のみです。
      </p>

      {/* 問い合わせ（スレッド） */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>最近の問い合わせ（メッセージのやり取り）</h2>
        {threads.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
            まだ問い合わせはありません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {threads.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
                <span className="text-[13px] font-semibold text-[var(--ink)]">
                  {nameMap.get(t.fromMemberId) ?? "（不明）"}
                  <span className="mx-1 text-[var(--muted)]">→</span>
                  {nameMap.get(t.toMemberId) ?? "（不明）"}
                </span>
                {t.offeringId ? (
                  <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 text-[11px] text-[var(--green-d)]">
                    {offeringMap.get(t.offeringId) || "台帳"}
                  </span>
                ) : null}
                <span className="text-[12px] text-[var(--muted)]">{t._count.messages}通</span>
                <span className="ml-auto text-[11px] text-[var(--muted)]">{fmt(t.lastMessageAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* プロジェクト応募 */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>共創プロジェクトへの応募</h2>
        {apps.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
            まだ応募はありません。
          </p>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {apps.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
                <span className="text-[13px] font-semibold text-[var(--ink)]">
                  {nameMap.get(a.applicantMemberId) ?? "（不明）"}
                </span>
                <span className="text-[12px] text-[var(--muted)]">→</span>
                <Link href={`/projects/${a.project.id}`} className="text-[13px] text-[var(--green-d)] underline">
                  {a.project.title || "（無題）"}
                </Link>
                <span className="text-[12px] text-[var(--muted)]">
                  掲載者：{nameMap.get(a.project.memberId) ?? "（不明）"}
                </span>
                <span className="rounded bg-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]">
                  {APPLICATION_STATUS[a.status] ?? a.status}
                </span>
                <span className="ml-auto text-[11px] text-[var(--muted)]">{fmt(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
