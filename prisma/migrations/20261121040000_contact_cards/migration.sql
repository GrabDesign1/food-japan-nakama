-- CreateTable
CREATE TABLE "contact_cards" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_kana" TEXT,
    "company" TEXT,
    "department" TEXT,
    "job_title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "website" TEXT,
    "postal_code" TEXT,
    "address" TEXT,
    "image_path" TEXT,
    "met_at" TEXT,
    "met_on" TIMESTAMP(3),
    "note" TEXT,
    "tags" TEXT[],
    "linked_member_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'scan',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_cards_owner_member_id_created_at_idx" ON "contact_cards"("owner_member_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_cards_tenant_id_idx" ON "contact_cards"("tenant_id");

-- CreateIndex
CREATE INDEX "contact_cards_linked_member_id_idx" ON "contact_cards"("linked_member_id");


-- 取り込んだ名刺は**他人の個人情報**。PostgREST（anon / authenticated）から直接は触らせない。
-- 読み書きはサーバー（service role）経由だけにし、そこで持ち主の検証を必ず行う。
ALTER TABLE "contact_cards" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "contact_cards" FROM anon, authenticated;
