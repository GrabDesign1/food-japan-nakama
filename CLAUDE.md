# FOOD JAPAN NAKAMA — 開発メモ（Claude Code 用）

Food Japan Summit の参加者を会員とする、通年運用の食の共創プラットフォーム。
本番: https://nakama.food-japan-summit.jp/ ／ GitHub: GrabDesign1/food-japan-nakama（main へ push で Vercel 自動デプロイ）。
運営会社: 株式会社グラブデザイン（代表 梅原卓也 / info@grab-design.com / 03-6825-3901 / 〒102-0073 東京都千代田区九段北1-2-1）。

一次資料: `docs/HANDOVER.md`（初期仕様）, `docs/DECISIONS.md`, `docs/current-state.md`（現状構成）,
`NAKAMA_ClaudeCode_implementation_spec.md`（3サービス改修の実装指示書＝最新方針）。

## 事業構造（3サービス。混ぜない）
1. **NAKAMA**（月額会員）= 出会い・営業・マッチング・学び。**月額22,000円（税込／＝20,000円税抜）**。
2. **共創プロデュース** = 人が介在する企画・実証・事業化の個別支援。15万円（税抜）〜＋成功報酬（個別）。
3. **クラウドファンディング支援** = Makuake等を活用した販売・市場検証。個別見積。
- 決め台詞:「出会い、つながり、学ぶ『NAKAMA』。人が入り、事業をつくる『共創プロデュース』。商品を売り、市場で試す『クラウドファンディング支援』。」
- 事務局は少人数＝手厚い伴走は上位サービス限定。NAKAMAは原則セルフサービス＋自動化で回す方針。

## 技術スタック（実装済）
- Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4（`src/app/globals.css` に CSS変数）
- DB: PostgreSQL（Supabase, project ref zbyxhtswjrrhlcnzouew, tenant slug `food-japan-summit`）
- ORM: **Prisma 7**（`prisma-client` generator → `src/generated/prisma`。`/src/generated` はgitignore）
- 認証: Supabase Auth（`@supabase/ssr`）＋ Google OAuth。`src/middleware.ts` で保護。
- 決済: Stripe（Checkout / Customer Portal / Webhook。Webhookが課金状態の正）。**LIVEモード**。
- メール: Resend（`src/lib/email.ts`, `EMAIL_FROM`, ドメイン grab-design.com 認証済）
- ホスティング: Vercel（team food-japan）。`package.json` の `"postinstall": "prisma generate"` 必須。

