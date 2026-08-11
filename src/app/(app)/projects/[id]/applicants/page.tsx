// 応募者管理（主催者のみ）。応募者ごとに5段階の進捗・次の行動・期限・担当・メモを管理する。
// 完了・見送り・保留は通常一覧から折りたたむ（指示書 §10）。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import {
  ApplicantProgressCard,
  type ApplicantData,
} from "../../_components/ApplicantProgressCard";
import { isActiveProgress, nextActionDueState } from "@/lib/project-taxonomy";
import { EmptyState } from "@/components/EmptyState";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

// JSTで日付・日時を整形（サーバーはUTCで動くため+9hしてUTC値として読む）
function jst(d: Date): Date {
  return new Date(d.getTime() + 9 * 3600 * 1000);
}
function fmtDate(d: Date): string {
  const j = jst(d);
  return `${j.getUTCMonth() + 1}月${j.getUTCDate()}日`;
}
function fmtDateTime(d: Date): string {
  const j = jst(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.getUTCMonth() + 1}月${j.getUTCDate()}日 ${p(j.getUTCHours())}:${p(j.getUTCMinutes())}`;
}
function toDateInput(d: Date | null): string | null {
  if (!d) return null;
  const j = jst(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.getUTCFullYear()}-${p(j.getUTCMonth() + 1)}-${p(j.getUTCDate())}`;
}
function toDateTimeInput(d: Date | null): string | null {
  if (!d) return null;
  const j = jst(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.getUTCFullYear()}-${p(j.getUTCMonth() + 1)}-${p(j.getUTCDate())}T${p(j.getUTCHours())}:${p(j.getUTCMinutes())}`;
}

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  applied: "興味の表明",
  stage_change: "段階の変更",
  next_action: "次の行動",
  assignee_change: "担当の変更",
  hold: "保留",
  declined: "見送り",
  done: "完了",
};

export default async function ProjectApplicantsPage({
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
      applications: {
        orderBy: { updatedAt: "desc" },
        include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
      },
    },
  });
  // 主催者のみ（応募者・第三者は404）
  if (!project || project.memberId !== me.id) notFound();

  const applicantIds = project.applications.map((a) => a.applicantMemberId);
  const members = applicantIds.length
    ? await prisma.member.findMany({
        where: { id: { in: applicantIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  // 既存のメッセージスレッド（会話への導線。二重のメッセージ機能は作らない）
  const threads = applicantIds.length
    ? await prisma.thread.findMany({
        where: {
          OR: [
            { fromMemberId: me.id, toMemberId: { in: applicantIds } },
            { toMemberId: me.id, fromMemberId: { in: applicantIds } },
          ],
        },
        orderBy: { lastMessageAt: "desc" },
        select: { id: true, fromMemberId: true, toMemberId: true },
      })
    : [];
  const threadByMember = new Map<string, string>();
  for (const t of threads) {
    const other = t.fromMemberId === me.id ? t.toMemberId : t.fromMemberId;
    if (!threadByMember.has(other)) threadByMember.set(other, t.id);
  }

  const toData = (a: (typeof project.applications)[number]): ApplicantData => ({
    applicationId: a.id,
    applicantMemberId: a.applicantMemberId,
    applicantName: nameMap.get(a.applicantMemberId) ?? "（会員）",
    appliedAt: fmtDate(a.createdAt),
    reason: a.reason,
    offer: a.offer,
    involvement: a.involvement,
    meetingWish: a.meetingWish,
    desiredRole: a.desiredRole,
    message: a.message,
    progressStage: a.progressStage,
    nextAction: a.nextAction,
    nextActionDue: toDateInput(a.nextActionDue),
    assignee: a.assignee,
    nextMeetingAt: toDateTimeInput(a.nextMeetingAt),
    ownerMemo: a.ownerMemo,
    holdReason: a.holdReason,
    updatedAt: fmtDate(a.updatedAt),
    threadId: threadByMember.get(a.applicantMemberId) ?? null,
    dueState: nextActionDueState(a.progressStage, a.nextActionDue),
    activities: a.activities.map((ac) => ({
      id: ac.id,
      label: `${ACTIVITY_TYPE_LABEL[ac.type] ?? ac.type}${ac.detail ? `：${ac.detail}` : ""}`,
      at: fmtDateTime(ac.createdAt),
    })),
  });

  const active = project.applications.filter((a) => isActiveProgress(a.progressStage));
  const closed = project.applications.filter((a) => !isActiveProgress(a.progressStage));

  // 期限超過 → 期限あり（近い順）→ 期限なし。同条件は更新の新しい順
  const dueRank = (a: (typeof project.applications)[number]) => {
    const s = nextActionDueState(a.progressStage, a.nextActionDue);
    return s === "overdue" ? 0 : a.nextActionDue ? 1 : 2;
  };
  active.sort(
    (a, b) =>
      dueRank(a) - dueRank(b) ||
      (a.nextActionDue?.getTime() ?? Infinity) - (b.nextActionDue?.getTime() ?? Infinity) ||
      b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div>
        <Link href={`/projects/${project.id}`} className="text-[12px] text-[var(--green-d)] underline">
          ← プロジェクトへ戻る
        </Link>
        <p className={`${eyebrowCls} mt-2`}>APPLICANTS</p>
        <h1 className={h1Cls}>応募者管理</h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          「{project.title || "（無題）"}」に興味を表明した相手を、5段階で管理できます。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={`/projects/${project.id}/edit`} className={btn("secondary", "sm")}>掲載内容を編集</Link>
          <Link
            href={`/consultation?type=project&project=${project.id}`}
            className={btn("secondary", "sm")}
          >
            事務局を交えて相談する
          </Link>
        </div>
      </div>

      {project.applications.length === 0 ? (
        <EmptyState
          title="まだ応募はありません"
          description="公開ページの内容を充実させると、興味を持つ相手が増えます。課題・提供できるもの・募集する役割を具体的に書いてみましょう。"
          actions={[{ label: "掲載内容を編集する", href: `/projects/${project.id}/edit` }]}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {active.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-6 text-[13px] text-[var(--muted)]">
                進行中の応募はありません。
              </p>
            ) : (
              active.map((a) => (
                <ApplicantProgressCard key={a.id} app={toData(a)} backHref={`/projects/${id}/applicants`} />
              ))
            )}
          </div>

          {closed.length ? (
            <details className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-3">
              <summary className={`${h2Cls} cursor-pointer`}>
                保留・見送り・完了（{closed.length}）
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                {closed.map((a) => (
                  <ApplicantProgressCard key={a.id} app={toData(a)} backHref={`/projects/${id}/applicants`} />
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}

      <p className="text-[11px] leading-5 text-[var(--muted)]">
        ※ 応募者名・メモ・進捗はこのプロジェクトの主催者だけが閲覧できます。段階の変更や見送りは各カードの「活動履歴」に記録されます。
      </p>
    </div>
  );
}
