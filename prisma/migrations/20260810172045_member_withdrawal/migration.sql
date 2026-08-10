-- AlterTable
ALTER TABLE "members" ADD COLUMN     "withdrawal_reason" TEXT,
ADD COLUMN     "withdrawal_requested_at" TIMESTAMP(3);
