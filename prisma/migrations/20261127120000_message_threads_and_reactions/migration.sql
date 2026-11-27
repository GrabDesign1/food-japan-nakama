-- スレッド返信（2026-11-27）。親の発言へのぶら下がり。
-- ⚠️ null ＝ 本文に出る発言。⚠️ 入れ子は1段だけ（アプリ側で守る）。
-- AlterTable
ALTER TABLE "messages" ADD COLUMN "parent_message_id" TEXT;

-- CreateIndex
CREATE INDEX "messages_parent_message_id_idx" ON "messages"("parent_message_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_member_id_emoji_key" ON "message_reactions"("message_id", "member_id", "emoji");

-- CreateIndex
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ⚠️⚠️⚠️ Supabase の新しい表は、必ず RLS を有効にして anon/authenticated から権限を剥がす。
--    ⚠️ 剥がさないと、ブラウザの公開キーだけで誰でも読める（＝誰がどの発言に反応したかが丸見えになる）。
--    ⚠️ サーバー（service_role）からのアクセスは RLS を素通りするので、アプリの動きは変わらない。
ALTER TABLE "message_reactions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "message_reactions" FROM anon, authenticated;
