// 共創プロジェクトの公開詳細ページ（指示書 §7 の並び）。
// 旧データ（新項目がnull）の場合はセクションを非表示にし、body をフォールバック表示する。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { toggleFavorite } from "../../favorites/actions";
import { adminApproveProject } from "../actions";
import { InterestForm } from "../_components/InterestForm";
import { SendBackButton } from "../_components/SendBackButton";
import {
  PURPOSE_LABEL,
  STAGE_LABEL,
  RESOURCE_KIND_LABEL,
  REWARD_POLICY_LABEL,
  EVENT_FLAG_LABEL,
  PROGRESS_LABEL,
  formatProjectDeadline,
  isProjectDeadlinePassed,
} from "@/lib/project-taxonomy";
import { btn, h1Cls, h2Cls } from "@/lib/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className={`${h2Cls} mb-2`}>{title}</h2>
      {children}
    </div>
  );
}

function Para({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{text}</p>;
}

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
    include: {
      applications: true,
      roles: { where: { isPublic: true }, orderBy: { sortOrder: "asc" } },
      resources: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!project) notFound();
  const isOwner = project.memberId === me.id;
  // 事務局（同一テナントの管理者）は掲載承認のため公開前でも閲覧できる
  const isAdmin = isAdminRole(su.app.role) && project.tenantId === su.app.tenantId;
  if (project.status !== "published" && !isOwner && !isAdmin) notFound();

  // 閲覧数の加算・掲載者情報・お気に入り状態は互いに独立なので並列で実行（直列3往復→1往復）
  const [, owner, myFavorite] = await Promise.all([
    !isOwner && !isAdmin
      ? prisma.project.update({ where: { id }, data: { viewCount: { increment: 1 } } })
      : Promise.resolve(null),
    prisma.member.findUnique({
      where: { id: project.memberId },
      select: { id: true, name: true, avatarUrl: true, categoryL1: true, prefecture: true, companyLogoUrl: true },
    }),
    // お気に入り状態（非オーナーのみ）
    !isOwner
      ? prisma.favorite.findUnique({
          where: {
            memberId_targetType_targetId: { memberId: me.id, targetType: "project", targetId: project.id },
          },
        })
      : Promise.resolve(null),
  ]);

  const myApplication = project.applications.find((a) => a.applicantMemberId === me.id);
  const deadlinePassed = isProjectDeadlinePassed(project.deadline);
  const isOpen = project.status === "published" && !deadlinePassed;

  const roleNames = project.roles.map((r) => r.name);
  const hasConditions =
    project.area || project.period || project.place || project.budget || project.rewardPolicy || project.contractNote || project.targetTiming;
  const conditionRows: [string, string | null][] = [
    ["実施地域", project.area],
    ["実施期間", project.period],
    ["実施場所", project.place],
    ["目標時期", project.targetTiming],
    ["予算", project.budget],
    ["報酬・費用負担・売上分配", project.rewardPolicy ? REWARD_POLICY_LABEL[project.rewardPolicy] ?? null : null],
    ["契約・秘密保持", project.contractNote],
    ["募集期限", formatProjectDeadline(project.deadline)],
  ];

  const interestCta = isOwner ? null : isOpen ? (
    <div className="flex flex-wrap items-center gap-3">
      <a href="#interest" className={btn("primary")}>
        興味があります
      </a>
      <Link
        href={`/consultation?type=project&project=${project.id}`}
        className={btn("secondary")}
      >
        事務局を交えて相談する
      </Link>
    </div>
  ) : (
    <p className="w-fit rounded-[10px] bg-[var(--line)] px-4 py-3 text-[13px] text-[var(--ink-2)]">
      {project.status === "closed"
        ? "このプロジェクトの募集は終了しました。"
        : deadlinePassed
          ? "募集期限を過ぎたため、現在は応募を受け付けていません。"
          : "現在は応募を受け付けていません。"}
    </p>
  );

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      {/* 事務局向け：承認待ちの内容確認と承認・差し戻し */}
      {isAdmin && project.status === "pending" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#E7D9A6] bg-[#FFFBF0] px-4 py-3">
          <span className="text-[13px] font-bold text-[#7A5A0B]">
            承認待ちのプロジェクトです。内容を確認して承認・差し戻しをしてください。
          </span>
          <div className="ml-auto flex items-center gap-2">
            <form action={adminApproveProject.bind(null, project.id)}>
              <button className={btn("primary", "sm")}>承認</button>
            </form>
            <SendBackButton projectId={project.id} projectTitle={project.title} />
          </div>
        </div>
      ) : null}
      {isAdmin && !isOwner && project.status !== "published" && project.status !== "pending" ? (
        <p className="rounded-[10px] bg-[var(--line)] px-4 py-2.5 text-[12px] text-[var(--ink-2)]">
          事務局として閲覧しています（この案件は{project.status === "draft" ? "下書き" : "終了"}のため、会員には表示されません）。
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Link href="/projects" className="text-[12px] text-[var(--green-d)] underline">← 一覧</Link>
        {isOwner ? (
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/applicants`} className={btn("secondary", "sm")}>
              応募者管理（{project.applications.length}）
            </Link>
            <Link href={`/projects/${project.id}/edit`} className={btn("secondary", "sm")}>編集する</Link>
          </div>
        ) : project.status === "published" ? (
          <form action={toggleFavorite.bind(null, "project", project.id)}>
            <button className={btn("secondary", "sm")}>
              {myFavorite ? "★ お気に入り済み" : "☆ お気に入りに追加"}
            </button>
          </form>
        ) : null}
      </div>

      {/* 1. メイン画像・タイトル・一言目的 */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[var(--green)] px-2.5 py-1 text-[11px] font-bold text-white">
            共創プロジェクト
          </span>
          {project.purposeMain ? (
            <span className="rounded bg-[var(--green-soft)] px-2.5 py-1 text-[12px] text-[var(--green-d)]">
              {PURPOSE_LABEL[project.purposeMain]}
            </span>
          ) : null}
          {project.stage ? (
            <span className="rounded bg-[#EEF2FA] px-2.5 py-1 text-[12px] text-[#3C4A62]">
              現在の段階：{STAGE_LABEL[project.stage]}
            </span>
          ) : null}
          {project.supportOfficial ? (
            <span className="rounded bg-[#FAF0D6] px-2.5 py-1 text-[12px] font-bold text-[#B77F0B]">
              事務局伴走中
            </span>
          ) : null}
        </div>
        <h1 className={`${h1Cls} mt-2 leading-tight`}>{project.title || "（無題）"}</h1>
        {project.oneLiner ? (
          <p className="mt-1 text-[15px] leading-7 text-[var(--ink-2)]">{project.oneLiner}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--ink-2)]">
          <span>{owner?.name}</span>
          {project.area ? <span>📍 {project.area}</span> : owner?.prefecture ? <span>📍 {owner.prefecture}</span> : null}
          {project.deadline ? (
            <span className={deadlinePassed ? "text-[var(--red)]" : "text-[#B77F0B]"}>
              ⏳ 募集期限 {formatProjectDeadline(project.deadline)}
            </span>
          ) : null}
          <span className="text-[var(--muted)]">閲覧 {project.viewCount} ・ 興味あり {project.applications.length}</span>
        </div>
        {/* FJS連携ラベル（控えめ表示） */}
        {project.eventFlags.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.eventFlags.map((f) => (
              <span key={f} className="rounded-full border border-[#E7D9A6] bg-[#FFFBF0] px-2.5 py-0.5 text-[11px] text-[#7A5A0B]">
                {EVENT_FLAG_LABEL[f] ?? f}
              </span>
            ))}
          </div>
        ) : null}
        {project.tags.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {project.tags.map((t) => (
              <span key={t} className="rounded-full border border-[var(--line)] px-3 py-1 text-[12px] text-[var(--ink-2)]"># {t}</span>
            ))}
          </div>
        ) : null}
      </div>

      {project.imageUrls[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={project.imageUrls[0]} alt="" className="max-h-[440px] w-full rounded-xl border border-[var(--line)] object-cover" />
      ) : null}

      {/* 3-4. CTA */}
      {interestCta}

      {/* 5. 何を実現するプロジェクトか */}
      {project.coCreationGoal ? (
        <Section title="何を実現するプロジェクトか">
          <Para text={project.coCreationGoal} />
        </Section>
      ) : null}

      {/* 6. なぜ取り組むのか・背景にある課題 */}
      {project.challengeIssue || project.challengeWhy || project.challengeWho ? (
        <Section title="なぜ取り組むのか・背景にある課題">
          <div className="flex flex-col gap-3">
            {project.challengeIssue ? (
              <div className="rounded-[10px] border border-[#E7D9A6] bg-[#FFFBF0] p-4">
                <div className="text-[12px] font-bold text-[#7A5A0B]">いま起きている課題</div>
                <p className="mt-1 whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{project.challengeIssue}</p>
              </div>
            ) : null}
            {project.challengeWhy ? (
              <div>
                <div className="text-[12px] font-bold text-[var(--muted)]">なぜ解決したいのか</div>
                <Para text={project.challengeWhy} />
              </div>
            ) : null}
            {project.challengeWho ? (
              <div>
                <div className="text-[12px] font-bold text-[var(--muted)]">誰に、どのような影響があるか</div>
                <Para text={project.challengeWho} />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* 旧データのフォールバック（新項目が無い場合は従来の本文を表示） */}
      {!project.coCreationGoal && !project.challengeIssue && project.body ? (
        <Para text={project.body} />
      ) : null}

      {/* 7. 現在どこまで進んでいるか */}
      {project.stage || project.stageDone || project.stageLearned || project.stageIssues || project.stageSchedule || project.existingPartners ? (
        <Section title="現在どこまで進んでいるか">
          <div className="flex flex-col gap-3">
            {project.stage ? (
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="rounded-full bg-[var(--green-soft)] px-3 py-1 font-bold text-[var(--green-d)]">
                  {STAGE_LABEL[project.stage]}
                </span>
              </div>
            ) : null}
            {(
              [
                ["これまでに取り組んだこと", project.stageDone],
                ["分かっていること・検証できたこと", project.stageLearned],
                ["未解決の論点", project.stageIssues],
                ["目標スケジュール", project.stageSchedule],
                ["既存の参加者・協力者", project.existingPartners],
              ] as [string, string | null][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <div className="text-[12px] font-bold text-[var(--muted)]">{k}</div>
                  <Para text={v} />
                </div>
              ))}
          </div>
        </Section>
      ) : null}

      {/* 8. 主催者が提供できるもの */}
      {project.resources.length ? (
        <Section title="主催者が提供できるもの">
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {project.resources.map((r) => (
              <div key={r.id} className="flex flex-col gap-0.5 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
                <div className="text-[13px] font-bold text-[var(--ink)]">
                  ✓ {RESOURCE_KIND_LABEL[r.kind] ?? r.kind}
                </div>
                {r.description ? <div className="text-[13px] text-[var(--ink-2)]">{r.description}</div> : null}
                {r.condition ? <div className="text-[12px] text-[var(--muted)]">提供条件：{r.condition}</div> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* 9. 募集する相手・具体的な役割 */}
      {project.roles.length ? (
        <Section title="募集する相手・具体的な役割">
          <div className="flex flex-col gap-3">
            {project.roles.map((r) => (
              <div key={r.id} className="rounded-[10px] border border-[var(--green)] bg-white p-4">
                <div className="text-[14px] font-bold text-[var(--green-d)]">👤 {r.name}</div>
                {r.request ? (
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-[var(--ink-2)]">{r.request}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
                  {r.requirement ? <span>条件：{r.requirement}</span> : null}
                  {r.headcount ? <span>募集数：{r.headcount}</span> : null}
                  {r.period ? <span>時期・期間：{r.period}</span> : null}
                  {r.reward ? <span>費用・報酬：{r.reward}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* 10. 参加することで生まれる価値 */}
      {project.futureVision ? (
        <Section title="事業化した先に目指す状態">
          <Para text={project.futureVision} />
        </Section>
      ) : null}

      {/* 11. 実施地域・期間・費用条件 */}
      {hasConditions || project.deadline ? (
        <Section title="実施地域・期間・費用条件">
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            <table className="w-full text-[13px]">
              <tbody>
                {conditionRows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k} className="border-b border-[#EDF0EA] last:border-0">
                      <th className="w-[38%] bg-[#FAFBF9] px-4 py-2.5 text-left font-medium text-[var(--muted)]">{k}</th>
                      <td className="px-4 py-2.5 text-[var(--ink)]">{v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {/* 13. 主催企業・責任者 */}
      <Section title="主催企業">
        <div className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-white p-4">
          {owner?.companyLogoUrl || owner?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(owner.companyLogoUrl || owner.avatarUrl) as string}
              alt=""
              className="h-12 w-12 rounded-full border border-[var(--line)] object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--green-soft)] text-[18px]">🏢</span>
          )}
          <div className="min-w-0">
            <Link href={`/producers/${project.memberId}`} className="text-[14px] font-bold text-[var(--ink)] hover:underline">
              {owner?.name}
            </Link>
            <div className="text-[12px] text-[var(--muted)]">
              {[owner?.categoryL1, owner?.prefecture].filter(Boolean).join(" ・ ")}
              {project.leaderName ? ` ・ 責任者：${project.leaderName}` : ""}
            </div>
          </div>
        </div>
      </Section>

      {/* 14. 関連画像 */}
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

      {/* 15. CTA再掲（興味がありますフォーム） */}
      {!isOwner && isOpen ? (
        <div id="interest" className="scroll-mt-24 rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-5">
          {myApplication ? (
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-bold text-[var(--green-d)]">
                興味を伝えています（現在の状態：{PROGRESS_LABEL[myApplication.progressStage] ?? "問い合わせ・応募"}）
              </p>
              <p className="text-[12px] text-[var(--ink-2)]">
                主催者からの連絡をお待ちください。メッセージのやり取りは
                <Link href="/messages" className="mx-1 underline">メッセージ</Link>
                から確認できます。
              </p>
            </div>
          ) : (
            <InterestForm projectId={project.id} roleNames={roleNames} />
          )}
        </div>
      ) : null}
    </div>
  );
}
