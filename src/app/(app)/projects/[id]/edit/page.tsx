import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { ProjectForm, type ProjectData } from "../../_components/ProjectForm";
import { submitProject, closeProject, deleteProject } from "../../actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { missingForProjectPublish } from "@/lib/project-publish";
import { btn, h1Cls } from "@/lib/ui";

function toDateInput(d: Date | null): string | null {
  if (!d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function ProjectEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ missing?: string; created?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      roles: { orderBy: { sortOrder: "asc" } },
      resources: { orderBy: { sortOrder: "asc" } },
      _count: { select: { applications: true } },
    },
  });
  if (!project || project.memberId !== me.id) notFound();

  const data: ProjectData = {
    id: project.id,
    title: project.title,
    body: project.body,
    fromRole: project.fromRole,
    area: project.area,
    budget: project.budget,
    tags: project.tags,
    imageUrls: project.imageUrls,
    bodyImageUrl: project.bodyImageUrl,
    purposeMain: project.purposeMain,
    purposeSub: project.purposeSub,
    oneLiner: project.oneLiner,
    deadline: toDateInput(project.deadline),
    targetTiming: project.targetTiming,
    leaderName: project.leaderName,
    challengeIssue: project.challengeIssue,
    challengeWhy: project.challengeWhy,
    challengeWho: project.challengeWho,
    coCreationGoal: project.coCreationGoal,
    futureVision: project.futureVision,
    stage: project.stage,
    stageDone: project.stageDone,
    stageLearned: project.stageLearned,
    stageIssues: project.stageIssues,
    stageSchedule: project.stageSchedule,
    existingPartners: project.existingPartners,
    period: project.period,
    place: project.place,
    rewardPolicy: project.rewardPolicy,
    contractNote: project.contractNote,
    eventFlags: project.eventFlags,
    supportRequested: project.supportRequested,
    roles: project.roles.map((r) => ({
      name: r.name,
      request: r.request ?? "",
      requirement: r.requirement ?? "",
      headcount: r.headcount ?? "",
      period: r.period ?? "",
      reward: r.reward ?? "",
      isPublic: r.isPublic,
    })),
    resources: project.resources.map((r) => ({
      kind: r.kind,
      description: r.description ?? "",
      condition: r.condition ?? "",
    })),
  };

  return (
    <div className="flex max-w-[1100px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className={btn("secondary", "sm")}>← 一覧</Link>
          <h1 className={`${h1Cls} mt-1`}>プロジェクトの編集</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/applicants`} className={btn("secondary", "sm")}>
            応募者管理（{project._count.applications}）
          </Link>
          {project.status === "draft" || project.status === "closed" ? (
            <ConfirmActionButton
              action={submitProject.bind(null, project.id)}
              buttonLabel="掲載を申請"
              title="掲載を申請しますか？"
              description="事務局が内容を確認し、承認されると公開されます。必須項目が足りない場合は、不足している項目をご案内します。"
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

      {sp.created ? (
        <p className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[13px] text-[var(--green-d)]">
          下書きを保存しました。内容を確認できたら右上の「掲載を申請」から掲載できます（事務局の承認後に公開されます）。
        </p>
      ) : null}
      {/* 事務局からの差し戻し理由（再申請すると消える） */}
      {project.reviewNote && project.status === "draft" ? (
        <div className="rounded-[10px] border border-[#E7D9A6] bg-[#FFFBF0] px-4 py-3">
          <p className="text-[13px] font-bold text-[#7A5A0B]">事務局から差し戻しがありました。次の点を修正して、再度「掲載を申請」してください。</p>
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[var(--ink-2)]">{project.reviewNote}</p>
        </div>
      ) : null}
      {/* 掲載前チェック：URLのパラメータではなく、保存済みの現在値から毎回判定する（揃ったら消える） */}
      {sp.missing && (project.status === "draft" || project.status === "closed") ? (
        (() => {
          const missingNow = missingForProjectPublish({
            ...project,
            publicRoleCount: project.roles.filter((r) => r.isPublic).length,
          });
          return missingNow.length ? (
            <p className="rounded-[10px] border border-[#E7C7BE] bg-[#FBF1EE] px-4 py-3 text-[13px] leading-6 text-[var(--red)]">
              掲載を申請するには、次の項目の入力が必要です：<b>{missingNow.join("・")}</b>
              <span className="mt-1 block text-[12px] text-[var(--ink-2)]">
                入力したら「保存する」を押すと、この表示が更新されます。
              </span>
            </p>
          ) : (
            <p className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[13px] text-[var(--green-d)]">
              ✓ 必須項目がすべて入力されました。右上の「掲載を申請」から申請できます。
            </p>
          );
        })()
      ) : null}

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        {/* updatedAt を key にして、保存後に最新値で再表示する */}
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
