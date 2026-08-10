-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "offering_id" TEXT;

-- AlterTable
ALTER TABLE "stripe_events" ADD COLUMN     "processed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "auth_attempts" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "email" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_attempts_kind_email_created_at_idx" ON "auth_attempts"("kind", "email", "created_at");

-- CreateIndex
CREATE INDEX "auth_attempts_kind_ip_created_at_idx" ON "auth_attempts"("kind", "ip", "created_at");
