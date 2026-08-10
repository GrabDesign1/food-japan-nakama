-- AlterTable
ALTER TABLE "offerings" ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'public';

-- CreateTable
CREATE TABLE "matched_notices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "criteria" TEXT,
    "target_count" INTEGER,
    "sent_count" INTEGER,
    "review_note" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matched_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matched_notices_order_item_id_key" ON "matched_notices"("order_item_id");

-- CreateIndex
CREATE INDEX "matched_notices_offering_id_idx" ON "matched_notices"("offering_id");

-- CreateIndex
CREATE INDEX "matched_notices_status_idx" ON "matched_notices"("status");
