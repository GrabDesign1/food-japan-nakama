
-- AlterTable
ALTER TABLE "members" ADD COLUMN     "source_key" TEXT,
ADD COLUMN     "summit_events" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "summit_role" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_source_key_key" ON "members"("source_key");

-- CreateIndex
CREATE INDEX "members_tenant_id_summit_role_idx" ON "members"("tenant_id", "summit_role");

