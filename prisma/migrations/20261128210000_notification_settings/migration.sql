-- 通知メールの ON/OFF（2026-11-28 ユーザー指示）。
-- ⚠️ 列の追加のみ。既定は NULL ＝「受け取る」。既存会員の挙動は変わらない。
ALTER TABLE "users" ADD COLUMN "message_email_opt_out_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "mention_email_opt_out_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "connection_email_opt_out_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deal_email_opt_out_at" TIMESTAMP(3);
