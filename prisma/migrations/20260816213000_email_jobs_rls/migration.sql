-- 新テーブルは必ずRLSを有効化し、匿名キーで触れないようにする（CLAUDE.md の必須手順）
-- ※ email_jobs は宛先メールアドレスと本文を持つため、漏れると影響が大きい
ALTER TABLE "email_jobs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "email_jobs" FROM anon, authenticated;
