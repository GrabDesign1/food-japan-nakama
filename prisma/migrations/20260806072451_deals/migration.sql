-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_member_id" TEXT NOT NULL,
    "counterpart_member_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "phase" INTEGER NOT NULL DEFAULT 0,
    "next_action" TEXT,
    "due_date" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deals_owner_member_id_idx" ON "deals"("owner_member_id");

-- CreateIndex
CREATE INDEX "deals_counterpart_member_id_idx" ON "deals"("counterpart_member_id");
