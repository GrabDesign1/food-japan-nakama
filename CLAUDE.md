# Food Japan Connect — 開発メモ（Claude Code 用）

Food Japan Summit（2026年11月 宮崎／12月 名古屋）の参加者を会員とする、
通年運用の「共創CRM」。イベント管理ではなく、出会いを商談・共創まで追跡する。

詳細仕様は `docs/HANDOVER.md`（実装引き継ぎ書）が一次資料。
UIの再現ゴールは `docs/prototype-v5.html`（動くプロトタイプ）。
未決事項と採用した既定値は `docs/DECISIONS.md`。

## 技術スタック
- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS
- DB: PostgreSQL（Supabase）
- ORM: Prisma（予定）
- 認証: Supabase Auth（メール認証）
- 決済: Stripe（Checkout / Customer Portal / Billing）
- ホスティング: Vercel（本番）

## 重要な制約
- **お名前.comのレンタルサーバーには載らない**（PHP用のため）。
  お名前.comは「ドメイン」として使い、本体はVercel＋Supabase。
- 開発はOneDriveの外（このフォルダ `~/Development/food-japan-connect`）で行う。
- Node.jsはnvm管理。コマンド実行前に
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` が必要。

## 実装順序（HANDOVER 第11章）
1. 認証・テナント・権限 ← 最初。後入れは全画面改修になる
2. 会員プロフィール＋審査フロー
3. 持ち寄り台帳（システムの中心）
4. パートナー検索
5. 興味送信・メッセージ
6. 商談管理・ステータス
7. 共創プロジェクト
8. 課金・Stripe
9. 分析・事務局ダッシュボード

## 設計の肝（崩すと「ただのマッチングサイト」になる）
- 「企業を探す」ではなく「動かせるモノ・場所・条件を探す」構造。
- 検索対象は企業プロフィールの自由記述ではなく、1件ずつの
  **持ち寄り台帳レコード（offerings）**。
- 課金の権限判定は自社DB側で行う（Stripeに毎回問い合わせない）。
