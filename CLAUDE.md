# FOOD JAPAN NAKAMA — 開発メモ（Claude Code 用）

Food Japan Summit の参加者を会員とする、通年運用の食の共創プラットフォーム。
本番: https://nakama.food-japan-summit.jp/ ／ GitHub: GrabDesign1/food-japan-nakama（main へ push で Vercel 自動デプロイ）。
運営会社: 株式会社グラブデザイン（代表 梅原卓也 / info@grab-design.com / 03-6825-3901 / 〒102-0073 東京都千代田区九段北1-2-1）。

一次資料: `docs/HANDOVER.md`（初期仕様）, `docs/DECISIONS.md`, `docs/current-state.md`（現状構成）,
`NAKAMA_ClaudeCode_implementation_spec.md`（3サービス改修の実装指示書＝最新方針）。

**機能別の実装指示書**（すべて `~/Desktop/00_デスクトップ/企画書/スナックフォーラム/NAKAMAサイト制作/`。改修時は必ず該当書を参照）:
`NAKAMA_dashboard_final_ClaudeCode_instructions.md`（マイページ最終形）/ `NAKAMA_sell_listing_ClaudeCode_instructions.md`＋`NAKAMA_sell_story_ClaudeCode_instructions.md`（売りたい）/ `NAKAMA_projects_ClaudeCode_instructions.md`（共創プロジェクト・AUBA参考）/ `NAKAMA_buyer_ClaudeCode_instructions.md`（探している＝買いたい）。

## 事業構造（**2026-08-10 確定。正＝docs/NAKAMA_課金システム_ClaudeCode実装パッケージ/00_Claude提出用_最終実装指示_2026-08-10.md**）
- **無料**: 登録・プロフィール・案件掲載（売りたい/探している/共創したい）・閲覧・買い手からの問い合わせ・**届いた問い合わせへの返信（何往復でも無料）**・継続メッセージ。カード登録不要。ログイン前は概要まで。※2026-08-10夜に導入した「引き合い課金（2往復目以降Premium）」は2026-08-11に**撤廃**（商談開始直後の課金壁で離脱するというニーズチェックの指摘による）。
- **初回紹介料（中心商品）**: 売り手→「探している」案件への最初の提案のみ有料。**支払いは紹介クレジットの消費に一本化（2026-08-11・法務レビュー版）＝通常案件1クレジット／NAKAMA確認済み案件3クレジット**（優良案件専用クレジットは廃止＝会員の月次クレジットを確認済み案件にも使える）。1クレジット1,100円、単品（1クレジット1,100円／3クレジット3,300円）とパック（5クレジット5,500円／10クレジット11,000円＝単価同額）。**有償クレジットは単品・パックとも購入日から180日後の23:59 JSTで失効（期限延長・実質的な再発行なし）**。**パックは会員割引の対象外**。消費順＝月次付与→有償購入→無償付与（同順位は期限が早い順）。事業者確認（承認）時に組織単位で無償3件付与（一度だけ・無期限）。送信後14日未読なら消費分を自動返還（開封済み・返信なしは返還しない。**元ロットが期限切れなら返還しない**）。課金単位=売り手×案件（ContactUnlock unique）。
- **月額22,000円（税込）＝NAKAMAビジネス会員**（2026-08-11確定・旧「Premium会員」）: 特典＝**毎月50クレジット（繰越なし・1クレジットあたり440円＝使い切ると55,000円相当）＋追加クレジット（単品購入）と掲載オプションが20%割引**。提案無制限は「大量営業・スパムで買い手が離れる」懸念から撤回。**価格整合の要点（2026-08-11 見直し）**＝会員が得になる分岐点は「月額 ÷ 1件あたりの購入単価」で決まり、付与数は上限にしか効かない。旧設定（月20件・パック770円/件）は分岐点28.6件＞上限20件で**フル消化しても損**だった。パック単価を1,100円に統一＋付与30件で分岐点20件＜上限30件となり「月20件以上提案するなら会員が最安」が成立。既存契約1件=グラブデザイン（9/9満了予約）。3か月後に使用率・返信率・商談化率を見て再調整する。
- **掲載オプション（自動販売・Stripe一回払い）**: 注目表示5,500〜11,000円/最上部PR22,000円/急募3,300〜5,500円（各7日）・条件一致通知11,000円（最大100件・同意者のみ）・非公開募集22,000円・応募者限定公開11,000円（各30日）＋セット（しっかり告知8,800円/相手へ届ける22,000円）。広告表記必須・自然順位に混ぜない。
- **正式サービスメニュー（相談→個別契約・自動決済しない）**: NAKAMA登録無料/販促プラン月33,000円/販売強化月110,000円＋広告費/売れる仕組み構築100万〜500万/販売成果報酬10〜20%/共創・商品開発300万〜1,000万。トップ・/pricing・/billing に掲載、/consultation?type=service&service=X で受付。
- **実装しない（後続フェーズ・承認後）**: CPC入札・NDAワークフロー・成果報酬の自動請求（UIに準備中とも出さない）。
- 原則:「自分で登録・掲載・応募・商談するなら無料。事務局の人・企画・制作・営業・広告・ネットワークを使うなら有料。」

## 技術スタック（実装済）
- Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4（`src/app/globals.css` に CSS変数）
- DB: PostgreSQL（Supabase, project ref zbyxhtswjrrhlcnzouew, tenant slug `food-japan-summit`）
- ORM: **Prisma 7**（`prisma-client` generator → `src/generated/prisma`。`/src/generated` はgitignore）
- 認証: Supabase Auth（`@supabase/ssr`）＋ Google OAuth。`src/middleware.ts` で保護。
- 決済: Stripe（Checkout / Customer Portal / Webhook。Webhookが課金状態の正）。**LIVEモード**。
- メール: Resend（`src/lib/email.ts`, `EMAIL_FROM`, ドメイン grab-design.com 認証済）
- ホスティング: Vercel（team food-japan）。`package.json` の `"postinstall": "prisma generate"` 必須。

## 開発・運用の作法（重要）
- **指示されていない変更をしない（最重要・ユーザー指示 2026-08-09）**: 依頼された箇所以外のコード・文言・デザイン・CSSに手を加えない。「ついで」の改善や整理は実装せず、提案として報告だけする。共通CSS・共通コンポーネントなど影響が波及する変更は、事前に影響範囲を伝えてから行い、変更後は複数の画面幅（1520/1200/1120/1000/375px 目安）で表示確認する。レイアウト崩れの実害が出たことがある。
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
- ボタン: **`btn(variant, size)`**（`src/lib/ui.ts`）。variant=primary/action/amber/secondary/danger/ghost, size=sm/md/lg。角丸`rounded-lg`統一。
- 入力欄: **`input(size)`**（`src/lib/ui.ts`。2026-08-12 新設）。size=xs(12px・表の中の数値)/sm(13px)/md(14px・既定)。角丸`rounded-md`・枠線`--line`・白地・focusで緑枠までを内包し、**幅やレイアウト（`w-full` 等）だけ後ろに足す**。枠線と背景を自前で出し分けたい場合（未入力ハイライト・期限超過の赤枠）は **`inputBare(size)`** を使い border/bg を呼び出し側で指定する。**新しい入力欄をクラス直書きで作らないこと**。
- 見出しは**2系統**（2026-08-12 に明文化）:
  - ページ側 = `eyebrowCls`/`h1Cls`(22px serif)/`h2Cls`(18px serif)/`h3Cls`(15px semibold)
  - **フォームの章見出しと確認・プレビュー系モーダルのタイトル = `h2FormCls`(16px bold ゴシック)**。入力欄が密集する場所では明朝18pxが重くなるため別系統にしている。会員ゾーンと共通コンポーネント用（公開ページは独自のタイプスケールなので対象外）。
- 押せるカード=影＋ホバーで浮く＋緑枠（OfferingCard/ProducerCard/ProjectCard）。押せない=フラット。
- 配色は CSS変数（`src/app/globals.css`）。背景は白。緑`--green`/`--green-d`/`--green-soft`、赤`--red`/`--red-soft`、オレンジ`--orange`/`--orange-soft`、罫線`--line`/`--line-soft`(薄い方)、**金`--amber`/`--amber-d`/`--amber-ink`/`--amber-line`/`--amber-soft`/`--amber-bg`（「探している」と課金まわり）**、**ゴールド`--gold`/`--gold-d`（ビジネス会員）**、**`--action`/`--action-d`（赤みのオレンジ＝提案・問い合わせの最重要CTA）**。2026-08-12 に金色系216箇所を変数化した。**色は直書きせず変数を使うこと**（直書きすると色の調整で数十ファイルを触ることになる）。
- **取引の段階（PHASES）は表示専用**（2026-08-12）。手で動かせると記録された事実とずれるため、クリックや選択で変えない。色は**済＝淡い黄（`--amber-soft`）／次にやること＝橙（`--orange`）／未達＝白**。光らせるのは「最後に済んだ段階」ではなく**次にやること**（`activeStep`）。
- **レイアウトの注意（指摘あり）**: 2カラム内に高さの違うボタン等を混ぜない。CTAは行として切り出して全幅で整列させる。

## 料金・法務
- 料金表示＝「無料利用0円＋個別支援（税別・個別契約）」（/pricing=利用料金・共創支援）。「無料で登録する」がCTA標準。
- 旧 `startCheckout` は無効化済み（billing/actions.ts に Legacy 保持）。`src/lib/stripe.ts` の PLANS 定数は既存契約表示用に残置。
- **規約・特商法は旧月額文言が残存＝改定差分案は `docs/legal-revision-draft-20260810.md`（弁護士確認前・未適用）**。法務ページ本文は `src/lib/legal.ts`、特商法は `/tokushoho`。
- signup に案内メール同意チェック（任意・users.marketing_opt_in_at に記録。Google OAuth 登録は同意なし=null。配信開始前に配信停止手段の整備が必要）。

## 現在の進捗（3サービス改修）
- **Phase 1 完了**: 料金修正(¥22,000/単一/無料廃止), `/produce` `/crowdfunding` `/pricing`(3サービス比較) `/consultation`(フォーム+Consultationモデル+`info@grab-design.com`通知+自動返信+`/admin/consultations`) `/learn`(最小), トップに3サービス/学び/最終3択CTA, ヘッダー/フッターの3サービスナビ, SEO(title/description)。
- **公開前テスト完了（2026-08-09）**: Stripe live確認（Webhookシークレットはローテーション済）／相談フォーム実送信／登録→確認メール→¥0クーポン決済→課金反映→ポータル／解約（期間終了時キャンセル予約）まで全合格。テストデータ全削除済（会員は株式会社グラブデザイン1社のみ）。手順書=`docs/pre-launch-test-runbook.md`。
- **法務レビュー反映済（2026-08-09）**: 課金サイクル文言をStripe実装（アニバーサリー課金）に統一→弁護士フィードバック全反映（規約17条=通信の秘密/4条=決済完了で契約成立/10条=解約期限23:59JST/29条、プライバシー4項=明示同意/7項=海外委託先実名/8項=外部送信ポリシー化、特商法増補、Checkoutのcustom_textで特商法12条の6対応、/billing契約条件ボックス、signup事業目的チェック）。施行日=「制定：2026年8月7日／改定・施行：2026年8月9日」。レビュー用docx=`docs/FOOD_JAPAN_NAKAMA_法務レビュー用_20260809.docx`。
- **公開ページ大改修（2026-08-09 午後・全て本番反映済み）**:
  - `/about` 写真ストーリー版に全面刷新（Summit写真・かき氷事例・会員特典チェックリスト。写真=public/about/）
  - `/produce` 顧客目線版に全面刷新（悩みチェックリスト・イラスト4枚=public/produce/action-*.jpg・料金4プラン=着手金15万〜/50万〜/月30万〜/成功報酬・FAQ9問+FAQPage構造化データ）
  - `/crowdfunding` マーケ訴求版に全面刷新（写真ヒーロー・手数料35%=Makuake20%+当事務局15%+着手金10万・青島クラフト実事例=case-beer.jpg・FAQ8問）
  - `/food-loss` 食品循環プロデュースとして新設→AIO改修（トマト反転ヒーロー=文字右・FAQ15問5カテゴリ=農水省定義に沿い食品ロス/食品副産物を使い分け・Service+FAQPage構造化データ）
  - ヘッダー統一: 下層もトップと同一（大ロゴ+6項目メニュー+緑ログイン）。モバイル=左ハンバーガー（HeroMobileMenu）。≤820pxで項目非表示→バーガー、≤1500pxはコンパクト表示
  - CTA統一:「NAKAMAに申し込む」（フッターは緑ボタン化）。3サービスカード=NAKAMAモデル/詳細はこちら/プロデュース料金非表示
  - 相談フォーム: 種別「フードロスについて相談したい」追加＋種別=food-lossで専用質問（状態/成分/発生量/地域/処分費/安全性/過去の対策/法規制→productSummaryに整形追記。DB変更なし）
  - 法務: 規約§16に特商法のしつこい勧誘・再勧誘禁止＋§18警告2回で登録抹消。3サービスページ料金欄に準委任契約の説明（売上非コミット/完成責任なし/善管注意義務）。フッター©=FOOD JAPAN SUMMIT実行委員会
  - 認証: ログアウト→トップへ。signup=利用規約リンク付きチェックボックス。会員エリアのロゴ→トップへ
- **Phase 3 完了（2026-08-09 夜・本番反映済み。仕様書Phase 3=案件・マッチング体験の改善）**:
  - `/search` 統合検索: 3対象トグル（売りたい・買いたい／共創プロジェクト／登録事業者）＋ページネーション（24件/頁・総件数表示）。旧URL `target=projects` は台帳検索として互換。共創PJの業種フィルタは `fromRole`、地域は新設 `Project.area`（migration `add_project_area`・掲載フォームに都道府県セレクト追加）
  - お気に入り拡張: `/ledger/[id]`・`/projects/[id]` 詳細に☆ボタン（`favorites/actions.ts` の `toggleFavorite`、offering/project対応）、`/favorites` 一覧ページ新設（企業・台帳・PJの3セクション）、NAVに「お気に入り」追加
  - 空状態の統一: `src/components/EmptyState.tsx` 新設（タイトル+説明+CTA）。/search・/projects・/ledger・dashboard・/deals・messages に適用
  - メール通知（Resend流用）: 新着メッセージ（相手が未読を溜めていない時のみ=洪水防止）・PJ応募（新規のみ）・掲載非公開化。宛先は `getMemberUserEmails()`（member.ts、SUSPENDED除く）
  - 事務局: `/admin/inquiries`（問い合わせ・応募のメタ情報一覧。**規約17条によりメッセージ本文は表示しない**）、`/admin/listings`（掲載の事後チェック=即公開のまま監視し、理由つき非公開化→掲載者へ自動メール）。/adminに指標2種（問い合わせ・応募）とリンク追加
  - 台帳の掲載審査は「事後チェック方式」を採用（ユーザー承認済み。事前審査はしない）
- **セキュリティ検査（2026-08-09）→ 主要修正 完了（2026-08-10・本番反映済み）**: 「高」6件＋「中」の主要件を修正。Webhook=フェイルクローズ+StripeEventテーブルで冪等化+全ライフサイクルイベント対応、Member に stripeCustomerId/subscriptionId 保存＋deleteMemberで先にStripe解約、SUSPENDED実効化（getSessionUser遮断→/suspended・Supabaseバン・掲載非表示）、ストレージ削除の所有権検証（src/lib/upload.ts）、画像はマジックバイト検証でSVG不可、markThreadRead/saveDraft認証、requireSuperAdmin（管理者作成/剥奪・課金・削除はREVIEWER不可）、middlewareパス完全一致化、相談フォームhoneypot+レート制限（Consultation.ip）、メールHTMLエスケープ、**監査ログ（AuditLog+/admin/audit）**。migration=`security_hardening`。検査全文と修正状況・残課題=`docs/security-audit-20260809.md`、バックアップ手順=`docs/backup-runbook.md`
- **ダッシュボードUX改修 完了（2026-08-10・提案書=NAKAMAサイト制作/NAKAMA_dashboard_UI_implementation_proposal（チャット貼付）+ NAKAMA_dashboard_UI_mockup.html 準拠・本番反映済み）**:
  - dashboard: 「今日は何を進めますか？」見出し+会員状態タグ（NAKAMA会員/お支払い待ち/未加入）、初回セットアップ4ステップ（記入率%バー・「あと◯項目」=member.tsのcountMissingProfileFields・審査状態表示）、主要4アクション（目的ベースの文言・メッセージ未読バッジ）、事務局相談パネル（?type=付き4リンク・グリーン地）、プランパネル（未課金は加入CTA）、「最近の動き」統合タイムライン（未読メッセージ/商談更新/PJ応募をマージ・空はCTA）
  - NAV再編: 上位4=ホーム/パートナーを探す/案件を登録する/メッセージ、「進行中の活動」=商談・商談ステータス・共創プロジェクト・お気に入り、「アカウント」=プロフィール・お支払い・事務局管理（NavItem.sectionでグループ見出し）
  - モバイル: 下部固定ナビ5項目（ホーム/探す/登録/メッセージ/その他=ドロワー。44px以上・safe-area対応・mainにpb-24）
  - **公開ゲート（サーバー側）**: 台帳のtogglePublish・プロジェクトのsubmitProjectは paymentStatus=PAID のみ（未課金は/billingへ）。**下書き作成・編集・閲覧・検索は未課金でも全部可**（ユーザー決定 2026-08-10）
  - 文言: 持ち寄り→「案件を登録する（売りたい・買いたい）」、dashboard一覧見出し「みんなの案件」
  - **横はみ出しの根本修正**: (app)レイアウトのグリッドを`md:grid-cols-[238px_minmax(0,1fr)]`+メイン列にmin-w-0（商談ボード含む全ページでページ全体の横スクロールを防止。ボードは列コンテナのみ横スクロール）
  - 未対応（提案書のC優先度）: アクセシビリティ総点検・イベント計測。vitest導入は見送り（ユーザー決定）
