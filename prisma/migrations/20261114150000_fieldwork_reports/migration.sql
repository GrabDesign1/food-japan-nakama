-- CreateTable
CREATE TABLE "fieldwork_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "team" TEXT,
    "email" TEXT,
    "partner" TEXT,
    "project_name" TEXT,
    "answers" JSONB NOT NULL,
    "report" JSONB,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fieldwork_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fieldwork_reports_tenant_id_event_key_created_at_idx" ON "fieldwork_reports"("tenant_id", "event_key", "created_at");

-- CreateIndex
CREATE INDEX "fieldwork_reports_ip_hash_created_at_idx" ON "fieldwork_reports"("ip_hash", "created_at");


-- ⚠️ Supabase の新規テーブルは必ず RLS を有効化し、anon / authenticated から権限を剥がす。
--    このテーブルはサーバー（service role）からだけ読み書きする。
--    公開ページから書き込むため、ブラウザから直接読めると他社の共創案が全部見えてしまう。
ALTER TABLE "fieldwork_reports" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "fieldwork_reports" FROM anon, authenticated;
