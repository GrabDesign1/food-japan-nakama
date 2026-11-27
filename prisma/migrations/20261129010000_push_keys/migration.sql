-- プッシュ通知の鍵（VAPID）を DB に持つ（2026-11-28）。⚠️ 追加のみ。
-- ⚠️⚠️ 環境変数に置くと本番反映のたびに人が貼り付ける必要があり、そこで作業が止まるため。
CREATE TABLE "push_keys" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "public_key" TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_keys_pkey" PRIMARY KEY ("id")
);

-- ⚠️⚠️⚠️ private_key は秘密。読めるのはサーバー（service_role）だけにする。
ALTER TABLE "push_keys" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "push_keys" FROM anon, authenticated;
