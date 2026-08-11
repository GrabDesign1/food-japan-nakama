-- CreateTable
CREATE TABLE "issued_documents" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "offering_id" TEXT,
    "offer_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "doc_no" TEXT NOT NULL,
    "issued_on" TEXT,
    "due_text" TEXT,
    "received_on" TEXT,
    "purpose" TEXT,
    "note" TEXT,
    "tax_rate" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "issued_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issued_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issued_documents_thread_id_idx" ON "issued_documents"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "issued_documents_offer_id_kind_key" ON "issued_documents"("offer_id", "kind");

-- AddForeignKey
ALTER TABLE "issued_documents" ADD CONSTRAINT "issued_documents_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 新テーブルは必ずRLSを有効化し、匿名キーで触れないようにする（CLAUDE.md の必須手順）
ALTER TABLE "issued_documents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "issued_documents" FROM anon, authenticated;