- **ダッシュボード最終簡素化（2026-08-10・NAKAMA_dashboard_final_ClaudeCode_instructions.md 準拠・本番反映済み）**: 情報削減が目的。①主操作3つのみ（案件を探す=primary緑/案件を登録する/事務局に相談する。相談種別はフォーム側で選択）②プロフィール進捗は1行（%+あと◯項目+バー。100%かつAPPROVEDで非表示）③「進行中の活動」=商談+共創PJ統合・要返信優先・最大3件（要返信=商談スレッドの未読で判定）④おすすめ案件=**暫定で新着4件**（おすすめ条件ロジックはTODO・コード内コメントあり）⑤相談CTAは右カラム1つ⑥会員状態は右カラム「ご利用状況」1か所のみ（PAIDは次回決済日をStripeから取得・失敗時非表示。モバイルではご利用状況カード非表示=モック準拠）⑦旧下部ブロック（数字カード/みんなの案件/新着PJ/最近閲覧/お気に入り/あなたのPJ）を削除⑧NAV=商談・商談ステータス併記をやめ「進行中の活動」(/deals)に一本化（ボードは/deals内リンクから）、共創PJ・お気に入りは「その他」⑨モバイル下部ナビ=ホーム/探す/活動/メッセージの4項目⑩title=マイページ｜FOOD JAPAN NAKAMA。**判断メモ**: グローバルナビのトップバー化はせず既存サイドバー維持（指示の「既存デザインシステム優先」「/dashboardのみ置き換え」に従う）。/deals の見出しは据え置き。
- **連打対策（2026-08-10）**: 下書き作成の連打で空offering16件が量産→削除済み。createDraftOffering/createDraftProject は既存の空下書きを再利用（サーバー側冪等）＋作成ボタンは PendingButton（src/components/PendingButton.tsx・useFormStatus）で送信中disabled。
- **売りたい登録改修（2026-08-10・仕様=NAKAMAサイト制作/NAKAMA_sell_listing_ClaudeCode_instructions.md・本番反映済み）**:
  - Offeringに取引条件13列追加（migration `offering_trade_terms`・全nullable=既存案件互換）: priceType/priceAmount/priceUnit・minOrderText・itemCondition・storageType・shelfLifeText・specification・supplyFrequency・deliveryMethods[]・shippingCostBearer・applicationDeadline・desiredPartner
  - offering-taxonomy.ts: 選択肢定数（PRICE_TYPES等）+ formatPrice/formatDeadline + isFoodCategory(食材・原料)/isGoodsCategory(+加工設備)
  - OfferingForm全面刷新: 基本情報/価格と数量/状態と提供時期/詳しい取引条件のセクション構成・カテゴリ別に食品/物品固有項目を切替・**右に「買い手からの見え方」ライブプレビュー**（主要項目は制御コンポーネント）。編集ページはmax-w-[1100px]の2カラム
  - **`/ledger/new?direction=GIVE|WANT`**: 開くだけではDBレコードを作らない（初回保存=createOfferingで作成→編集ページへ。写真は保存後に追加）。同タイトル1分以内は再利用する二重送信ガード。旧createDraftOfferingは廃止・一覧のボタンはLink化
  - **公開時のみ必須検証**（missingForPublish・GIVEのみ）: 希望価格（固定は金額+単位）・募集期限（過去日不可）＋物品系=状態/受け渡し/発送元＋食品=提供量/最小取引量/保存/期限/品質規格/頻度。不足時は `?missing=` 付きで編集画面へ戻しバナー表示。**WANTと既存公開中案件は従来どおり**
  - カード: 価格（緑太字）/最小取引量/状態/期限を表示（値がある場合のみ）。詳細: 「取引条件」テーブル＋品質規格＋希望する相手＋「この案件について問い合わせる」CTA＋流れ表示（送信→確認→相談）
  - 未実装TODO: 証明書・検査表のファイル添付、最小取引量×総量の整合チェック（自由記述のため）、規格外理由・アレルゲン欄、設備カテゴリの型番等
- **売りたい第2次改善（2026-08-10・仕様=NAKAMAサイト制作/NAKAMA_sell_story_ClaudeCode_instructions.md・本番反映済み）**:
  - Offeringに追加（migration `offering_story_fields`・全nullable=旧案件互換）: listingPurpose(trade/challenge)・tagline・featureDiff・backgroundStory・usageIdeas・challengeCurrent/Scale/Tried/Ask/Value・sampleAvailability・priceTaxType
  - 登録フォーム: 冒頭に「今回、何をしたいですか？」タイプ選択（商品・原料を売りたい／課題を一緒に解決したい）→「魅力と背景」セクション=質問に答える形式（入力例つき）。課題解決型は黄色地の追加5問。desiredPartnerは魅力セクションへ移動。価格に税区分、取引条件にサンプル提供を追加
  - 公開時検証（GIVEのみ・タイプ別）: trade=説明・違い・使い方・相手が必須／challenge=＋課題・協力・価値。旧公開中案件・WANTは従来どおり
  - 写真: 上限6→10枚（推奨ショット案内つき。attachTempImagesも10）
  - カード: 一言特徴（2行省略）＋「課題解決」ラベル。詳細: tagline・タイプバッジ・上下の問い合わせCTA（#inquiryアンカー）・「この商品・原料について→特徴・こだわり→生まれた背景→課題ブロック→使い方→取引条件（税区分/サンプル可否行）」の構成。空の任意項目はセクション非表示
  - 買い手プレビュー: カテゴリ連動の行表示＋未入力は「入力する→」で該当欄へジャンプ＋概要/おすすめ/タグのライブ反映
  - 未対応: 画像ごとの説明・altテキスト、AI文章補助、設備カテゴリ固有項目
