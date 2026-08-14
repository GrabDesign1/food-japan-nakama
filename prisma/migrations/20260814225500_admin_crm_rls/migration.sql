-- 新テーブルは必ずRLSを有効化し、匿名キーで触れないようにする（CLAUDE.md の必須手順）
-- ※ member_notes は事務局の内部記録のため、漏れると影響が大きい
ALTER TABLE "member_notes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "member_notes" FROM anon, authenticated;
