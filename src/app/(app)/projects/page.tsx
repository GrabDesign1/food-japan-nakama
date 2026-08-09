import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createDraftProject } from "./actions";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { PendingButton } from "@/components/PendingButton";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "下書き", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
  pending: { label: "承認待ち", cls: "bg-[#FAF0D6] text-[#B77F0B]" },
  published: { label: "掲載中", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  closed: { label: "終了", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
};

export default async function ProjectsPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const published = await prisma.project.findMany({
    where: { tenantId: su.app.tenantId, status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  const memberIds = Array.from(new Set(published.map((p) => p.memberId)));
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  const mine = await prisma.project.findMany({
    where: { memberId: me.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className={eyebrowCls}>PROJECTS</p>
          <h1 className={h1Cls}>共創プロジェクトを企画する</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">困っていること・実現したいことを書いて、解決してくれる共創パートナーを募ります。</p>
        </div>
        <form action={createDraftProject}>
          <PendingButton className={btn("primary")} pendingText="作成中…">
            ＋ 共創プロジェクトを企画する
          </PendingButton>
        </form>
      </div>

      {/* 掲載中のプロジェクト */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>掲載中のプロジェクト</h2>
        {published.length === 0 ? (
          <EmptyState
            title="掲載中のプロジェクトはまだありません"
            description="最初の1件を掲載してみませんか。困っていること・実現したいことを書くだけで、共創パートナー候補に届きます。"
            actions={[{ label: "持ち寄り（売りたい・買いたい）から探す", href: "/search" }]}
          >
            <form action={createDraftProject}>
              <PendingButton className={btn("primary", "sm")} pendingText="作成中…">＋ 共創プロジェクトを企画する</PendingButton>
            </form>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {published.map((p) => (
              <ProjectCard
                key={p.id}
                p={{ id: p.id, title: p.title, imageUrls: p.imageUrls, memberName: nameMap.get(p.memberId), budget: p.budget }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 自分の掲載 */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>自分の掲載</h2>
        {mine.length === 0 ? (
          <EmptyState
            compact
            title="まだ掲載していません"
            description="「＋ 共創プロジェクトを企画する」から下書きを作成できます。掲載は事務局の承認後に公開されます。"
          >
            <form action={createDraftProject}>
              <PendingButton className={btn("primary", "sm")} pendingText="作成中…">＋ 共創プロジェクトを企画する</PendingButton>
            </form>
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {mine.map((p) => {
              const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
              return (
                <div key={p.id} className="flex items-center gap-3 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${s.cls}`}>{s.label}</span>
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)] hover:underline">
                    {p.title || "（無題）"}
                  </Link>
                  <span className="text-[12px] text-[var(--muted)]">応募 {p._count.applications}</span>
                  <Link href={`/projects/${p.id}/edit`} className="text-[12px] text-[var(--green-d)] underline">編集</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
