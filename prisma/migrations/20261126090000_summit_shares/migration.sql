-- サミット特設ページへの共有（写真・動画・記事）。2026-11-26
CREATE TABLE "summit_shares" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_slug" TEXT NOT NULL,
    "author_member_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_paths" TEXT[],
    "link_url" TEXT,
    "link_title" TEXT,
    "link_image_url" TEXT,
    "link_site_name" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summit_shares_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "summit_shares_tenant_id_event_slug_created_at_idx" ON "summit_shares"("tenant_id", "event_slug", "created_at");
CREATE INDEX "summit_shares_event_slug_featured_created_at_idx" ON "summit_shares"("event_slug", "featured", "created_at");
CREATE INDEX "summit_shares_author_member_id_idx" ON "summit_shares"("author_member_id");

-- ⚠️ 新しい表には必ず付ける（このプロジェクトの決まり）。
--    アプリはサービスロールで接続するので動作は変わらないが、
--    anon / authenticated から直接読み書きできる口を残さない。
ALTER TABLE "summit_shares" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "summit_shares" FROM anon, authenticated;