## 開発・運用の作法（重要）
- 開発はこのフォルダ **`~/Development/food-japan-connect`**（OneDrive外）。
- コマンド前に必ず: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`
- push: `GIT_TERMINAL_PROMPT=0 git push origin main`（osxkeychain に認証あり）
- 変更フロー: 実装 → `npx tsc --noEmit` →（大きめの変更は `npx next build`）→ commit → push（自動デプロイ）。
- schema変更後は `npx prisma migrate dev --name xxx` → `npx prisma generate`（クライアント再生成しないと型が出ない）。
- 画像編集は Python + Pillow/numpy（`python3 -m pip install --user Pillow numpy`）。ヒーロー画像 `public/hero-nakama-visual.png` はラベル除去・上下端フェード/カットを Pillow で実施済。
- ローカル確認: `npm run dev`（別プロセス）→ ブラウザツールで localhost:3000 を screenshot して見比べる。
- `next.config.ts`: `experimental.serverActions.bodySizeLimit: "8mb"`（画像アップロードで必要。既定1MBだと本番で失敗）。
- **DNS注意**: grab-design.com / food-japan-summit.jp は NS を `ns-rs*.gmoserver.jp`（レンタルサーバDNS）へ委任。お名前.com Navi(dnsv.jp) ではなく**レンタルサーバのDNSパネル**にレコードを入れる。

## ルーティング
- 公開 `(public)`: `/`（LP）, `/about`,`/pricing`,`/flow`,`/faq`,`/company`,`/contact`,`/terms`,`/privacy`,`/tokushoho`, `/produce`,`/crowdfunding`,`/consultation`,`/learn`, `/preview/{projects,offerings}/[id]`, `/login`,`/signup` 他。middleware の `PUBLIC_PATHS` に追加が必要。
- 会員 `(app)`: `/dashboard`（**表示名「マイページトップ」**・URLは維持）, `/search`,`/profile`,`/ledger`,`/deals`(+`/board`),`/projects`,`/messages`,`/billing`,`/admin`。共通ナビは `(app)/layout.tsx` の `NAV`（PC/モバイル共有）。
- 公開LPのヘッダーはヒーロー内蔵（`(public)/page.tsx`）。下層は `(public)/_components/PublicTopBar.tsx`。フッターは `(public)/layout.tsx`。

## データモデル（Prisma / 抜粋）
Tenant, User, Member(共創プロフィール項目を保持), Offering(売りたい/買いたい=台帳), OfferingView,
Project(共創プロジェクト)+ProjectApplication, Deal(phase 0-5=進捗ボード), Thread/Message(+Draft/Template),
Favorite, Announcement, Banner, CuratedArticle(食の注目記事), **Consultation(個別相談)**。

## UI規約（統一済み。崩さない）
- ボタン: **`btn(variant, size)`**（`src/lib/ui.ts`）。variant=primary/amber/secondary/danger/ghost, size=sm/md/lg。角丸`rounded-lg`統一。
- 見出し: `eyebrowCls`/`h1Cls`(22px serif)/`h2Cls`(18px serif)/`h3Cls`(15px semibold)（`src/lib/ui.ts`）。
- 押せるカード=影＋ホバーで浮く＋緑枠（OfferingCard/ProducerCard/ProjectCard）。押せない=フラット。
- 配色は `--green`/`--green-soft`/`--ink` 等の CSS変数。背景は白。
- **レイアウトの注意（指摘あり）**: 2カラム内に高さの違うボタン等を混ぜない。CTAは行として切り出して全幅で整列させる。

## 料金・法務
- NAKAMA は Stripe 単一プラン `nakama` ¥22,000（`src/lib/stripe.ts`。無料/¥30,000は廃止）。登録=即課金（signup→`/billing`）。
- 表示は「22,000円（税込）」で統一（税抜内訳は特商法/規約側に）。
- 「無料」表記は使わない。法務ページ本文は `src/lib/legal.ts`（利用規約/プライバシー）。特商法は `/tokushoho` に構造化。
- 法務文面の最終確定は貴社/専門家確認前提（施行日 2026-08-07 仮置き）。

## 現在の進捗（3サービス改修）
- **Phase 1 完了**: 料金修正(¥22,000/単一/無料廃止), `/produce` `/crowdfunding` `/pricing`(3サービス比較) `/consultation`(フォーム+Consultationモデル+`info@grab-design.com`通知+自動返信+`/admin/consultations`) `/learn`(最小), トップに3サービス/学び/最終3択CTA, ヘッダー/フッターの3サービスナビ, SEO(title/description)。
- Phase 2以降（未着手・要承認）: 学び/セミナー本実装、案件統合検索/掲載上限/審査、共créプロフィール構造化+食の検索条件、自動マッチング提案+週次ダイジェスト、共créシート/企画書自動生成、共cré事例、analytics。
- 公開前TODO: Stripe本番額が¥22,000か最終確認、相談フォーム実送信テスト、登録→決済フロー確認、法務最終確認。テストデータ削除済（会員は株式会社グラブデザインのみ）。

## 設計の肝（崩すと「ただのマッチングサイト」になる）
- 「企業を探す」ではなく「動かせるモノ・場所・条件を探す」。検索対象は企業自由記述ではなく **offerings（台帳）1件ずつ**。
- 課金の権限判定は自社DB側（Stripeに毎回問い合わせない。Webhookで同期）。
- リアル資産（Food Japan Summit のイベント/人脈）＋ オンライン(NAKAMA) ＋ 個別支援(共創プロデュース) を一体で売るのが勝ち筋。
