import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { ProjectForm, type ProjectData } from "../../_components/ProjectForm";
import { submitProject, closeProject, deleteProject } from "../../actions";
import { btn } from "@/lib/ui";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.memberId !== me.id) notFound();

  const data: ProjectData = {
    id: project.id,
    title: project.title,
    body: project.body,
    fromRole: project.fromRole,
    toRole: project.toRole,
    budget: project.budget,
    tags: project.tags,
    imageUrls: project.imageUrls,
    bodyImageUrl: project.bodyImageUrl,
  };

  return (
    <div className="flex max-w-[720px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className="text-[12px] text-[var(--green-d)] underline">← 一覧</Link>
          <h1 className="mt-1 font-serif text-[20px] text-[var(--ink)]">プロジェクトの編集</h1>
        </div>
        <div className="flex items-center gap-2">
          {project.status === "draft" || project.status === "closed" ? (
            <form action={submitProject.bind(null, project.id)}>
              <button className={btn("primary", "sm")}>掲載を申請</button>
            </form>
          ) : project.status === "pending" ? (
            <span className="rounded-full bg-[#FAF0D6] px-3 py-1 text-[11px] text-[#B77F0B]">承認待ち</span>
          ) : (
            <>
              <span className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-[11px] text-[var(--green-d)]">掲載中</span>
              <form action={closeProject.bind(null, project.id)}>
                <button className={btn("secondary", "sm")}>終了する</button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <ProjectForm key={project.updatedAt.getTime()} project={data} />
      </div>

      <div className="flex items-center justify-between">
        {project.status === "published" ? (
          <Link href={`/projects/${project.id}`} className="text-[13px] text-[var(--green-d)] underline">掲載ページを見る →</Link>
        ) : <span />}
        <form action={deleteProject.bind(null, project.id)}>
          <button className={btn("danger", "sm")}>削除</button>
        </form>
      </div>
    </div>
  );
}
