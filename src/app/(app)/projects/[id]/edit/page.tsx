import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { ProjectForm, type ProjectData } from "../../_components/ProjectForm";
import { submitProject, closeProject, deleteProject } from "../../actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { btn, h1Cls } from "@/lib/ui";

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
    area: project.area,
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
          <h1 className={`${h1Cls} mt-1`}>プロジェクトの編集</h1>
        </div>
        <div className="flex items-center gap-2">
          {project.status === "draft" || project.status === "closed" ? (
            <ConfirmActionButton
              action={submitProject.bind(null, project.id)}
              buttonLabel="掲載を申請"
              title="掲載を申請しますか？"
              description="事務局が内容を確認し、承認されると公開されます。"
              confirmLabel="申請する"
              cancelLabel="今はしない"
            />
          ) : project.status === "pending" ? (
            <span className="rounded-full bg-[#FAF0D6] px-3 py-1 text-[11px] text-[#B77F0B]">承認待ち</span>
          ) : (
            <>
              <span className="flex items-center gap-2 rounded-full bg-[#F59E0B] px-4 py-2 text-[14px] font-bold text-white shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                掲載中
              </span>
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
        <ConfirmDeleteButton
          action={deleteProject.bind(null, project.id)}
          buttonLabel="削除"
          buttonClassName={btn("danger", "sm")}
          title="本当に削除しますか？"
          description={`「${project.title || "（無題）"}」と写真・応募がすべて削除されます。この操作は元に戻せません。`}
        />
      </div>
    </div>
  );
}
