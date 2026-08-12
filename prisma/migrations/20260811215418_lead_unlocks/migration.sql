-- CreateTable
CREATE TABLE "lead_unlocks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "buyer_member_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "offering_id" TEXT,
    "credit_ledger_entry_id" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_unlocks_thread_id_key" ON "lead_unlocks"("thread_id");

-- CreateIndex
CREATE INDEX "lead_unlocks_member_id_idx" ON "lead_unlocks"("member_id");

-- CreateIndex
CREATE INDEX "lead_unlocks_buyer_member_id_idx" ON "lead_unlocks"("buyer_member_id");

-- 新テーブルは必ずRLSを有効化し、匿名キーで触れないようにする（CLAUDE.md の必須手順）
ALTER TABLE "lead_unlocks" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "lead_unlocks" FROM anon, authenticated;
