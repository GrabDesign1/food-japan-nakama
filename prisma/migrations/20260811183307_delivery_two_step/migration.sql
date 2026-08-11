-- AlterTable
ALTER TABLE "contract_offers" ADD COLUMN     "received_at" TIMESTAMP(3),
ADD COLUMN     "received_by" TEXT,
ADD COLUMN     "shipped_at" TIMESTAMP(3),
ADD COLUMN     "shipped_by" TEXT;
