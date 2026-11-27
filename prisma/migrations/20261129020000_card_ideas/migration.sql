-- 名刺から、その先を考える（2026-11-28 ユーザー指示「AIをガンガン使ったものにして」）。⚠️ 列の追加のみ。
-- ⚠️⚠️ ideas は AI の提案であって事実ではない。画面でもそう書くこと。
ALTER TABLE "contact_cards" ADD COLUMN "ideas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "contact_cards" ADD COLUMN "greeting_draft" TEXT;
