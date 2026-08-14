-- AlterTable
ALTER TABLE "members" ADD COLUMN     "crm_next_action" TEXT,
ADD COLUMN     "crm_next_action_due" TIMESTAMP(3),
ADD COLUMN     "crm_owner_user_id" TEXT,
ADD COLUMN     "crm_stage" TEXT,
ADD COLUMN     "crm_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "member_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_notes_member_id_occurred_at_idx" ON "member_notes"("member_id", "occurred_at");

-- CreateIndex
CREATE INDEX "member_notes_tenant_id_occurred_at_idx" ON "member_notes"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "members_tenant_id_crm_next_action_due_idx" ON "members"("tenant_id", "crm_next_action_due");

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
