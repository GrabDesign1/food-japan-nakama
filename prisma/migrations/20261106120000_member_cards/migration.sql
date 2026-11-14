-- CreateTable
CREATE TABLE "member_cards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "job_title" TEXT,
    "headline" TEXT,
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "show_phone" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_exchanges" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_a_id" TEXT NOT NULL,
    "member_b_id" TEXT NOT NULL,
    "initiated_by_member_id" TEXT NOT NULL,
    "met_at" TEXT,
    "note_a" TEXT,
    "note_b" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_cards_member_id_key" ON "member_cards"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_cards_code_key" ON "member_cards"("code");

-- CreateIndex
CREATE INDEX "member_cards_tenant_id_idx" ON "member_cards"("tenant_id");

-- CreateIndex
CREATE INDEX "card_exchanges_tenant_id_idx" ON "card_exchanges"("tenant_id");

-- CreateIndex
CREATE INDEX "card_exchanges_member_a_id_idx" ON "card_exchanges"("member_a_id");

-- CreateIndex
CREATE INDEX "card_exchanges_member_b_id_idx" ON "card_exchanges"("member_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_exchanges_member_a_id_member_b_id_key" ON "card_exchanges"("member_a_id", "member_b_id");

-- AddForeignKey
ALTER TABLE "member_cards" ADD CONSTRAINT "member_cards_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_exchanges" ADD CONSTRAINT "card_exchanges_member_a_id_fkey" FOREIGN KEY ("member_a_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_exchanges" ADD CONSTRAINT "card_exchanges_member_b_id_fkey" FOREIGN KEY ("member_b_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 新テーブルは必ずRLSを有効化し、匿名キーで触れないようにする（CLAUDE.md の必須手順）
-- ※ card_exchanges は「誰と誰が会ったか」、member_cards は交換コードを持つため、
--    漏れると会員の人脈そのものが外部から読めてしまう
ALTER TABLE "member_cards" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "member_cards" FROM anon, authenticated;
ALTER TABLE "card_exchanges" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "card_exchanges" FROM anon, authenticated;
