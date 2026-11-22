-- AlterTable
ALTER TABLE "members" ADD COLUMN     "listed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "prereg_at" TIMESTAMP(3),
ADD COLUMN     "prereg_by" TEXT,
ADD COLUMN     "prereg_email" TEXT,
ADD COLUMN     "prereg_note" TEXT;

-- CreateIndex
CREATE INDEX "members_tenant_id_prereg_email_idx" ON "members"("tenant_id", "prereg_email");

