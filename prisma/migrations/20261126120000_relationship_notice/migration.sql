-- 関係が薄れてきた方へのお知らせを「1回だけ」にするための印（2026-11-26）
ALTER TABLE "relationships" ADD COLUMN "fading_notified_at" TIMESTAMP(3);
ALTER TABLE "relationships" ADD COLUMN "cold_notified_at" TIMESTAMP(3);
