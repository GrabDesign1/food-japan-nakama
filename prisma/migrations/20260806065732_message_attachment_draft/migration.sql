-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "attachment_name" TEXT,
ADD COLUMN     "attachment_url" TEXT;

-- CreateTable
CREATE TABLE "message_drafts" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_drafts_thread_id_member_id_key" ON "message_drafts"("thread_id", "member_id");
