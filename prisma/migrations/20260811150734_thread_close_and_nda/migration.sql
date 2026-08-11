-- AlterTable
ALTER TABLE "threads" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "closed_by" TEXT,
ADD COLUMN     "closed_reason" TEXT;

-- CreateTable
CREATE TABLE "nda_agreements" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "offering_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "party_a_name" TEXT NOT NULL,
    "party_a_address" TEXT,
    "party_b_name" TEXT NOT NULL,
    "party_b_address" TEXT,
    "special_terms" TEXT,
    "template_version" TEXT NOT NULL DEFAULT '2026-08-11',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "agreed_by" TEXT,
    "agreed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nda_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nda_agreements_thread_id_key" ON "nda_agreements"("thread_id");
