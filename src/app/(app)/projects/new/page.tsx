// 共創プロジェクトの新規登録。画面を開くだけではDBレコードを作らない（初回保存時に作成）。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { ProjectForm, type ProjectData } from "../_components/ProjectForm";
import { btn, h1Cls } from "@/lib/ui";

export default async function NewProjectPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const empty: ProjectData = {
    id: null,
    title: "",
    body: null,
    fromRole: null,
    area: null,
    budget: null,
    tags: [],
    imageUrls: [],
    bodyImageUrl: null,
    purposeMain: null,
    purposeSub: [],
    oneLiner: null,
    deadline: null,
    targetTiming: null,
    leaderName: null,
    challengeIssue: null,
    challengeWhy: null,
    challengeWho: null,
    coCreationGoal: null,
    futureVision: null,
    stage: null,
    stageDone: null,
    stageLearned: null,
    stageIssues: null,
    stageSchedule: null,
    existingPartners: null,
    period: null,
    place: null,
    rewardPolicy: null,
    contractNote: null,
    eventFlags: [],
    supportRequested: false,
    roles: [],
    resources: [],
  };

  return (
    <div className="flex max-w-[1100px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className={btn("secondary", "sm")}>
            ← 一覧
          </Link>
          <h1 className={`${h1Cls} mt-1`}>新しいプロジェクトを始める</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            構想を公開し、必要な仲間を集めて、実証・事業化まで進めましょう。保存すると下書きが作成されます。
          </p>
        </div>
      </div>

      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        <ProjectForm project={empty} />
      </div>
    </div>
  );
}
