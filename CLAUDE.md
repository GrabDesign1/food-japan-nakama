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
- **プロジェクト承認フロー改善（2026-08-10・本番反映済み）**: ①事務局（同一テナントの管理者）は公開前のプロジェクト詳細を閲覧可（従来は所有者以外404で承認前の内容確認ができなかった）。承認待ちは詳細ページ上部に承認・差し戻しバー、管理者閲覧では閲覧数を数えない。②**差し戻しは理由必須のモーダル**（`SendBackButton.tsx`。/adminと詳細ページの両方）→ `adminSendBackProject` が status=draft＋`Project.reviewNote` 保存（migration `project_review_note`）＋監査ログに理由記録＋**掲載者へ理由つきメール**（notifyProjectSentBack）。掲載者の編集画面に黄色バナーで理由表示、再申請（submitProject）で消去。③**承認メール**（adminApproveProject→notifyProjectApproved・公開ページへのリンクつき）。旧 adminReviewProject は approve/sendBack の2関数に分割。メール失敗でも承認/差し戻し自体は成立（catchしてログ）。④/adminに**「差し戻し中のプロジェクト」一覧**（status=draft かつ reviewNote あり＝再申請待ちを追跡。再申請でreviewNoteがクリアされ承認リストへ戻る。理由・差し戻し日・会員名を表示）。E2E検証済み（差し戻し→理由保存・バナー・メール→再pending→承認→published・理由クリア。テストデータは削除済み）
- **⚠️運用TODO（ユーザー作業）**: ①Stripeダッシュボードで Webhook に `invoice.payment_failed`・`customer.subscription.updated` の2イベントを追加（未追加だと決済失敗が反映されない）②Supabaseプラン確認→Pro+PITRでバックアップ有効化（backup-runbook.md）
- Phase 2以降（未着手・要承認）: 学び/セミナー本実装、掲載上限、共créプロフィール構造化+食の検索条件、自動マッチング提案+週次ダイジェスト、共créシート/企画書自動生成、共cré事例、analytics（導入時は外部送信ポリシー更新必須）。

## やることリスト（対外募集開始前）
1. **【最重要】電気通信事業の届出要否確認**: 会員間1対1メッセージ＝「他人の通信の媒介」該当可能性高（弁護士見解）。関東総合通信局 電気通信事業課（03-6238-1670・九段第3合同庁舎＝会社の目の前）へ電話確認。確認依頼文書と事実関係別紙=`docs/telecom-notification-inquiry.md`。**特にQ5「届出前に会員募集を開始してよいか」を必ず確認**（公開スケジュールに直結）。「必要」ならClaude が様式第8記入案+ネットワーク構成図を作成する。
2. **9/9以降: 自社会員を手動PAIDに戻す**: テストサブスクは期間終了時キャンセル予約済み→2026-09-09の満了時にWebhookで自社会員（グラブデザイン）が「未決済」に落ちる。/admin→会員管理→「課金済みにする」で戻す（課金は発生しない）。
3. 運用規程の整備（Claude が雛形作成可）: データ保存期間表／本人確認書類の取扱規程／非公開メッセージ閲覧時の権限・記録手順（届出する場合は特に必要）。
4. 弁護士回答の残論点があれば `src/lib/legal.ts`（規約/プライバシー）・`/tokushoho` に反映（実装との矛盾チェック必須）。
5. メルマガ・イベント案内を始める際: 特定電子メール法対応（事前同意・同意記録・配信停止手段）。

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
