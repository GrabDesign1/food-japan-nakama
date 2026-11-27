-- AlterTable
ALTER TABLE "threads" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'DIRECT';

-- CreateTable
CREATE TABLE "thread_participants" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "invited_by" TEXT NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),

    CONSTRAINT "thread_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'MEMBERS',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_members" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_posts" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parent_post_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "channel_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_post_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_post_mentions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_post_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thread_participants_member_id_status_idx" ON "thread_participants"("member_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "thread_participants_thread_id_member_id_key" ON "thread_participants"("thread_id", "member_id");

-- CreateIndex
CREATE INDEX "channels_tenant_id_visibility_idx" ON "channels"("tenant_id", "visibility");

-- CreateIndex
CREATE INDEX "channel_members_member_id_idx" ON "channel_members"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_members_channel_id_member_id_key" ON "channel_members"("channel_id", "member_id");

-- CreateIndex
CREATE INDEX "channel_posts_channel_id_created_at_idx" ON "channel_posts"("channel_id", "created_at");

-- CreateIndex
CREATE INDEX "channel_posts_parent_post_id_idx" ON "channel_posts"("parent_post_id");

-- CreateIndex
CREATE INDEX "channel_post_reactions_post_id_idx" ON "channel_post_reactions"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_post_reactions_post_id_member_id_emoji_key" ON "channel_post_reactions"("post_id", "member_id", "emoji");

-- CreateIndex
CREATE INDEX "channel_post_mentions_member_id_read_at_idx" ON "channel_post_mentions"("member_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "channel_post_mentions_post_id_member_id_key" ON "channel_post_mentions"("post_id", "member_id");

-- AddForeignKey
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_posts" ADD CONSTRAINT "channel_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_posts" ADD CONSTRAINT "channel_posts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_posts" ADD CONSTRAINT "channel_posts_parent_post_id_fkey" FOREIGN KEY ("parent_post_id") REFERENCES "channel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_post_reactions" ADD CONSTRAINT "channel_post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "channel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_post_reactions" ADD CONSTRAINT "channel_post_reactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_post_mentions" ADD CONSTRAINT "channel_post_mentions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "channel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_post_mentions" ADD CONSTRAINT "channel_post_mentions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ⚠️⚠️⚠️ Supabase の新しい表は、必ず RLS を有効にして anon/authenticated から権限を剥がす。
--    ⚠️ 剥がさないと、ブラウザの公開キーだけで誰でも読める。
--       チャンネルの発言・招待の記録・＠で名指しされた記録は、どれも他人に見えてはいけない。
--    ⚠️ サーバー（service_role）からのアクセスは RLS を素通りするので、アプリの動きは変わらない。
--    ⚠️⚠️ PUBLIC のチャンネルも、ここでは閉じる。公開はアプリ側が判断して出す
--       （DBを直接開けてしまうと、非公開チャンネルまで一緒に読まれる）。
ALTER TABLE "thread_participants" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "thread_participants" FROM anon, authenticated;

ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "channels" FROM anon, authenticated;

ALTER TABLE "channel_members" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "channel_members" FROM anon, authenticated;

ALTER TABLE "channel_posts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "channel_posts" FROM anon, authenticated;

ALTER TABLE "channel_post_reactions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "channel_post_reactions" FROM anon, authenticated;

ALTER TABLE "channel_post_mentions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "channel_post_mentions" FROM anon, authenticated;
