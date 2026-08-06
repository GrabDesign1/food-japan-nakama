import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createDraftProject } from "./actions";
import { ProjectCard } from "@/components/ProjectCard";

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
          <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">PROJECTS</p>
          <h1 className="font-serif text-[22px] text-[var(--ink)]">共創プロジェクトを企画する</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">困っていること・実現したいことを書いて、解決してくれる共創パートナーを募ります。</p>
        </div>
        <form action={createDraftProject}>
          <button className="rounded-md bg-[var(--green)] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[var(--green-d)]">
            ＋ 共創プロジェクトを企画する
          </button>
        </form>
      </div>

      {/* 掲載中のプロジェクト */}
      <div>
        <h2 className="mb-3 font-serif text-[18px] text-[var(--ink)]">掲載中のプロジェクト</h2>
        {published.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">まだ掲載中のプロジェクトはありません。</p>
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
        <h2 className="mb-3 font-serif text-[18px] text-[var(--ink)]">自分の掲載</h2>
        {mine.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">まだ掲載していません。「＋ プロジェクトを掲載」から作成できます。</p>
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
