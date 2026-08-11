-- AlterTable
ALTER TABLE "contract_offers" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completed_by" TEXT,
ADD COLUMN     "tax_rate" INTEGER;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "bank_account" TEXT,
ADD COLUMN     "invoice_reg_no" TEXT;
