-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('FREE', 'UNPAID', 'PAID');

-- AlterEnum
ALTER TYPE "MemberStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'FREE';
