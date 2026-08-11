-- AlterTable
ALTER TABLE "threads" ADD COLUMN     "proposed_amount" INTEGER;

-- CreateTable
CREATE TABLE "proposal_notes" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "rating" INTEGER,
    "memo" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proposal_notes_thread_id_member_id_key" ON "proposal_notes"("thread_id", "member_id");

-- AddForeignKey
ALTER TABLE "proposal_notes" ADD CONSTRAINT "proposal_notes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
