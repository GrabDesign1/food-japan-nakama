
-- AlterTable
ALTER TABLE "members" ADD COLUMN     "invite_answer" TEXT,
ADD COLUMN     "invite_answered_at" TIMESTAMP(3),
ADD COLUMN     "invite_sent_at" TIMESTAMP(3),
ADD COLUMN     "invite_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_invite_token_key" ON "members"("invite_token");

