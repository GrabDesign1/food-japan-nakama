import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { applyToProject } from "../actions";
import { btn, h1Cls, h2Cls } from "@/lib/ui";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const project = await prisma.project.findUnique({
    where: { id },
    include: { applications: true },
  });
  if (!project) notFound();
  const isOwner = project.memberId === me.id;
  if (project.status !== "published" && !isOwner) notFound();

  if (!isOwner) {
    await prisma.project.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  }

  const owner = await prisma.member.findUnique({
    where: { id: project.memberId },
    select: { id: true, name: true, avatarUrl: true, categoryL1: true, prefecture: true },
  });

  const myApplication = project.applications.find((a) => a.applicantMemberId === me.id);

  // 応募者名（オーナー向け）
  const applicantIds = project.applications.map((a) => a.applicantMemberId);
  const applicants = isOwner && applicantIds.length
    ? await prisma.member.findMany({ where: { id: { in: applicantIds } }, select: { id: true, name: true } })
    : [];
  const applicantMap = new Map(applicants.map((m) => [m.id, m.name]));

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/projects" className="text-[12px] text-[var(--green-d)] underline">← 一覧</Link>
        {isOwner ? (
          <Link href={`/projects/${project.id}/edit`} className={btn("secondary", "sm")}>編集する</Link>
        ) : null}
      </div>

      <div>
        {project.fromRole || project.toRole ? (
          <span className="rounded bg-[var(--green-soft)] px-2.5 py-1 text-[12px] text-[var(--green-d)]">
            {project.fromRole || "—"} → {project.toRole || "誰でも"}
          </span>
        ) : null}
        {project.budget ? (
          <span className="ml-2 rounded bg-[#FAF0D6] px-2.5 py-1 text-[12px] text-[#B77F0B]">
            予算：{project.budget}
          </span>
        ) : null}
        <h1 className={`${h1Cls} mt-2 leading-tight`}>{project.title || "（無題）"}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--ink-2)]">
          <span>{owner?.name}</span>
          {owner?.prefecture ? <span>📍 {owner.prefecture}</span> : null}
          <span className="text-[var(--muted)]">閲覧 {project.viewCount} ・ 応募 {project.applications.length}</span>
        </div>
        {project.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {project.tags.map((t) => <span key={t} className="rounded-full border border-[var(--line)] px-3 py-1 text-[12px] text-[var(--ink-2)]"># {t}</span>)}
          </div>
        ) : null}
      </div>

      {project.imageUrls[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={project.imageUrls[0]} alt="" className="max-h-[440px] w-full rounded-xl border border-[var(--line)] object-cover" />
      ) : null}

      {project.body ? (
        <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{project.body}</p>
      ) : null}

      {project.bodyImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={project.bodyImageUrl} alt="" className="max-h-[400px] w-full rounded-xl border border-[var(--line)] object-cover" />
      ) : null}

      {project.imageUrls.length > 1 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {project.imageUrls.slice(1).map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" className="aspect-square w-full rounded-lg border border-[var(--line)] object-cover" />
          ))}
        </div>
      ) : null}

      {/* 応募（非オーナー） */}
      {!isOwner && project.status === "published" ? (
        <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-5">
          {myApplication ? (
            <p className="text-[13px] text-[var(--green-d)]">応募済みです。相手からの連絡をお待ちください。</p>
          ) : (
            <form action={applyToProject.bind(null, project.id)} className="flex flex-col gap-2">
              <div className="text-[14px] font-semibold text-[var(--ink)]">このプロジェクトに応募する</div>
              <textarea name="message" rows={3} placeholder="意気込みや、提供できるもの・強みをお書きください。" className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]" />
              <button className={`${btn("primary")} w-fit`}>応募する</button>
            </form>
          )}
        </div>
      ) : null}

      {/* 応募者一覧（オーナー） */}
      {isOwner ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>応募（{project.applications.length}）</h2>
          {project.applications.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">まだ応募はありません。</p>
          ) : (
            <div className="flex flex-col gap-2">
              {project.applications.map((a) => (
                <div key={a.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
                  <Link href={`/producers/${a.applicantMemberId}`} className="text-[14px] font-medium text-[var(--ink)] hover:underline">
                    {applicantMap.get(a.applicantMemberId) ?? "（会員）"}
                  </Link>
                  {a.message ? <p className="mt-1 whitespace-pre-wrap text-[13px] text-[var(--ink-2)]">{a.message}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
