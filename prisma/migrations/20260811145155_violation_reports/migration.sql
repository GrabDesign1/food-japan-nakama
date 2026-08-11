-- CreateTable
CREATE TABLE "violation_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reporter_member_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "violation_reports_tenant_id_status_idx" ON "violation_reports"("tenant_id", "status");
