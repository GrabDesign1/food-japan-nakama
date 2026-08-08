# FOOD JAPAN NAKAMA 現状構成（current-state）

作成：2026-08-09 ／ 実装仕様書 `NAKAMA_ClaudeCode_implementation_spec.md` の Phase 1 着手前調査。

## 技術スタック
- **フレームワーク**：Next.js 16（App Router）／React 19／TypeScript／Tailwind CSS v4
- **DB/ORM**：PostgreSQL（Supabase）＋ Prisma 7（`prisma-client` generator → `src/generated/prisma`）
- **認証**：Supabase Auth（`@supabase/ssr`）。Google OAuth 有効。`src/middleware.ts` で保護。
- **決済**：Stripe（Checkout・Customer Portal・Webhook）。`src/lib/stripe.ts` / `src/app/(app)/billing/*` / `src/app/api/stripe/webhook`
- **メール**：Resend（`src/lib/email.ts`、`EMAIL_FROM`）
- **ホスティング**：Vercel（main へ push で自動デプロイ）。カスタムドメイン nakama.food-japan-summit.jp

## ルーティング
### 公開（未ログイン可・middleware で許可）
`/`（LP）, `/about`, `/pricing`, `/flow`, `/faq`, `/company`, `/contact`, `/terms`, `/privacy`, `/tokushoho`, `/preview/projects/[id]`, `/preview/offerings/[id]`, `/login`, `/signup`, `/forgot-password`, `/reset-password`
- 公開LPのヘッダー/フッターは `(public)/page.tsx`（ヒーロー内蔵）と `(public)/layout.tsx`。下層は `_components/PublicTopBar.tsx`。

### 会員（`(app)` グループ・要ログイン）
`/dashboard`（表示名「マイページトップ」）, `/search`, `/profile`, `/ledger`(+`[id]`,`[id]/edit`), `/deals`(+`/board`), `/projects`(+`[id]`,`[id]/edit`), `/messages`(+`[id]`), `/billing`, `/admin`
- 共通ナビは `(app)/layout.tsx` の `NAV` 配列（PC/モバイル共有）。

### 管理（`/admin`・requireAdmin）
会員審査/停止/削除、お知らせ、バナー、記事キュレーション、管理者アカウント、プロジェクト掲載承認。

## データモデル（Prisma）
Tenant, User, Member, Announcement, Banner, CuratedArticle, Project, ProjectApplication, Deal, Thread, Message, MessageTemplate, MessageDraft, Favorite, Offering, OfferingView
- **無い（Phase 1/2 で必要）**：Seminar（学び）、Consultation（個別相談）。
- Member プロフィールは既に「提供できるもの/求める相手/解決したい課題/組みたい相手」等を保持（共創プロフィールの土台あり）。
- Deal は phase 0〜5（出会う/初回商談/条件整理/試作PoC/実証/成約）＝進捗管理は実装済。

## 決済（重要）
`src/lib/stripe.ts` の `PLANS`：
- `free`（¥0）
- `community`「共創コミュニティ」`amount: 30000`／「1団体2名」等の機能列挙

Checkout は `price_data.unit_amount = plan.amount`（＝**¥30,000 を課金**）。Portal・Webhook 実装あり（Webhook が課金状態の正）。

## 再利用できるもの
- 認証・会員・課金・Webhook・メールの基盤はそのまま利用可。
- 会員プロフィール＝共創プロフィールへ拡張可能。
- Deal ボード＝進捗管理として流用可能。
- 検索・お気に入り・メッセージ・プレビュー壁（未ログインは概要のみ）は実装済で、仕様書 §10/§11 の多くを満たす。

## Phase 1 で影響する主な差分／新規
- 新規ページ：`/produce`, `/crowdfunding`, `/consultation`（＋ Consultation モデル・管理通知）
- 改修：トップ（3サービスへ再構成）, `/pricing`（3サービス比較）, `/flow`, 共通ヘッダー/CTA/価格表記の統一
- SEO（title/description/OGP）

## 未実装・未確定（要判断。勝手に決めない＝仕様書 §18）
1. **【最優先・要確認】決済額の不一致**：実 Stripe 課金 **¥30,000**（plan `community`）↔ 表示・法務は **¥22,000（税込）**。プラン名も「共創コミュニティ」で仕様書の「NAKAMA 月額会員（¥20,000税抜/¥22,000税込）」と不一致。→ Stripe金額を 22000 に修正し、プランを NAKAMA 月額会員へ再定義する要あり（既存課金者への影響：現状ほぼテストのみ）。
2. 相談フォームの通知先メール（§18-8）
3. 無料アカウントを残すか／登録＝即課金か（§18-3、現状 free プランあり）
4. トップ・ヒーローの見出し文言（仕様書 §4.2 は新コピー、現行は「食の『譲りたい』『あったらいいな』を共創でつなぐ。」で確定運用中）
5. 案件掲載数の上限・掲載前審査の要否（§18-4,5）
6. セミナー頻度・アーカイブを月額に含めるか（§18-1,2）
7. 共創プロデュース成功報酬、クラファン着手金・料率、事例・ロゴ許諾（§18-6,7,9）
8. analytics 未導入（§13 の計測イベントは analytics 導入後）
