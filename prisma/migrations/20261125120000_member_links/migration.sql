-- 会員が「発信しているところ」（FB / Instagram / X / note / 自社サイト / 管理しているページ）
CREATE TABLE "member_links" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_links_member_id_sort_order_idx" ON "member_links"("member_id", "sort_order");

ALTER TABLE "member_links" ADD CONSTRAINT "member_links_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ⚠️ Supabase の決まり：新しい表は必ず RLS を有効にし、匿名/ログイン済みの直アクセスを塞ぐ。
--    アプリは service_role（サーバー）経由でしか読み書きしない。
ALTER TABLE "member_links" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "member_links" FROM anon, authenticated;
