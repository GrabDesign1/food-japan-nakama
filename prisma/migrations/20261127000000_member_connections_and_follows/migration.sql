-- CreateTable
CREATE TABLE "member_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "addressee_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "member_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_follows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_connections_tenant_id_idx" ON "member_connections"("tenant_id");

-- CreateIndex
CREATE INDEX "member_connections_addressee_id_status_idx" ON "member_connections"("addressee_id", "status");

-- CreateIndex
CREATE INDEX "member_connections_requester_id_status_idx" ON "member_connections"("requester_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "member_connections_requester_id_addressee_id_key" ON "member_connections"("requester_id", "addressee_id");

-- CreateIndex
CREATE INDEX "member_follows_tenant_id_idx" ON "member_follows"("tenant_id");

-- CreateIndex
CREATE INDEX "member_follows_followee_id_idx" ON "member_follows"("followee_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_follows_follower_id_followee_id_key" ON "member_follows"("follower_id", "followee_id");

-- AddForeignKey
ALTER TABLE "member_connections" ADD CONSTRAINT "member_connections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_connections" ADD CONSTRAINT "member_connections_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_follows" ADD CONSTRAINT "member_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_follows" ADD CONSTRAINT "member_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ⚠️⚠️⚠️ Supabase の新しい表は、必ず RLS を有効にして anon/authenticated から権限を剥がす。
--    ⚠️ 剥がさないと、ブラウザの公開キーだけで誰でも読める（＝誰が誰に申請したかが丸見えになる）。
--    ⚠️ サーバー（service_role）からのアクセスは RLS を素通りするので、アプリの動きは変わらない。
ALTER TABLE "member_connections" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "member_connections" FROM anon, authenticated;

ALTER TABLE "member_follows" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "member_follows" FROM anon, authenticated;