- **UI細部改善（2026-08-10 夜・すべて本番反映済み）**:
  - **確認モーダル2種**: 削除=`src/components/ConfirmDeleteButton.tsx`（本当に削除しますか？／今はしない・削除する。台帳とプロジェクトの削除に適用）／実行=`ConfirmActionButton.tsx`（汎用。台帳「公開する」=公開しますか？・公開しない/公開する、プロジェクト「掲載を申請」に適用）
  - **画像の並べ替え**: DnD＋◀▶ボタン（スマホ用）。1枚目=メイン画像バッジ。OfferingImageUploader/TempImageUploader/ProjectFormの3か所。サーバー側 `reorderOfferingImages`/`reorderProjectImages` は既存URLの順列のみ許可
  - **公開中バッジ**: 橙(#F59E0B)の大型ピル＋白ドットのpingアニメーション（台帳「公開中」・プロジェクト「掲載中」）
  - **公開必須バナーの再判定**: 判定関数を `src/lib/offering-publish.ts` に共通化。編集画面のバナーは**保存済みの現在値から毎回判定**（?missing=の値は使わない）→入力・保存で消え、全部揃うと緑の「✓公開できます」表示に変わる
  - **買い手プレビューの完全一致**: 全質問フィールドを制御化し、詳細ページと同じ並び（商品について→特徴→背景→課題(黄枠)→使い方→おすすめ→相手→タグ）でライブ反映。未入力は「入力する→」アンカーで該当欄へジャンプ。行はカテゴリ連動（状態・最小取引量は該当カテゴリのみ）
  - **単位追加**: PRICE_UNITSに円/人・円/1ユーザー、AMOUNT_UNITSに人・1ユーザー
  - **ダッシュボード「あなたの公開中の案件」**: 自分の公開中の売りたい・買いたいをOfferingCardで2列表示（進行中の活動は商談+PJの行リスト最大3件に整理）。カード下に**閲覧◯回・興味あり◯人（太字）**＋問い合わせがあれば橙の「📩問い合わせ◯件」バッジ＋編集リンク。統計=OfferingView総数/Favorite(targetType=offering)数/Thread(offeringId)数のgroupBy
  - **問い合わせメール**: 案件経由の初回問い合わせは件名「【FOOD JAPAN NAKAMA】「案件名」にお問い合わせがありました」（notifyNewMessageにlistingTitle追加）
  - **低解像度画像の警告**: `src/lib/upload.ts` の validateImageFile が実寸（JPEG/PNG/WebP/GIF）を解析し、**横800px未満は受け付けつつ黄色警告**（横1200px以上推奨。ユーザー決定=拒否はしない）。適用=台帳編集/新規・プロジェクト画像。※事例: 152pxのWebPをアップして詳細ヒーローで荒く見えた→アプリ側は原本をそのまま配信しており劣化処理は無い
- **共創プロジェクト大改修 フェーズ1 完了（2026-08-10・仕様=NAKAMAサイト制作/NAKAMA_projects_ClaudeCode_instructions.md・AUBA参考。売りたいフォーム仕様への統一も同時実施）**:
  - DB（migration `project_cocreation`・全て追加的＝旧案件はフォールバック表示で互換）: Project に主目的 purposeMain＋関連目的 purposeSub[]・一言目的 oneLiner・募集期限 deadline・targetTiming・leaderName・質問5問（challengeIssue/Why/Who・coCreationGoal・futureVision）・現在地（stage＋stageDone/Learned/Issues/Schedule・existingPartners）・条件（period/place/rewardPolicy=未定と無償は別値/contractNote）・eventFlags[]（FJS連携6種）・supportRequested/supportOfficial（伴走中表示は事務局のみ）。新モデル **ProjectRole**（募集役割：役割名/依頼内容/条件/募集数/期間/報酬/isPublic）・**ProjectResource**（提供資源：分類10種/説明/提供条件）・**ProjectActivity**（活動履歴）。**ProjectApplication** に興味表明4欄＋desiredRole＋進捗管理（progressStage=inquiry/meeting/planning/pilot/contract＋hold/declined/done、nextAction/nextActionDue/assignee/nextMeetingAt/ownerMemo/holdReason・updatedAt）。定数=`src/lib/project-taxonomy.ts`、公開検証=`src/lib/project-publish.ts`
  - **/projects/new**: 開くだけではDBレコードを作らない（初回保存で作成＋同タイトル1分以内は再利用）。写真は一時アップロード `projects/tmp/<memberId>/`→保存時にmove。旧 createDraftProject 廃止
  - フォーム＝売りたい仕様に統一: 章立て（目的と基本情報／背景と実現したいこと=質問形式・入力例つき／現在地／持っているもの・足りないもの=役割と資源の動的リスト（hidden JSONで送信・サーバー側で検証）／条件・イベント連携）＋右に「公開ページの見え方」ライブプレビュー（未入力は「入力する→」アンカー）
  - **掲載申請時のみ必須検証**（missingForProjectPublish: プロジェクト名/一言目的/主目的/課題/実現したいこと/段階/期限(過去不可)/公開役割1件以上）→不足は `?missing=1` で編集画面バナー（保存済み現在値から毎回再判定・揃うと緑✓）。既存公開中は対象外。申請=PAIDのみ・事前審査（pending→事務局承認）は従来どおり
  - 詳細ページ=指示書§7の並び（一言目的→バッジ→CTA→実現すること→課題(黄枠)→現在地→提供資源→募集役割カード→条件表→FJSラベル→主催者→CTA再掲）。募集終了・期限切れはCTA無効化＋理由表示
  - 「興味があります」= applyToProject 拡張（理由=必須・提供できるもの・関わり方・面談希望・希望役割・伝えたいこと。期限切れは受付拒否・新規時のみメール通知＋活動履歴。応募済みは現在の進捗を表示）
  - **/projects/[id]/applicants**（主催者のみ・他人は404）: 応募者ごとに5段階＋保留/見送り/完了の明示変更（DnDなし=指示書§10）、次の行動/期限/担当/次回打合せ/非公開メモ/保留理由、期限超過⚠・7日以内⏰・未設定は「次の行動を設定」、活動履歴、既存Threadがあればメッセージ導線（新しいメッセージ機能は作らない）。完了系は折りたたみ
  - 一覧: コピー「仲間と一緒に、食の新しい事業をつくる」＋GET絞り込み（q/目的/地域/段階/FJS発/募集中のみ=URLクエリで戻る維持・0件時は条件解除と相談導線）。ProjectCard 拡張（一言目的・段階・募集役割3件・期限・FJS/伴走中ラベル。旧データは非表示）
  - ダッシュボード「進行中の活動」に主催案件の応募進捗を統合（優先度: 未読0→期限超過・間近1→打合せ7日以内2→更新順3）
  - 相談フォーム: 種別「共創プロジェクトの伴走を相談したい」追加。`/consultation?type=project&project=<id>` でプロジェクト引き継ぎ（タイトルはサーバー照合・公開中のみ表示）＋希望する支援6種→productSummaryに整形追記（Consultationモデル変更なし）
  - 検証: tsc/eslint/next build 合格。375pxで横スクロールなし。初回保存→編集→不足バナー→緑✓→確認モーダル削除まで実機確認（検証用テスト会員・テスト案件は削除済み＝本番データはグラブデザイン1社のみを維持）
  - **フェーズ2へ残し（指示書§17・先行実装しない）**: カンバンDnD・自動リマインド・おすすめマッチング・数値レポート・AI原稿補助・電子契約・資料添付（公開範囲つき）・supportOfficial の管理画面トグル
  - **⚠️開発注意**: schema変更後はローカルdevサーバーの再起動が必要（古いPrismaクライアントを掴んだままだと PrismaClientValidationError）。ClaudeCODE側 `.claude/launch.json` は attach型→起動型（`npm run dev --prefix ~/Development/food-japan-connect`）に変更済み
- **プロジェクト承認フロー改善（2026-08-10・本番反映済み）**: ①事務局（同一テナントの管理者）は公開前のプロジェクト詳細を閲覧可（従来は所有者以外404で承認前の内容確認ができなかった）。承認待ちは詳細ページ上部に承認・差し戻しバー、管理者閲覧では閲覧数を数えない。②**差し戻しは理由必須のモーダル**（`SendBackButton.tsx`。/adminと詳細ページの両方）→ `adminSendBackProject` が status=draft＋`Project.reviewNote` 保存（migration `project_review_note`）＋監査ログに理由記録＋**掲載者へ理由つきメール**（notifyProjectSentBack）。掲載者の編集画面に黄色バナーで理由表示、再申請（submitProject）で消去。③**承認メール**（adminApproveProject→notifyProjectApproved・公開ページへのリンクつき）。旧 adminReviewProject は approve/sendBack の2関数に分割。メール失敗でも承認/差し戻し自体は成立（catchしてログ）。④/adminに**「差し戻し中のプロジェクト」一覧**（status=draft かつ reviewNote あり＝再申請待ちを追跡。再申請でreviewNoteがクリアされ承認リストへ戻る。理由・差し戻し日・会員名を表示）。⑤/adminの**全削除ボタンをConfirmDeleteButtonモーダル化**（お知らせ・バナー・記事キュレーション・会員の「完全に削除する」＝window.confirm廃止。売りたい・買いたいの削除と同一仕様）。ConfirmDeleteButtonはaction完了後に自分で閉じるよう共通変更（リダイレクトしない管理画面の削除に対応。既存の台帳/PJ削除はredirectするため影響なし）。E2E検証済み（差し戻し→理由保存・バナー・メール→再pending→承認→published・理由クリア。テストデータは削除済み）
- **パフォーマンス改善（2026-08-10・本番反映済み）**: ①`getSessionUser` を React `cache()` 化＝layoutと各ページの二重呼び出し（Supabase AuthへのHTTP＋DB照会×2）を1回に（全会員ページに効く。**注意: getOrCreateMemberForUser はキャッシュしない**＝アクション内で member を更新→同一リクエスト内の再レンダーで古い値が出るため）②(app)layoutの未読バッジ＝スレッド一覧→カウントの2クエリをリレーション条件の count 1回に＋アバターと並列化 ③dashboard＝Stripe次回決済日を `unstable_cache` で1時間キャッシュし初段のPromise.allへ（毎表示のStripe API待ち数百msを排除）、2段目の直列4往復（商談未読groupBy/案件統計3種/応募者名/views24h）を1つのPromise.allに統合 ④詳細3ページ（ledger/[id]・projects/[id]・producers/[id]）とfavorites・projects一覧の独立クエリを並列化 ⑤カード画像（OfferingCard/ProjectCard/ProducerCard）に `loading="lazy" decoding="async"`。ローカル計測でdashboardウォーム 約1.2〜1.4秒→約450〜600ms。**残課題（未実施・提案のみ）**: 認証系の直列（signIn後の遷移）、admin系ページの並列化
- **画像最適化 併用実装（2026-08-10・本番反映済み）**: ①**アップロード時縮小**＝`validateImageFile`（src/lib/upload.ts）が sharp で横1600px超を自動縮小（`.rotate()`でEXIF回転を画素に反映してから縮小。GIFはアニメ保護のため対象外・失敗時は原本のまま受理）。戻り値に `body: Buffer` を追加し、**全10箇所のアップロード**（ledger×3/projects×3/profile×3/banner×1）を `v.body` 保存に変更。テスト済（3000px JPEG→1600px・600pxは無変換+警告・1600pxちょうどは無変換）②**next/image**＝next.config.ts に images.remotePatterns（zbyxhtswjrrhlcnzouew.supabase.co/storage/…）を追加し、カード3種（OfferingCard/ProjectCard/ProducerCard）のサムネイルを `<Image fill sizes>` 化（親は既存の relative aspect-[4/3] 枠なのでレイアウト不変。配信時にWebP変換+表示幅への縮小）。ProducerCardの小ロゴと詳細ページのヒーローは従来の`<img>`のまま（アスペクト固定枠が無くレイアウト変更リスクがあるため見送り）。**注意**: next.config.ts の変更は dev サーバー再起動が必要。Vercel Hobbyの画像最適化は元画像 月1000枚まで（現規模では余裕）。**既存の大きい画像のストレージ内一括縮小は未実施**（やる場合はバックフィルスクリプトを別途）
- **「探している（買いたい）」改修 Phase 1 完了（2026-08-10・仕様=NAKAMAサイト制作/NAKAMA_buyer_ClaudeCode_instructions.md・本番反映済み）**:
  - **不具合修正（指示書§2）**: 「買いたいを登録」でログインへ戻される件＝コード上は再現せず（最有力=セッション失効/多タブのトークンローテーション）。ただし middleware の `next` に**パスしかセットされずクエリ（direction=WANT）が消える**実バグを発見・修正（`path + request.nextUrl.search` に）。signIn/GoogleButton/auth-callback は next 対応済みだったため、これで**未ログイン→ログイン→direction保持で元のフォームへ完全復帰**をE2E確認済み
  - **名称変更（§3・DB値WANTは不変）**: DIRECTION_LABEL/SHORT の WANT=「探している」。NAV「案件を登録する」→**「売りたい・探している」**。/ledger見出し・ボタン「＋ 探しているものを登録する」・セクション「探している商品・原料（買いたい）」・空表示・登録/編集ページ見出し「探している商品・原料を登録する」+指示書コピー。検索トグル・favorites・admin/listings・producers・LP・faq/pricing/flow/JsonLd/Stripe機能説明も「売りたい・探している」に統一。WANT公開中の詳細に**「仕入れ・調達先を募集中」バッジ**
  - **募集タイプ（§4）**: Offering.seekingType（specific特定の商品/proposal提案してほしい/oem/surplus余剰・規格外/codev共同開発/other・taxonomyのSEEKING_TYPES=補足文つき）。WANTフォーム冒頭に「何を探していますか？」6択ラジオカード（切替で入力値は消えない）。カードに短縮バッジ（商品指定/提案募集/OEM・PB等）・詳細にフルラベル
  - **使用目的・販売先（§5A）**: Offering.usageContext。売り手の提案判断に最重要のため公開時必須
  - **必須・希望・相談可能（§6）**: 新モデル **OfferingRequirement**（kind=産地/数量/価格/納期/保存/規格/認証/その他 × level=must/want/negotiable、hidden JSONで送信・サーバー検証・置換保存）。フォームは行エディタ（分類/内容/レベル、レベル色分け）。詳細ページで**必須（赤）/希望（黄）/相談可能（緑・代替案歓迎）にグループ表示**。プレビューにもレベルバッジつきでライブ反映
  - **公開時検証の変更**: WANT=タイトル+募集タイプ+使用目的が必須に（missingForPublish。従来の「タイトルのみ」決定を指示書§5Aに従い更新。既存公開中案件には適用されない）。WANTのCTA=「商品・原料を提案する」に文言変更（機能は既存の問い合わせ=Thread）
  - migration=`offering_seeking`（全てnullable・既存WANT案件はフォールバック表示で互換）。E2E確認済み（未ログイン→next復帰→タイプ/使用目的/条件2件の登録→保存→再表示→公開→詳細のバッジ/条件グループ表示→一覧の新コピー+バッジ。テストデータ削除済み）
  - **文言・入力例の調整（同日・ユーザー指示。すべてWANTのみ。GIVEは従来どおり）**: ①**地域ラベルの誤りを修正**＝買い手は受け取る側なので「発送元・受渡地域」→**「発送先・受取地域」**（フォーム・プレビュー・詳細ページの3か所を direction で出し分け。プレースホルダも「例：東京都 千代田区（納品先）」に。DBの `area` 列は共用のまま）②条件の分類に**「支払い方法」**（payment）を追加＋ヒント文に「請求書払い（振込）・PayPay・応相談」を明記 ③条件セクションの説明から「すべて必須にすると提案が来にくくなります。」を**削除** ④**「おすすめポイント」→「うちの特徴」**（フォーム・プレビュー・詳細の3か所。入力例も買い手目線＝「毎年クリスマスになるとケーキに使ういちごが不足しています／はじめてのお取引から再発注につながる可能性もございます」）⑤**入力例（グレー文字）をいちご調達の具体例に差し替え**＝タイトル「クリスマスで使うイチゴを探している」／詳細説明＝用途と品質条件を書いた文章例／使用目的＝用途・産地・規格・サイズ・荷姿・必要数量・納品希望・納品場所・価格・継続取引の箇条書き＋締めの一文（textareaを3行→13行にしてスクロールなしで全文表示。375pxでも横スクロールなしを確認）
  - **未対応（提案済み・ユーザー判断待ち）**: WANTフォームに残る売り手目線の表記2件＝「提供可能量」（買い手目線では**必要数量**）・「提供頻度」（**発注頻度**）。ラベル文言のみの変更で影響は軽微
  - **Phase 2以降（未実装・要承認）**: 公開範囲設定（価格・数量等の非公開/提案後開示）・構造化された提案フォーム・提案一覧比較・提案ごとの5段階進捗管理・通知連携（§7〜§12）。Phase 3=下書き自動期限通知・事務局伴走画面・運営レポート
- **バグ再点検（2026-08-10・2件修正）**: ①getOrCreateMemberForUser＝getSessionUserのcache()化で同一リクエスト内（アクション→再レンダー）に member が二重作成されうる理論穴→memberId未設定時のみusers行を読み直すガードを追加 ②プロジェクト保存で旧 `toRole` が空文字→nullで消える退行→更新対象から除外（募集役割ProjectRoleに移行済みのため入力欄なし）。他の当日変更（並列化・unstable_cache・next/image・v.body保存・確認モーダル）は机上＋実機で再確認し問題なし。DB健全性も確認（孤児user/member・二重リンクなし。会員3=グラブデザイン/umetaku1@gmail(未入力・APPROVED)/tongatuned31@gmail(DRAFT)）
- **⚠️運用TODO（ユーザー作業）**: ①Stripeダッシュボードで Webhook に `invoice.payment_failed`・`customer.subscription.updated` の2イベントを追加（未追加だと決済失敗が反映されない）②Supabaseプラン確認→Pro+PITRでバックアップ有効化（backup-runbook.md）
- **次にやる候補（未着手・着手前に要承認）**:
  1. **探している Phase 2**（買い手指示書§7〜§12）: 公開範囲設定（価格・数量・会社名の非公開/提案後開示）→ 構造化された提案フォーム → 提案の一覧比較 → 提案ごとの5段階進捗（共創PJの応募者管理と同じ作りで実装可）→ 通知連携
  2. **共créプロジェクト Phase 2**（プロジェクト指示書§17）: カンバンDnD・自動リマインド・おすすめマッチング・資料添付（公開範囲つき）・`supportOfficial`（事務局伴走中ラベル）の管理画面トグル
  3. 3サービス仕様書 Phase 2以降: 学び/セミナー本実装、掲載上限、共créプロフィール構造化+食の検索条件、自動マッチング提案+週次ダイジェスト、共créシート/企画書自動生成、共cré事例、analytics（導入時は外部送信ポリシー更新必須）
  4. 画像の**既存分の一括縮小**（バックフィルスクリプト。新規アップロードは自動縮小済み）／詳細ページヒーローの next/image 化
  5. ダッシュボードの「おすすめ案件」を新着4件→条件スコアリングに置き換え（コード内TODO）

- **課金システム Phase 1 実装（2026-08-10 夕・未コミット・本番未デプロイ）**: 仕様=00_Claude提出用_最終実装指示。①DB=migration `billing_phase1`（BillingProduct/BillingOrder/BillingOrderItem/ListingPromotion/ContactUnlock/ContactCreditLedger＋Offering優良3列）+`billing_phase1b`（Offering.visibility＋MatchedNotice）+`user_marketing_opt_in`。②中核=src/lib/billing-core.ts（純粋ロジック・vitest 18件合格）/billing.ts（商品マスターseed・Checkout mode=payment・履行・スポンサー枠取得。期間は同一効果の加算=scheduled行）/contact-credits.ts（ロット台帳・期限順消費・冪等付与/返還/失効）。③紹介料フロー=/ledger/[id]/propose（料金明示・残高・購入・送信。sendProposalは1トランザクションでunlock作成+消費+スレッド+メッセージ。会員はクレジット消費なし・未読返還対象外）。sendInterestはWANT×未解放をproposeへリダイレクト（バイパス防止）。markThreadReadでunlock.openedAt記録。④承認時に3件付与=member.ts setMemberReview（idempotency signup3:memberId）。⑤Webhook拡張=checkout.session.completedのbillingOrderId分岐→fulfillPaidOrder＋charge.refunded同期（既存サブスク処理は不変）。⑥掲載オプション=/ledger/[id]/options（セット先・4分類・会員割引表示・重複警告・見積系は相談導線）。編集画面に「無料で公開する」＋「有料オプションを追加する」。⑦表示=/searchに最上部PR枠+注目枠（広告表記・日替わりローテ）+急募バッジ（OfferingCard urgent prop）。visibility="public"フィルタ=search/LP/sitemap/producers/favorites/dashboard新着。詳細=privateは所有者・管理者以外404、applicant_onlyは掲載者が返信するまで社名・事業者情報を非開示。⑧管理=/admin/billing（商品マスター編集=SuperAdmin・seed投入ボタン・オプション審査承認/否認・条件一致通知の審査/送信=同意者のみ最大100件・優良案件確認/解除=根拠必須・注文・台帳）。⑨cron=/api/cron/billing-daily（vercel.json 0 0 * * *・CRON_SECRET必須(本番)・scheduled→active/期限切れ/3日前通知1回/14日未読返還/クレジット失効。表示側もendsAt判定で二重防御）。⑩メール=決済完了/終了予告/終了/未読返還/条件一致通知（広告表記+配信停止案内）。⑪/billing全面刷新（残高・プランカード・サービスメニュー・購入履歴）。**運用**: 商品はseed後すべて非公開→管理画面で有効化が必要。CRON_SECRETをVercelに追加要。**決済E2E全合格（2026-08-10夜・Stripeテストモード＋stripe CLI listen＋テストアカウントで実施→全テストデータ削除済み）**: 商品seed投入(admin UI)→UI有効化→提案ページ(料金明示・残高0で送信不可)→1件購入Checkout(4242カード)→Webhook→注文fulfilled→クレジット+1(180日)→消費+unlock+スレッド作成(1トランザクション)→二重課金防止(解放済み→無料)→14日未読返還(cron・2回目0=冪等)→優良案件判定(バッジ・3,300円)→会員無制限(消費なし・返還対象外)→掲載オプション購入で会員20%割引(5,500→4,400・discount_amount記録)→featured active→検索スポンサー枠(広告表記)→Stripe返金→charge.refunded→注文refunded自動同期→審査承認フロー(pending_review→active・監査ログ)。テスト用env=`.env.local.stripetest`（テストキー入り・gitignore済。stripe CLIバイナリはscratchpad）。**本番運用開始の残り=/admin/billingで商品を有効化するだけ**（現在全商品active=false）。CRON_SECRET設定済み・Webhook 6イベント設定済み。バナー広告の申込管理・SNS/特集の進行管理はPhase 2。
- **無料化改修（2026-08-10・本実装。未コミット時は要ビルド確認）**: ①課金導線停止=startCheckout無効化・signup→/dashboard・/billing全面書換（無料明示+既存契約者ポータル+個別支援表）②PAIDゲート撤廃=sendInterest/sendMessage/startConversation/togglePublish/submitProject/applyToProject・Composer locked/UpgradeToMessage削除・dashboardご利用状況を無料会員表記へ③表側=トップ（新FV「食の課題を、全国のNAKAMAと事業に変える。」・2導線・件数つき3区分・サービス4種・Summit工程・CTA「無料で登録する」）・about（MEMBERSHIP→無料/依頼2列比較）・pricing・FAQ9問・flow・ヘッダー/フッター/モバイルメニュー・Paywall文言・produce/food-lossの月額文言・layout metadata・llms.txt・JsonLd（月額Offer削除）④共創テーマ相談=consultation type=theme（探している相手・公開可否→productSummary整形、予算帯6択に変更、admin/メールのラベル追加）⑤同意=signupに案内メール同意（migration user_marketing_opt_in・auth.tsでuser_metadata→users行へ引継）⑥休眠=migration billing_phase1（課金6テーブル+Offering優良案件3列。全て空・未参照）。検証=tsc/eslint(既存deals/page.tsxのDate.nowエラー1件は既存・未修正)/next build/ブラウザ（トップ・pricing・faq・about・consultation・signup・375px横スクロールなし）。**E2E未実施**=無料ユーザーのメッセージ送信・公開申請（本番テストアカウント手順で公開後に確認予定）。**残**=規約・特商法の改定反映（差分案承認待ち）・退会セルフサービス・配信停止手段。

- **Premium改称＋引き合い課金（2026-08-10 夜・本番反映済み）**: ①月額22,000円を「**NAKAMA Premium会員**」に改称（規約の呼称=Premium会員プラン・全UI・特商法）。ダッシュボードのユーザー名上にPremiumロゴバッジ（public/premium-badge.png・PAID時のみ）。ゴールド基調 #C9A053/#A87F2F/#FDF9EF（billing/pricingのカード・申込ボタン・20%OFFチップ・会員状態表示）。②**引き合い課金**（ユーザー指示で最終実装指示の「返信無料」を上書き）＝「売りたい」に受信した問い合わせは**1通目のみ無料閲覧・2通目以降の閲覧・返信はPremium特典**。実装=src/lib/inquiry-gate.ts（判定）・スレッド画面モザイク（本文はサーバー秘匿）・sendMessageブロック・markThreadReadは1通目のみ既読・通知メール本文秘匿・一覧プレビュー秘匿。対象外=WANT提案スレッド・買い手側・案件に紐づかないスレッド（producers経由の直接スレッドは**制限されない抜け道**として残存・要検討）。規約第7条/7条の2・特商法・FAQ・pricing・billing・about・llms.txt改定済み。**弁護士確認依頼書には本変更が未記載**（追補が必要）。

- **admin整理・通知・仕上げ（2026-08-10 深夜・本番反映済み）**: ①会員管理を `/admin/members` に分離（/adminは指標＋リンク集。会員管理リンクとサイドバー「事務局管理」に審査待ち赤バッジ）②審査3択の「課金してもらう」ボタン撤去（承認/非承認の2択。AWAITING_PAYMENT表示は「お支払い待ち（旧・要承認し直し）」で残置）③新規登録時に info@ へ管理者通知メール（auth.tsの初回ユーザー作成時・fire-and-forget。審査申請通知は既存）④/admin指標に要対応4種（審査中会員/PJ承認待ち/課金審査待ち/新規相談）＝1件以上で赤枠・赤数字・「要対応」バッジ・クリックで該当画面へ⑤ダッシュボード「ご利用状況」に無料会員向けゴールド「Premium会員へアップグレード」ボタン（モバイルはカード自体非表示の既存仕様）⑥会員管理バッジ「課金中」→「Premium会員（課金中）」⑦**パフォーマンス整理**=inquiry-gateをReact cache()化（位置引数）・メッセージ詳細4クエリ並列＋既読先行・ThreadListのPremium判定をprops化・/admin直列4クエリをPromise.all統合・提案ページ3クエリ並列。

- **セキュリティ検査 Phase 6（2026-08-11・検査完了。報告書=`docs/security-audit-20260811.md`）**: 課金Phase1・引き合い課金・Premium・掲載オプション・cron・公開範囲を対象に再検査（全Server Action 20ファイル86関数の認可総点検＋本番Supabaseへの実接続検証を含む）。**最重要=Supabaseの`public`スキーマ全31テーブルでRLS無効かつanon/authenticatedに全権限が付与されており、ブラウザに埋め込まれた匿名キーだけで本番DBを全読み書きできる状態だった（実測でusers.emailの取得・UPDATE/INSERT権限を確認）。同日修正・検証済み**（anon/authenticatedからREVOKE＋postgresの既定権限も是正＋全テーブルRLS有効化。アプリはPrismaが`postgres`ロールで直結し`supabase.from()`を1箇所も使っていないため影響なし。修正後：匿名アクセスは401、本番`/api/health`とページは200）。**⚠️今後：新しいテーブルを追加したらRLSを有効化すること**（既定権限は是正済みだが多層防御のため）。コード側の残課題は報告書§1〜§3。特に対外募集前=propose画面のvisibility未検査/Stripe決済額の未検証によるPremium昇格（**本番Liveに100%OFFクーポン`FJS2026TEST`が実在＝誰でも¥0でPremiumになれる。Stripeで無効化が必要**）/認証系レート制限/オープンリダイレクト(`/\evil.com`がsafeNextを通過)/セキュリティヘッダ皆無。課金モデルの実効性=引き合い課金は「返信しなければ何通でも無料で読める」・スレッドが会員ペア単位のため`/producers`から空スレッドを先に作ると引き合い課金も紹介料も恒久的に回避可能。

- **セキュリティ修正 Phase 6（2026-08-11・実装完了。未コミット・本番未デプロイ／DBマイグレーションのみ本番適用済み）**: migration=`security_phase6`（追加のみ＝`Message.offeringId`／`AuthAttempt`／`StripeEvent.processedAt`）。①**引き合い課金をメッセージ単位の判定に作り直し**（`src/lib/inquiry-gate.ts` 全面書換）＝基準を「自分の初回返信」→「相手からの1通目」に変更（返信しなければ無料で読み放題だった穴）＋`/producers`で先に空スレッドを作る回避手口を封鎖（判定に`Message.offeringId`を使用）＋`sendInterest`にもゲート適用＋通知メールは`previewForRecipient`経由で必ず秘匿。ThreadListの二重実装を廃止しゲートに一本化。②Stripe＝**支払額・通貨・セッションIDを注文と突合**してから履行、`invoice.paid`は自社プラン額の定期課金のみ、`markPaid`のAPPROVED昇格は`AWAITING_PAYMENT`からのみ、返金/チャージバックで`revokeRefundedOrder`（未消費クレジット取消・掲載効果cancelled・公開範囲を戻す）、非同期決済/期限切れイベント対応、`processedAt`で取りこぼし再処理。③`src/lib/security.ts`新設＝`safeInternalPath`（`/\evil.com`を弾く。auth系3か所＋Checkoutで共通化）・認証レート制限（メール5回/時・IP20回/時）・文字数上限定数・`canSendToOthers`（REJECTED/SUSPENDEDの送信禁止）。④クレジット消費を`pg_advisory_xact_lock`で直列化（別案件への同時提案による二重消費を防止）。⑤`next.config.ts`にセキュリティヘッダ（X-Frame-Options DENY・frame-ancestors・nosniff・Referrer-Policy・Permissions-Policy＋CSPはReport-Only）。⑥propose画面のvisibility検査、`buyProposalProduct`のofferingId検証、cron認証を定数時間比較＋未設定は本番拒否、クレジット付与数を商品コードから決定。**検証**=tsc/vitest18件/next build合格、引き合い課金の回避封鎖と本文の非配信をE2E＋HTTPレスポンスで実測確認、公開WANT案件の提案は回帰なし、テストデータは全削除。詳細＝`docs/security-audit-20260811.md`。**残（未対応・要判断）**: 添付のprivateバケット化＋署名付きURL、退会セルフサービス＋ストレージ孤児削除、updatePasswordの現行PW確認、REVIEWERの権限引き下げ（優良案件マーク・一斉送信）、applicant_onlyの地域/業種の秘匿。

- **セキュリティ残課題の消化（2026-08-11 第2弾・本番反映済み）**: migration=`member_withdrawal`（Member.withdrawalRequestedAt/withdrawalReason）。**Supabaseに非公開バケット `message-attachments` を新設**（既存添付0件のため移行不要）。①**メッセージ添付を非公開化**＝DBには保存パスのみ、配信は `/api/attachments/[messageId]` が参加者検証＋引き合い課金ゲートを通してから60秒の署名付きURLへリダイレクト（公開URL直叩きは不可を実測確認）②**パスワード変更に本人確認**＝再設定リンク直後のみ `nakama-pw-recovery` クッキー(httpOnly/15分)で現行PW不要、それ以外は現在のパスワードで再認証＋変更完了メール通知③**REVIEWER権限の引き下げ**＝優良案件マーク/解除（紹介料1,100→3,300円）・条件一致通知の送信/否認・掲載オプション否認を requireSuperAdmin に（UIも出し分け）④**応募者限定公開**で社名に加え都道府県・市区町村・業種も非開示⑤**退会フロー**＝/profileに退会の申し出（即時削除せず申請として記録＋事務局通知＋監査ログ）、/admin/membersに申請一覧（Premium課金中は警告）、deleteMemberがStorageの画像・添付も削除⑥条件一致通知はvisibility=publicのみ・上限は商品から取得⑦お知らせ/記事/バナー/相談の操作に監査ログ⑧favoritesにテナント条件⑨単品クレジットを無期限化（期限を告知していないため。パックのみ180日）⑩未読返還先の期限切れロットは新ロットで発行⑪`$transaction`内のP2002握りつぶしを`createMany({skipDuplicates})`に置換⑫Checkout連打は直近2分の未決済注文を再利用。**検証**=tsc/vitest/build合格＋添付の配信制御・パスワード欄・退会セクション・応募者限定公開の秘匿を実機で実測、テストデータは全削除。詳細＝`docs/security-audit-20260811.md` §4-3。

- **課金モデル変更：引き合い課金の撤廃＋NAKAMAビジネス会員（月20チケット）（2026-08-11・ニーズチェックを受けたユーザー決定）**: ①**引き合い課金を全面撤廃**＝`src/lib/inquiry-gate.ts` を削除し、スレッド画面・一覧・添付配信・メッセージ各アクションからゲートを撤去。届いた問い合わせは何往復でも無料で閲覧・返信できる（メール通知の本文秘匿も不要になったため撤去）。②**Premium会員→NAKAMAビジネス会員**に改称（UI・法務・特商法・llms.txt・Stripe商品名）。ダッシュボードのバッジは premium-badge.png からゴールドのテキストバッジに変更（画像の文言が「Premium」のままだったため。**新しいバッジ画像があれば差し替え可**）。③**特典を「毎月20件の提案チケット（繰越なし）＋追加チケットと掲載オプション20%割引」に変更**＝提案無制限を撤回。`MEMBER_MONTHLY_CREDITS=20`、`grantMonthlyMemberCredits`（invoice.paid で請求書1通につき一度だけ付与・`member_monthly:<invoiceId>` で冪等）、**繰越なしは前月の未使用ロットを `monthly_reset:<lotId>` で失効させて担保**（Stripeの請求期間の丸めで数日残るのを防ぐ）。会員も提案時にチケットを消費する（propose の isMember バイパスを削除）。紹介料商品4種に会員割引20%を設定（SEED_PRODUCTS＋本番DBの billing_products を更新済み）。④料金・法務の文言を全面統一＝pricing/billing/FAQ/about/llms.txt/dashboard/propose/options/tokushoho/規約（第7条1項・2項4号・第7条の2・用語定義）。**規約の施行日に2026年8月11日を追記**（弁護士へは事後確認）。**検証**=tsc/vitest18件/next build合格、月次付与→同一invoice再送で二重付与なし→消費→翌月付与で前月分が失効（20→19→20）を実測、スレッド画面で3通すべて表示＋入力欄あり・Premium表記0を実測、/pricing・/billing の新文言を実測。テストデータと孤児台帳は削除済み。**⚠️注意**: `invoice.paid` は「税込22,000円ちょうどの定期課金」のみをビジネス会員として扱うため、**クーポン適用の申込みは自動反映されない**（やることリスト9番）。

- **買い手ファースト化＋メッセージUX＋呼称統一（2026-08-11 後半・すべて本番反映済み）**: ニーズチェック（`docs/needs-check-20260811.md`・農業生産者視点55点）と、その後の実装指示を受けた改修。①**トップを買い手ファーストに**＝ファーストビューを「あなたの／食材・素材・サービスを／探している人と出会う。」＋「食の「あったらいいな」／を共創でつなぐ。」（改行位置はユーザー指定）、CTAを『買い手の募集を見る』『商品を無料で掲載する』の2つに、「今、企業が探している食材・商品」を注目記事より前へ移動、掲載0件のときは件数を出さない、空表示を「順次登録しています」に。metadata（title/description）も更新。ヒーローH1は長文化に合わせてサイズと折り返しを調整（1520/1200/375pxで確認）。②**メッセージ画面のUX**＝送信ボタンに「送信中…」（useFormStatus）、送信処理の商談作成とメール通知を `after()` へ移して応答を待たせない、ファイル添付はアップロード完了後にモーダル（メッセージ記入・ファイル名変更・画像プレビュー）、送信後は枠付きカードでサムネイル＋ファイル名＋サイズ＋プレビュー（`Message.attachmentSize` 追加＝migration `message_attachment_size`）、最新メッセージまで自動スクロール（`ScrollToLatest`。入力欄の下に潜り込む問題）、定型文の「◯◯（事業者名）」「△△」に自分の事業者名・担当者名を差し込み、テンプレの「使う」をボタン化。未読は行の左に赤ライン＋背景オレンジ＋相手名/本文/時刻を太字＋「新着N」ピル、一覧見出しに「新着N件」。③**マイページに事務局の役割バッジ**（🛡事務局管理者／✓事務局審査担当。会員バッジの右隣）。④**案件区分の呼称を統一（ユーザー決定・2026-08-11に再調整）**＝正式名は**「売りたい（提供したい）」**／**「探している（調達したい）」**／**「共創パートナー募集」**、ボタン等の短い場所は**「売りたい」「探している」**。（いったん「販売・提供できる商品／仕入れ・調達したいもの」にしたが、ユーザー指示で上記に変更）`offering-taxonomy.ts` の DIRECTION_LABEL を起点に41ファイルを一括変更、併記は「売りたい・探している」。トップの導線も「探している案件を見る」に統一。**動詞の「探している」は元の日本語のまま残す**（例「食材を探している人と出会う」）。規約は条文を触らず、**第2条に表示名の対応を1文追加**（弁護士レビュー済み文面の構造・改定履歴を動かさないため）。⑤**サービス説明の誤りを修正**＝管理画面に残っていた撤回済み特典（提案無制限・2往復目以降）を月20件チケットの説明に、未実装の「会員向けセミナー」を特典から削除、/flow に紹介料の説明を追加。**⚠️手動でビジネス会員にしても月次チケットは自動付与されない**（Stripe決済時のみ）＝管理画面に注記済み。**OG画像（public/og.jpg）の「会員制ネットワーク」表記はこのままとする（ユーザー判断 2026-08-11）**＝登録して使うサービスであり実態どおりのため。今後この表記を「有料会員制に見える」として再指摘しないこと。⑥**「条件一致通知」を実装に合わせて改称（ユーザー決定 2026-08-11）**＝実際はカテゴリ・地域での絞り込みが無く「同意者へ先着100件の一斉送信」だったため、商品名を**「案内メール一斉送信（同意者・最大100件）」**に、説明を「条件による絞り込みは行いません」と明記する内容に変更。SEED_PRODUCTS・UI・メール・管理画面に加え、**本番DBの billing_products（matched_notice_100 / both_reach_matched_100）も更新済み**（seedは既存行を更新しないため手動更新が必要）。

- **課金モデルの法務レビュー反映（Phase 7・2026-08-11・指示書=NAKAMAサイト制作/FOOD_JAPAN_NAKAMA_規約改定_弁護士確認用_追補_修正版_20260811.docx）**: 追補依頼書の修正版に実装を合わせた（同文書の冒頭に「サイト・規約・特商法・決済画面・システム実装を同一内容へ更新した後に確定版として使用」とあるため）。①**確認済み案件を3クレジット消費に変更**（`creditCostFor`。`creditTypeForTier`とverified専用クレジットを廃止＝クレジットは1種類。会員の月次クレジットが確認済み案件にも使えるようになった）②**有償クレジットは単品も180日期限**（`creditExpiryFrom`＝購入日+180日の23:59:59.999 JST。旧仕様の単品無期限を廃止）③**消費順序を明示**（`allocateCredits`＝月次付与→有償購入→無償付与、同順位は期限が早い順。3クレジットはロットを跨いで割り当てる）④**未読返還は消費分を元ロットへ戻す**（`refundUnreadCredits`。**元ロットが期限切れなら返還しない**＝再発行しない方針。cronは返還数をメールに反映）⑤料金比較の表示を「月20件で同額／21件以上で会員が割安／19件以下は都度購入が安い」に修正⑥規約第7条第2項第4号・第7条の2第2〜3項、特商法（販売価格・提供時期・返金）、pricing/faq/billing/dashboard/propose/admin/llms.txt を「クレジット」表記に統一。**検証**=tsc/eslint/next build、vitest 24件（消費順・割り当て・期限計算を追加）、本番DBへ実接続したE2E（トランザクション内で作成→3クレジットが月次2+有償1で引かれることを確認→ロールバック。DBに痕跡なしを実測）。DBスキーマ変更なし（creditType列は残置・新規は全て standard）。**本番DBの billing_products の name/description も要更新**。
- **課金の価格整合（Phase 7・2026-08-11 夜・ユーザー決定）**: 事業モデルは変えず**数字の不整合だけ**を直した（機能追加なし）。**判断の根拠＝会員が得になる分岐点は「月額 ÷ 1件あたりの購入単価」で決まり、月次付与数は上限にしか効かない**。旧設定は 22,000 ÷ 770（10件パック単価）＝28.6件 ＞ 上限20件で、フル消化しても会員が損をし、さらに会員はパックにも20%割引が乗って**616円/件＝会費より安く同じものを買えた**（二重割引）。変更＝①月次チケット **20→30件**（`MEMBER_MONTHLY_CREDITS`）②パックの**まとめ買い割引を廃止**（5件4,400→**5,500**／10件7,700→**11,000**＝1件1,100円で単品と同額）③パックを**会員割引の対象外**（`memberDiscountPercent` 20→0。単品と掲載オプションの20%は維持）。結果の単価ラダー＝**会員733円 < 単品会員880円 < 単品・パック1,100円**、分岐点は**月20件**（上限30件）。反映先＝`billing-core.ts`／`billing.ts`（SEED_PRODUCTS）／`stripe.ts`（PLANS）／pricing・faq・tokushoho・legal（規約第7条の付与件数と改定履歴）／billing・dashboard・propose・admin／`llms.txt`／`sitemap.ts` の CONTENT_UPDATED_AT。**本番DBの billing_products も手動更新が必要**（seedは既存行を更新しない）。実施時点で `billing_orders` は0件＝既存購入者への影響なし。**未対応（意図的に見送り）**: 月次チケットの優良案件（verified）への充当、非金銭特典の追加、直接提案などの機能追加。

- **掲載代行（2026-08-11・買い手の案件を集めるため）**: 買い手に13項目のフォームを書かせるのは負担が大きく案件が集まらないため、**事務局が電話ヒアリング→代筆→本人確認→公開**を回せるようにした。①`/admin/listings` に「会員に代わって案件を作る」フォーム（会員選択・区分・分類・案件名→**下書き(非公開)**を作成して編集画面へ）＝`admin/listing-proxy-actions.ts` の `createOfferingForMember`。②`ledger/actions.ts` の `ownOfferingOr404` を「本人 **または** 同一テナントの上位管理者」に拡張（保存・公開・削除・画像操作の8アクションが全てここを通る）。③編集画面は所有者以外でも上位管理者なら開ける＋**橙色の「代理で編集しています」バナー**。④代理での作成・保存・公開・非公開・削除は**すべて監査ログ**（`listing.proxy_*`）。**REVIEWERには許可しない**（なりすまし投稿に相当するため `isSuperAdminRole` で判定）。**未登録企業の案件は作れない**（会員が先に必要＝本人の同意と本人確認のため。会員登録の代行は別途）。有料オプション購入画面は従来どおり本人のみ。

- **「探している（調達したい）」の表記とフォームをカテゴリ別に作り直し（2026-08-11・買い手案件を集める準備）**: 買い手が入力する画面に売り手目線の言い回しと食品前提の項目が残っていた。①**表記**（探している側のみ・売りたい側は不変）＝提供可能量→**必要数量**／状態と提供時期→**希望する時期**・提供・希望時期→**希望する納品時期**／アピール・うちの特徴→**備考**（上部に「詳細説明」が別にあるため「詳細」は避けた）。「数値で登録すると範囲検索できます」の注記は**削除**（数量の範囲検索は未実装＝売りたい側にも出ていた）。②**数量の期間**に「およそ（合計）」「期間は相談」を追加し、「あたり」の付与を `formatAmountPeriod()` に共通化（DB保存値は不変）。③**カテゴリ群による出し分け**＝`categoryGroup()` で3群（モノ＝食材・原料/加工設備／サービス・場・ヒト＝技術・販路・実証の場・物流・人材／資金・地域＝資金・補助・地域課題）。群ごとに **条件の分類**（`requirementKindsFor`）・**募集タイプ**（`seekingTypesFor`）・**数量欄の見出しと入力例**（`amountLabel`/`amountPlaceholder`）・**入力例と一部の見出し**（`formExamples`＝案件名/詳しく/備考/タグ/地域、使用目的・販売先→service「依頼の背景・目的」support「背景・目的」）を切り替える。**⚠️サーバー側の検証は必ず全群の和集合で**（`ALL_REQUIREMENT_KIND_KEYS`/`ALL_SEEKING_TYPE_KEYS`）＝群ごとの配列で検証すると、群を跨いでカテゴリを変えた瞬間に保存値が「その他」へ落ちる。表示ラベルも全群の和集合から引く（既存データが未知の値にならないように）。
- **掲載オプションの購入体験を作り直し（2026-08-11）**: 名前と価格しか無く「何が起きるか分からない」状態だった。①**見え方プレビュー**＝各商品の「見え方を見る」で**モーダル（最大900px）**を開き、**実際の `OfferingCard` と /search と同じ広告表記マークアップ**で表示例を描く（画像を別途用意するとデザイン変更でズレるため、必ず実コンポーネントを使うこと）。注目表示＝注目枠に自分の案件＋通常結果との位置関係／最上部PR＝最上部1枠／急募＝バッジ／応募者限定公開＝事業者名・所在地が伏せられた詳細。②**下書き（非公開）では購入不可**＝上部に橙の警告と公開導線、購入ボタンを出さず、`buyListingOption` でもサーバー側で拒否（効果が出ないのに課金されるのを防ぐ）。プレビューは公開前でも見られる。③**購入前の確認画面**＝オプション名／対象案件／分量（期間・件数）／金額（税込・会員割引後と定価）／支払い時期／適用開始／注意事項（広告表記・成果非保証・適用後の自己都合返金不可・審査不通過は全額返金・特商法と規約へのリンク）をモーダルで表示してから決済へ。**特商法の最終確認画面の考え方に対応**。ボタンは「購入する（内容を確認）」。④個別見積（quote）の行は金額を出さず「**要相談**」。⑤**注目表示のカードに橙枠**（`OfferingCard` の `featured` プロップ＝#F59E0B の2px枠＋リング。/search の注目枠とプレビューの両方に適用。「あなたの投稿」の金枠より優先）。⑥**カードのバッジが単語の途中で改行される不具合を修正**（「探してい／る」）＝`whitespace-nowrap`＋バッジ単位の折り返し＋地域名は `max-w-[55%] truncate`、領域に `right-2`。**共通カードのため検索・ダッシュボード・お気に入りにも効く**（375px/1280pxで確認）。
- **見え方プレビューの詰めとカード表示の調整（2026-08-11 夕・すべて本番反映済み）**: ①プレビューは**モーダル（最大900px）**に変更（カード内で展開すると幅が足りずカードが潰れて読めなかった）。②並べるダミー他社は**架空の3社**（神奈川県/株式会社スーパーA・大阪府/株式会社スーパーB・愛知県/株式会社食品工場）で、価格・数量・条件・募集タイプを1件ずつ変えて実際の一覧に近づけた。**プレビュー内のカードは全てクリック不可**（`pointer-events-none`。モーダルから詳細へ飛ぶと確認が中断されるため）。③注目枠は**全カードに橙枠が付くのが実物どおり**なので、自分の案件は「あなたの投稿」バッジ（実際の検索結果と同じ挙動）で区別する。④**バッジの色分けを整理**＝急募（有料）は赤・一回り大きく、新着（無料）は**青 #2E86C1**・従来サイズ。同じ赤で見分けられなかったため。
- **カード・詳細ページの表示調整（2026-08-11 夕・本番反映済み）**: ①**探している案件は写真が無いのが普通**なので、カードの画像枠を「概要（説明の冒頭）＋希望価格・数量・最小ロット」のテキストに置き換える。写真があれば従来どおり写真。②**会社ロゴ**（`Member.companyLogoUrl`）を会社名の左に表示（カード表示に使う各クエリの member select に `companyLogoUrl` を追加）。`OfferingCardData` に `description` / `memberLogoUrl` / `priceTaxType` を追加。③**案件詳細のヒーローは写真が無ければ枠ごと出さない**（16:9の枠に分類アイコンだけが出て画面の大半が空白だった。売りたい・探しているとも）。公開プレビュー `/preview/offerings/[id]` は元から非表示。④**詳細の末尾CTAを2ボタンに**＝「提案する」（売りたいは「問い合わせる」）＋「お気に入りに追加」をlgサイズで横並び（スマホは縦積み）。上部CTAの文言も「商品・原料を提案する ↓」→「提案する ↓」に短縮。⑤**⚠️試して撤回した設計＝探している案件の横長リスト（OfferingRow）**：クラウドワークス風に概要・価格・数量・期限を列で並べたが、右3列の幅指定（`sm:w-[300px]`）と列の最小幅の合計が合わず「募集期限」がはみ出し、売りたいカードとの混在も見づらく**同日中に撤回**。**カードの情報量を増やす場合はカード枠の中で完結させること**（一覧は売り・買いが混ざるため、行とカードを混在させない）。
- **クレジット改定の反映漏れを修正（2026-08-11 夕）**: `creditCostFor`（通常1・確認済み3）を入れた際、UI側に旧仕様が残っていた。詳細ページの「紹介料（クレジット1件）」表記、提案フォームの送信ボタン「クレジット1件を使って…」、そして**残高不足の判定バグ**（`balance <= 0` でしか送信不可にしておらず、3クレジット必要な案件で残高1〜2でもボタンが押せてサーバー側で弾かれた）を修正。**定数を変えたらUI側の判定・文言まで追うこと**。

- **掲載代行は本番で実動作を確認済み（2026-08-11）**: 管理画面から代理作成した下書きが `audit_logs` に `listing.proxy_create` として記録されることを実データで確認。
- **⚠️本番反映の確認方法（今日2回ハマった）**: 会員ページの変更は未ログインでは確認できない。**配信ハッシュで判定する**＝`curl -s https://nakama.food-japan-summit.jp/ | grep -o '/_next/static/[^"]*' | sort -u | shasum` の値がデプロイ前後で変われば新しいビルドが配信されている。**push しても Vercel が反映しないことが実際にある**（今日1回発生）。その場合は空コミット（`git commit --allow-empty`）を push すると再デプロイされる。

- **クラウドワークス型への転換（2026-08-11 夜・ユーザー指示「売りたい・探しているはクラウドワークスのように作ろう」）**: ①**メッセージを案件ごとに分けた**＝`findOrCreateThread`（messages/actions.ts）を新設し、スレッドを **(会員ペア × 案件)** 単位に。`sendInterest`／`sendProposal`／`startConversation` を差し替え（事業者への直接連絡は案件なしスレッド1本）。**既存スレッドはそのまま**。②**商談（Deal）もスレッド単位**に＝`ensureDeal` が threadId 基準（従来は会員ペアに1件で、案件が違っても進捗が混ざっていた）。threadId が無い旧データはペア基準のまま。③メッセージ画面に **ThreadHeader**（対象案件の写真・区分・案件名・希望価格/数量/最小/募集期限・案件へのリンク）と **PhaseStepper**（出会う〜成約・商品化の6段階。押すと即時反映）。メッセージ一覧の各行にも「案件」バッジ＋案件名。④**提案一覧 `/ledger/[id]/proposals`**（掲載者のみ＝クラウドワークスの応募者一覧に相当）＝未返信/合計/商談中/成約のサマリー、会社ロゴ・地域・業種／初回メッセージ抜粋／初回・最終日時／進捗バッジ／新着バッジ／「やり取りを見る」。未返信を上・次に最終更新順。相手から1通も無いスレッドは数えない。導線は案件詳細（掲載者の右上）と台帳一覧のカード下。⑤CTAの配色に `btn("action")` を追加（#E2591F 赤みのオレンジ）。**未実装＝条件提示**（金額・数量・納期の構造化オファーと合意。契約に近いため規約・特商法の確認が要る）。
- **⚠️CTAが動かなかった2件の原因（2026-08-11・再発しやすい）**: ①**「すでにやり取りがあります」の判定が相手ごとのまま**で、別案件の会話があるだけで提案ボタンがページ内アンカーに戻り「押しても何も起きない」状態になっていた。**スレッドを案件ごとにしたら、やり取り判定・件数集計もすべて案件IDまで一致させること**。②**お気に入りが無言で終了**＝`toggleFavorite` は条件に合わないと `return` するだけで画面に何も出ず、利用者は二度押しして追加→取消していた（本番のお気に入りは0件だった）。結果を返す `toggleFavoriteWithResult` を追加し、失敗理由をボタン下に表示。**サーバーアクションで早期returnする箇所は、UIに理由を返すこと**。
- **クーポン契約（100%オフ）でビジネス会員の月次クレジットが付かない問題（2026-08-11・実際に発生）**: `invoice.paid` の判定が「税込22,000円ちょうど」だったため、毎月無料のクーポン契約では請求額0円→対象外→付与されなかった。**判定を「値引き前（subtotal）が22,000円の定期課金」に変更**し、**昇格（無料→会員）は定価どおり支払われた場合のみ／割引つきの請求では「すでに会員の場合だけ」クレジットを付与**する形に分離（割引コードが漏れても自動昇格しない）。あわせて `/admin/members` に **「今月分のクレジット（30）を付与する」**（上位管理者・当月1回・冪等キー `member_monthly_manual:<memberId>:<YYYY-MM>`・監査ログ `member.grant_monthly_credits`）を追加。**Webhookの修正は次回請求から効くため、取りこぼした月は管理画面のボタンで付与する**。※`checkout.session.completed` は金額を見ずにPAIDにするため、**無料クーポンのコードが漏れると誰でも会員になれる**点は未対応（自社・招待用に限定して運用する）。

- **月次クレジットを30→50に増額（2026-08-11 夜・ユーザー決定）**: 月額22,000円の価値を高めるため。**分岐点（月20件＝月額÷単価1,100円）は変わらず、上限と訴求力だけが上がる**（実効単価 733円→**440円**／使い切ると**55,000円相当**）。会員は自社2件のみ・追加購入の実績ゼロのため、変えるなら今が最小コストという判断（増やすのは簡単、減らすのは不利益変更で難しい）。反映＝`MEMBER_MONTHLY_CREDITS=50`／規約第7条第2項第4号＋改定履歴／特商法（販売価格・提供時期）／pricing・faq・llms.txt・billing・dashboard・propose・admin。**サイトから「月20件なら都度購入と同額、月21件以上なら会員が割安」という比較文は削除（ユーザー指示）**。コード内に残っていた旧称「チケット」も「クレジット」へ統一。
- **提案画面（/ledger/[id]/propose）の作り直し（2026-08-11 夜）**: ①対象案件が「掲載者＋タイトル＋詳細リンク」だけで**何を求められているか分からなかった**ため、緑枠で強調し、区分・分類・募集タイプのバッジ、案件名20px、概要（先頭160字）、要点チップ（希望価格／必要数量／最小取引量／時期／地域／募集期限のうち最大4つ）、募集終了の明示を追加。②「募集の詳細を見る」は**モーダル**（何を探しているか／使用目的・販売先／条件＝必須赤・希望黄・相談可能緑／取引条件の表／備考／タグ）。**案件ページへ遷移すると提案の入力が中断する**ため。③紹介料の説明（6項目）は**初回だけ開き、2回目以降は畳む**（localStorage。料金と残高の1行は常時表示）。**⚠️ localStorage を見て畳む実装は `useEffect` 内で setState するとlintの「effect内の同期setState」に触れる**ため、`useSyncExternalStore`（サーバースナップショット=false=開いた状態）で読み、effectでは書き込みだけ行う形にした。
- **⚠️月次クレジットの付与は「必ず1本の処理に集約する」（2026-08-11・重複付与の教訓）**: 付与経路がStripe(`invoice.paid`)・日次バッチ・管理画面の手動ボタンの3つに増えた際、手動ボタンだけ `grantCredits` を直接呼んでおり、**前月までの月次ロットを失効させないため「バッチ→手動」の順で60になりうる**状態だった。全経路を `grantMonthlyMemberCredits`（冪等キー＋前月ロットの失効）に統一して解決。**月次分は常に上限値（現在50）に収束する**。ただし**残高全体**は「月次50＋有償購入分＋無償3件」なので50を超えうる（異常判定は「月次分だけで51以上」）。日次バッチの補填は「直近27日以内に月次付与があればスキップ」で二重付与を避けている。

- **弁護士向け追補依頼書の50クレジット版を作成（2026-08-11・未送付）**: ユーザーが手を入れた `…追補_修正版_20260811.docx` を**土台にして書式・構成・文言をそのまま維持**し、数字と経緯だけ更新した `…追補_20260811_50クレジット版.docx` を作成。変更＝現行仕様の記述8か所（30→50クレジット）／経緯の表に「8/11 夜：付与を30→50へ」の行を追加し直前行の現況を「後に再変更」に／冒頭「計5回の改定」→「計6回」／施行日欄の「8月11日付の2行」→「4行」（③クレジット一本化・180日 と ④毎月50 が抜けていたため補記）。**docxの編集は document.xml のテキスト置換で足りた**（このファイルはランが分断されておらず merge_runs 不要。`defusedxml` 未導入のため skill の merge_runs.py は動かない）。表の行追加は該当 `<w:tr>` を複製してセル文字列を差し替える方法で実施。**元の修正版ファイルは経緯として残す**。

- **⚠️会員管理に未提出（下書き）の会員が出ていなかった（2026-08-11・本番反映済み。commit 47dfc56）**: `/admin/members` に株式会社グラブデザインの1社しか出ず、ユーザーの指摘で発覚。原因＝`listReviewMembers`（src/lib/member.ts）の `status: { not: "DRAFT" }`。**登録だけしてプロフィールを提出していない会員（DRAFT）は事務局から一切見えず、承認・停止・削除もできなかった**。実際に4名（うち `umetaku1@gmail.com` は**課金状態PAID＝ビジネス会員なのに不可視**）が埋もれていた。修正＝①除外条件を外して全件返す（呼び出し元はこの画面1か所のみ）②`AdminTable` の審査バッジに `DRAFT=「未提出（登録のみ）」`（グレー）を追加＝無いと生の "DRAFT" が出る③未提出が増えても審査中が下に埋もれないよう、**対応の優先度で並べ替え**（審査中→お支払い待ち→承認済み→未提出→非承認→停止中。同じ状態の中は更新の新しい順のまま）。会社名が空の行は既存実装がそのまま「（未入力）メールアドレス」で表示する。**教訓＝「◯◯管理」画面の一覧クエリに状態の除外条件を入れると、その状態の会員は運営から永久に見えなくなる。除外ではなくバッジで区別すること**。検証＝tsc/next build＋本番DBに実接続して `listReviewMembers("tnt_default")` が5件（DRAFT4＋APPROVED1）を返すことをテストで実測（確認用の一時テストとvitest設定は削除済み）。

- **提案画面の残高表示と購入導線（2026-08-11・本番反映済み。commit 27e8ca0）**: ①**残高の内訳を出す**＝「残高：53クレジット（ビジネス会員：毎月50クレジット付与・繰越なし）」だけでは**53の出どころ（月次50＋事業者確認の無償3）が分からない**という指摘。`getCreditBreakdown()`（src/lib/contact-credits.ts）を追加し、**今月分／購入分／無償付与**を消費順に、有効期限つきで表示（0件のグループは出さない）。あわせて**送信後に残る数**（不足時は「あと◯クレジット足りません」を赤字）を併記。残高と同じロットから集計するのでDB問い合わせは増えない（合計が `getCreditBalance` と一致することを実データで確認）。期限は**日本時間で表示**（有効期限は23:59 JST基準のため `Intl.DateTimeFormat` に `timeZone: "Asia/Tokyo"` を指定）。②**「クレジットを購入する」ブロックは残高不足のときだけ表示**（従来は解放済み案件以外で常時表示され、クレジットを持っている人にも出ていた＝ユーザー指示）。**残高が足りている人の追加購入は /billing からのみ**になる。**⚠️注意＝月次ロットは付与時点の数量で残る**ため、30→50に増やす前に付与された会員（グラブデザイン）は今月分が30のまま表示される（次回請求で50になる）。**教訓＝合計値だけの残高表示は、付与ルールの説明文と数字が食い違って見える。内訳と期限まで出すこと**。

- **お支払い画面（/billing）の整理（2026-08-11・本番反映済み。commit 726d537 / 4036085）**: ①**会員には「基本利用は無料です」の説明を出さない**（未加入には従来どおり必要なので残す）。空いた上部に**「事務局へ依頼する（個別契約）」を移動**（`ServiceMenuSection` に切り出し、会員は上部・未加入は従来どおりプランカードの下）。②**購入履歴は支払いが成立したものだけ**にする＝`pending_payment`（Stripeへ遷移しただけで購入していない）・`payment_failed`・`cancelled` を除外し `paid`/`fulfilled`/`refunded` のみ表示（返金済みは支払いの記録として残し赤バッジ）。実施時点の `billing_orders` 4件はすべて `pending_payment` だった（データは残置）。③**ビジネス会員の月額を購入履歴に載せる**＝月額は `billing_orders` に残らず Stripe の請求書側にあるため、`stripe.invoices.list` の `status=paid` を取得して単品購入と1つの履歴に日付順でまとめる。**クーポンで0円になった請求も Stripe 上は支払い済みなので ¥0 として載る**（本番で実機確認済み）。表示名は明細の自動生成文（英語まじり）ではなくプラン名に統一。Checkout(mode=payment)の単品購入は請求書を作らないため、ここに来るのは月額のみ。取得失敗時は履歴が出ないだけで画面は動く。**⚠️ローカルでは検証できない**＝`.env.local` の `STRIPE_SECRET_KEY` は空（liveキーはVercelのみ）なので `stripe` が null になり請求書は常に空配列。**Stripe読み取りを足したら本番で目視確認すること**。

- **販路開拓の入口商品とサービスメニューの統合（2026-08-11・本番反映済み。commit bbe95c3）**: サービス表が「月額・単発・成果報酬・事業づくり」を粒度なく5行並べただけで選べない状態だったため作り直した。①**`/hanro` 新設**＝入口商品2段階（**商品・販路戦略セッション 110,000円〜／販路開拓トライアル 440,000円〜・1商品45日間**）の業務範囲・実施後に共有するもの・**含まれないもの**・共通の契約条件（**準委任型＝売上/返信/面談/採用/契約を保証しない**）・料金に「〜」を付ける理由・申込みから支援まで8ステップ。文面はユーザー確定のものをそのまま掲載。**公開ページなので `middleware` の `PUBLIC_PATHS`＋`sitemap.ts`＋`llms.txt` に追加**（毎回ここを忘れるとログインへリダイレクトされる）。②**定義を `src/lib/services.ts` に集約**＝トップ・/pricing・/billing・/hanro が同じ `SERVICE_MENU` を参照する。**同じ価格を5ファイルに書き分けていて食い違った事故（同日発生）の再発防止**。表示は「いま困っていること→サービス→やること（納品物）→期間→費用」に統一し、入口商品2つを既存5サービスの上に置く（ユーザー決定＝既存は残す）。③**相談フォームに `strategy_session` / `channel_trial` を追加**＝**種別は4か所に分散している**（`ConsultationForm` の選択肢／`consultation/actions.ts` の許可リスト／`admin/consultations` のラベル／`email.ts` のラベル）。**1か所でも漏れるとサーバー側で弾かれるかラベルが出ない**。④**未確定の数字は推測で書かない**＝「SNS投稿◯回/月」は回数を書かず、期間未定は「相談して決める」。決まったら `services.ts` の1か所を直せば全ページに反映される。⑤トップのファーストビューは変更していない（ユーザー指示）。「販路開拓伴走プラン」はトライアルの文中で触れるだけでメニュー化しない。

- **提案フォームをメッセージ画面と同じ操作に統一（2026-08-11・本番反映済み。commit 902c813）**: 提案の入力欄が素のtextareaだけだったため、Composerと同じ**下書き保存／テンプレートから選択／面談日程を調整／ファイル添付**を入れた。`DEFAULT_TEMPLATES` と `Modal` を Composer から export して**実装を共用**（メッセージ画面の挙動は変えていない）。**スレッドがまだ無いための違いは2点**＝①下書きは `MessageDraft` がスレッド単位のため**このブラウザに保存**（localStorage・別端末では復元されない）②添付は送信前に `proposals/<memberId>/` へ置き、送信時にメッセージへ紐づける（サーバー側は**自分のフォルダ配下のパスしか受け付けない**）。会員削除時のストレージ掃除にもこのフォルダを追加（入れないと添付が残る）。
- **添付の作り直し（2026-08-11・本番反映済み。commit 7020f43 / f3b0a5f / e77e3b5）**: ①**モーダルを廃止**＝ファイルを選んだらその場でアップロードし、本文の直下にカードで表示（画像はプレビュー）。ファイル名の変更欄も廃止。②**受信側にダウンロードを追加**＝`/api/attachments/[messageId]?download=1` が署名付きURLに `Content-Disposition` を付ける。③**複数添付に対応**＝新モデル **`MessageAttachment`**（migration `message_attachments`）。`Message` の旧列 `attachmentUrl/Name/Size` は既存1件の表示のため残置し、新規は使わない。配信は `?i=<添付ID>` で1件を指定し、**その添付が当該メッセージのものであること**をクエリ条件で確認してから参加者検証を行う。上限は**1通5件・1件8MB**。④**貼り付け（⌘V）とドラッグ&ドロップ**に対応（テキスト欄の `onPaste`/`onDrop` から同じアップロード処理を呼ぶ）。「画像が貼れない」の原因はファイル選択ボタンしか無かったこと。**⚠️地雷2つ**＝(1)**新テーブルを追加したらRLSを有効化**（`message_attachments` で実施。`enable row level security` ＋ anon/authenticated から REVOKE を実測確認）(2)**client component から `security.ts` のような server 依存モジュールを import すると `next build` が落ちる**（"module depends on next/headers" ＋ dns/fs が解決できない、で8エラー）。**共有したい定数は依存を持たない独立モジュールに置く**（`src/lib/attachments.ts` の `MAX_ATTACHMENTS`）。
- **面談候補日の作り直しと提案用テンプレート（2026-08-11・本番反映済み。commit b36eced）**: 旧UIは「日付・開始・終了」を1行ずつ手入力させる作りで、**候補3つに9回の入力**が必要だった（ユーザー評価＝滅茶苦茶使い勝手が悪い）。**所要時間を1回選ぶ→日付を選ぶ→開始時刻を押す**で候補が積み上がる形に変更（終了時刻は自動計算・最大8件・一覧にない日時の直接入力も残す）。`src/components/ScheduleModal.tsx` に共通化しメッセージ画面と提案フォームで共用。生成文面は従来と同じで所要時間の行だけ増える。**⚠️`useEffect` 内の `setState` は lint（react-hooks/set-state-in-effect）でエラー**になるため、日付一覧は `useState` の遅延初期化で作る。定型文は提案側だけ**募集内容を見て提案する場面向けの4種**に差し替え（募集を見て提案する／条件を確認してから提案したい／代わりのご提案をする／打ち合わせをお願いする）。`■■（案件名）` に募集タイトルを差し込む。メッセージ画面の定型文は汎用のまま。
- **案件とやり取りを1画面に＝クラウドワークス型（2026-08-11・本番反映済み。commit 8fd7158 / 2f10091 / 7fbef21 / 7a1c5af）**: ①**提案済みなのに「提案する」ボタンが出る不具合を修正**＝やり取りがあるときCTAの行き先がページ内アンカーのままだった。文言も「メッセージを見る」に変更。②**`/ledger/[id]/proposals/[threadId]` を新設**＝案件名・相手の事業者・案件の要点と進捗・募集の内容・やり取り・返信欄を1画面に。スレッドが**この案件のもの**かつ自分が当事者であることの両方を検証する。提案一覧の「詳細へ」・案件詳細のCTAとバナー・**提案送信後のリダイレクト先**をこの画面に付け替えた（`/messages` は案件に紐づかない直接連絡のために残す）。③**やり取りは吹き出しではなく全幅カード**（投稿者名＋日時＋本文）を時系列に並べる＝これがクラウドワークスとの見た目の差だった。`MessageList` に `variant`（bubble/card）を持たせ、`/messages` は従来のチャット表示のまま。④**提案一覧を表形式**に（ステータス／提案企業／提案の内容／最終更新／対応）。未返信の行はオレンジ地、サマリーは「**対応が必要＝未返信**」を赤で独立させ、右に受付＋商談中＋成約・商品化＝合計。⑤案件一覧の「届いた提案（N）」は件数があるとき目立つ色に（**確認は案件一覧から入るのが自然**というユーザー指摘）。**未実装＝条件提示**（金額・数量・納期の構造化オファーと合意。契約に近いため規約・特商法の確認が要る）。
- **⚠️「This page couldn't load」はデプロイ直後の古いチャンク（2026-08-11・切り分け手順）**: 404（"This page could not be found"）とは別物で、**デプロイ前に開いていたタブから遷移すると出る**。リロードで直る。**本番で認証が必要な画面を実測する手順**＝service_role で一時 auth ユーザーを作る→anonキーで `signInWithPassword`→セッションJSONを `base64-` 付きで `sb-<ref>-auth-token` クッキーに入れて curl→**検証後に users / members / auth ユーザーを必ず削除**（今回 `phase8-debug@example.com` で実施し削除済み。会員は元の5件に戻っている）。

- **やり取り中の案件を分かるようにした（2026-08-11・本番反映済み。commit 6758021）**: ①`OfferingCard` に状態バッジを追加（**要返信＝オレンジ／進捗フェーズ＝緑**。画像の右上。「あなたの投稿」がある場合は下にずらす）②**ダッシュボードの「進行中の活動」に、案件へ紐づく商談をカードで最大4件**（要返信が上→最終更新順）。カードにしたものは下の行リストから除外する③カードのクリック先は `/ledger/[id]/proposals/[threadId]`。**⚠️`Thread` に `offering` リレーションは無い**ので、案件は threadId→offeringId→offering の順で取得する。④やり取りカードの投稿者名の左に、ヘッダーと同じ丸アイコン（avatarUrl→companyLogoUrl→頭文字の順）。
- **検索の作り直し（2026-08-11・本番反映済み。commit 6eb2285 / 47c3701）**: ①**「売りたい」と「探している」を別タブに**（探している／売りたい／共創プロジェクト／登録事業者の4つ）。**性質が違う**（売りたいは写真が主役、探しているは写真が無いのが普通で条件テキストが主役。しかも**見る人が逆**）ため、混ぜると誰向けの一覧か分からなくなる。「売り・買い両方」のプルダウンは廃止。新URLは `?t=want|give|coprojects|producers`、旧URL（`target`/`direction`）も解決する。**既定は「探している」**（トップが買い手の募集を先に見せているため）。②**⚠️タブが遅かった原因＝`<form>` の送信ボタンだった**こと。ブラウザの通常のページ送信になるため**クライアント遷移にならず、プリフェッチも `loading.tsx` も効かない**（`loading.tsx` はあるのに出ていなかった）。`Link` に変更して解決。絞り込みの送信でタブが外れないよう hidden で現在のタブを持たせる。**同じ作りが他画面にあれば同様に遅い**ので、タブ・切替はLinkにする。③タブは**押せると分からない**という指摘を受け、検索パネルの外に出して「何を探しますか？」の見出し＋枠線つきカード型＋1行の補足（買い手が求めているもの／売り手が提供できるもの／一緒に事業をつくる／会社から探す）にした。④結果件数の上にタブ名の見出しを出す。
- **記入率50%未満の会員は「登録事業者」の一覧に出さない（2026-08-11・本番反映済み。commit a2e72a5）**: 承認済みでもプロフィールが空の会員が「（未入力）」として並んでいた（実際に承認直後の4社が0%で表示された）。`searchProducers` に `completionRate >= 50`（`MIN_PRODUCER_COMPLETION`）を追加。件数表示も連動する。**自分の会社も同じ基準**（他社から見えている状態をそのまま見せる）。ダッシュボードのプロフィール案内に理由を明記し1文目を太字・大きめにした。**⚠️承認とは別基準なので、事務局が「承認したのに一覧に出ない」と迷わないこと**。なお案内カード自体は記入率40%未満のときだけ大きく出る仕様なので、**40〜49%の会員にはこの説明が出ない**（未対応）。
- **細かい修正（2026-08-11・本番反映済み。commit 22e3e81 / d36737a / 35aaf40）**: ①ダッシュボードの「事務局に相談する」が主操作カードと右カラムの緑パネルで**重複**していたため、白いカード側を削除し主操作は2つに（グリッドも2列へ）②`/ledger` の見出しが「探してい／る）」で改行していた＝**見出しとボタンを横一列に固定していた**ため。`flex-wrap` と見出し側の `min-w`/`flex-1` で解決。**長いボタンと見出しを同じ行に置くときは折り返しを許可すること**③同じ相手が「進行中の活動」にカードと行の2つで出て重複に見えた件＝**実際は別の会話**（案件ごとのスレッドと、案件に紐づかない直接の会話が並存する。後者は `/producers/[id]` の問い合わせと、案件ごとにスレッドを分ける改修より前の会話）。行の補足を「**案件に紐づかないメッセージ**」に変更して区別できるようにした。

- **/deals を案件中心に統一（2026-08-11・本番反映済み。commit 95f11fb）**: 案件という概念が入る前の作りのままで、会社名だけの表示・未読なし・リンク先が旧メッセージ画面・見出しがナビと不一致だった。カード先頭に区分バッジ＋案件名（案件ページへ）、会社名は補足、未読は「要返信 N」、「やり取りを見る →」は案件があれば `/ledger/[id]/proposals/[threadId]` へ。見出しは「進行中の活動」に統一。**既存の lint エラー（レンダー中の `Date.now` 直呼び）もここで解消**。
- **売りたい側にも条件（必須・希望・相談可能）を追加（2026-08-11・本番反映済み。commit 28625e3）**: 「探しているの仕様は売りたいにも入っているか」という確認から。**差は条件の行エディタ1点だけ**だった（カテゴリ群による出し分け・数量の期間・注記の削除は元から両方に効いていた。募集タイプと使用目的は探している固有の概念）。行エディタを向きの分岐から外に出し、見出しと説明だけ立場で出し分ける（売りたい＝「取引の条件」）。案件詳細とプレビューでも表示。**公開時の必須には加えない**（既存の掲載運用を止めないため）。あわせて**売りたい案件への問い合わせ後の遷移先**も案件ごとのやり取り画面に統一（提案だけ新画面で、問い合わせは旧メッセージ画面のままだった）。
- **毎日の投稿を可能にする＝過去の投稿の複製（2026-08-11・本番反映済み。commit 10fbc5b）**: 「農家の方が毎日 売りたいへ投稿できるようにしたい」という要望から。**食材・原料の公開には15項目が必要**で毎日ゼロから書くのは不可能。定番を1回登録し、**複製して数量・価格・出荷可能日（募集期限）だけ直す**方式にした（`duplicateOffering`）。**⚠️画像はURLを使い回さずストレージ上でコピーする**＝元の案件を削除すると `offerings/<元のID>/` 配下が消え、複製側の画像が壊れるため。募集期限は引き継がず、必ず下書きから始める。条件（`OfferingRequirement`）も引き継ぐ。導線は案件詳細・案件一覧・管理表の3か所。**未対応＝期限切れの自動非公開**（毎日投稿すると一覧が古い出荷情報で埋まる。日次バッチに足すのが自然）。
- **自分が出した案件の管理表（2026-08-11・本番反映済み。commit 10fbc5b / d1361d7）**: クラウドワークスの「登録中のお仕事」に相当。`src/lib/listing-stats.ts`（集計）＋ `src/components/MyListingsTable.tsx`（表示）。**問い合わせが来ているか・返していないか・放置していないか**が一目で分かることが目的＝届いた件数／未返信（赤）／**放置＝未返信は無いが最後のやり取りから14日以上**／掲載の状態（公開中・下書き・募集終了）。ダッシュボードの「あなたの公開中の案件」カードは目的に合わないため置き換え、**不要になったクエリ4本を削除**した。**⚠️ダッシュボードの左カラムは約600pxで、最低900pxの表を入れると枠内で横スクロールしボタンが見切れる**→狭い場所は `layout="cards"`、/deals は表のまま。
- **届いた提案の一覧を応募者一覧に寄せた（2026-08-11・本番反映済み。commit 10fbc5b）**: ①**チェックボックスで一括送信**（メッセージ／お断り。定型文つき。1通ずつ通常のメッセージとして届く）②**5段階の非公開評価とメモ**（新モデル `ProposalNote`・RLS有効化済み。相手には見えない）③**提示額の列**（提案フォームに任意の「提示額」を追加し `Thread.proposedAmount` に保存。**契約・合意ではない旨を画面とDBコメントに明記**）④**表示順**（新着／お気に入り／最新更新日／提示額の安い順）。**未返信は並べ替えに関わらず先頭**に固定（対応漏れを防ぐため）。
- **取引条件の提示と合意＝Phase 1（2026-08-11・本番反映済み。commit ab1bcb8）**: クラウドワークスの条件提示を参考に、**お金は動かさない**形で実装。新モデル `ContractOffer`（RLS有効化済み）＝金額・数量・納品予定日・内容・状態（提示中／合意／見送り／置き換え）。新しい提示で前のものは自動的に `superseded` になり**有効なのは常に最新の1件**。提示・回答は**やり取りにもメッセージとして残し**相手へ通知。合意すると商談の進捗を「成約・商品化」に進める。画面と記録の両方に「**NAKAMAは当事者にならず代金を預からない**」と明記。**⚠️事業判断の経緯（重要）**＝ユーザーは当初「契約額の10%をシステム利用料に」と希望したが、①規約・/pricing・llms.txt に「売買手数料を徴収しない」と明記済みで正面から矛盾する②**食材の卸取引は粗利が数%〜十数%で、10%は粗利を超えるためサイト外決済に逃げる**（クラウドワークスが成立するのは粗利の高い役務だから）③確実に取るには仮払い（エスクロー）が必要で**資金決済法の整理が必須**、という3点を説明し、**Phase 1（合意の記録のみ・手数料なし）から始める**方針で合意した。Phase 2＝手数料の請求（規約・特商法の改定が必要）、Phase 3＝仮払い（法務・金融の整理が必要）。
- **やり取りの表示調整と違反報告の土台（2026-08-11・本番反映済み。commit 2293b99）**: ①案件ごとのやり取りは**自分＝白地に緑枠／相手＝かなり薄い緑地（#F3F9F3）**（枠だけでは見分けられなかった）②メッセージ画面は名前の左に丸アイコン③**進捗ステッパーはメッセージ画面から外し**案件ごとの画面に集約（`ThreadHeader` の `showPhase`）④違反報告の土台＝`ViolationReport`（RLS有効化済み）＋受付処理＋事務局あて通知（`notifyAdminLines`）。**種別は食のプラットフォームの実態に合わせた**（サイト外取引の勧誘／マルチ商法／情報商材／スパム／**虚偽の情報（産地・規格・数量・実績）**／**食品衛生・表示の懸念**／迷惑行為／法令違反のおそれ／その他）。**残＝報告フォームと事務局の一覧画面**。

- **Phase 1 の周辺機能（2026-08-11・本番反映済み。commit e3f4860）**: ①**違反報告**＝`/report`（会員）と `/admin/reports`（上位管理者）。新モデル `ViolationReport`（RLS有効化済み）。**やり取りの本文は事務局にも表示しない**（規約17条の通信の秘密。対象IDのみ）。報告フォームに「**個別のご回答は行っておりません**」と明記。種別は食の実態に合わせた（サイト外取引の勧誘／マルチ／情報商材／スパム／**虚偽の情報（産地・規格・数量・実績）**／**食品衛生・表示の懸念**／迷惑行為／法令違反のおそれ／その他）。②**見送り**＝`Thread.closedAt/closedBy/closedReason`。どちらの当事者からでも終了・再開でき、見送ると**提示中の条件も自動で declined** にする。③**秘密保持契約（NDA）**＝新モデル `NdaAgreement`（RLS有効化済み・threadIdでunique）。雛形を提示→相手が同意で締結を記録（**電子署名ではない**）。特記事項つき。**⚠️雛形 `src/lib/nda.ts` は弁護士確認前**。**どの版に同意したかを `templateVersion` に残す**ので、改定しても過去の合意は壊れない（確認後は `NDA_TEMPLATE_VERSION` を上げる）。第10条に「**NAKAMAは当事者にならない**」を独自に追加。④**メッセージの保存期間**＝日次バッチで**最後のやり取りから1年**経過したスレッドの本文と**添付の実ファイル**を削除（1回200スレッドまで）。**プライバシーポリシー「10. 保存期間」に明記**し画面にも注記。**⚠️削除は戻せない**。実際に消え始めるのは2027年8月以降。
- **法人番号からプロフィールを自動入力（2026-08-11 調査済み・⚠️アプリケーションIDの申請待ちで未着手）**: 国税庁「法人番号システム Web-API」で、法人番号13桁から**商号・所在地・郵便番号**を取得してプロフィールに反映できる。仕様書は `~/Desktop/00_デスクトップ/企画書/スナックフォーラム/NAKAMAサイト制作/k-web-api-*.pdf`（共通編・概要編・Ver.4編）。**この節を読めばPDFを読み直さなくてよい**。
  - **エンドポイント**（Ver.4・XML）: `https://api.houjin-bangou.nta.go.jp/4/num?id=<アプリケーションID>&number=<13桁>&type=12&history=0`。`type` は 01=CSV/Shift-JIS、02=CSV/Unicode、**12=XML/Unicode（JSONは無いのでこれを使う）**。番号はカンマ区切りで**最大10件**。
  - **応答（XML）**: `<corporations><corporation>` の中に `corporateNumber` / `name`（商号） / `prefectureName` / `cityName` / `streetNumber` / `postCode` / `furigana` / `latest` / `hihyoji` など。**`postCode` はハイフンなし7桁**（`1000000`）なので整形が必要。**`hihyoji=1` は検索対象除外**（公表サイトの検索から外れている法人）＝**自動反映せず手入力を案内する**。
  - **アプリケーションID**: 無料・添付書類も手数料も不要。`https://www.invoice-kohyo.nta.go.jp/web-api/pre-reg/` にメールアドレスを送信→届いたURLから届出→**13桁のIDがメールで届く**。**書面では受け付けない**。**IDはシステム単位で、同一メールアドレスでは複数取得できない**。検証環境あり。データ更新は登記完了日16時または翌稼働日11時。
  - **実装方針（合意済み）**: `Member.corporateNumber`（任意）＋ `src/lib/houjin-bangou.ts`＋プロフィールの「この番号で会社情報を取得」ボタン。**取得結果は確認してから反映**（登記上の本店所在地は実際の事業所と違うことが多い）。**環境変数 `HOUJIN_BANGOU_APP_ID` が未設定なら機能ごと非表示**（Stripeと同じ作法）。**個人事業主には法人番号が無いので必須にしない**。将来は「法人確認済み」バッジの根拠に使える（ニーズチェックの項目）。
  - ※2026-08-11 に列を先行追加したが、ユーザーの「申請が済んでから」の指示により**DBの列・migration・schema すべて元に戻した**（作業ツリーはクリーン）。着手時は列の追加からやり直す。
- **UIの統一感を実測して直した（2026-08-12・本番反映済み。commit 326ba52 / 8f97216）**: tsx 138ファイルを実測したところ、ボタンは182個中179個が `btn()`、会員側32ページ全部が `h1Cls` で**そこは守られていた**。ばらついていたのは次の4点で、まとめて規格化した。①**入力欄に共通規格が無かった**（48箇所が27通りの書き方。角丸md/lg・文字12/13/14px・余白py-1.5/2/2.5が混在）→ `input(size)`/`inputBare(size)` を新設し**50箇所を移行**。見た目が変わったのは rounded-lg→md の9箇所と余白1箇所だけ（統一値を現状の最頻値にしたため）。②**見出しが2系統**（フォームの章とモーダルのタイトルだけ 16px bold ゴシック）→ `h2FormCls` を新設して16箇所を統一し、**2系統であること自体をUI規約に明文化**。③**金色系が30ファイルに直書き**（#B77F0B 61箇所ほか）→ `--amber`系6色/`--gold`/`--action`/`--line-soft`/`--orange-soft` を定義し**218箇所を置換**。#FFFBF0 と #FEFBF0 は差が1/255で区別できないため統合。④**ヘッダーの1項目目がトップと下層で文言もリンク先も違っていた**（下層の「案件を探す」は共créプロジェクトのセクションへ飛んでいた）→ トップに合わせて「探している案件を見る」→`/#buyer-listings` に統一し、**/hanro をヘッダー・モバイルメニュー・フッターに追加**（ヘッダーは7項目にすると折り返すため「利用料金・共創支援」と差し替え。利用料金はモバイルメニューとフッターに残す）。詰め表示のブレークポイントを 1500px→1620px に広げ、1520px前後の折り返しも解消した。**⚠️PCナビは1360px未満では元から2〜3行に折り返す**（今回の変更が原因ではない。直すならハンバーガーの閾値を上げるしかなく、影響が大きいので見送り）。
- **⚠️一括置換は `className="..."` だけを見ると漏れる（2026-08-12 の実例）**: 入力欄の移行で3箇所（ドラッグ中に枠色が変わる textarea＝メッセージ・提案フォーム、期限超過で赤枠になる日付欄）が**テンプレートリテラル**で書かれていて置換対象から外れ、`rounded-lg` のまま残った。**実画面で computed style を測って気づいた**。クラス文字列を機械置換するときは backtick 版も必ず洗うこと。
- **公開ページのコピー改訂（2026-08-12・本番反映済み。commit 191d944 / b7d5920 / 3a330c8 / 33ac688 / 2398079）**: トップの大コピー＝「食の「売りたい」「探している」「あったらいいな」を共créでつなぐ」、小コピー＝「全国の食品メーカー・飲食店・卸・小売と、新しい取引や共créのきっかけをつくる。…直接提案できます。」。**旧タグライン（食の「あったらいいな」を共créでつなぐ。）は大コピーに取り込まれたため削除**。登録カード見出し＝「「売りたい」「探している」「あったらいいな」を登録する。」、伴走カード＝「必要な相手を探し、事業化まで伴走します。」、3択CTA＝「目的に合わせてお選びいただけます。」。改行は固定せずブラウザ任せ（1520pxで2行・768pxで2行・375pxで3行）。**⚠️layout.tsx のサイトタイトルとOG画像の alt は旧コピー（あなたの食材・素材・サービスを探している人と出会う）のまま**＝検索結果の見出しに効くため、変えるなら文言をユーザーに指定してもらう。
- **/hanro の作り直し（2026-08-12・本番反映済み。commit 1ccb1d3 / dddb61d / 5e9d63e / 723f85f / f308998 / 6faa235 / f366583）**: ①**冒頭にいきなり価格が出ていた**ので、価格は各セクションの末尾に「目安の費用：…」として小さく置く（12px・補助テキスト色）②「入口商品 1／2」は**こちら側の呼び方**なので画面から削除③導入文をユーザー確定の文面に差し替え（見出し「まだ出会えていない相手へ、商品の価値を届ける。」）。**`InfoPage` の `lead` は1段落しか置けない**ため、続きの段落はページ本文の先頭に書いた（共通コンポーネントは変更しない）④**最終成果物**を両サービスに追加＝戦略セッションは「商品・販路戦略書（PDF／目安8〜12ページ）」＋記載項目7つ、トライアルは「販路開拓活動報告書（PDF形式／目安10〜15ページ）」＋記載項目8つ＋守秘義務の注記。準委任契約に基づく旨と成果を保証しない旨を小さく添える⑤トライアルの期間を**45日間→30日間程度**に変更。**⚠️同じ数字が本文以外に5箇所あった**（SEO説明文・相談フォームの選択肢・`src/lib/services.ts` の期間欄＝トップ/pricing/billing/hanroの表に共通・llms.txt×2）。**サービスの数字を変えたら `services.ts` と llms.txt と相談フォームを必ず一緒に直す**。
- **届いた提案の「対応」ボタンを先頭列へ（2026-08-12・本番反映済み。commit ae22a64）**: 表の右端にあったため**横スクロールで隠れ、押せることに気づけなかった**（ユーザー指摘「滅茶苦茶わかりにくい」）。チェックボックスの次に移し、白い枠線ボタン→塗りボタンに変更。未返信ありは赤みのオレンジで「対応する」、それ以外は緑で「やり取りを見る」。**⚠️`min-w` を持つ横スクロールの表では、主要な操作を右端に置かない**。
- **事業者ページの「戻る」が /search 固定だった（2026-08-12・本番反映済み。commit b44b84f）**: 届いた提案の一覧から会社名を押すと元の一覧へ戻れなかった。呼び出し元が `?from=` で戻り先を渡し、事業者ページは **`safeInternalPath` で検証してから**使う（外部URLは `/search` にフォールバック＝オープンリダイレクト防止。`?from=https://evil.example.com` で実測確認）。**全体を洗ったところ同じ問題が10箇所**あった（提案一覧／案件ごとのやり取り／メッセージ／PJ詳細／応募者管理×2／お気に入り／進行中の活動／ステータスボード／違反報告）。共通コンポーネント2つ（`ProducerCard`・`ApplicantProgressCard`）には**任意プロパティ**として足したので、渡さない既存の呼び出しは挙動が変わらない。**⚠️詳細ページの戻るリンクを固定URLで書かない**。
- **納品書・請求書の作成と発送・受け渡し完了（2026-08-12・PR #1・未マージ／⚠️migration のみ本番適用済み）**: 取引成立後の事務作業を画面内で完結できるようにした。①合意済みの条件に**「発送・受け渡し完了」**（完了日を記録＋やり取りに残す＋相手へ通知。**どちらの当事者からでも押せる**＝発送側・受領側どちらが起点でも成立するため。取り消しあり）②完了後に **`/ledger/[id]/proposals/[threadId]/document?type=invoice|delivery`** で納品書・請求書を作成（印刷ダイアログからPDF保存）③migration `invoice_documents`＝`Member.invoiceRegNo/bankAccount`、`ContractOffer.taxRate/completedAt/completedBy`（**列の追加のみ**）④条件提示フォームに消費税率8%/10%（分類が食材・原料なら8%が初期選択）⑤印刷時にサイドバーとヘッダーを隠す（`print:hidden`）。**位置づけ＝A：作成支援ツール（ユーザー決定）**＝書類は売り手名義で、NAKAMAは請求も回収もしない。**媒介者交付特例は使わない**（「当事者にならない」方針と衝突するため）。用紙末尾に当事者でない旨を明記。**⚠️発行済みPDFはサーバーに保存しない**（保存すると電子帳簿保存法の検索機能・訂正削除防止の要件を負う）。書類番号は対象IDから決定的に生成し、保存しなくても再発行で同じ値になる。**登録番号・振込先は記入率（RATE_FIELDS）に入れていない**＝入れると承認基準と事業者一覧の50%基準が動くため。登録番号が未入力なら区分記載請求書として成立させ、売り手本人にだけ画面上（印刷では非表示）で入力を促す。売り手の判定は案件の向き（GIVE＝掲載者が売り手／WANT＝掲載者が買い手）。**残＝完了後の帳票画面の実表示チェック**（実データで完了ボタンを押すと相手へ通知メールが飛ぶため、一時レコードで確認する手順を用意）と**税理士による様式確認**（端数処理＝税込からの割り戻し・円未満切り捨て、1明細構成の可否）。
- **取引成立後の事務を画面内で完結させた（2026-08-12・本番反映済み。commit ea72b61 / 24b09ea / d3f12e7 / 711605b / d6cfee9 / 842f73d / 46bfe81 / 12457cf / 0635c96 ほか）**: 条件の合意（Phase 1）から先が画面に無く、納品・請求は完全に画面外だった。**発送→受け取り→帳票→入金→完了**を1本の線でつないだ。
  - **発送と受け取りは別々に記録し、両方そろって完了**（migration `delivery_two_step`＝`ContractOffer.shippedAt/By・receivedAt/By` を追加）。**売り手は「発送しました」、買い手は「受け取りました」しか押せない**（立場と操作が食い違う操作はサーバー側で拒否）。片方だけのときは「発送済み・受け取り待ち」と出す。当初は1ボタンで完了にしていたが実態に合わないためユーザー指示で作り直した。
  - **帳票3種**＝`/ledger/[id]/proposals/[threadId]/document?type=invoice|delivery|receipt`。インボイス制度の記載事項（登録番号・取引年月日・税率ごとの区分・軽減税率の※）に合わせた。**発行日・書類番号（自動採番だが手で書き換え可）・支払期限・但し書き・代金受領日・備考**を画面で入力する。領収書は**電子交付なら収入印紙が不要**である旨も印字。
  - **消費税率は既定10%**（`defaultTaxRate` はカテゴリを見ない）。**「軽減税率（8%）の対象品目にする」チェックを入れたときだけ8%**で内訳を計算し直す（税込＝合意額は動かさない）。**分類から自動で8%にすると、送料込みや役務が混ざる取引で誤った税額の請求書を出してしまう**ため、発行する人に判断させる形にした（ユーザー決定）。
  - **発行内容だけをDBに保存する（案B・ユーザー決定）**＝新モデル `IssuedDocument`（migration `issued_documents`。**RLS有効化＋anon/authenticatedからREVOKEまで実施し `pg_class` と `role_table_grants` で実測確認**）。相手にも**同じ内容**の帳票を開いてもらうため。**PDFは保存しない**＝保存すると電子帳簿保存法の検索機能・訂正削除防止の要件を負う（保存義務は従来どおり当事者それぞれ）。書類番号は対象IDから決定的に生成し、保存しなくても再発行で同じ値になる。**発行できるのは売り手だけ**で、同じ取引・同じ種類は1件（出し直すと上書き）。押すとやり取りに残り相手へ通知。**買い手は発行前は用紙を見られない**（未発行なのに書類が見えると紛らわしい）。
  - **位置づけ＝A：作成支援ツール（ユーザー決定）**。書類は売り手名義で、用紙末尾に「NAKAMAは本取引の当事者ではなく、請求・代金の授受に関与しない」と明記。**媒介者交付特例は使わない**（「当事者にならない」方針と衝突するため）。`Member` に登録番号・振込先を追加したが、**記入率（RATE_FIELDS）には入れていない**＝入れると承認基準と事業者一覧の50%基準が動くため。
  - **商談の段階を7段階に作り替え**＝**ご商談＞ご契約＞発送＞受け取り＞納品書・請求書発行＞入金確認＞完了（領収書発行）**（旧：出会う〜成約・商品化の6段階は成約までしか追えなかった）。**手では動かせない**（ステッパーも /deals の選択も表示専用にした。ユーザー指摘「自分で触れてしまうのはダメ」）。段階は操作から自動で進む（戻さない）。**入金だけはNAKAMAから見えない**ので売り手に「入金を確認した」ボタンを置いた。**光らせるのは「次にやること」**（`activeStep`＝記録上の段階＋1。受け取りまで済んだら「納品書・請求書発行」が現在地）。色は済＝淡い黄／現在＝橙／未達＝白。
  - **取引が進んだら条件を変更できない**（ユーザー指摘）。発送・受け取りの記録か帳票の発行があると提示を止める（**サーバー側でも拒否**）。合意済みでも発送前なら「条件を変更する（相手の同意が必要）」で変更できる＝数量・納期の調整は普通に起きるため。
  - **やり取りの表示**＝古いメッセージは既定で畳み「▼ 他の◯件のメッセージを表示」で開く（最新3件は開いたまま）。1件ずつクリックで開閉もできる。`【条件を提示しました】`のような**`【〜】`だけの行を太字**にする（本文はプレーンテキストのまま描画時に判定）。**返信の入力欄はやり取りの直下**へ移した（間に「見送り・NDA・違反報告」が挟まっていた）。条件提示の一覧は見出しを**「これまでの条件提示」**にし、先頭に**募集条件の行**（案件の希望価格・数量・最小・期限）、最新の提示に**「最新」バッジ**と淡い黄の強調を付けた。
  - **問い合わせの二重送信を塞いだ**＝実際に同じ「はじめまして」が2件登録される事故が起きた（連打ではなく「効いていないと思ってもう一度押した」）。**ボタンを PendingButton にする＋サーバー側で直近2分の同一本文を弾く**の2段構え。画面だけだと古い画面や通信のやり直しですり抜ける。添付つきは同じ本文でも別物になり得るため対象外。
- **違反報告をやり取りの画面のモーダルにした（2026-08-12・本番反映済み。commit 1b88b74）**: 別ページ（/report）へ飛ぶとどのやり取りの話か分からなくなり戻るのも手間だった。やり取りの画面のままモーダルで報告する（対象のスレッドは固定で送る）。**種別に取引そのもののトラブルを追加**＝合意した条件と違う／連絡が取れなくなった／支払いのトラブル（未払い・一方的な減額）／なりすまし・会社情報が事実と違う。並びも「取引で困ったこと→相手の情報が疑わしい→勧誘・迷惑行為」に整理した（既存キーは変えていないので過去の報告の表示は崩れない）。**参考にした他サービスの分類はそのまま使わない**（著作物であり、クラウドソーシング固有で食の取引に関係ない項目も多い）。本文を事務局に見せない方針は不変（規約17条）で、その旨を画面にも明記した。
- **「探している」の未記載項目を両側に知らせる（2026-08-12・本番反映済み。commit 914a41f）**: 公開の必須は3項目（タイトル・募集タイプ・使用目的）だけなので、数量も時期も予算も空のまま公開できる。一方**提案する側はクレジットを払う**ので、判断材料が無いまま払うことになっていた。`recommendedMissingForWant()` を追加し、**公開は止めずに**掲載側の編集画面へ警告を、提案画面には「この案件で未記載の項目」を出す。**必須を増やさなかったのは、買い手に13項目書かせると案件が集まらないため**（8/11に掲載代行を作った経緯と同じ判断）。
- **リードの初回開封に1クレジット（2026-08-12・ユーザー決定。⚠️ブランチ `lead-unlock` で作業中・未マージ／migration `lead_unlocks` のみ本番適用済み）**: 「探している」への提案だけが有料で、「売りたい」で得たリードは無料だった＝**収益が片側に偏り、売り手側の価値が回収できていない**。**「初回の接点に紹介料」という一本のルール**に揃える。
  - **決めたこと（ユーザー）**：①開封は**1クレジット**（提案側の通常案件と同額。案件の確認状態では変えない）②**ビジネス会員も月次クレジットから消費**（同じ財布。実効440円/件で会費の価値が上がる）③**開封後のやり取りは何往復でも無料**④透明化は3つとも実施＝未開封を一定期間で買い手に通知／案件カードに返信率／問い合わせフォームに予告。
  - **⚠️これは8/10夜に入れて8/11に撤廃した「引き合い課金」と同じ場所**。前回はニーズチェックの指摘（商談開始直後の課金壁で離脱する）で撤回した。**今回は壁の位置が違う**（前回＝会話の途中／今回＝最初の1件、提案側の紹介料と同じ性質）が、同じ論点が再燃しうる。撤退の判断ができるよう、開封率と返信率は必ず見ること。
  - **実装（中核は完了。commit c9f47a1）**：新モデル `LeadUnlock`（RLS有効化＋anon/authenticated REVOKE 実測確認）。`openLead()` は記録の作成とクレジット消費を1トランザクションで行い、**二重課金は `threadId` の unique で防ぐ**。課金対象は `isChargeableLead()`＝**自分の「売りたい」案件に相手から届いた問い合わせ**だけ（自分から送ったやり取り・探している案件・案件に紐づかない直接連絡は無料のまま）。未開封のやり取り画面は**本文をサーバーから返さない**（画面で隠すだけでは読める）。冒頭40字だけ見せて開封導線を出す。**開封は自分の操作なので未読返還の対象外**（提案側は相手が読まないことがあるため返還がある）。
  - **⚠️マージ前に必ず要るもの（→ 2026-08-12 に①〜⑤すべて実装済み。下記「開封課金の仕上げ」）**：①提案一覧の伏せ字 ②規約・料金・LPの改定 ③未開封7日通知 ④返信率の表示 ⑤問い合わせフォームの予告。
- **開封課金の仕上げ（2026-08-12・ブランチ `lead-unlock`・未マージ／migration `lead_unopened_notice` のみ本番適用済み）**: 上の①〜⑤を実装。
  - **施行日＝2026年8月26日（ユーザー決定・2週間の予告つき）**。無料範囲を狭める不利益変更なので、先に文言を改定して周知し、課金は施行日から。**判定は「相手からの最初のメッセージの日時」1つに集約**（`LEAD_UNLOCK_START_AT`）＝施行日より前に届いた未開封のリードは無料のまま／予告期間中はそもそも課金対象が存在しない、の両方が同じ条件で満たされる。**画面の文言（`LEAD_UNLOCK_START_LABEL`）と定数は必ず一緒に直すこと**。
  - **判定と文言は `src/lib/lead-unlock-core.ts` に分離**（DB非依存＝vitestで検証。billing-core.ts と同じ作法）。`lead-unlock.ts` は core を再輸出するので、呼び出し側の import は従来どおり。**client component から `lead-unlock` を import しない**（prisma が入る）。
  - **本文が読めた穴を全部塞いだ**＝①提案一覧（冒頭40字＋「未開封」バッジ、ボタンは「開いて読む」）②メッセージ一覧のプレビュー③**`/messages/[id]` は案件ごとの画面へリダイレクト**（ゲートを迂回して全文が読めていた）④**通知メールの本文80字**（`notifyRecipientIfCaughtUp` で伏せる）⑤**添付の配信（402で拒否）**。**判定は必ず `loadLockedLeadThreadIds()` を通す**（画面ごとに条件を書くと必ずどこかで漏れる）。⑥未開封のうちは**既読にしない**（読んでいないのに「未返信」が消えると対応漏れになる）。
  - **未開封の場所にビジネス会員の案内**（2026-08-12 ユーザー指示「ビジネス会員を増やそう」）＝`src/components/BusinessMemberPromo.tsx` に文言を集約し、**3か所**（メッセージ一覧の未開封の行の下・届いた問い合わせの一覧・開封画面 LeadGate）に同じものを出す。**すでにビジネス会員（PAID）には出さない**。**見せ方＝月額より「1件あたり」を先に出す**（ユーザー指示「2万円のサブスクは隠れられる」）＝見出し「開封1件 1,100円 → 会員なら440円」、月額22,000円は下に小さく（特商法・景表法があるので**消さない**）。数字は `billing-core.ts` の `MEMBER_MONTHLY_CREDITS`／`CREDIT_UNIT_PRICE`／`MEMBER_MONTHLY_FEE` から計算（440円＝22,000÷50、55,000円相当＝50×1,100）。**⚠️メッセージ一覧の行そのものが `<Link>` なのでリンクは入れ子にできない**＝行を `<div>` で包み、案内は Link の外に出している。**⚠️届いた提案の表では列の中に入れない**（横スクロールで隠れる）＝表の上に1つだけ出す。**同じ案内は1画面に1つ**＝メッセージ一覧は未開封の**先頭1件の下だけ**に出す（行ごとに出すと未開封が並んだとき同じ案内が何個も続く）。
  - **未開封7日通知**＝日次バッチの8番。`Thread.leadUnopenedNoticeAt`（migration `lead_unopened_notice`・列の追加のみ）で一度だけ。先に印を付けてから送る。買い手あて（`notifyLeadUnopened`）。
  - **返信率**＝`src/lib/reply-rate.ts`。母数＝相手から先に届いたやり取り／分子＝1通以上返したもの。**母数3件未満は出さない**（1件で0%と出ると実態を表さない）。表示＝/search のカード（`OfferingCard.replyRatePercent`＝任意プロップなので渡さない画面は不変）と案件詳細の情報表。
  - **問い合わせフォームの予告**＝売り手が開封して読むこと・開封に1クレジットかかること・7日で通知が届くこと・具体的に書くほど開いてもらいやすいこと。施行日前は「8月26日以降にお送りいただく分から」と出し分ける。
  - **文言の統一（ユーザー指示「これは統一してほしい」「削除だね」）**＝「届いた問い合わせへの返信は無料」を9か所から削除し、**無料＝登録・掲載・閲覧・検索・問い合わせの送信＋解放後の継続メッセージ（何往復でも無料）／有料＝初回の接点（提案・開封）・掲載オプション・事務局への依頼**に揃えた。反映＝規約第2条（紹介料の定義）・第7条1項・第7条2項4号・第7条の2第1項〜2項・返還規定・改定履歴／特商法（販売価格・返金）／トップ／layout の description／pricing／faq／flow／about／billing／llms.txt／案件詳細／`stripe.ts` の特典表記／`sitemap.ts` の CONTENT_UPDATED_AT。**規約は「改定：8月12日／施行：8月26日」と分けて記載**。
  - **検証**＝tsc・next build・vitest 31件（うち新規7件＝施行日と課金対象の判定）・375pxで横スクロールなし・規約/pricing/トップの実表示。**⚠️会員側の実画面（伏せ字・返信率・予告）は未検証**＝施行日前は課金対象が0件になるため、E2Eするなら一時的に `LEAD_UNLOCK_START_AT` を過去にして本番の一時アカウントで確認する。
  - **残（ユーザー作業）**：①**施行前の周知**（お知らせ＋できればメール）②弁護士への事後確認は**7回目**の論点としてこの改定を追加③施行日を過ぎたら開封率・返信率を見て継続可否を判断。
- **「売りたい」の課題解決タイプを廃止（2026-08-12・ユーザー判断「売りたいに課題はいらないかも」）**: 登録冒頭の「今回、何をしたいですか？」（商品・原料を売りたい／課題を一緒に解決したい）の2択と、課題5問（`challengeCurrent/Scale/Tried/Ask/Value`）・詳細ページの黄色ブロック・カードとプレビューの「課題解決」ラベル・**公開必須検証の課題3項目**を削除した。**課題は共創パートナー募集（/projects）の役割と重複**しており、売りたいの入力を長くするだけだった（実際に「レモンを使ったクラフトビール」が課題3項目を書かないと公開できない状態で止まっていた）。**DBの列と `LISTING_PURPOSES` の値は残置**（`listing_purpose='challenge'` の既存1件は下書きのみ・表示に出なくなるだけ）。`offering-taxonomy.ts` から `LISTING_PURPOSES` を削除したので、復活させるならこの節を参照。保存処理（`ledger/actions.ts`）も課題項目を書かない。
- **⚠️2026-08-12 に踏んだ地雷**: ①**データ移行スクリプトは実行順で壊れる**＝段階の移し替えで「旧5→1」の直後に「旧1〜4→0」を流し、直したはずの1件を0に巻き戻した（合意済みの商談から復元して事なきを得た）。**同じ列を複数回UPDATEするなら、条件が重ならないか順序を先に確かめる**。②**表示と記録はずれる**＝旧仕様（1ボタンで完了）で `completedAt` だけ入った記録は段階の自動前進が働かず取り残された。`reconcileDealPhase` を入れ、画面を開いたときに事実から計算して直すようにした。**イベント駆動で状態を進める作りには、事実から現在地を再計算する経路も要る**。③**立場で出し分けていないボタンは誤解を生む**＝買い手にも「請求書を発行する」が見えていて「押せば発行できる」と読めた。**誰の操作かで出し分ける**。④schema変更後の dev サーバー再起動（`PrismaClientValidationError`）を今日も2回踏んだ。
- **⚠️新機能を足すたびに繰り返す作業（2026-08-11 時点のまとめ）**: ①新テーブルを足したら **RLS有効化＋anon/authenticated からREVOKE**（`enable row level security` と `revoke all`。`pg_class.relrowsecurity` で実測確認）②`npx prisma generate` を忘れると型が出ない③client component から server 依存モジュールを import しない④**画面の切替は `Link`**（form送信にするとクライアント遷移が効かず遅い）⑤法務に触れる文言を変えたら**弁護士への事後確認リストに追加**する。

## Phase 7 への引き継ぎ（2026-08-11 時点）

Phase 6（セキュリティ検査と修正）は完了・本番反映済み。以降の作業もすべてデプロイ済み。
Phase 7 では下記から着手する。**着手前にこの節と「やることリスト」を必ず読むこと。**

### 判断待ち（ユーザー決定が必要）

1. ~~**ビジネス会員（月22,000円）のメリットが薄い**~~ → **2026-08-11 に価格整合を実施（下記「課金の価格整合」参照）**。
   残る論点＝**月次チケットは standard 専用**で、確認済み優良案件（3,300円・verified）には使えない
   （会員だけの機会にする案は未採用）。非金銭特典（優先通知・分析・月1レビュー等）も未実装。

2. **ニーズチェック（買い手ファースト化）の未着手分**。`docs/needs-check-20260811.md` と
   ユーザー提供の実装指示（チャット）に基づく。案件カードへの取引条件の一覧表示
   （必要数量・時期・納品地域・規格・価格・取引形態・募集期限・法人確認。**データは既に揃っている**）、
   条件検索の絞り込み拡張、買い手の法人確認バッジ・返信率・最終ログイン表示、通報・ブロック、
   高額支援ページの分離、登録画面の簡素化。
   ※**最優先は事務局が実在の買い手案件を20件集めること**。案件0件のままでは画面改修の効果が出ない。

### 運用（ユーザー作業）

3. ~~**検索インデックスの再クロール依頼**~~ → **2026-08-11 実施済み**（Google Search Console で
   `/pricing` `/faq` `/terms` `/tokushoho` `/` のインデックス登録をリクエスト、Bing はサイトマップ再送信）。
   反映は数日〜1週間。確認は普通のGoogle検索で `site:nakama.food-japan-summit.jp/pricing`。
   **料金・サービス説明を変えたら `src/app/sitemap.ts` の `CONTENT_UPDATED_AT` を更新すること**（これを忘れると再クロールが遅れる）。
   ※GSCの検査窓には `site:` を付けず素のURLを貼る。「公開URLをテスト」ではなく「インデックス登録をリクエスト」を押す。
4. Supabase の Logs で外部IPからの `/rest/v1/` アクセス有無を確認（RLSの穴の悪用有無の最終確認）。
5. 弁護士への規約改定の事後確認。**8/10以降で4回改定**（引き合い課金導入→Premium改称→撤廃＋月20チケット
   ＋ビジネス会員改称→第2条に案件の表示名を併記）。依頼書 docx は①②までの内容なので追補が必要。
6. 電気通信事業の届出要否確認（`docs/telecom-notification-inquiry.md`）。

### 実装上の注意（Phase 7 で踏みやすい地雷）

- **手動でビジネス会員にしても月次チケットは付与されない**（`markMemberPaid` は paymentStatus のみ更新。
  付与は Stripe の `invoice.paid` のみ）。9/9 の自社会員戻しで実際に問題になる。手動付与の導線が必要。
- **クーポン適用の申込みは自動反映されない**（`invoice.paid` は税込22,000円ちょうどの定期課金のみ通す）。
  キャンペーンをやるなら Stripe に正式な Price を作り price ID で判定する改修が必要。
- **新しいテーブルを追加したら RLS を有効化する**（既定権限は是正済みだが多層防御のため）。
  `alter table public.<name> enable row level security;` ＋ `revoke all on public.<name> from anon, authenticated;`
  を実行し、`pg_class.relrowsecurity` と `information_schema.role_table_grants` で実測まで確認する。
- **client component から server 依存モジュール（`security.ts` 等）を import しない**。
  `next build` が "module depends on next/headers" と dns/fs 未解決で落ちる。
  画面と共用したい定数は依存を持たない独立モジュールへ（例＝`src/lib/attachments.ts`）。
- **`useEffect` の中で `setState` を呼ぶと lint エラー**（react-hooks/set-state-in-effect）。
  初期値の計算は `useState` の遅延初期化、外部の値の購読は `useSyncExternalStore` を使う。
- **画面の切替（タブ等）を `<form>` の送信ボタンで作らない**。ブラウザの通常のページ送信になり、
  クライアント遷移・プリフェッチ・`loading.tsx` がすべて効かず「押しても固まる」体感になる。
  `Link` を使い、フォームに残したい状態は hidden で持たせる。
- **見出しと長いボタンを横一列に固定しない**（`flex ... justify-between` だけにしない）。
  ボタンに幅を取られて見出しが途中で改行される。`flex-wrap` と見出し側の `min-w`/`flex-1` を入れる。
- **`Thread` に `offering` リレーションは無い**（`offeringId` は素の列）。案件を引くときは
  threadId→offeringId→offering の順に取得する。
- **ダッシュボードの左カラムは約600px**。列の多い表（min-w 900px 等）を置くと枠内で
  横スクロールし、右端のボタンが見切れる。狭い場所はカード表示にする。
- **案件の画像をコピーするときはストレージ上で複製する**。URLを使い回すと、元の案件を
  削除したときに `offerings/<元のID>/` 配下が消えてコピー側が壊れる。
- **手数料・仮払い（エスクロー）は未実装**。条件提示は「合意の記録」だけで、
  NAKAMAは当事者にならず代金も預からない。ここを変えるなら規約・特商法の改定と
  資金決済法の整理が先（`ContractOffer` のコメント参照）。
- **添付ファイルは非公開バケット `message-attachments`**。`getPublicUrl` を使わず
  `/api/attachments/[messageId]` 経由で配信する。
- **OG画像（public/og.jpg）の「会員制ネットワーク」表記はこのままでよい**（ユーザー判断・再指摘しない）。
- **案件区分の呼称**＝正式名「売りたい（提供したい）」「探している（調達したい）」「共創パートナー募集」、
  短い場所は「売りたい」「探している」。動詞の「探している」は括弧書きを付けない。

### 検証の作法（今回得た知見）

- **会員側の部品の見え方は、`/preview` 配下に一時ページを作って確認する**（2026-08-12）。会員ページはログインが要り、開発ブラウザからは入れないことが多い。`src/app/(public)/preview/tmp-*/page.tsx` を作れば `middleware` の `PUBLIC_PATHS` に `/preview` があるのでそのまま開ける（狭い枠に入れた compact 版と通常版を並べて比べられる）。**確認したら必ず消すこと**＋消した後に `tsc` が「.next/dev/types/…tmp-… が見つからない」と言うので `.next/dev/types` の該当フォルダも消す。**なお、この一時ページを開いたままだと「同じものが2つ並んでいる」と誤解される**（実際に指摘を受けた）。

- 開発ブラウザペインは**クリックとキー入力がReactに届かないことがある**。ログインが必要な画面は、
  Supabase の token エンドポイントでセッションを取り、`document.cookie` に
  `sb-<ref>-auth-token=base64-<JSON>` を直接注入してから `location.href` で遷移すると確実。
- **push しても Vercel に反映されないことがある**（今回1回発生）。反映を確認するまで完了と report しない。
  反映されない場合は空コミットを push すると再デプロイされる。
- E2E は本番DBしかないため「一時アカウント＋テストデータを作成→検証→必ず削除」。
  テスト会員名は `【テスト】…(削除予定)`、メールは `phase6-*@example.com` を使った。
  削除時は messages / threads / offerings / credit台帳 / Storage(message-attachments) / Supabase Auth まで消す。

## やることリスト（対外募集開始前）
000. **【追加】2026-08-12 開封課金（リードの初回開封に1クレジット）の周知**:
   ①**施行日 2026年8月26日までに会員へ周知する**（/admin のお知らせ＋案内メール同意者へのメール。無料範囲を狭める不利益変更のため、規約は「改定8/12・施行8/26」で先に反映済み）。
   ②弁護士への事後確認（下記1）に**7回目の改定として本件を追加**（論点＝不利益変更の周知期間と方法・前払式の紹介クレジットの資金決済法該当性との関係）。
   ③施行後は**開封率と返信率**を見る（前回の引き合い課金と同じ論点が再燃したら撤退できるように）。
00. **【追加】2026-08-12 の帳票で確認が必要になったもの**:
   ①**税理士に様式を1回見てもらう**（特に**端数処理**＝税込からの割り戻し・円未満切り捨て、**1明細で送料等を分けない構成**の可否、免税事業者のときの区分記載請求書の体裁）。
   ②**発行フローのE2Eが未実施**＝発行できるのは売り手だけなので、**自社が売り手になる「売りたい」案件**で
   発行 → 入金確認 → 領収書まで通しで確認する（実案件で押すと相手に通知メールが飛ぶ点に注意）。
   ③二重送信ガードもE2E未実施（実メッセージが飛ぶため机上のみ）。
0. **【追加】2026-08-11 の Phase 1 で法務確認が必要になったもの**（上記1の送付時にまとめて）:
   ①**秘密保持契約の雛形**（`src/lib/nda.ts`・**弁護士確認前のまま本番に入っている**。確認後は
   `NDA_TEMPLATE_VERSION` を上げる）②**プライバシーポリシー「10. 保存期間」の追記**
   （会員間メッセージと添付を最後のやり取りから1年で削除する運用を明記し、実際に日次バッチで削除する）
   ③**取引条件の提示と合意**（当事者間の意思表示の記録であり、NAKAMAは当事者にならず代金も預からない、
   という整理でよいか。手数料・仮払いに進む場合は規約・特商法の改定と資金決済法の整理が必要）。
1. **【最重要】弁護士へ規約改定の事後確認を送付**（**2通・作成済み・未送付**）: ①`docs/FOOD_JAPAN_NAKAMA_規約改定_弁護士確認用_20260810.docx`（8/10 18:47時点まで）②`docs/FOOD_JAPAN_NAKAMA_規約改定_弁護士確認用_追補_20260811_50クレジット版.docx`（**それ以降の全6回の改定＝Premium改称／引き合い課金の導入と撤回／ビジネス会員改称と月次クレジット／案件の表示名／クレジット一本化・確認済み3クレジット・有償180日／月50クレジット**）。追補はユーザー修正版（`…追補_修正版_20260811.docx`）を土台に数字と経緯だけ更新したもので、**冒頭の「サイト・規約・特商法・決済画面・実装を同一内容へ更新した後に確定版として使用」という条件は全て満たしている**（同日中に本番反映済み）。**最重要論点=紹介クレジット（前払式）の資金決済法該当性**、次いで繰越なしの失効の有効性・短期間に6回改定した約款変更手続・撤回した規定の履歴の書き方・料金比較表示（景表法）・電気通信事業の届出要否。
2. **【最重要】電気通信事業の届出要否確認**: 会員間1対1メッセージ＝「他人の通信の媒介」該当可能性高（弁護士見解）。関東総合通信局 電気通信事業課（03-6238-1670・九段第3合同庁舎＝会社の目の前）へ電話確認。確認依頼文書と事実関係別紙=`docs/telecom-notification-inquiry.md`。**特にQ5「届出前に会員募集を開始してよいか」を必ず確認**。「必要」ならClaude が様式第8記入案+ネットワーク構成図を作成する。※無料化で全登録者がメッセージ利用可になった点も伝える。
3. **9/9以降: 自社会員を手動でビジネス会員に戻す**: テストサブスクは期間終了時キャンセル予約済み→2026-09-09の満了時にWebhookで自社会員（グラブデザイン）が「未決済」に落ちる。/admin/members→「入金確認済み→Premium会員（課金中）にする」で戻す（課金は発生しない）。
4. 運用規程の整備（Claude が雛形作成可）: データ保存期間表／本人確認書類の取扱規程／非公開メッセージ閲覧時の権限・記録手順（届出する場合は特に必要）。
5. 弁護士回答の残論点があれば `src/lib/legal.ts`（規約/プライバシー）・`/tokushoho` に反映（実装との矛盾チェック必須）。
6. メルマガ・イベント案内を始める際: 特定電子メール法対応（事前同意・同意記録は実装済み=users.marketing_opt_in_at。**配信停止手段（メール内リンク等）の整備が配信開始前に必要**）。条件一致通知・相手へ届けるセットは同意者が貯まったら有効化。
7. 残る旧状態の掃除: **2026-08-11に本番DBを実測したところ、umetaku1会員は「お支払い待ち（旧）」ではなく `status=DRAFT`（プロフィール未入力・記入率0%）かつ `paymentStatus=PAID`（ビジネス会員）だった**。ほかに hiro0731@gmail.com / toshi.taniguchi@nifty.com / tongatuned31@gmail.com も DRAFT のまま（いずれも会員管理の修正で表示されるようになった）。/admin/members で会社名を開き、承認する（承認時に3件クレジット付与）か、課金を解除するかを判断する。
8. ~~Stripe本番Liveの100%OFFクーポン`FJS2026TEST`を無効化/削除~~ **→ 2026-08-11 ユーザー対応済み**。残り: Supabase の Logs で外部IPからの `/rest/v1/` アクセス有無を確認（RLS穴の悪用有無の確認）。
9. ~~**⚠️割引つきサブスクは自動でPremiumにならない仕様になった**~~ → **2026-08-11 夜に解消**（値引き前の金額で判定し、すでに会員なら割引つき請求でも月次クレジットを付与。昇格だけは定価どおりの支払いに限定）。旧記述は以下（経緯として残す）: `invoice.paid` は「定期課金かつ税込22,000円ちょうど」の請求書だけをPremiumとして扱う。クーポンや割引での申込みは自動反映されないため、キャンペーンをやる場合は①/admin/membersの手動Premium化で運用するか、②Stripeに正式なPrice（現在は都度 price_data 生成）を作り、金額ではなくprice IDで判定するようWebhookを改修する。既存の自社¥0契約は9/9満了→手動戻し（項目3）の流れで整合している。

## 将来の検討（今は実装しない）
- **1社で複数ユーザーが同じ画面を使うプラン**（ユーザー着想 2026-08-12）: 引き合いが増えたら、1社10ユーザーで月10万円程度の上位プランが要るかもしれない。現状は1会員＝1事業者で、`Member` に複数 `User` がぶら下がる構造は既にあるが、**課金・クレジットは会員単位**なので席数の概念はない。着手するなら、席数の上限・招待フロー・クレジットの共有範囲（会社の財布を全員で使う想定でよいか）から決める。

## 今後の課題（ニーズチェック評価 2026-08-09・詳細=docs/needs-check-20260809.md）
外部評価の結論: **相談・個別支援へのニーズは強いが、月額22,000円の説得力は4/10**。説明の追加ではなく「企業・案件・商談・成果」が実在して見える状態が必要。当面の売上の中心は会費ではなく個別相談→プロデュース契約（15万→50万→月30万）。
1. **利用者別の4入口**をトップに（生産者/メーカー・小売/自治体・地域商社/食品ロスに困る方 × できること・利用例・おすすめプラン）
2. **「現在ありません」をなくす**: 売10・買10・共創10件、参加30社、進行5件、セミナー3件、事例3件（架空案件は禁止。「事務局企画・情報提供者募集中」表示で構想と実案件を区別）
3. **月額22,000円の中身を具体化**（月1回30分の事務局相談・毎月の候補情報提供・打診・月1交流会 等＋別料金の境界明示）
4. **実名の信頼**（許諾を得た企業ロゴ・顔写真・FJS実績・「○社○名参加」等の数字をトップに）
5. **相談後の流れを明示**（30分初回相談→整理→候補調査→方針と費用→実行）
6. **事例は数字で**（相談者/課題/支援/期間/成果/次の展開。成果前でも進捗を掲載）
- 90日目標: 掲載30件・問い合わせ20件・商談10件・試作実証3件・有料契約1件（第1段階=クーポンで情報集め→第2段階=事務局が働きかけ→第3段階=成果公開）

## 設計の肝（崩すと「ただのマッチングサイト」になる）
- 「企業を探す」ではなく「動かせるモノ・場所・条件を探す」。検索対象は企業自由記述ではなく **offerings（台帳）1件ずつ**。
- 課金の権限判定は自社DB側（Stripeに毎回問い合わせない。Webhookで同期）。
- リアル資産（Food Japan Summit のイベント/人脈）＋ オンライン(NAKAMA) ＋ 個別支援(共創プロデュース) を一体で売るのが勝ち筋。
