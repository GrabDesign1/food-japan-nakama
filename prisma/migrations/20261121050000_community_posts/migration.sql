-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "author_member_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "link_title" TEXT,
    "image_paths" TEXT[],
    "deleted_at" TIMESTAMP(3),
    "deleted_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_member_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_tenant_id_created_at_idx" ON "posts"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "posts_author_member_id_created_at_idx" ON "posts"("author_member_id", "created_at");

-- CreateIndex
CREATE INDEX "post_likes_member_id_idx" ON "post_likes"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_member_id_key" ON "post_likes"("post_id", "member_id");

-- CreateIndex
CREATE INDEX "post_comments_post_id_created_at_idx" ON "post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "post_comments_author_member_id_idx" ON "post_comments"("author_member_id");

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 投稿・いいね・コメントは「つながっている人だけ」に見せる。
-- 範囲の判定はサーバー側の問い合わせで行うので、PostgREST からは触らせない。
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_comments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "posts" FROM anon, authenticated;
REVOKE ALL ON TABLE "post_likes" FROM anon, authenticated;
REVOKE ALL ON TABLE "post_comments" FROM anon, authenticated;
