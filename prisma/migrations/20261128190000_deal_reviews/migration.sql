-- 取引が完了したあとの、相手への評価（2026-11-28）。
-- ⚠️ 追加のみ。既存の表・列には一切さわらない。
-- ⚠️⚠️ 両者が出すまで公開しない（published_at）。先に見えると報復になる。

-- CreateTable
CREATE TABLE "deal_reviews" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_member_id" TEXT NOT NULL,
    "target_member_id" TEXT NOT NULL,
    "would_work_again" BOOLEAN NOT NULL,
    "comment" VARCHAR(80),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deal_reviews_thread_id_author_member_id_key" ON "deal_reviews"("thread_id", "author_member_id");

-- CreateIndex
CREATE INDEX "deal_reviews_target_member_id_idx" ON "deal_reviews"("target_member_id");

-- AddForeignKey
ALTER TABLE "deal_reviews" ADD CONSTRAINT "deal_reviews_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_reviews" ADD CONSTRAINT "deal_reviews_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_reviews" ADD CONSTRAINT "deal_reviews_target_member_id_fkey" FOREIGN KEY ("target_member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ⚠️⚠️⚠️ Supabase の新しい表は、必ず RLS を有効にして anon/authenticated から権限を剥がす。
--    ⚠️ 剥がさないと、ブラウザの公開キーだけで誰でも読める。
--       公開前の評価が読めると、報復を防ぐ仕組みそのものが壊れる。
--    ⚠️ サーバー（service_role）は RLS を素通りするので、アプリの動きは変わらない。
ALTER TABLE "deal_reviews" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "deal_reviews" FROM anon, authenticated;
