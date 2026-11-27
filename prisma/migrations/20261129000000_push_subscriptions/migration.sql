-- プッシュ通知の宛先（2026-11-28・PWA）。⚠️ 追加のみ。
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_member_id_idx" ON "push_subscriptions"("member_id");

ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ⚠️⚠️⚠️ endpoint は通知の宛先そのもの。漏れると他人の端末に通知を送れてしまう。
--    Supabase の新しい表は必ず RLS を有効にし、anon/authenticated から権限を剥がす。
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "push_subscriptions" FROM anon, authenticated;
