-- AlterTable
ALTER TABLE "project_applications" ADD COLUMN     "assignee" TEXT,
ADD COLUMN     "desired_role" TEXT,
ADD COLUMN     "hold_reason" TEXT,
ADD COLUMN     "involvement" TEXT,
ADD COLUMN     "meeting_wish" TEXT,
ADD COLUMN     "next_action" TEXT,
ADD COLUMN     "next_action_due" TIMESTAMP(3),
ADD COLUMN     "next_meeting_at" TIMESTAMP(3),
ADD COLUMN     "offer" TEXT,
ADD COLUMN     "owner_memo" TEXT,
ADD COLUMN     "progress_stage" TEXT NOT NULL DEFAULT 'inquiry',
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "challenge_issue" TEXT,
ADD COLUMN     "challenge_who" TEXT,
ADD COLUMN     "challenge_why" TEXT,
ADD COLUMN     "co_creation_goal" TEXT,
ADD COLUMN     "contract_note" TEXT,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "event_flags" TEXT[],
ADD COLUMN     "existing_partners" TEXT,
ADD COLUMN     "future_vision" TEXT,
ADD COLUMN     "leader_name" TEXT,
ADD COLUMN     "one_liner" TEXT,
ADD COLUMN     "period" TEXT,
ADD COLUMN     "place" TEXT,
ADD COLUMN     "purpose_main" TEXT,
ADD COLUMN     "purpose_sub" TEXT[],
ADD COLUMN     "reward_policy" TEXT,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "stage_done" TEXT,
ADD COLUMN     "stage_issues" TEXT,
ADD COLUMN     "stage_learned" TEXT,
ADD COLUMN     "stage_schedule" TEXT,
ADD COLUMN     "support_official" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "support_requested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "target_timing" TEXT;

-- CreateTable
CREATE TABLE "project_roles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "request" TEXT,
    "requirement" TEXT,
    "headcount" TEXT,
    "period" TEXT,
    "reward" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_resources" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "condition" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_activities" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "application_id" TEXT,
    "actor_member_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_roles_project_id_idx" ON "project_roles"("project_id");

-- CreateIndex
CREATE INDEX "project_resources_project_id_idx" ON "project_resources"("project_id");

-- CreateIndex
CREATE INDEX "project_activities_project_id_idx" ON "project_activities"("project_id");

-- CreateIndex
CREATE INDEX "project_activities_application_id_idx" ON "project_activities"("application_id");

-- AddForeignKey
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "project_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
