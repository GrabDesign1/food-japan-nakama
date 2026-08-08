-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ref_no" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "area" TEXT,
    "industry" TEXT,
    "product_summary" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "desired_outcome" TEXT,
    "desired_timing" TEXT,
    "budget" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultations_ref_no_key" ON "consultations"("ref_no");

-- CreateIndex
CREATE INDEX "consultations_tenant_id_idx" ON "consultations"("tenant_id");
