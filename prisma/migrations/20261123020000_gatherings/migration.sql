-- CreateTable
CREATE TABLE "gatherings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "host_member_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "start_at" TIMESTAMP(3),
    "time_note" TEXT,
    "prefecture" TEXT,
    "place" TEXT,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gatherings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_joins" (
    "id" TEXT NOT NULL,
    "gathering_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'going',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gathering_joins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gatherings_tenant_id_status_start_at_idx" ON "gatherings"("tenant_id", "status", "start_at");

-- CreateIndex
CREATE INDEX "gatherings_host_member_id_created_at_idx" ON "gatherings"("host_member_id", "created_at");

-- CreateIndex
CREATE INDEX "gathering_joins_member_id_idx" ON "gathering_joins"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "gathering_joins_gathering_id_member_id_key" ON "gathering_joins"("gathering_id", "member_id");

-- AddForeignKey
ALTER TABLE "gathering_joins" ADD CONSTRAINT "gathering_joins_gathering_id_fkey" FOREIGN KEY ("gathering_id") REFERENCES "gatherings"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ⚠️ 新しい表には必ず RLS を有効にし、anon / authenticated から権限を外す（2026-11-23）。
--    アプリは service_role 経由でのみ読み書きする。付け忘れると、
--    Supabase の公開APIから誰でも読める表になる。
ALTER TABLE "gatherings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gathering_joins" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "gatherings" FROM anon, authenticated;
REVOKE ALL ON TABLE "gathering_joins" FROM anon, authenticated;
