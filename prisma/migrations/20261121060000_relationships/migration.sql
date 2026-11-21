-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_a_id" TEXT NOT NULL,
    "member_b_id" TEXT NOT NULL,
    "strength_at_last_contact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_contact_at" TIMESTAMP(3) NOT NULL,
    "last_kind" TEXT NOT NULL,
    "context_codes" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_a_id" TEXT NOT NULL,
    "member_b_id" TEXT NOT NULL,
    "actor_member_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "relationships_tenant_id_idx" ON "relationships"("tenant_id");

-- CreateIndex
CREATE INDEX "relationships_member_a_id_idx" ON "relationships"("member_a_id");

-- CreateIndex
CREATE INDEX "relationships_member_b_id_idx" ON "relationships"("member_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_member_a_id_member_b_id_key" ON "relationships"("member_a_id", "member_b_id");

-- CreateIndex
CREATE INDEX "contact_events_member_a_id_member_b_id_created_at_idx" ON "contact_events"("member_a_id", "member_b_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_events_tenant_id_created_at_idx" ON "contact_events"("tenant_id", "created_at");


-- 関係性と接触の記録はサーバー経由でのみ読み書きする。
ALTER TABLE "relationships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "relationships" FROM anon, authenticated;
REVOKE ALL ON TABLE "contact_events" FROM anon, authenticated;
