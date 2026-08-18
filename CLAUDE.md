# FOOD JAPAN NAKAMA — 開発メモ（Claude Code 用）

Food Japan Summit の参加者を会員とする、通年運用の食の共創プラットフォーム。
本番: https://nakama.food-japan-summit.jp/ ／ GitHub: GrabDesign1/food-japan-nakama（main へ push で Vercel 自動デプロイ）。
運営会社: 株式会社グラブデザイン（代表 梅原卓也 / info@grab-design.com / 03-6825-3901 / 〒102-0073 東京都千代田区九段北1-2-1）。

一次資料: `docs/HANDOVER.md`（初期仕様）, `docs/DECISIONS.md`, `docs/current-state.md`（現状構成）,
`NAKAMA_ClaudeCode_implementation_spec.md`（3サービス改修の実装指示書＝最新方針）。

**いまサイトに何があるか（ページ・機能・システム・記載内容の全量）は「現況の棚卸し」の節にまとめてある**（下の「現在の進捗」は時系列の作業記録）。

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
- 生成AI: **OpenAI**（`openai` SDK・`gpt-5.6-terra`・Responses API＋JSONスキーマ）。掲載文とプロフィールの下書き支援だけに使う。`OPENAI_API_KEY` が無ければ機能を出さない。**会員間メッセージには一切使わない（規約17条）**。

## 開発・運用の作法（重要）
- **指示されていない変更をしない（最重要・ユーザー指示 2026-08-09）**: 依頼された箇所以外のコード・文言・デザイン・CSSに手を加えない。「ついで」の改善や整理は実装せず、提案として報告だけする。共通CSS・共通コンポーネントなど影響が波及する変更は、事前に影響範囲を伝えてから行い、変更後は複数の画面幅（1520/1200/1120/1000/375px 目安）で表示確認する。レイアウト崩れの実害が出たことがある。
- **コマンド実行の許可（2026-08-16 設定）**: 毎回の確認を減らすため、ClaudeCODE 側の `.claude/settings.local.json` で **`permissions.defaultMode = "auto"`**（安全なコマンドは自動実行）にしてある。あわせて**禁止リスト（deny）**を置き、`rm -rf /`・`sudo`・`git push --force`・`git reset --hard`・`git clean -fd`・**`npx prisma migrate reset`**・**`npx prisma db push`**・`cat .env*`・`cat ~/.ssh/*` は auto でも実行できない。**本番DBを壊す2つ（migrate reset / db push）を禁止しているのは、このプロジェクトが本番DB1本で動いているため**。設定を変えたら Claude Code の再起動（または `/hooks` を一度開く）で反映される。
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
- **規約 第17条の2＝掲載文およびプロフィールの作成補助（AI下書き）**。8/14新設・8/15にプロフィールへ拡張、いずれも即日施行。送信先＝OpenAI, Inc.（米国）。プライバシーポリシーの3.利用目的・7.外国にある事業者にも記載済み。**弁護士確認は未了（下記1に追加すること）**。
- signup に案内メール同意チェック（任意・users.marketing_opt_in_at に記録。Google OAuth 登録は同意なし=null。配信開始前に配信停止手段の整備が必要）。

## 現況の棚卸し（2026-08-18 時点・サイトの内容／機能／システムの全体像）

**この節は「いま何があるか」の一覧**（下の「現在の進捗」は「いつ何をしたか」の時系列記録）。
実装から実測して作った。**画面や仕様を変えたらこの節も直すこと**。上の「ルーティング」「データモデル」は抜粋なので、全量はここを見る。

### ゾーンは4つ（ルートグループ）
| ゾーン | ルートグループ | 中身 | ヘッダー／フッター |
| --- | --- | --- | --- |
| 公開 | `(public)` | LP・サービス紹介・法務・案件のプレビュー | トップはヒーロー内蔵、下層は `PublicTopBar`／NAKAMAフッター |
| 会員 | `(app)` | ログイン後の全機能＋事務局管理 | `(app)/layout.tsx` の `NAV`（PC/モバイル共通） |
| 認証 | `(auth)` | ログイン・登録・パスワード | 専用 |
| 協賛 | `(event)` | Food Japan Summit の協賛（NAKAMA本体ではない） | スキップリンクと `<main>` だけ＝**NAKAMAのナビ・フッターを出さない** |

### 公開ゾーン（22ページ）
公開ヘッダーのナビ＝**探している案件を見る／NAKAMAとは／販路開拓支援／共創プロデュース／食品ロス支援／クラウドファンディング支援／ログイン**（ログイン済みは「マイページトップへ」）。

- **`/`（トップ・10セクション）**＝①ヒーロー（h1「食の『売りたい』『探している』『あったらいいな』を共創でつなぐ」／CTA「仕入れたい企業を見る」「商品を無料で掲載する」／料金の注記＝掲載と閲覧は無料・提案と初回開封にクレジット）②目的別入口3枚（売りたい／探している／共創したい＋掲載件数。0件のときは件数を出さない）③掲載導線（大ボタン「案件を登録する」「事務局に代筆を申し込む」＋Summitネットワークへの先行紹介）④今、企業が探している食材・商品 ⑤売りたい（提供したい）⑥共創プロジェクト（④〜⑥は**各区分4件未満なら丸ごと非表示**＝`MIN_LISTINGS_TO_SHOW`）⑦実績（`/cases` の記事カード・常設）⑧注目記事（`CuratedArticle`・共創タグ）⑨登録後、最初にすること（3ステップ）⑩実践者から学ぶ／NAKAMAのサービス／Summit連動の6工程（登録・募集→候補探索→商談・試食→試作・実証→取引・事業化→成果発表）／最終CTA3択。
- **`/about`**＝WHY NAKAMA?／WHAT HAPPENS HERE「出会いから、共創事業へ。」／FROM THE FIELD／HOW TO USE（無料でできること・事務局へ依頼できること）。
- **`/pricing`**＝「利用料金・共創支援」。無料範囲＋紹介クレジット＋掲載オプション＋事務局へ依頼する（`SERVICE_MENU` を参照）。
- **`/flow`**＝4ステップ（登録→掲載→問い合わせ→商談・共創）。**紹介料の条件を本文で明示**（提案1,100円／確認済み3,300円／初回開封1,100円・2026-08-26から）。
- **`/faq`**＝9問（料金・収益源・無料範囲・有料になる3つ・共創支援の費用・未ログイン閲覧・取引の当事者ほか）。FAQPage構造化データつき。
- **`/listings`**＝公開の案件一覧（`?type=give|want|coproject`）。0件時は空状態＋掲載導線。
- **`/cases`・`/cases/[slug]`**＝実績（`src/lib/cases.ts` の静的定義・DBなし）。プレスリリース体裁。**参照は必ず `CASES_SORTED`（公開中のみ）**。
- 個別支援4ページ＝**`/hanro`（販路開拓・110,000円〜／440,000円〜）／`/produce`（共創プロデュース）／`/food-loss`（食品循環プロデュース・金額は出さない）／`/crowdfunding`（手数料35%）**。書式は `publicUi.ts` の共通規格。
- 受付・情報＝**`/consultation`（個別相談フォーム＝`Consultation` に保存＋通知＋自動返信。`?type=` で設問が変わる）／`/contact`／`/company`／`/learn`（最小）**。
- 法務＝**`/terms`（利用規約 全34条）／`/privacy`（全15項）／`/tokushoho`**。本文は `src/lib/legal.ts`。
- そのほか＝`/preview/offerings/[id]`・`/preview/projects/[id]`（未ログインでも見える案件プレビュー）、`/suspended`。
- クローラ向け＝`robots.ts` / `sitemap.ts`（`CONTENT_UPDATED_AT` を手で更新）／`public/llms.txt`／`og.jpg`。

### 会員ゾーン（ナビ10項目）
**ホーム(`/dashboard`／表示名「マイページトップ」)／案件を探す(`/search`)／売りたい・探している(`/ledger`)／進行中の活動(`/deals`)／メッセージ(`/messages`)／共創プロジェクト(`/projects`)／お気に入り(`/favorites`)／プロフィール(`/profile`)／プラン・お支払い(`/billing`)／事務局管理(`/admin`・権限者のみ)**

- **案件（Offering）**＝`/ledger`（自分の案件）・`/ledger/new`・`/ledger/[id]`（詳細）・`/[id]/edit`・`/[id]/options`（掲載オプション購入）・`/[id]/propose`（提案＝紹介クレジット消費）・`/[id]/proposals`（掲載者向けの提案一覧＝クラウドワークスの応募者一覧に相当）・`/[id]/proposals/[threadId]`（個別のやり取り＋進捗）・`/document`（納品書・請求書・領収書の発行）。
- **やり取り**＝`/messages`・`/messages/[id]`。スレッドは**(会員ペア × 案件)単位**。`ThreadHeader` に対象案件、進捗ステッパーは案件ごとの画面に集約。添付は非公開バケット。
- **進行中の活動**＝`/deals`・`/deals/board`。段階は7つ（ご商談／ご契約／発送／受け取り／納品書・請求書発行／入金確認／完了（領収書発行））で**表示専用＝事実から自動で進む**（`reconcileDealPhase`）。
- **プロフィール**＝会社情報・ロゴ・アバター・画像、AI下書き支援、案内メールの受け取り設定（`MailPreference`）、退会。**記入率50%未満は事業者一覧に出ない**。
- **プラン・お支払い**＝クレジット残高・プラン・サービスメニュー・購入履歴。
- **そのほか**＝`/producers/[id]`（事業者ページ）・`/report`（違反報告）・`/favorites`。
- **共創プロジェクト**＝`/projects` 一覧／`new`／`[id]`／`edit`／`applicants`（応募者管理）。

### 事務局ゾーン（タブ8つ）
タブ＝**事務局管理／会員管理／掲載の監視／問い合わせ・応募の状況／個別相談の管理／課金管理／違反報告／監査ログ**、その下のリンク＝**お知らせ／バナー／記事キュレーション／管理者アカウント**（`AdminNav` の `PAGES`／`SECTIONS`。**新しい管理ページを足したら `PAGES` に1行**）。

- `/admin`＝「対応が必要なもの」（要対応5種＋対応期限ぎれ）と「現在の数字」に分離。
- `/admin/members`＝名刺台帳型の一覧。**選択→一括DM配信（`EmailJob` でバックグラウンド送信）**・**CSV書き出し（上位管理者のみ・監査ログ）**・審査・課金状態・月次クレジットの手動付与。
- `/admin/crm/[memberId]`＝顧客カルテ（担当・状況・次にやること・期限・タグ・対応履歴・反応の数字・購入履歴・監査ログ・**メール送信**）。**メッセージ本文は事務局にも出さない（規約17条）**。
- `/admin/billing`＝商品マスター（seed／有効化）・オプション審査・条件一致通知の審査・優良案件の確認・注文・クレジット台帳。
- 見た目の規約は `admin/_components/adminUi.ts`（**`src/lib/ui.ts` と `globals.css` は触らない**）。

### 協賛ゾーン `/sponsor`（Food Japan Summit 2026・現状仕様）
**NAKAMA本体の機能ではない**＝ヘッダー・フッターからリンクせず、`sitemap.ts`／`llms.txt` にも入れず、**`robots: noindex`**。URLを直接案内して使う。定義は **`src/lib/sponsor.ts` に集約**（949行・サーバー依存を持たせない＝クライアントからも import する）。

- **3ページ**＝`/sponsor`（黒基調のティザー・案内）／`/sponsor/apply`（白基調・4ステップの本申込）／`/sponsor/contact`（連絡先だけの短い相談＝**組織名・担当者名・電話・メール＋任意でFacebook・相談内容の6項目。ここに項目を足さない**）。
- **登壇・参加予定企業・団体のロゴマルキー（2026-08-18・指示書＝参加企業ロゴ/CloudCode_協賛ページ追加指示書.md）**＝**数字帯の直後・WHY SPONSOR の直前**。⚠️**白いのはロゴの帯だけ**（ユーザー指示「縦幅ロゴくらいの部分を白背景で」）＝納品HTMLはセクション全体が白だったが、見出し（WHO YOU CAN MEET／登壇・参加予定企業・団体）と注記は黒地のまま残し、帯だけ白く抜いている（PC116px＝ロゴ76＋上下20／モバイル90px）。**帯は `.wrap` の外に置いて画面端まで伸ばす**。データは `sponsor.ts` の `PARTICIPANT_LOGOS`（34件・提供順）。**見出しは `Food Japan Summit 2026 登壇・参加予定企業・団体`**（サミット名は 2026-08-18 にユーザー指示で追加。`SUMMIT_TITLE` から作る）。**「登壇・参加予定企業・団体」の語は必ず残す**（「協賛企業」「参加確定企業」とは書かない）。⚠️見出しの後半は `.meetTitleMain`（`white-space: nowrap`）に入れてある＝1つの文字列だと 375px で「登壇・／参加予定企業・団体」と中点で折れる（`word-break: keep-all` でも止まらない）。**注記 `PARTICIPANTS_NOTE`（末尾に「（順不同）」）を消さない**、**提供ファイル以外のロゴを足さない**。⚠️**同じ配列を2回描く**のは継ぎ目を消すためで社数を二重に見せる意図ではない（2セット目は `aria-hidden`）。`prefers-reduced-motion` では止めて横スクロールにする。⚠️**この帯はユーザー操作を受け付けない**（ユーザー指示 2026-08-18「クリックやマウスオーバーなどの操作は期待していない」）＝ホバー停止を入れず、`pointer-events: none`＋`user-select:none`＋`-webkit-touch-callout:none` で当たり判定・選択・iOSの長押しメニューを止めている（動きを減らす設定のときだけ `pointer-events` を戻す＝指でスクロールさせるため）。⚠️**iOS実機でロゴが1枚も出ない事故（2026-08-18）の原因と対策**＝①器の幅が auto なのに img の高さを `height:100%` にしていた（幅と高さが互いを参照し、**Safariでは幅0に潰れる**。Chromeは解決してしまうので開発ブラウザでは気づけない）→ **高さは実寸で書く** ②`loading="lazy"` を付けていた（**流れている要素は Safari で可視判定が働かず読み込まれない**）→ **付けない** ③`width`/`height` 属性が無かった（`width:auto` なので**読み込み完了まで幅0**になり帯だけ白く空く）→ **`PARTICIPANT_LOGOS` に実寸 `w`/`h` を持たせて必ず出力する**。**ロゴを囲む枠は付けない**（ユーザー指示）＝高さ76px（モバイル58px）で揃え、**幅はロゴなり**（器を固定幅にすると細いロゴの左右に余りが残り、gapを詰めても見た目の間隔が揃わない）。間隔は16px（モバイル12px）。⚠️**器を `display:grid`＋`place-items:center` にしない／img の `max-width`・`max-height` を外さない**＝どちらも正方形ロゴが器を突き抜けて帯の下端で切れる（2026-08-18 に実際に発生。240×240 が 164×164 で描かれた）。画像は `public/images/participants/`（表示は高さ76px基準なので**長辺400px以内に縮小**して 2.2MB→600KB。jdocco は中身が埋め込みラスタの240KB SVGだったので400px幅のPNGへ変換＝10KB）。**ロゴ画像は取り込み時に補正してある（2026-08-18・ユーザー指示「変形しているものや背景にグレー・黒が入っているものを調整して」）**＝①**全点で周囲の一様な地（白・グレー・黒）を切り落として**中身の大きさを揃えた（切らないと、余白の多い素材だけ小さく見える）②`revonity`＝黒地に白抜きの**単色ロゴだったので白黒反転**して白地・黒ロゴにした（彩度0%を実測してから反転する。色つきロゴを反転するとブランド色が壊れる）③`pasta-cuore`＝角丸アイコンの外周が黒だったので**四隅から塗りつぶして白に置換**④`yuraku`＝**ユーラクとブラックサンダーが1枚に並んでいるが、これはこのまま使う**（ユーザー判断 2026-08-18。一度ユーラク側だけに切り出したが、ブラックサンダーが載っているほうがよいとの指示で戻した）。⚠️**この1点だけ自動トリムをかけていない**＝左が白地・右が黒地で四隅の色が揃わず、切る位置を誤るため。縮小だけしてある⑤`asano-suisan`＝グレーの余白を落として黒い看板画像だけにした。⚠️**正方形のタイル型ロゴ（`bronco-billy` 赤／`kakuyasu` ピンク／`tsuboichi` 緑／`tsumoto-shiki` 黒）は、地の色も形もロゴの一部なのでトリムせず正方形のまま使う**（ユーザー判断 2026-08-18。一度トリムして横長のバーにしたが「正方形のロゴもそのままで良い」と指示があり戻した）。`asano-suisan` の黒い看板も素材そのもの。**白地版を各社からもらえたときだけ差し替える**。元ファイルは `~/Desktop/00_デスクトップ/企画書/スナックフォーラム/参加企業ロゴ/` の zip にある（**加工前の原本から作り直すこと**）。
- **`/sponsor` の構成**＝ヒーロー（CO-CREATION PARTNER / SPONSORSHIP・h1「協賛で／商談へつなげる。／共創をつくる。」）→ FIGURES（**25名 登壇者を予定／50社 参加企業を予定／100件 商談機会を目標／宮崎200〜300名・名古屋400〜500名の来場想定**。⚠️「予定・目標・想定」を外さない）→ WHY SPONSOR → **WHAT HAPPENS「協賛するメリット」01 SPEAK／02 TASTE／03 MEET／04 CONTINUE**（4件とも写真1200×675）→ WHAT YOU GET「協賛企業共通の提供価値」（`COMMON_VALUE_CARDS` 5枚＋価格＋CTA）→ TWO CITIES → FROM EVENT TO BUSINESS「一日で終わらせない。」（BEFORE／AT THE SUMMIT／AFTER）→ 最終CTA「次の共創、次の地方創生をつくろう。」→ **EVENT OUTLINE 開催概要（フッター直前・位置を上へ戻さない）** → フッター「フードジャパンサミット実行委員会」。CTAは**ヒーロー下・途中・一番下の3か所**。
- **CSSはページ専用のCSSモジュール**（`sponsor-teaser.module.css`）。色変数はページの入れ物に載せる（`:root`/`body` に入れるとサイト全体が黒くなる）。
- **メタ**＝タブ「Food Japan Summit 2026｜共創パートナー募集」／**OGPだけ別文言「協賛パートナーを募集しています！」＋専用画像 `/sponsor/og-sponsor.jpg`**（`openGraph` と `twitter` の両方を指定すること）。
- **開催と会場**＝宮崎 2026年11月17日（火）・18日（水）／宮崎観光ホテル、名古屋 2026年12月15日（火）・16日（水）／名鉄グランドホテル（`EVENT_OUTLINE` では「（予定）」付き）。
- **協賛プラン（すべて税別）**＝

  | プラン | 単独開催（宮崎／名古屋） | 両開催 | 宮崎県法人 特別割 |
  | --- | --- | --- | --- |
  | LIGHT（協賛のみ） | 150,000 | 200,000 | 150,000 |
  | STANDARD（シルバー） | 300,000 | 500,000 | 300,000 |
  | PRESENTER（ゴールド） | 500,000 | 800,000 | 400,000 |
  | STRATEGIC（プレミアム） | 800,000 | 1,200,000 | 700,000 |
  | DIAMOND PARTNER（パートナー） | 2,500,000 | 4,000,000 | 2,000,000 |

  価格の定義は `sponsor.ts` の3か所（`singleVenuePlans()`／`COURSES` の both／`LOCAL_DISCOUNT_PRICES`）だけで、**`plansFor()` が唯一の参照元**。⚠️**特別割は宮崎開催のみ**（特典は宮崎通常プランと同一で価格だけ違う。守りは3重＝`localPlans` を宮崎にしか持たせない／サーバーで弾く／チェックボックスを宮崎選択時だけ描画）。
- **登壇枠**＝なし／なし／30分／60分／60分＋テーマセッション主催（`presentationSlot()`。**LIGHT・STANDARDは「登壇枠：なし」と明示する**）。共通特典＝協賛ロゴ掲載・NAKAMA掲載・コワーキングルーム使用・試食・チラシ・ノベルティの配布・商談候補者の優先紹介・面談調整。⚠️**「参加後の参加者リストのご提供」は入れない**。
- **おすすめ表示**＝`RECOMMENDED_PLAN`＝**宮崎のみ・両開催＝PRESENTER／名古屋のみ＝STRATEGIC**（`planBadge(courseCode, planCode)` で出し分け。プランコードだけで決めない）。DIAMOND は常に「最上位プラン」。
- **オプション**＝**ブース出展 200,000円（税別・間口2,000×奥行1,500mm・レイアウト図モーダル）**は協賛プランと別枠で加算する。**年間会員 月額30,000円（税別）・1団体2名**は「あわせて相談」なので**金額を加算しない**。年間会員の実体＝**Stripeのクーポンで NAKAMAビジネス会員を付与**（システムは作らない）＝毎月50クレジット＋20%割引。⚠️features の「提案：毎月50件まで」を外さない（景表法）。
- **申込フォーム（`/sponsor/apply`）**＝4ステップ（①開催 ②プラン・オプション ③会社情報・目的 ④確認・申込）。送信項目22＝`course` `isLocalCorp` `plan` `boothOption` `annualMember` `presentation` `themes` `benefits` `purpose` `company` `companyKana` `name` `department` `phone` `email` `address` `website` `referrer` `invoiceName` `invoiceNote` `logoSubmission` `logoPath`/`logoName` `message` `consent`＋ハニーポット `nickname`。**壊してはいけない3点＝全入力を制御コンポーネントにする／ステップ切替は `hidden` で隠すだけ（DOMから外さない）／`noValidate` で必須判定は自前**。
- **締め切り**＝宮崎・両開催は**2026-11-17**まで、名古屋・相談は**2026-12-15**まで（`COURSE_CLOSE_AFTER`・判定は必ずJST `todayJst()`）。全部終わるとページごと「協賛の募集が終了しました。」に差し替え。`/sponsor/apply` は `force-dynamic`、**本当の関所は `actions.ts`**。
- **受付＝メールのみでDBに保存しない**。宛先＝`info@grab-design.com` と `umetaku@grab-design.com`＋申込者への控え。受付番号は申込 `FJS-`／相談 `FJS-Q-`。**事務局あてが1通も送れなければ成功にしない**（`adminDelivered`）。
- **ロゴ提出**＝既定はメール提出。「こちらから提出する」を選んだときだけ添付欄が出る。**Server Actionを通さず**ブラウザから非公開バケット `sponsor-logos` へ直アップロード（20MB・`.ai/.pdf/.eps`）。事務局へは**30日間有効の署名付きURL**。パスは `isLogoPath()` で検証。⚠️**自動削除はない**。
- **見積書**＝申込を送らなくても作れる。HTMLで組んでブラウザの「PDFとして保存」（PDFライブラリなし・サーバーに保存しない）。税抜・消費税10%・税込を並べ、有効期限は発行から30日（`quoteTotals()`／`QUOTE_VALID_DAYS`）。

### 課金・クレジットの現行値（`src/lib/billing-core.ts` が正）
- 1クレジット **1,100円**。通常案件の初回提案＝**1クレジット**、NAKAMA確認済み案件＝**3クレジット**。
- **ビジネス会員＝月22,000円（税込）／毎月50クレジット付与（`MEMBER_MONTHLY_CREDITS = 50`・繰越なし＝1クレジットあたり440円）＋単品クレジットと掲載オプションが20%割引**。⚠️下の「課金の価格整合（Phase 7）」に**「月次チケット20→30件」と書いてあるが、現在のコードは50**。数字を引くときはコードを見ること。
- 有償クレジットは**購入日から180日**で失効。承認時に**無償3クレジット**（組織単位・一度だけ・無期限）。消費順＝月次→有償→無償（同順位は期限が早い順）。**送信後14日未読で自動返還**（元ロットが期限切れなら返還しない）。
- **開封課金**＝「売りたい」に届いた問い合わせの初回開封に1クレジット。**施行 2026-08-26 00:00 JST**（`LEAD_UNLOCK_START_AT`）。未開封は先頭40字だけ見える。7日未開封で買い手へ通知。
- 掲載オプション＝注目表示5,500〜11,000／最上部PR22,000／急募3,300〜5,500（各7日）／案内メール一斉送信11,000（最大100件）／非公開募集22,000・応募者限定公開11,000（各30日）／セット8,800・22,000。見積系（バナー・SNS・特集記事・探索・商談設定など）は相談導線。
- 個別支援メニュー＝`src/lib/services.ts` の `SERVICE_MENU`（110,000円〜／440,000円〜／月33,000／月110,000＋広告費／50万〜／売上の10〜20%／共創・商品開発は「ご相談」）。**金額は `services.ts`・`/faq` の本文・`llms.txt` の3か所に分かれているので必ず一緒に直す**。

### システム構成
- Next.js 16（App Router）／React 19／TS／Tailwind v4／Prisma 7＋Supabase(PostgreSQL)／Supabase Auth＋Google OAuth／Stripe（LIVE）／Resend／Vercel／OpenAI `gpt-5.6-terra`。
- **Prisma モデル40・enum6**（Tenant, User, Member, MemberNote, EmailJob, StripeEvent, AuditLog, Announcement, Banner, Consultation, CuratedArticle, Project, ProjectRole, ProjectResource, ProjectApplication, ProjectActivity, Deal, Thread, NdaAgreement, ViolationReport, ContractOffer, ProposalNote, Message, MessageAttachment, AuthAttempt, MessageTemplate, MessageDraft, Favorite, Offering, OfferingRequirement, BillingProduct, BillingOrder, BillingOrderItem, ListingPromotion, ContactUnlock, MatchedNotice, ContactCreditLedger, OfferingView, IssuedDocument, LeadUnlock）。**新規テーブルは必ずRLS有効化＋anon/authenticatedからREVOKE**。
- **APIルートは5本**＝`/api/stripe/webhook`（課金状態の正）／`/api/cron/billing-daily`（Vercel Cron・毎日0:00・`CRON_SECRET`必須）／`/api/attachments/[messageId]`（非公開添付の配信）／`/api/admin/members/export`（CSV・上位管理者）／`/api/health`。
- **日次バッチの中身**＝①掲載オプション scheduled→active ②終了3日前通知 ③active→expired＋公開範囲の復帰 ④14日未読のクレジット返還 ⑤月次クレジットの取りこぼし補填 ⑥期限切れロットの失効 ⑦**最後のやり取りから1年たったスレッドの本文と添付を削除**（1回200件）⑧未開封リードを買い手へ通知 ⑨中断した一括メール（`EmailJob`）の再開。
- **Server Actions は27ファイル**（`src/app/**/actions.ts`）。**メールは `src/lib/email.ts` の約20関数**（パスワード・退会・課金完了・オプション終了予告／終了・未読返還・未開封通知・条件一致通知・新規登録／会員登録の事務局通知・新着メッセージ・PJ応募／承認／差し戻し・掲載停止・個別相談・事務局からの会員メール・協賛の申込／相談）。
- **Storage バケット3つ**＝`member-images`（公開・プロフィール／案件／PJ／バナー）、`message-attachments`（非公開・API経由で配信）、`sponsor-logos`（非公開・20MB・署名付きURL）。
- **AI**＝掲載文とプロフィールの下書きだけ（`AI_DRAFT_DAILY_LIMIT = 20`／利用は監査ログに記録）。**会員間メッセージには一切使わない（規約17条）**。`OPENAI_API_KEY` が無ければ機能自体を出さない。
- 認証の保護＝`src/middleware.ts` の `PUBLIC_PATHS`（`/sponsor` を含む）。**公開ページを足したらここに追加**。

### 記載内容（法務・`src/lib/legal.ts`）
- **利用規約 全34条**＝適用／定義／本サービスの内容および当社の立場／登録／登録情報の変更および本人確認／アカウント管理／利用料金／**第7条の2 紹介料および紹介クレジット**／**第7条の3 掲載オプション**／支払方法および請求／契約期間および自動更新／解約／料金改定／投稿情報／投稿情報の利用許諾／当社の知的財産権／秘密情報／禁止事項／**第17条 監視、調査および通報対応**／**第17条の2 掲載文およびプロフィールの作成補助（AI下書き）**／利用停止および登録抹消／退会後のデータ／サービスの変更・中断・保守／サービスの終了／第三者サービス／保証の範囲／損害賠償および責任制限／反社会的勢力の排除／権利義務の譲渡／通知／**第27条の2 案内メール**／本規約の変更／分離可能性／準拠法および合意管轄／協議。
- **プライバシーポリシー 全15項**＝事業者情報／取得する情報／利用目的／公開および会員間提供／第三者提供／委託／外国にある事業者への取扱いの委託等／Cookie等／安全管理措置／**保存期間（メッセージと添付を1年で削除）**／保有個人データに関する請求／漏えい等への対応／未成年者／本ポリシーの変更／問い合わせ・苦情窓口。
- **⚠️`legal.ts` の本文を触ったら、必ず同じコミットで改定履歴にも1行足す**（履歴は文字列の末尾）。特商法は `/tokushoho`。

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
- **リードの初回開封に1クレジット（2026-08-12・ユーザー決定。**本番反映済み**＝2026-08-12に `main` へマージ・デプロイ。**課金の開始は施行日の2026年8月26日から**）**: 「探している」への提案だけが有料で、「売りたい」で得たリードは無料だった＝**収益が片側に偏り、売り手側の価値が回収できていない**。**「初回の接点に紹介料」という一本のルール**に揃える。
  - **決めたこと（ユーザー）**：①開封は**1クレジット**（提案側の通常案件と同額。案件の確認状態では変えない）②**ビジネス会員も月次クレジットから消費**（同じ財布。実効440円/件で会費の価値が上がる）③**開封後のやり取りは何往復でも無料**④透明化は3つとも実施＝未開封を一定期間で買い手に通知／案件カードに返信率／問い合わせフォームに予告。
  - **⚠️これは8/10夜に入れて8/11に撤廃した「引き合い課金」と同じ場所**。前回はニーズチェックの指摘（商談開始直後の課金壁で離脱する）で撤回した。**今回は壁の位置が違う**（前回＝会話の途中／今回＝最初の1件、提案側の紹介料と同じ性質）が、同じ論点が再燃しうる。撤退の判断ができるよう、開封率と返信率は必ず見ること。
  - **実装（中核は完了。commit c9f47a1）**：新モデル `LeadUnlock`（RLS有効化＋anon/authenticated REVOKE 実測確認）。`openLead()` は記録の作成とクレジット消費を1トランザクションで行い、**二重課金は `threadId` の unique で防ぐ**。課金対象は `isChargeableLead()`＝**自分の「売りたい」案件に相手から届いた問い合わせ**だけ（自分から送ったやり取り・探している案件・案件に紐づかない直接連絡は無料のまま）。未開封のやり取り画面は**本文をサーバーから返さない**（画面で隠すだけでは読める）。冒頭40字だけ見せて開封導線を出す。**開封は自分の操作なので未読返還の対象外**（提案側は相手が読まないことがあるため返還がある）。
  - **⚠️マージ前に必ず要るもの（→ 2026-08-12 に①〜⑤すべて実装済み。下記「開封課金の仕上げ」）**：①提案一覧の伏せ字 ②規約・料金・LPの改定 ③未開封7日通知 ④返信率の表示 ⑤問い合わせフォームの予告。
- **開封課金の仕上げ（2026-08-12・本番反映済み／migration `lead_unopened_notice`）**: 上の①〜⑤を実装。
  - **施行日＝2026年8月26日（ユーザー決定・2週間の予告つき）**。無料範囲を狭める不利益変更なので、先に文言を改定して周知し、課金は施行日から。**判定は「相手からの最初のメッセージの日時」1つに集約**（`LEAD_UNLOCK_START_AT`）＝施行日より前に届いた未開封のリードは無料のまま／予告期間中はそもそも課金対象が存在しない、の両方が同じ条件で満たされる。**画面の文言（`LEAD_UNLOCK_START_LABEL`）と定数は必ず一緒に直すこと**。
  - **判定と文言は `src/lib/lead-unlock-core.ts` に分離**（DB非依存＝vitestで検証。billing-core.ts と同じ作法）。`lead-unlock.ts` は core を再輸出するので、呼び出し側の import は従来どおり。**client component から `lead-unlock` を import しない**（prisma が入る）。
  - **本文が読めた穴を全部塞いだ**＝①提案一覧（冒頭40字＋「未開封」バッジ、ボタンは「開いて読む」）②メッセージ一覧のプレビュー③**`/messages/[id]` は案件ごとの画面へリダイレクト**（ゲートを迂回して全文が読めていた）④**通知メールの本文80字**（`notifyRecipientIfCaughtUp` で伏せる）⑤**添付の配信（402で拒否）**。**判定は必ず `loadLockedLeadThreadIds()` を通す**（画面ごとに条件を書くと必ずどこかで漏れる）。⑥未開封のうちは**既読にしない**（読んでいないのに「未返信」が消えると対応漏れになる）。
  - **未開封の場所にビジネス会員の案内**（2026-08-12 ユーザー指示「ビジネス会員を増やそう」）＝`src/components/BusinessMemberPromo.tsx` に文言を集約し、**3か所**（メッセージ一覧の未開封の行の下・届いた問い合わせの一覧・開封画面 LeadGate）に同じものを出す。**すでにビジネス会員（PAID）には出さない**。**見せ方＝月額より「1件あたり」を先に出す**（ユーザー指示「2万円のサブスクは隠れられる」）＝見出し「開封1件 1,100円 → 会員なら440円」、月額22,000円は下に小さく（特商法・景表法があるので**消さない**）。数字は `billing-core.ts` の `MEMBER_MONTHLY_CREDITS`／`CREDIT_UNIT_PRICE`／`MEMBER_MONTHLY_FEE` から計算（440円＝22,000÷50、55,000円相当＝50×1,100）。**⚠️メッセージ一覧の行そのものが `<Link>` なのでリンクは入れ子にできない**＝行を `<div>` で包み、案内は Link の外に出している。**⚠️届いた提案の表では列の中に入れない**（横スクロールで隠れる）＝表の上に1つだけ出す。**同じ案内は1画面に1つ**＝メッセージ一覧は未開封の**先頭1件の下だけ**に出す（行ごとに出すと未開封が並んだとき同じ案内が何個も続く）。
  - **未開封7日通知**＝日次バッチの8番。`Thread.leadUnopenedNoticeAt`（migration `lead_unopened_notice`・列の追加のみ）で一度だけ。先に印を付けてから送る。買い手あて（`notifyLeadUnopened`）。
  - **返信率**＝`src/lib/reply-rate.ts`。母数＝相手から先に届いたやり取り／分子＝1通以上返したもの。**母数3件未満は出さない**（1件で0%と出ると実態を表さない）。表示＝/search のカード（`OfferingCard.replyRatePercent`＝任意プロップなので渡さない画面は不変）と案件詳細の情報表。
  - **問い合わせフォームの予告**＝売り手が開封して読むこと・開封に1クレジットかかること・7日で通知が届くこと・具体的に書くほど開いてもらいやすいこと。施行日前は「8月26日以降にお送りいただく分から」と出し分ける。
  - **文言の統一（ユーザー指示「これは統一してほしい」「削除だね」）**＝「届いた問い合わせへの返信は無料」を9か所から削除し、**無料＝登録・掲載・閲覧・検索・問い合わせの送信＋解放後の継続メッセージ（何往復でも無料）／有料＝初回の接点（提案・開封）・掲載オプション・事務局への依頼**に揃えた。反映＝規約第2条（紹介料の定義）・第7条1項・第7条2項4号・第7条の2第1項〜2項・返還規定・改定履歴／特商法（販売価格・返金）／トップ／layout の description／pricing／faq／flow／about／billing／llms.txt／案件詳細／`stripe.ts` の特典表記／`sitemap.ts` の CONTENT_UPDATED_AT。**規約は「改定：8月12日／施行：8月26日」と分けて記載**。
  - **検証**＝tsc・next build・vitest 31件（うち新規7件＝施行日と課金対象の判定）・375pxで横スクロールなし・規約/pricing/トップの実表示。**会員側もE2E実施済み（2026-08-12）**＝**施行日を過去に倒す必要はなく、テストの問い合わせの受信日時を施行日以降（8/27）にすれば課金対象になる**（定数を触らないので戻し忘れが起きない）。確認できたこと＝①提案一覧・メッセージ一覧・`/messages/[id]`・やり取り画面の**4画面すべてで本文が出ない**（40字より後ろに置いた合言葉がHTMLに一切現れないことで判定）②`/messages/[id]` は案件ごとの画面へ送られ、メッセージ画面の中身自体をサーバーが返さない③開封記録を作ると全文と返信欄が出て、未開封バッジと会員案内が消える④返信率＝案件詳細「75%（届いた4件のうち3件に返信）」・カード「返信率 75%」、母数3件未満の会員には出ない⑤問い合わせフォームの予告が施行日前の文面（「2026年8月26日以降にお送りいただく…」）で出る⑥未開封7日通知の抽出は、施行日以降の未開封だけを拾い、開封済みは0件になる。**⚠️日次バッチ本体（/api/cron/billing-daily）はローカルから叩かないこと**＝本番DBに対して月次クレジットの補填や1年経過メッセージの削除まで実行してしまう。新しい抽出だけを見たいときは `/preview/tmp-*` に読み取り専用の一時ルートを作って確認し、あとで消す。**⚠️本文の漏れを見るときは、合言葉を必ず41字目以降に置く**（40字は無料で見せる範囲なので、冒頭に置くと「漏れている」と誤判定する。実際に一度やった）。テストデータ（会員5・案件2・スレッド4・メッセージ7・クレジット台帳1・認証ユーザー1）は削除済みで、会員総数は元の5件に戻っている。
  - **残（ユーザー作業）**：①**施行前の周知**（お知らせ＋できればメール）②弁護士への事後確認は**7回目**の論点としてこの改定を追加③施行日を過ぎたら開封率・返信率を見て継続可否を判断。
- **「売りたい」の課題解決タイプを廃止（2026-08-12・ユーザー判断「売りたいに課題はいらないかも」）**: 登録冒頭の「今回、何をしたいですか？」（商品・原料を売りたい／課題を一緒に解決したい）の2択と、課題5問（`challengeCurrent/Scale/Tried/Ask/Value`）・詳細ページの黄色ブロック・カードとプレビューの「課題解決」ラベル・**公開必須検証の課題3項目**を削除した。**課題は共創パートナー募集（/projects）の役割と重複**しており、売りたいの入力を長くするだけだった（実際に「レモンを使ったクラフトビール」が課題3項目を書かないと公開できない状態で止まっていた）。**DBの列と `LISTING_PURPOSES` の値は残置**（`listing_purpose='challenge'` の既存1件は下書きのみ・表示に出なくなるだけ）。`offering-taxonomy.ts` から `LISTING_PURPOSES` を削除したので、復活させるならこの節を参照。保存処理（`ledger/actions.ts`）も課題項目を書かない。
- **⚠️2026-08-12 に踏んだ地雷**: ①**データ移行スクリプトは実行順で壊れる**＝段階の移し替えで「旧5→1」の直後に「旧1〜4→0」を流し、直したはずの1件を0に巻き戻した（合意済みの商談から復元して事なきを得た）。**同じ列を複数回UPDATEするなら、条件が重ならないか順序を先に確かめる**。②**表示と記録はずれる**＝旧仕様（1ボタンで完了）で `completedAt` だけ入った記録は段階の自動前進が働かず取り残された。`reconcileDealPhase` を入れ、画面を開いたときに事実から計算して直すようにした。**イベント駆動で状態を進める作りには、事実から現在地を再計算する経路も要る**。③**立場で出し分けていないボタンは誤解を生む**＝買い手にも「請求書を発行する」が見えていて「押せば発行できる」と読めた。**誰の操作かで出し分ける**。④schema変更後の dev サーバー再起動（`PrismaClientValidationError`）を今日も2回踏んだ。
- **⚠️新機能を足すたびに繰り返す作業（2026-08-11 時点のまとめ）**: ①新テーブルを足したら **RLS有効化＋anon/authenticated からREVOKE**（`enable row level security` と `revoke all`。`pg_class.relrowsecurity` で実測確認）②`npx prisma generate` を忘れると型が出ない③client component から server 依存モジュールを import しない④**画面の切替は `Link`**（form送信にするとクライアント遷移が効かず遅い）⑤法務に触れる文言を変えたら**弁護士への事後確認リストに追加**する。

- **アクセシビリティと表示速度のチューニング（2026-08-12・ユーザー依頼）**: 実測してから直した。
  - **キーボードで現在地が見えなかった**（最大の問題）＝Tailwindの初期化で `outline` が消えており、Tabで移動しても何が選ばれているか分からない状態（WCAG 2.4.7）。`globals.css` に `:focus-visible` で緑2pxの輪を定義（マウス操作では出ない）。**濃い地（サイドバー等）は `.on-dark` を付けて白い輪にする**。
  - **本文へスキップ**を会員側・公開側の両レイアウトに追加（`.skip-link`＋`<main id="main">`）。ナビを何十回もTabしないと本文に入れなかった。普段は見えず、Tabで最初に出る。
  - **モーダルがEscで閉じられなかった**（全画面共通）＝`src/components/useCloseOnEscape.ts` を新設し、確認・削除・面談日程・違反報告・掲載オプション・差し戻し・会員詳細・モバイルのドロワー…**10か所**に適用。`role="dialog"`/`aria-modal` が無かった3つ（ScheduleModal・AdminTableの会員詳細・Composerの共通Modal）にも付け、共通Modalは開いたときに中へフォーカスを移す。
  - **プレースホルダだけの入力欄**（/search・/projects のキーワード欄）に `aria-label`。読み上げで何の欄か分からなかった。
  - **小さすぎるリンク**（ダッシュボードの「すべて見る →」＝高さ20px）に上下の余白を足して24px以上に（`-my-1 py-1` でレイアウトは動かさない）。
  - **表示速度**＝今回足したクエリが直列になっていた箇所を並列化。①/search の返信率を最初の `Promise.all` へ（スポンサー枠のぶんだけ不足分を追加取得）②メッセージ一覧の**4本の直列クエリ**（相手・未読・案件・未開封＋会員種別）を1往復に③案件詳細の閲覧数と返信率を同時に④届いた問い合わせ一覧の伏せ字判定と非公開メモを同時に。ローカル計測（ウォーム）＝dashboard 180-260ms／search 225-305ms／messages 185-420ms／ledger 276-370ms。
  - **確認**＝Tabでスキップリンクが出て緑の輪が付くこと、モバイルのドロワーがEscで閉じることを実機で確認。tsc/next build/vitest 31件。
  - **残（未対応）**: コントラスト比の全面点検、`--muted`(#7c8899) の11pxテキストは小さい箇所があるので拡大時の確認、フォーカストラップ（モーダル内でTabが背後へ抜ける）、イベント計測。

- **「探している」で写真が無いときはロゴ面にした（2026-08-12・ユーザー指定）**: 写真が無いのが普通なので説明文を枠内に敷いていたが、一覧が文字だらけになるためやめ、**黒地＋ロゴマークだけ**の面にした（文字入りも試したが、ユーザー指定でマークのみに）（写真と同じ扱い＝バッジはその上に重なる）。**画像ファイルは増やさず `public/logo-mark.png` と文字で組む**（どの幅でも綺麗に出る／差し替えが1か所）。**⚠️バッジ（新着・あなたの投稿・地域・区分・募集タイプ）は狭いカードで3行に折り返す**ので、中央よりやや上に置き `pb-10` で下の帯を避けている。実測＝700px(212x159)でバッジとの重なりゼロ。狭い幅では「あなたの投稿」バッジがマークに少しかかるが、写真のときと同じ見え方なのでそのまま。枠内に出していた価格・数量・最小の要点は、カード下段に同じものが出ているので削除した。

- **掲載文・プロフィールのAI下書き支援（2026-08-14〜15・本番反映済み）**: 掲載が積み上がらない一番の理由は必須項目が13〜15個あって手が止まること。**3〜4行のメモから各項目の下書きを作り、本人が直して保存する**。
  - **委託先＝OpenAI（`gpt-5.6-terra`・約2円/回）**。性能で選んだのではなく、ユーザーが既に請求とダッシュボードを持っていて**取引先を増やさない**判断（Claude Code の月額サブスクはアプリのAPI呼び出しには使えず、どの社でも新規のAPI課金になる点は説明済み）。事業者を替えるときは `src/lib/ai.ts` と `ai-draft-core.ts` の `AI_PROVIDER_NAME` と**規約の3か所を同時に直す**。
  - **`OPENAI_API_KEY` 未設定なら機能ごと出さない**（Stripeと同じ）。キーが無い／残高が無い状態でも会員側は壊れない。
  - 対象＝「売りたい」11項目（`src/lib/ai-draft-core.ts`）／プロフィール22項目・3タブ全部（`src/lib/ai-profile-core.ts`）。**「探している」には出さない**。
  - **事実を作らせない作り**: メモにない産地・原材料・受賞歴・数量・価格・認証は書かせず、材料が無い項目は**空文字**で返させる（画面には「メモに材料が無かったため空のままです」と出す）。とくに**品質・規格／賞味期限**と、プロフィールの**所在地・郵便番号・URL・設立年・人数**は「推測禁止・そのまま写す」を名指しで指示。優良誤認表現と健康効果の訴求も禁止（景表法・健康増進法）。
  - **勝手に保存しない**。生成しただけでは何も変わらず、「フォームに入れる」を押して初めて入る。押した直後に確認モーダル（**赤字で「書き間違えると食品事故と取引トラブルに直結します」**）。
  - **「プロンプトはこちら」＝当社の課金を減らすための導線**（ユーザー指摘）。返ってくる形をフォームの項目そのものにしてあるので、**手元のAIで書かせて各欄に直接貼れば当社のAPIは0円**。うちの生成は任意の手段に降ろしてある。
  - 回数上限＝**台帳とプロフィールで合算1日20回**（`src/lib/ai-usage.ts`。専用テーブルは作らず監査ログの件数で数える。**失敗時は消費しない**）。
  - **⚠️`input()`（`src/lib/ui.ts`）に `w-full` は入っていない**。フォーム本体は `flex flex-col` の `<label>` が引き伸ばしているだけなので、素の `<div>` の中に置くと入力欄が既定幅（20桁）に落ちる。共通CSSは触らず、置いた側で `w-full` を指定する。
  - **⚠️プロフィール側の反映は非制御のまま**（22項目を制御コンポーネントに作り替えない）。`form.elements.namedItem(name)` で引いて `.value` に書く。選択肢のある欄は**選択肢に無い値を入れない**。会員種別だけは制御なので `setL1`/`setL2` を使い、大分類→細分類の順で入れる。
  - **⚠️検証時の落とし穴**: ファイルを1文字直すたびに Fast Refresh で状態が飛ぶ。「モーダルがすぐ消える」と何度も誤診した。**編集せずに通しで触ること**。また、ブラウザツールの `.click()` は user activation が無いので `navigator.clipboard` が失敗する（実クリックなら通る。`execCommand` のフォールバックを入れてある）。
  - 規約＝**第17条の2（掲載文およびプロフィールの作成補助）を新設**（8/14新設・8/15にプロフィールへ拡張）。プライバシーポリシーは3.利用目的と7.外国にある事業者へ OpenAI, Inc.（米国）を追記。**弁護士確認は未了**。

- **/billing の並び替え（2026-08-15・ユーザー指定）**: 「紹介クレジット残高」と「NAKAMAビジネス会員」をページ最上部（タイトル直後）へ移動。**⚠️非会員には「基本利用は無料です」の説明がプランより下に来る**ので、無料を先に見せる方針（2026-08-11 の指示）と衝突する可能性がある。会員視点の指示だったため全員に適用したが、非会員だけ順序を戻す選択肢は残っている。

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
6. ~~電気通信事業の届出要否確認~~ → **2026-08-17 に届出まで完了**（`docs/telecom-notification-inquiry.md` は相談時の想定問答として保存）。

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
- **Vercelの関数はリクエストボディが4.5MBを超えると413**（`FUNCTION_PAYLOAD_TOO_LARGE`）。
  これは**プラットフォーム側の制限**で、`next.config.ts` の `serverActions.bodySizeLimit` を
  いくら上げても回避できない（2026-08-18 に公式ドキュメントで確認）。**大きいファイルは
  Server Action に渡さず、ブラウザから Supabase Storage へ直接送る**こと
  （実装例＝協賛ロゴ：`sponsor/apply/logo-upload.ts` が署名付きアップロードURLだけを発行し、
  フォームは保存先パスと表示名しか送らない）。逆に Server Action 経由に戻すなら上限は4MB以下。
- **協賛ロゴは非公開バケット `sponsor-logos`**（20MB・MIME制限つき、2026-08-18 作成）。
  事務局へはメール添付ではなく**30日間有効の署名付きURL**を送る。
  ⚠️ **未認証で叩けるアップロード口**なので、パスはサーバーが決め（UUID）、
  受け取ったパスは `isLogoPath()` で形を検証してから署名する。ここを緩めると
  バケット内の任意ファイルを読み出す口になる。⚠️ **自動削除は無い**（溜まり続ける）。
- **`<label>` の中にリンクを置いたらクリックを止める**。`onClick={(e) => e.stopPropagation()}`
  を付けないと、リンクを押しただけでチェックが切り替わる（`preventDefault` はしない＝遷移はさせる）。
  例＝協賛特典の「FOOD JAPAN NAKAMAへの掲載」。`<button>` を `<label>` 内に置く場合も同様
  （`<button>` は labelable なので、チェックボックスより前に置くと label がそちらを指してしまう）。
- **黒背景が焼き込まれたロゴPNGを写真の上に置かない**。透過に見えても実際は不透明で、
  黒い長方形として浮く（2026-08-18 に `/sponsor` のヒーローで実際に起きた）。
  `sharp` で `alpha = max(r,g,b)` として straight alpha に変換する。
  ⚠️ あわせて `box-shadow` を外すこと。影は**画像の矩形**にかかるので、透過させても箱の輪郭が残る。
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

- **Phase 11＝事務局CRM（顧客カルテ）第1弾（2026-08-15）**: 事務局側に「誰にいつ何をして、次は何をするか」を残す場所が無かったので作った（既存の審査・監視画面は触っていない）。
  - DB＝migration `admin_crm`（追加のみ）＋`admin_crm_rls`。`Member` に `crmStage`／`crmOwnerUserId`（事務局ユーザーのid・リレーションは張らない）／`crmNextAction`／`crmNextActionDue`／`crmTags[]` を追加（全て任意）。新モデル **`MemberNote`**（対応履歴＝種別・本文・対応日時・記録者名を保存。記録者名は退職後も履歴が読めるように文字列で持つ）。**新テーブルなので RLS 有効化＋anon/authenticated から REVOKE を別マイグレーションで実施済み**。
  - 画面＝**`/admin/crm/[memberId]`（顧客カルテ）**。左＝担当・状況・次にやること・期限・タグの保存フォーム／対応履歴の追加と一覧／この会員の案件一覧。右＝反応の数字（公開中案件・閲覧・届いた問い合わせ・送った提案・商談・合意した商談・共創PJ・クレジット残高）／連絡先／個別相談（**メールアドレス一致で拾う参考表示**。`Consultation` に会員IDの列は無い）／購入履歴／この会員に対する操作の監査ログ。
  - **メッセージ本文は一切出さない（規約17条）**。件数と日時だけ＝`/admin/inquiries` と同じ扱い。`src/lib/crm.ts` の先頭とカルテのファイル冒頭にも明記した。
  - 導線＝`/admin/members` の表に「顧客カルテ」列（`カルテ →`）。`/admin` の指標に**「対応期限ぎれ」（1件以上で赤・要対応）**＋期限を過ぎた会員の一覧（`#crm-overdue`）。
  - 定数＝`src/lib/crm.ts`（種別6・状況6・文字数上限・タグの分解・期限の状態判定）。アクション＝`admin/crm-actions.ts`（`saveMemberCrm`／`addMemberNote`／`deleteMemberNote`）。**担当者は同一テナントの事務局ユーザーのみ許可**、対応履歴の削除は**書いた本人か上位管理者のみ**（記録の改ざん防止）、操作は全て監査ログ（`member.crm_update`／`crm_note_add`／`crm_note_delete`）。日時は既存に合わせ `+09:00` 固定で解釈。
  - 検証＝tsc／eslint（変更ファイル）／next build 合格。本番DBに対して記録の追加→表示→`/admin` の赤アラート→削除→CRM欄のクリアまで実機確認し、**テストデータは全削除済み**（`member_notes` 0件・CRM列が入った会員 0件）。375／1280／1520px で横スクロールなし。
  - **未実装（次の段）**: 顧客一覧 `/admin/crm`（検索・絞り込み・担当別）、`Consultation.memberId` での正式な紐付け、期限リマインドのメール通知。
  - **⚠️開発の落とし穴**: schema変更後は dev サーバーを再起動しないと `prisma.memberNote` が undefined になり「Cannot read properties of undefined (reading 'findMany')」で500になる。別セッションの dev サーバーが動いていると2つ目は起動できない（同一ディレクトリでロック）ので、確認は `npx next start -p 3100` で本番ビルドを別ポートに立てるのが早い。

- **事務局ナビの共通化（2026-08-16）**: 事務局の移動ボタンを `admin/_components/AdminNav.tsx` に共通化し、**事務局管理トップと全下層ページ（会員管理・掲載の監視・問い合わせ・個別相談・課金・違反報告・監査ログ・顧客カルテ）に同じボタン列**を置いた。「→」＝別ページ、「↓」＝トップの中のセクション（下層からは `/admin#...` で移動）。**今いるページは押せないグレーのチップ**（`aria-current="page"`）。審査待ち会員のバッジ・プロジェクト承認・差し戻し中の件数は **AdminNav 自身が数える**（軽いcount3本）ので、置く側は `current` を渡すだけ。各ページにあった「← 事務局管理へ」の個別リンクは、同じ行き先がナビに入ったため削除した。**新しい事務局ページを足したら `PAGES` に1行足すこと**（各ページに書き足す必要はない）。

- **管理画面のUIを作り直した（2026-08-16・見た目のみ。機能・文言・データは変えていない）**: 「管理画面のUIがとても悪い」というユーザー指摘。Backlogのダッシュボードを参考にした（※スペースはログインが要るため未見。一般的な作りに寄せた）。
  - **規約＝`admin/_components/adminUi.ts`**（管理画面だけの見た目の定数）。**`src/lib/ui.ts` と `globals.css` は触らない**＝会員画面に波及させないため。`btn()`/`input()` は従来どおり使う。⚠️Tailwindはソースの文字列を探すので、**クラス名は必ずリテラルで書く**（`border-[${COLOR}]` のような組み立てはCSSが出ない）。
  - **地の色**＝`admin/layout.tsx` を新設し、管理画面だけ薄いグレー `#F4F5F7` に。(app)layoutの `<main>` の余白と同じ量を負のマージンで外に広げ、内側で同じ余白を付け直しているので位置は不変・横スクロールも出ない。白いカードが面として立つ。
  - **見出し**＝管理画面はゴシック（`aH1` 20px / `aH2` 14px）に統一。会員画面の明朝（h1Cls/h2Cls）は管理画面では使わない。
  - **AdminNav をタブに**（ボタン11個の羅列 → 下線タブ＋その下に薄いテキストリンク）。今いる場所は白いタブとして浮く。
  - **/admin の情報の階層**＝「対応が必要なもの」（要対応5種を1枚のカードに・0件はグレー）と「現在の数字」（見るだけ・小さく1行）に分離。お知らせ／バナー／記事／PJ承認／差し戻し／管理者アカウントは**見出し行つきの白カード**に統一（むき出しのフォームをやめた）。
  - **表**＝`aTable`/`aTh`/`aTd`/`aTr`。行高を詰め、見出し行は `#FAFBFC`、行ホバー `#F7F9FA`、バッジは角丸4pxの小型に（丸ピルをやめた）。
  - 確認＝tsc/eslint/build 合格。375/1280/1520px で横スクロールなし。全8画面で表示を実機確認（検証用の一時管理者は削除済み）。

- **/food-loss 全面再設計（2026-08-16・指示書＝相談ファイル/CloudCode_食品ロス支援ページ_再設計実装指示書_20260816.md）**: 「食品ロスの紹介ページ」から「食品循環プロデュースの個別相談を取るサービスページ」へ。指示書の確定コピーをそのまま実装した。
  - **このページ専用の配色**（globals.css は触らない）＝墨緑 `#182019`／深緑 `#49634F`／生成り `#F4F0E6`／アクセント黄緑 `#DCE969`。影なし・角丸ほぼなし・アニメーションなし。
  - 構成＝ヒーロー（トマト左・文字右・2行見出しの「次の価値に変える。」だけ黄緑）→ OUR APPROACH → YOUR PROBLEM（生成り・上罫線＋番号の編集レイアウト）→ WHAT WE SOLVE（濃色・横罫線の3列）→ MODEL（3カラム＋帯）→ PROJECT IDEAS（#ideas）→ PROJECT FLOW（#flow・PC5カラム）→ FEE（#price・濃色4カラム・価格を黄緑）→ FAQ → 最終CTA（深緑）。
  - **共通ヘッダー（PublicTopBar）は維持**し、その下に**ページ内ナビ（sticky）**を追加＝指示書4の「プロジェクト例／進め方／料金／相談する」。
  - **ヒーローの見出しは2行固定**。PCは `clamp(52px,4.3vw,84px)` で幅に合わせて伸縮させ、折り返しが増えないようにしている（固定80pxだと1440pxで4行に割れた）。**文字サイズを変えるときは1440/1280pxで行数を必ず確認すること**。
  - **⚠️金額は出さない（ユーザー指示 2026-08-16）**＝指示書5-8にあった「15万円〜／50万円〜／月額30万円〜」を撤去し、4項目とも「**個別見積**」表記に。ページ内ナビも「料金」→「費用」。`JsonLd.tsx` の `FOODLOSS_JSONLD` の説明文からも金額を削除した（**構造化データにも載せない**）。/produce・/crowdfunding の金額は従来どおり残している。
  - **⚠️FAQを15問→5問に減らした**（指示書5-9のとおり）。以前のAIO用の詳しいFAQ（食品ロスの定義・対象物の一覧など）は削除され、FAQPageの構造化データも5問になった。SEO/AIOの観点で戻したい場合は、下部に「詳しい質問」として別グループで復活させるのが早い。
  - 確認＝tsc/eslint/build 合格。h1は1つ、CTAは全て `/consultation?type=food-loss`、#ideas/#flow/#price が実在、375/1440pxで横スクロールなし、モバイル初期画面に見出しとCTAが収まる。

- **公開ページの共通UI規格（2026-08-16・設計書＝相談ファイル/CloudCode_NAKAMA_全画面共通UI設計書_20260816.md ＋ CloudCode_NAKAMA_UI改善_実装指示書_20260816.md）**: 「/food-loss だけ他の下層ページと書式が違う」という指摘を受け、**設計書側（＝food-lossの書式）を正として他ページを寄せる**方針に決定。
  - **規格＝`(public)/_components/publicUi.ts`**（色・幅・余白・見出し・ボタン・タグ）。設計書§4/§6の数値をそのまま定数化。**公開ページはこの定数を使い、サイズや色を直書きしない**。会員ゾーン（(app)）は従来のCSS変数のままで、`src/lib/ui.ts` と `globals.css` は無変更。⚠️Tailwindはソース文字列を探すのでクラス名はリテラルで書く。
  - 色＝墨緑 `#182019`／深緑 `#49634F`／生成り `#F4F0E6`／アクセント黄緑 `#DCE969`／補助文字 `#687067`／線 `#CFD1C8`。旧 `#f6f3ec` は `#F4F0E6` に置換。
  - 文字＝h1 `clamp(56px,4.4vw,84px)`（モバイル42/52）、h2 `clamp(44px,3.4vw,60px)`（モバイル32/40）、本文15〜17px、英字ラベル10〜11px。**見出しの明朝24/30pxは公開ページでは使わない**（会員ゾーンは従来どおり）。
  - 適用済み＝**/food-loss・/produce・/crowdfunding・/hanro**（幅1200・余白64/80/112・ボタン `pBtn()`＝四角に近い塗り／枠線・モバイルは幅100%）。
  - **/hanro のヒーロー写真（2026-08-16）**＝ユーザー提供の商談写真を `public/hanro/hanro-hero.jpg`（1672×941・144KB）に配置。**文字＝左／人物＝右**の構図なので、オーバーレイは左を濃く右を薄く（`linear-gradient(90deg, .95 → .86 → .45 → .15)`）。**このヒーローだけ h1 の上限を64pxにしている**（共通の `pH1` は74px。74pxだと文字が写真の人物にかぶるため。ファイル内のコメントにも理由を記載）。
  - **/hanro は全面再構成（2026-08-16・指示書＝相談ファイル/CloudCode_販路開拓支援ページ_UI修正指示書_20260816.md）**＝共通の `InfoPage`（文書向け820px）から外し、個別支援ページと同じ骨格に。ヒーロー → 課題6件 → **2サービス比較（#services・PC2カラム）** → WHAT WE DO（濃色5行）→ 進め方（#flow・5カラム）→ 料金（#price・濃色2カラム＋含まれないもの）→ FAQ4問 → 最終CTA。**契約条件・業務範囲・成果物・守秘の詳細文は削除せず折りたたみ（`<details>`）に移した**（指示書5）。巨大なサービスメニュー表は本文から外し `/pricing` へのリンクに。価格（110,000円〜／440,000円〜）と準委任・成果非保証の文面は確定文のまま。構造化データは Service＋FAQPage＋**BreadcrumbList**（`breadcrumbJsonLd()` を JsonLd.tsx に新設）。**`InfoPage` 自体は無変更**（規約・プライバシー・特商法・FAQ・料金・相談フォームが共用しているため）。
  - **⚠️事業モデルはユーザー判断で現行仕様を維持（2026-08-16）**＝設計書§3の「月額会員制・無料表記の削除」は**採用しない**。基本無料＋紹介クレジット＋ビジネス会員（月50クレジット）のまま。**料金・会員まわりの文言は今回の作業で一切触っていない**。
  - **⚠️見出しが途中で折れる問題と、その直し方（2026-08-16・ユーザー指摘「食の商品づくりを、で変な改行」）**: 日本語の大見出しは**器の内寸 ÷ 文字数**を超えた瞬間に意図しない位置で折れる。対処＝①`pContainer` の左右余白を `lg:px-[5vw]` → `lg:px-10` に変更（1920pxでも内寸1120pxを確保。5vwのままだと画面が広いほど内寸が痩せる）②見出しサイズを**器に収まる上限で頭打ち**にした（h1 `clamp(40px,5.2vw,74px)`＝1120÷14文字、h2 `clamp(30px,3.6vw,54px)`＝1120÷約18文字。設計書の「PC 64〜88／44〜60px」より小さいが、途中で折れない方を優先）③**見出しを入れる器に `max-w` を付けない**（ヒーローの `max-w-[1040px]`・CTAの `max-w-[760px]` が原因だった）④長い見出しには `<br>` で意図した改行を入れる（/food-loss「調査だけでも、」/crowdfunding 3か所）。
  - **確認方法（再発防止）**: ブラウザのコンソールで、各見出しの行ごとの必要幅を canvas の `measureText` で計算し、640/768/834/1024/1280/1440/1920px の器の内寸と突き合わせる。**iframeでの一括計測は `X-Frame-Options: DENY` のため不可**なので、ページごとに開いて実行する。4ページとも「OK」を確認済み。
  - **未対応（次の段）**＝公開トップ・/about・/pricing・/flow・/faq、共通ヘッダー（設計書§5のナビ構成）、ログイン後ホーム「みんなの案件」化・検索タブ・0件画面・3ステップ掲載フォーム（指示書Phase 1）。

- **テストデータの全削除（2026-08-16・ユーザー指示で実施。本番DB）**: 公開前の掃除。**案件0件／やり取り0件／商談0件／添付0件／注文0件**にした。
  - 削除した内容＝①案件3件（グラブデザイン2・青島クラフト1。Storageの画像も `offerings/<id>/` ごと削除）②スレッド3・メッセージ23通・添付1件（**非公開バケット `message-attachments` の実ファイルと、紐づかない孤児ファイル3件も削除**）③商談3・提案メモ1・条件提示2（スレッド削除でCASCADE）④未決済のまま残っていた注文4件と明細4件⑤クレジット台帳7件・解放記録1件。
  - **クレジット残高＝グラブデザイン0／青島クラフト0**。**一般会員3人の「承認時の無償3クレジット」は権利なので残した**（ユーザー判断）。
  - **監査ログはテスト分22件だけ削除**（対象がもう存在しない記録14＝削除済みPJの承認/差し戻し・案件の代理作成/非公開化、CRM機能の検証4、手動クレジット付与4）。**残した42件**＝商品マスター更新23・会員審査6+2・会員削除1・AI下書きの利用10（外部送信の記録なので残す）。⚠️監査ログは本来「追記のみ・画面から消せない」設計。**運用開始後に同じことをしないこと**。
  - ⚠️スレッドを消しても `messages.offering_id` のような**FKのない参照は残る**（アプリは案件が無い状態を許容する作り）。案件だけ消したときも同様。
- **登録後そのままの会員への案内（2026-08-16）**: 会員5社のうち**3人が記入率0%・掲載0・やり取り0のまま**（8/10登録）。原因は「登録直後の脱落」で、4人中3人が同じ場所で止まっている＝掲載代行を前提に設計したとおりの状態。**送る文面＝`docs/idle-member-followup-20260815.md`**（1通目＝続きの案内＋代筆の申し出／2通目＝10日後・これで最後にする旨を明記＝規約16条の再勧誘禁止に合わせた）。**1通ずつ個別送信・広告色を出さない**（料金や他サービスの話を足すと広告宣伝メールになり、案内メール未同意の2人へ送れなくなる）。送信後は顧客カルテに記録し、返信があれば `/admin/listings` の掲載代行へ。**※送信はユーザーが内容を確認してから。まだ送っていない。**

- **顧客カルテからのメール送信＋案内メール同意の作り直し（2026-08-16・ユーザー指示）**: 事務局から会員へ直接メールを送れるようにした。**会員間メッセージ（DM）には一切入らない**（規約17条）。
  - **カルテの「メールを送る」**（`admin/_components/MemberMailButton.tsx`・モーダル）＝**宛先を選び**（その会員に属するユーザーのみ）、種別を選び、件名・本文を書いて送る。送信後は**対応履歴（MemberNote・種別=メール）へ宛先・件名・本文を自動記録**＋監査ログ `member.email_send`。
  - **種別で送信先を変える（特定電子メール法）**＝①**利用案内（手続きの連絡）**は同意の有無に関わらず送れる ②**広告・宣伝を含む案内は同意者のみ**。画面では未同意の宛先を選べなくし、**サーバー側（`sendMemberEmail`）でも未同意が含まれたら送信中止**（画面の制御だけに依存しない）。広告は本文冒頭に「＜広告＞」、末尾に**送信者名・住所・連絡先・配信停止の案内**を自動付与（`sendAdminMessageEmail` in `src/lib/email.ts`）。
  - **同意の取り方を変更**＝登録時の任意チェックを廃止し、**利用規約の同意チェックに案内メールの同意を含めた**（チェック文言に「案内メール（広告・宣伝を含む）の受信に同意」と明示）。`(auth)/actions.ts` は `businessPurpose` のチェックで `marketing_opt_in` を記録。**既存会員の同意状態は変更していない**（未同意の人は未同意のまま）。
  - **配信停止の手段**＝`/profile` に「案内メールの受け取り」セクションを新設（`MailPreference.tsx`＋`setMarketingOptIn`）。停止しても手続的な連絡は届くことを明記。
  - **規約 第27条の2を改定**（手続的連絡と広告の区別・登録時の同意・配信停止方法・送信者表示）＋改定履歴に2026-08-16を追記。**弁護士確認リストに追加が必要**（下記やることリスト）。
  - 検証＝tsc/eslint/build 合格。実機で①モーダル表示②広告に切り替えると未同意の宛先が選べなくなる③画面を迂回して送っても**サーバーが拒否**④利用案内で実送信→対応履歴と監査ログに自動記録⑤/profile のトグルで受け取る／受け取らないが切り替わる、を確認。**テスト送信の記録と一時アカウントは削除済み**（`member_notes` 0件）。

- **会員一覧を名刺台帳型にして、選択→DM配信／CSV書き出し（2026-08-16・ユーザー指示。Eightの一覧を参考）**: `/admin/members` を作り替えた。
  - **一覧の列**＝チェックボックス／氏名・会社名（担当者名＋会社名＋業種・地域）／部署・役職／電話・メール（＋「案内メール未同意」の注記）／登録日／タグ／備考／審査／課金状態／顧客カルテ。上部に**会員数と選択件数**、**「メールを送る（N社）」「ダウンロード（CSV）」**。
  - **電話・部署・役職・備考は持っていなかったので、CRM項目として追加**（migration `admin_crm_contact`＝`Member.crmPhone` / `crmDepartment` / `crmMemo`）。**会員が入力するプロフィールとは別の、事務局が名刺・ヒアリングから控える欄**で、顧客カルテのフォームから入力する。会員側の入力画面は変更していない。
  - **一括DM配信**（`sendBulkEmail`）＝個別送信と同じ種別（利用案内／広告）。**広告のときは未同意と停止中を自動で除外して送る**（個別送信は全体を止めるが、一括は「送れる相手にだけ送る」方が実務に合うため）。送信前に「送信対象N社（M社は未同意または停止中のため送りません）」と画面に出す。送信内容は**会員ごとの対応履歴に自動記録**＋監査ログ `member.bulk_email_send`。
  - **CSV書き出し**＝`/api/admin/members/export?ids=...`（未指定なら全件）。**個人データの持ち出しなので上位管理者のみ**（`requireSuperAdmin`）＋監査ログ `member.export_csv`。ExcelのためBOM付きUTF-8。16列（会社名・担当者・部署役職・電話・メール・案内メール同意・登録日・所在地・業種・審査・課金・記入率・タグ・備考）。
  - **一括送信はバックグラウンド（2026-08-16 追加）**＝画面は宛先を確定して `EmailJob` を作るだけで即座に返し、実際の送信は `after()` で応答後に進む（`src/lib/email-job.ts`）。migration=`email_jobs`＋`email_jobs_rls`（**RLS有効化＋anon/authenticatedからREVOKE**。宛先と本文を持つため）。
    - **1件送るごとに `sentCount` を進める**ので、途中で止まっても**二重送信にならない**。`status="running"` のまま10分以上たったジョブは**日次バッチ（/api/cron/billing-daily）が続きから再開**する（`resumeStaleEmailJobs`）。
    - 会員ごとに送り終えた時点で対応履歴を1件記録。`/admin/members` に**「直近の一括送信」**（件名・種別・送信件数／総数・完了/送信中）を表示する。**自動更新はしないので、進捗は再読み込みで確認**。
  - 検証＝全選択で5社選択・広告に切り替えると2社に絞られる・CSVのヘッダーと1行目・一括送信1社の実送信と対応履歴／監査ログを実機で確認。**バックグラウンド送信**＝ジョブが `done`（1/1）になること、**中断したジョブ（2件中1件送信済み・30分前開始）を日次バッチが引き取り、2件目だけ送って完了**することを実測。**テスト記録・ジョブ・一時アカウントは削除済み**。

- **トップの置き換えと実績ページ（2026-08-17・本番反映済み。commit b27b170・指示書＝相談ファイル/CloudCode_トップページ改善指示書.md ＋ nakama-top-ui-preview.html）**: 指示書のうち**事業モデルに関わる部分は不採用**（下記）。UIは「追加」ではなく**既存セクションの置き換え**で実施し、セクション数は10のまま。**DB変更なし・migrationなし**。
  - **⚠️指示書のうち採用しなかったもの（ユーザー決定 2026-08-17）**＝「無料ではじめるの廃止」「月額22,000円の会員制」「無料表記の削除」。**基本無料＋初回接点の紹介クレジット＋ビジネス会員という現行モデルを維持**する。規約・特商法・PAIDゲート・既存会員の権限は**一切触っていない**。ほかに不採用＝呼称「仕入れたい」（正式名は「探している（調達したい）」のまま／補助コピーとしてのみ可）・「相手が承認すると連絡開始」（**そんな仕組みは無い**）・相談モーダルへの移行（提案は既存の `/ledger/[id]/propose` のまま）・検索の「すべて」タブ・ダッシュボードの3ステップ永続化（migrationを足さない）・会費特典への「セミナー」（実体が無い＝景表法）・プレビューHTMLの配色（#145137/#eb6a24 系。現行のCSS変数と `publicUi.ts` を正とする）。
  - **トップ（`(public)/page.tsx`）**: ①**h1が2つあった**のを解消＝2つ目の h1「食の課題を、全国のNAKAMAと共創し解決する」を削除 ②その下の**2カード（登録する／伴走します）を削除**＝行き先もボタン文言も**最終CTAの3択と完全に重複**していた（`/signup`「無料で登録する」・`/consultation?type=theme`「共créテーマを相談する」） ③「3つの案件区分」を**目的別入口3枚**に置き換え（既存の罫線＋見出しの体裁のままリンク化し、罫線の直下に線画アイコンを1つ置く。**指示書が求めた「カード上部の写真」は素材が未提供なので入れていない**） ④その下に**掲載導線を常設**（案件セクションを0件で隠すため、掲載を促す文の置き場が必要）＝見出し「売りたい・探している・共創したい に参加することができます！」＋**中央揃えの大ボタン2つ**（「案件を登録する」／「事務局に代筆を申し込む」。地は既存のCTA作法＝緑枠＋薄緑）。**⚠️`btn("secondary")` だけ枠線があり2px高くなる**ので、横並びにするときは primary 側に `border border-transparent` を足して高さを揃える（`ui.ts` は触らない） ⑤**実績セクションを新設・常設**（案件が閾値を超えたら案件が上に出る） ⑥**「登録後、最初にすること」を新設**（番号＋線画アイコン＋1文。カード・影は使わない）＋末尾に「無料で登録する」ボタン（ログイン済みは「マイページトップへ」）。アイコン＝`public/steps/step-profile.png`（会社カード）/`step-listing.png`（みかん＋掲載）/`step-contact.png`（連絡）。**ユーザー提供素材（1254px・約200KB）を、透過を保ったまま余白を詰めて192px・7〜11KBに縮小**してある。差し替えるときも同じ手順で（原寸のままだと表示48pxに対して26倍の画像を配ることになる）。目的別入口のアイコンも同様＝`public/purpose/purpose-give.png`（みかん箱を差し出す手）/`purpose-want.png`（書類＋虫めがね）/`purpose-coproject.png`（握手）を**256px・13〜20KB**に。
  - **⚠️掲載0件のうちは案件セクションを出さない（ユーザー決定 2026-08-17）**＝`MIN_LISTINGS_TO_SHOW`（`src/lib/public-content.ts`）。**2026-08-18 に 4 → 1 へ変更**（ユーザー指示。折兼の「バガス容器」が掲載されたので1件でも出す。トップの中身は触らず、しきい値だけを変えた）。**売りたい／探している／共創PJで別々に判定**し、満たないセクションは `PreviewSection` が `null` を返して**丸ごと消える**。「現在ありません」が3つ並ぶと誰もいないサービスに見えるため。4件にしたのは `lg:grid-cols-4` で1行が埋まる数だから。**閾値を変えるならこの定数1つ**。
  - **⚠️ヒーローの `#buyer-listings` アンカーを `/listings?type=want` に付け替えた**＝案件セクションが0件で消えると**行き先が無くなる**ため。ヒーローの文言・画像・レイアウトは変えていない（href のみ）。同じ理由で `PublicTopBar` と `HeroMobileMenu` も変更。
  - **`/listings` 新設（公開の案件一覧）**＝目的別入口の着地先。`getPublicListings()`（public-content.ts）は**トップのカードと同じ粒度**（member は name と companyLogoUrl だけ）で、連絡先や非公開項目は返さない。タブは Link（form送信にすると遅い）。**「すべて」タブは作らない**。0件のときは掲載導線＋掲載代行の案内＋実績への誘導を出す。
  - **`/cases`・`/cases/[slug]` 新設（実績）**＝データは `src/lib/cases.ts` の**静的定義**（2件・DBモデルは作らない＝migrationなし。増えたらDB化する）。**体裁はプレスリリース／ニュース記事**（日付→長い見出し→枠囲みリード→画像→■小見出し→事実の一覧→出典→静かなCTA）。ユーザー指示「AIが作ったようなCloudCode風のレイアウトはやめて」に沿い、**帯・カードグリッド・英字ラベルは使っていない**。参考＝GRAのニュースリリースページ。
  - **実績2件の一次情報**（ユーザー提供のURLから取得。**推測で数値・成果を足さない**）＝①**きくらげ堂みやざき／恩田敦司さん**（宮崎県佐土原町。航空自衛隊に21年勤務、2025年7月退職の翌日に開業）の白きくらげ「きくらげ姫」が塚田農場（APホールディングス）の冬の鍋メニューへ。出典=UMKテレビ宮崎 2026-05-26 ②**株式会社九重本舗玉澤**（1675年創業）×**ミガキイチゴ（株式会社GRA）**の「霜塩小餅かき氷（ミガキイチゴ）」2026年7月1日発売・単品1,540円／セット1,980円。**出会い（2026年2月・東京）から発売まで約5か月**。出典=GRA 2026-06-16。**画像の「新味玉澤」は商品名ではない**（「伝統が紡ぐ新味」で区切れる）。
  - **⚠️CASE 01（塚田農場）は現在 `published: false` ＝非公開**（2026-08-17 ユーザー指示。**掲載承諾がまだ**）。CASE 02（玉澤×ミガキイチゴ）は承諾済みで公開中。**承諾が取れたら `src/lib/cases.ts` の `published` を true に戻すだけ**で、トップ・`/cases`・サイトマップに復活する（詳細ページも生成される）。あわせて `llms.txt` に1行戻すこと。非公開のあいだ `/cases/tsukada-shirokikurage` は404。**参照側は必ず `CASES_SORTED`（公開中のみ）を使う。`CASES` を直接使うと非公開のものが漏れる。**
  - **CASE 01 の時期は2025年11月**（ユーザー訂正 2026-08-17。当初「2026年11月」と聞いて未来形で書いていたのを過去形に修正）。2025年7月に退職翌日に開業→同年11月に提供開始＝**開業から約4か月**。
  - **⚠️一覧の並び順は「日付の新しい順」ではなく `no`（CASE STUDY の通し番号）の昇順**。画像に「CASE STUDY 01/02」が焼き込まれているため、日付順（01=2025年11月／02=2026年7月）にすると 02 が 01 の上に出て不自然になる。事例を足すときは `no` を続き番号にすること。`sortKey`（実装時期）は残してあるので日付順に戻すことは可能。
  - **画像**＝`public/cases/case-tsukada.png`（932×588）/ `case-tamazawa-migaki.png`（922×828）。素材はユーザーのスクリーンショット。**CASE 02 は右上にスクリーンショットの黒帯が写り込んでいた**ので x645-922・y0-28 を塗りつぶした。**⚠️このとき純白で塗ると継ぎ目が出る**（周囲の地は #F6F6F7）。周囲の色を平均して塗り直してある。**文字が焼き込まれた画像なので、カードのサムネイルでは本文が読めない**＝記事本文をページ側に持たせ、画像は補助にしている（SEO・読み上げ対策も兼ねる）。
  - **`InquiryFlowCard` 新設**（`src/components/InquiryFlowCard.tsx`）＝案件詳細に「連絡から商談までの流れ」を固定表示。**立場で流れが逆になる**ので direction で出し分ける（GIVE=買い手が問い合わせ→売り手が開封／WANT=売り手が提案）。**8/26の開封課金は施行前後で文言を出し分ける**。import 元は **`lead-unlock-core`**（DB非依存。`lead-unlock` を import すると prisma が入る）。`(app)/ledger/[id]` の**既存の予告ブロック（amber枠）はこのカードに統合して削除**し、`(public)/preview/offerings/[id]` にも追加した。
  - 公開設定＝`middleware` の `PUBLIC_PATHS` に `/cases` `/listings`、`sitemap.ts` に `/cases` と公開中の詳細（`CASES_SORTED` から自動生成）、`llms.txt` に2行、フッターとモバイルメニューに「実績」。`CONTENT_UPDATED_AT` を 2026-08-17 に更新。
  - **コピーの見直し（2026-08-17 夕・ユーザーのトップ評価を受けて）**: ①**「相手から連絡が届きます」をやめた**＝届く保証はないので「**相手に見つけてもらいやすくなります**」に（掲載導線・3ステップの補足・`/listings` の空状態の3か所）。**この言い回しは今後も使わないこと**。②**無料表記の重複を削減**（ヒーロー下で9回→7回）＝「どこまでが無料か」は**3ステップ末尾の※1文に集約**し、3ステップ02の「掲載は無料です。」・サービス欄見出しの「基本掲載は無料です。」・NAKAMA登録カード説明の「登録・掲載・応募は無料。」を削除（価格欄の「無料」とCTAボタンの文言は残す）。**繰り返すと安心ではなく「後から請求されるのでは」という疑いを生む**というユーザー指摘。③**先行掲載の理由を追加**＝「いま掲載すると、Food Japan Summit のネットワークへ先行して紹介されます。」を掲載導線と `/listings` の空状態に。**⚠️これは事務局の約束**＝掲載者を Summit のネットワークへ実際に紹介する運用が前提（やらないと景表法上まずい）。裏付けとして Summit 公式サイトへリンクする。**URLは `src/lib/services.ts` の `FJS_URL` 1か所**（ヒーローのタグも同じ定数に統一した）。
  - **ヒーローの料金表記に「有料になる一点」を追加（2026-08-17 夕・ユーザー指示。ヒーロー変更禁止の例外）**: 従来の注記は「登録無料・月額契約不要。問い合わせの送信は無料。やり取りが始まったあとは、何往復でも無料です。」で、**無料の面しか書いておらずクレジットに一切触れていなかった**。→「**商品の掲載と案件の閲覧は無料です。／初回のやり取りに売り手側にクレジットがかかります。初回やり取りが始まったあとは、何往復でも無料です。**」に変更。**有料になるのは売り手側の初回2つだけ（「探している」案件への初回提案／届いた問い合わせの初回開封）で、どちらも払うのは売り手**という整理に統一した。あわせて①リード末尾の「商品の掲載と案件の閲覧は無料です。」を削除（注記と同じ文が2回出るため）②**3ステップの03も同じ整理に修正**＝従来は「「探している」案件へ提案するときだけ」と書いており、**8/26からの開封課金が抜けていてヒーローと食い違う**ため。**⚠️開封課金は 2026-08-26 施行なので、施行前のいまは「開封が有料」は先出しの表示**（過小ではなく過大な開示なので誤認は生まないが、承知のうえ）。**さらに同日、「初回のやり取りに売り手側にクレジットがかかります」では「誰が・どの操作で払うのか」が一読で分からないという指摘を受け、課金される操作を名指しする文に差し替えた**＝「**「探している」案件への提案、または「売りたい」案件に届いた問い合わせの初回開封に、紹介クレジットを使用します。初回やり取りが始まったあとは、何往復でも無料です。**」。**料金の文言は「初回」「やり取り」のような曖昧語で丸めず、課金対象の操作を書くこと**（1520/1200/375px で3〜4行に収まりヒーローからはみ出さないことを実測済み）。
  - **共創・商品開発の金額を非公開にした（2026-08-17 ユーザー決定）**＝「200万円〜」→「**ご相談**」。理由＝①内容で幅が大きく「〜」の情報価値が薄い②**トップに大きい数字が並ぶと「無料で始められる」という主メッセージを打ち消す**（いま集めたいのは初期の掲載者であって事業づくりの発注者ではない）③2026-08-16 に `/food-loss` から金額を全部外した判断と揃える。**⚠️同じ金額が3か所に分かれて書かれていた**＝`src/lib/services.ts` の `SERVICE_MENU`（トップ・/pricing・/billing が参照）／`(public)/faq/page.tsx` の回答文（直書き）／`public/llms.txt`（しかも「税別」と書いてあり services.ts の「税込の提案値」と食い違っていた）。**サービスの金額を変えるときはこの3か所を必ず一緒に直す**。他の6サービスの金額は据え置き（入口2商品 110,000円〜／440,000円〜は `/hanro` で業務範囲と含まれないものを明示しているので価格に責任が持てる＝残す判断）。
  - **Summit連動の6工程にアイコンと説明を追加（2026-08-17 夕・ユーザー提供素材）**＝「登録・募集／候補探索／商談・試食／試作・実証／取引・事業化／成果発表」。**矢印つきのピルを並べていたのをやめてグリッドに変えた**＝狭い幅で折り返すと順番が読めなくなるため。番号（01〜06）を振り、**各工程に30字以内の説明を1行**（実測13〜19字）。アイコンは `public/process/process-1〜6-*.png`（192px・8〜18KB）。**⚠️この素材だけ縦長（362×724）で、下部に「ほぼ透明だが完全には透明でない」画素が残っていた**。そのため `getbbox()`（alpha>0 を拾う）で切ると 02・04 だけ中身の占有率が64〜70%まで落ち、**並べたとき2つだけ小さく見えた**（ユーザー指摘）。対処＝**alpha≧32 かつ暗い画素だけを中身とみなして切り出し、6つの「インク面積」を揃えてから192pxの枠に中央配置**する（最大辺は172pxで頭打ち＝枠に10pxの余白を残す）。実測で面積24,600〜24,800px²・上下余白も均等に揃った。**⚠️アイコンを並べるときは最大辺ではなく面積で揃えること**（縦長・横長が混ざると最大辺基準では見た目の大きさが揃わない）。さらに**PCだけ工程間に細い線**を渡して「6つの機能」ではなく「順に進む工程」に見えるようにした（`li` の `::after`。アイコンの右端+6px から次のアイコンの左端-6px まで＝`left-[calc(50%+34px)] w-[calc(100%-52px)] top-7`。34px=アイコン半径28+余白6、28px=lg のアイコン56pxの中心）。**`lg:` のときだけ表示し、最後の1つは非表示**＝2列・3列に折り返す幅では線が順序を繋がないため（375pxと900pxで線0本を実測）。あわせて**このセクションの外枠を削除**＝他のセクションは枠なしで、ここだけ枠付き＋`px-6` のぶん見出しが24pxずれていた。**枠を付けてよいのは最終CTAだけ**（見出しの左端が全セクション66pxで揃うことを実測）。
  - **未実装（素材・指示待ち）**＝目的別カードの写真3枚（指示書は「カード上部に写真」だが素材未提供のためアイコンで代替）、塚田農場の掲載承諾、`/cases` の分類タブ（1〜2件では意味がないので省略）、関係者コメント・課題の追加取材分。
  - 検証＝tsc／eslint（新規分0件。既存の `DIRECTION_LABEL` 未使用警告は**変更前から同じ**なので触っていない）／vitest 31件／next build。実画面で**375／1200／1520px すべて横スクロールなし**、トップの h1 が1つ、案件3セクションが0件で消えていること、`/listings` の空状態、InquiryFlowCard の GIVE/WANT 出し分けを実測。確認用の一時ページ `/preview/tmp-flow` は削除済み。
  - **本番実測（デプロイ後）**＝配信ハッシュが `13940f00…`→`ad3b31b3…` に変化して反映を確認。`/cases/tsukada-shirokikurage` は**404**、`/cases/tamazawa-migaki-ichigo`・`/cases`・`/listings`（3区分とも）は200。トップと `/cases` に塚田の文字列なし、`sitemap.xml` は `/cases` と玉澤のみ、`llms.txt` の塚田は0行、h1は1つ。

- **Food Japan Summit の協賛ページ `/sponsor`（2026-08-17・本番反映済み）**: サミットの協賛企業を集めるための**独立したページ群**。**3ページ構成**＝`/sponsor`（案内＋2つの入口）／`/sponsor/apply`（プラン選択を含む本申込・設問18）／`/sponsor/contact`（**連絡先だけの短い相談フォーム**）。**⚠️入口を2つに分けたのは「金額・プランを決めてからでないと押せない状態」をなくすため**（ユーザー指示 2026-08-17）。案内ページの本文は確定コピー「協賛ではなく、共創へ。」。**相談フォームの必須は組織名・担当者名・電話番号・メールアドレスの4つだけ＋任意でFacebook URLとご相談の内容。ここに項目を足さないこと**（足すと「まず相談したい人」が離脱する）。受付番号は申込が `FJS-`、相談が `FJS-Q-` で区別できる。
  - **ブース出展（1ブース200,000円・税別／募集資料PDF p.47）は協賛プランとは別枠のオプション**（ユーザー確定 2026-08-17）＝設問2-3の独立チェックボックスで受ける。**プランの特典一覧には入れない**（含まれないので）。`BOOTH_OPTION`（`sponsor.ts`）。
  - **⚠️申込者への受付控えメールに宮崎の日程・会場が固定で書かれていた**のを修正（2026-08-17）＝名古屋のみ・両開催で申し込んだ人に誤った日程が届く状態だった。両開催の日程を並記する形にし、件名と見出しの「in MIYAZAKI」も外した（宮崎専用ではなくなったため）。
  - **年間会員（月30,000円税別・PDF p.13）の位置づけ（2026-08-17 ユーザー決定）**＝**主は月例ミーティング・年間アクセラレータープログラム・優先マッチング。NAKAMAビジネス会員として使えるのは付帯**（この主従を入れ替えないこと）。**実現方法はシステムを作らず Stripe のクーポンで NAKAMAビジネス会員を付与する**＝「提案無制限」の機能は作らない（2026-08-11 にスパム懸念で撤回した決定のまま）。
  - **⚠️「使いたい放題」は実際に無制限なものだけに付けている**＝NAKAMAで無制限なのは掲載・閲覧・検索・メッセージ・相談で、**初回の提案はクレジット消費なので月50件分が上限**。文面は「案件掲載・メッセージ・マッチング相談は使いたい放題、提案は毎月50件分まで」としてある。**この但し書きを外さないこと**（外すと景表法上の優良誤認になる）。
  - **⚠️クーポンで申し込ませたときの運用手順**（`webhook/route.ts` の `invoice.paid` の作りによる。実装を確認済み）: ①**割引つきの請求では自動で会員にならない**（割引コードが漏れたときに誰でも会員になれるのを防ぐため、昇格は定価どおりの支払いのみ）→ `/admin/members` で手動で「ビジネス会員（課金中）」にする ②手動で会員にしただけでは**その月の月次クレジットは付かない**→ `/admin/members` の「今月分のクレジット（50）を付与する」を押す（同月に何度押しても増えない）③**翌月以降は自動**（すでにPAIDなら割引つきの請求でも `invoice.paid` で50クレジットが付く）。
  - **⚠️①②を手作業のままにするのは意図的な決定（2026-08-17 ユーザー判断「そんなに簡単に増えないと思うので、手で良い」）**。年間会員の件数が少ないうちは手動で足りるため、**Webhookを改修して自動昇格させることはしない**（下記やることリスト9の②は採用しない）。**これを「未実装のバグ」と誤解して自動化しないこと**＝自動昇格を入れると、割引コードが漏れたときに誰でもビジネス会員になれる穴が復活する。件数が増えて手作業がつらくなったら、Stripeに正式なPriceを作ってprice IDで判定する方式を検討する。**⚠️NAKAMA本体の機能ではない**＝ヘッダー・フッターのナビからリンクせず、`sitemap.ts` と `llms.txt` にも入れず、`robots: noindex` にしてある（**URLを直接案内して使う**というユーザー指示 2026-08-17）。公開したくなったら noindex を外して sitemap に足すだけ。
  - **⚠️DBに保存しない（メールのみ）**＝`info@grab-design.com` と `umetaku@grab-design.com` の2通＋申込者への受付控え。migration なし。**そのぶん取りこぼすと痛いので（最大250万円の申込）、`sendSponsorApplicationEmails` は送信可否を戻り値で返し、事務局あてが1通も送れなかったら成功にせず「直接メールしてください」と出す**。通常の `send()` は失敗をログに出すだけなので、ここだけ別扱いにしている。
  - **切り替えの仕様（2026-08-17 に名古屋・両開催を追加して作り直し）**＝**2段構え**。①**一番上に「宮崎県内に本店または主たる事業所を置く法人」のチェックボックス**（ここで最初に分岐する。ユーザー指示「一番最初に選んでもらったほうが分かりやすい」）。チェックすると**開催は宮崎に確定して選択肢を出さず（hidden）**、価格表が特別割に切り替わる（**特別割は宮崎開催に限り適用**＝PDF p.11）。②チェックなしのときだけ設問1のラジオ**4コース**（宮崎のみ／名古屋のみ／両開催／相談）を出す。価格＝宮崎/名古屋 15/30/50/80/250万、両開催 20/50/80/120/400万、特別割 15/30/40/70/200万（すべて税別）。**サーバー側でも「特別割は宮崎のみ」「選んだコース（＋特別割の有無）に存在するプランか」を検証**する（送信値の付け替え防止）。年間会員は協賛と併用できるので独立したチェックボックスにした。
  - **⚠️特別割を「開催の選択肢」の1つにしない**＝一度そう作ったがユーザーの指摘で戻した。特別割は**開催ではなく申込者の属性**なので、開催のラジオに混ぜると意味が揃わない。
  - **⚠️ラジオ/チェックボックスには `autoComplete="off"` が必須**。これが無いとブラウザが再読み込み時に選択を復元し、**Reactの state と表示がずれる**（チェックボックス版で実際に踏んだ）。
  - **⚠️特別割は「特典は宮崎開催プランと同一、価格だけが違う」（ユーザー確定 2026-08-17）**＝LIGHT 15万／STANDARD 30万（この2つは通常と同額）／PRESENTER 40万／STRATEGIC 70万／DIAMOND 200万。**実装は通常プランから価格だけ差し替えて生成している**（`LOCAL_DISCOUNT_PRICES`）。**特典を別々に書かないこと**＝必ず食い違う。募集資料PDF p.11 はカンファレンスパスを1名/3名/4名としていたが、**資料側の誤りとして扱う**（同額のSTANDARDで通常2名に対し1名、値引きされたPRESENTERで通常2名に対し3名と逆転していた）。
  - **⚠️募集資料PDF（`~/Desktop/00_デスクトップ/企画書/スナックフォーラム/2026_JapanFoodSummit/2026_宮崎_協賛募集資料_JapanFoodSummit.pdf`）に残っている誤り**（資料を配布・改訂するときに直すこと。フォーム側は正しい内容にしてある）: ①p.11 特別割のカンファレンスパス人数（上記）②p.10の説明文「11月3日・4日」はp.9の「11月17日18日」と矛盾 ③p.9は「愛知のみ」、他は「名古屋」で表記ゆれ ④LIGHTの「名簿掲載」が NAKAMA掲載を指すのか不明 ⑤両開催STANDARDだけ「試食・チラシ・ノベルティ配布」が無い（単独開催のSTANDARDには有る）。**⚠️この5点はマスターPPTX側では2026-08-17〜18に全部修正済み。直っていないのは古いPDF（`2026_宮崎_協賛募集資料_JapanFoodSummit.pdf`）のほうなので、配布するならマスターPPTXから書き出し直すこと。**
  - **PDFで裏が取れたのでユーザー文面の抜けを補った箇所**＝PRESENTER/STRATEGIC の「協賛ロゴ掲載」「コワーキングルーム使用」。`sponsor.ts` のコメントに「※」で明示してある。
  - **マスター資料のレビュー（2026-08-17〜18・`~/Desktop/00_デスクトップ/企画書/スナックフォーラム/2026_JapanFoodSummit/2026_マスターJapanFoodSummit.pptx`・全57スライド）**: 17点を指摘し、**ユーザーが全点修正して解消済み**。内訳＝①フィールドツアーの曜日誤り（11月18日「木」→「水」）②p.51「11月3日・4日」→11月17日18日 ③「参加後の参加者リストのご提供」を全8箇所から削除し「参加者の同意を得た範囲で、商談候補者の紹介・面談調整を行います。」へ ④宮崎県法人特別割のパス人数の逆転（1名/3名/4名→2名/2名/3名）⑤LIGHTの「名簿掲載」削除 ⑥「試食等のノベルティ」の表記統一 ⑦来場者数の内訳追記（宮崎200〜300名／名古屋400〜500名）⑧p.50「愛知のみ」→「名古屋」⑨名古屋の会期を12/15-16の2日間に統一し p.18 と p.37 の時刻を一致 ⑩「宮崎カンファレンスへの参加権だけでなく」削除（年間会員に参加権が付くと誤読された）⑪年間会員に「（税別）」追記 ⑫ページ番号「◯/25」を全解消（実際は57スライド）⑬両開催プランにノベルティとNAKAMA掲載を追加 ⑭年間会員のNAKAMA範囲を明記（サイトと一致）。**⚠️フィールドツアーが本会期2日目（11/18）と同日なのは仕様**（ユーザー確認済み・指摘しないこと）。
  - **⚠️PPTX/PDFの矛盾を指摘する前に、画像との重なりと描画順を必ず確認する（2026-08-17 に3回続けて誤指摘した教訓）**: `<a:t>` を全部つないで読むと、**別々の図形のテキストが連結されて存在しない矛盾に見える**。さらに **PowerPointは全面画像で古いテキストボックスを覆っていることがある**（p.43 は 10.85×7.23インチの画像が下の「来場予定300名」等5個を完全に隠していた＝画面には出ていない）。**正しい確認手順**＝`<p:spTree>` を `<p:sp>`/`<p:pic>` 単位で走査し、**`<a:off>`（座標）・`<a:ext>`（サイズ）・XMLの出現順（＝描画順。後ろが上）** まで見る。**この環境には PowerPoint も LibreOffice も pdftoppm も無いのでレイアウトの目視ができない**＝文字を増やした箇所の枠はみ出し・重なりはユーザーに確認を依頼する。
  - **⚠️資料を直したら `sponsor.ts` も直す（両方向で食い違う）**: 2026-08-18 に、資料側で両開催STANDARDに追加された「試食・チラシ・ノベルティ」がフォームに無い食い違いを発見して合わせた。**資料の修正報告を受けたら、その内容がフォームにも要るかを毎回確認すること**。
  - **⚠️「参加後の参加者リストのご提供」は入れない（2026-08-17 ユーザー指示で削除）**＝PDF p.9〜11 には記載があるが、共通価値の「**参加者の同意を得た範囲で**商談候補者の紹介・面談調整を行います」と矛盾し、参加者名簿の第三者提供は個人データの提供にあたるため。**PDFを見て復活させないこと**。
  - **共通価値の文言で直した誤解ポイント（2026-08-17）**＝①「登壇、展示、試食・試飲、商談設定の**内容・時間帯**は…個別に調整します」だと**LIGHTでも登壇できると読めた**→「**各協賛プランに応じて提供します。**実施内容と時間帯は…」に。②NAKAMAの役割を分離＝協賛は「**協賛企業としての紹介情報の掲載**」まで、**案件掲載・メッセージ・マッチング相談の継続利用は年間会員特典**（この切り分けを崩さないこと）。
  - **案内ページのプラン早見表は `PLAN_SUMMARY`（`sponsor.ts`）でプラン定義から導出する**＝手で別表を書くと必ず食い違う。**⚠️DIAMOND PARTNER の特典は個別に列挙されず「全プランの特典」で表されるので、`inheritsAll` で拾わないと最上位プランだけ「展示・試食 —」「商談の紹介 —」と誤表示される**（実際に踏んだ）。
  - **⚠️特別割チェックボックスは読み込み時に必ず未選択から始める**。`autoComplete="off"` だけではブラウザの復元を防ぎきれず、**表示は特別割なのにReactのstateは未選択**という食い違いが起きて県外企業に特別割が先に出る。**2026-08-18 以降は `useRef`+`useEffect` でDOMを書き戻す方式をやめ、①開催が未選択から始まる ②チェックボックスは宮崎開催を選んだときだけ描画される ③入力欄を全部制御コンポーネントにした、の3点で構造的に防いでいる**（存在しない要素は復元されない）。
  - 定義は `src/lib/sponsor.ts` に集約（プラン・価格・テーマ・特典・同意事項・受付先）。**サーバー依存を持たせないこと**＝クライアントのフォームからも import している。**⚠️金額はすべて税別**（NAKAMA本体は税込なので取り違えない）。
  - `middleware` の `PUBLIC_PATHS` に `/sponsor` を追加済み。ハニーポット（`nickname`）あり。
  - **⚠️置き場所＝`src/app/(event)/sponsor/`（2026-08-17 に `(public)` から移動）**。理由＝`(public)/layout.tsx` が**NAKAMAのフッター（ナビ5列＋ログイン/無料で登録するCTA）を全ページに出す**ため、サミットの申込フォームに NAKAMA のサイトナビが付いてしまっていた（ユーザー指示「フッターは削除」）。**ルートグループなのでURLは `/sponsor` のまま**。`(event)/layout.tsx` はスキップリンクと `<main>` だけ。運営者の連絡先は page.tsx 末尾に自前で置いている（申込の受け取り先を示すため必要）。**⚠️ページを移動すると `.next/dev/types` と `.next/types` に旧パスの型が残って `tsc`/`next build` が落ちる**＝移動後は該当フォルダを削除すること（実際に踏んだ）。

- **Phase 12＝協賛申込フォームを「読むフォーム」から「選んで進めるフォーム」にした（2026-08-18・指示書＝ユーザーがチャットに直接貼付。本番反映済み `52ebcd3`）**: 情報は8〜9割そろっているのに縦に長く、説明を読み続ける構成だったのを、選択で進む4ステップにした。**触ったのは見た目とステップ分割だけで、送信する値（input の name / value / FormData の形）・メール本文（`src/lib/email.ts`）・料金定義は一切変えていない**。
  - **実測での改善（1280×720 / 375×812）**＝ページ全長 5,899px(8.2画面)→**1,471px(2.0画面)** / 7,719px(9.5画面)→**2,588px(3.2画面)**。開催を選べる位置 946px→**538px（PCは1画面目に収まった）** / 1,352px→**852px**。⚠️スマホは 812px の折り返しに対して 852px なので、**ラジオ本体はあと40px スクロールが必要**（見出し「協賛対象の開催」とステップナビは1画面目に入る）。リード文を詰めれば入るが、文面は指示書の指定どおりなので変えていない。
  - **直した構造上の問題**＝①最初の1画面に入力欄が0個だった ②最初に出会う操作が「宮崎県法人か」という例外条項で、チェックすると開催が勝手に宮崎に固定されていた ③**プランが二重に出ていた**（読み物としての一覧1,190〜2,200px＋選ぶためのラジオ）＝読む場所と選ぶ場所が別で、価格を覚えて下でもう一度選ぶ必要があった → カードUIに統合して二重を解消 ④年間会員が本文6行の一続き ⑤設問13が無条件チェックで LIGHT 15万でも登壇・展示・商談を全部選べた ⑥進捗表示も固定バーも無く送信ボタンまで9画面。
  - **4ステップは本当に画面を分ける**（①開催 ②プラン・オプション ③会社情報・目的 ④確認・申込）。sticky のステップナビをタップで移動でき、**前へは自由・先へは手前のステップを検証してから**進む（未入力があれば最初に引っかかるステップへ戻して該当項目の直下にエラーを出す）。
  - **⚠️踏むと必ず壊れる3点（この作りを崩さないこと）**：①**入力欄は全部制御コンポーネント**にする＝React 19 はサーバーアクション完了時に form をリセットするので `defaultValue` 方式だと送信エラーで入力が全部消える（認証フォームで踏んだ `c08dcb7` と同じ罠）②**ステップ切り替えで DOM から外さない**（`hidden` で隠すだけ）＝外すと値が消え FormData にも載らない。`hidden` な input は送信対象に残るのでこれで正しい（STEP4 表示中に FormData を実測して全22項目そろうことを確認済み）③**form に `noValidate` を付け必須判定は自前でやる**＝折りたたみや非表示ステップの中に `required` があると、ブラウザは「フォーカスできない欄」を検証しようとして**エラーも出さずに送信を止める**。`required` は表示中ステップにだけ付けており、支援技術向けの意味づけとしてだけ残している。
  - **⚠️「請求・ロゴ・その他」は開閉できるが既定は開いた状態**にしている（指示書15は折りたたみ可）。必須（請求書の宛名・ロゴ提出方法）を含むので、閉じたまま気づかず送信させないため。送信時に未入力があれば強制的に開く。
  - **プランカードは価格を持たない**＝`plansFor()` から導出する。**協賛プランの価格定義はリポジトリ全体で `sponsor.ts` の3か所だけ**（`singleVenuePlans()` 15/30/50/80/250万・`COURSES` の both 20/50/80/120/400万・`LOCAL_DISCOUNT_PRICES` 15/30/40/70/200万）で、`plansFor()` が唯一の参照元であることを実測で確認済み。カード用に足したのは開催が変わっても変わらないものだけ＝`PLAN_TAGLINE`（1行要約）/`PLAN_BADGE`（おすすめ・最上位プラン）/`PLAN_CTA_CONSULT`（DIAMONDは「選ぶ」でなく「相談する」表記。**送信値は他と同じ `plan=diamond`**）/`PLAN_CARD_FEATURES=4`（残りは「すべての特典を見る」で開く）/`COURSE_SHORT`（スマホ固定バー用の短縮表記）。**主要特典は features の先頭4件を自動で出す**（ユーザー選択 2026-08-18）＝開催で変わる特典（PRESENTERの「宿泊付き」は宮崎にあり名古屋に無い／両開催は「宮崎開催の宿泊・朝食付き」）が自動で正しく切り替わる。
  - **⚠️特別割は「宮崎開催のみ」に限定（ユーザーが 2026-08-18 に明示）**＝名古屋のみ・両開催には適用しない。**両開催向けの宮崎県法人特別価格は定義しない**。守りは3重＝①`localPlans` を miyazaki コースにしか持たせない（`plansFor` が通常価格に落ちる）②サーバーで `isLocalCorp && course !== "miyazaki"` を弾く（`actions.ts`）③**チェックボックス自体を宮崎開催選択時だけ描画**するので県外企業は特別価格を目にしない。
  - **登壇（トークセッション）枠をカードの価格直下に独立表示（ユーザー判断 2026-08-18「協賛で一番大きいのはトークセッション枠」）**＝`presentationSlot()` が `PLAN_SUMMARY` と同じ述語（`hasPresentation`）で判定し、LIGHT・STANDARD は**「登壇枠：なし」と明示する**。黙って省くと下位プランでも登壇できると読めるため。実測＝なし/なし/30分/60分/60分＋セッション主催。
  - **希望特典の誤解防止（指示書11）**＝`benefitIncluded()` で選択プランに含まれるかを判定し「プランに含まれます」／**「要相談」**を出す。注記 `DESIRED_BENEFITS_NOTE` は必ず出す。⚠️DIAMOND は特典が「全プランの特典」で表されるので `全プランの特典` を拾わないと最上位だけ誤判定する（`PLAN_SUMMARY` と同じ罠）。プラン未選択・「相談して決めたい」のときは断定しない（判定なし）。実測＝LIGHTで登壇・試食・チラシ・商談が「要相談」、PRESENTERは全部「含まれます」。
  - **金額サマリー**＝PCは右カラム sticky、スマホは画面下の固定バー（`form` に `pb-[104px]`）。**年間会員は「あわせて相談したい」で金額が確定しないので加算しない**（指示書10）。**ブース出展は定価が決まっている買い物なので加算する**（指示書に明記が無かったので判断。宮崎PRESENTER 50万＋ブース20万＝70万、両開催PRESENTER 80万＋20万＝100万を実測）。「相談して決めたい」は「事務局と相談」と出す。
  - **⚠️年間会員カードは 2026-08-17 に決めた主従（月例ミーティング等が主・NAKAMAは付帯）と逆順**になっている＝指示書がNAKAMA側を先に列挙しているため合わせた。見出しも PDF p.13 の「年間を通じて、共創コミュニティに属する。」から「FOOD JAPAN NAKAMAを1年間、使いたい放題。」へ差し替え。**「使いたい放題」を広く言う代わりに、features に「提案：毎月50件まで」を必ず並べて上限を同じカード内に見せている**（この1行を外すと無制限と読めて景表法の論点が戻る）。
  - **`BOOTH_OPTION` の金額の二重記述を解消**＝本文に「200,000円」と書きつつ `price: 200000` も持っていたので、表示は `price` から `yenFull()` で作るようにした。`MIN_PLAN_PRICE`（全プランの最安）も追加し、ファーストビューの「15万円〜」を固定値でなく導出値にした。
  - **`SponsorState` に `fields`（項目別エラー）を追加**＝キーは input の `name`。画面側は `FIELD_STEP` でどのステップへ戻すかを決める。**送信する側は無変更で、戻り値の形だけ増やしている**。エラーは1件ずつでなくまとめて返す（1件ずつだと直して送るたびに次が出る）。
  - **⚠️`/sponsor`（案内ページ）側で1件だけ直した**＝2つの入口ボタンのラベルが 375px で枠からはみ出していた（ユーザーがスクリーンショットで指摘）。原因は **`btn()` の土台に `whitespace-nowrap` があるので長いラベルが折り返せない**こと。「Food Japan Summit 2026 協賛を申し込む」→**「協賛を申し込む」**に短縮した（ユーザー判断。ページ見出しでサミット名は既に出ている）。`SUMMIT_TITLE` の import はこれで未使用になったので外した。**ボタンのラベルを伸ばすときは 375px で幅を確認すること**。
  - **⚠️残っている手書きの金額**＝`/sponsor/page.tsx:141` が特別割価格（PRESENTER 40万／STRATEGIC 70万／DIAMOND 200万）を**手書き**している。`PLAN_HIGHLIGHTS` の「協賛プランは15万円（税別）から」も文字列。今回の指示範囲外なので触っていないが、**特別割価格を変えたらここも直す必要がある**。
  - **⚠️このフォームはDBに保存しない（受付はメールのみ）**。指示書21・23の「DB保存処理」「管理画面側の申込情報」「管理画面表示」は**対象が存在しない**。壊す対象が無い代わりに、事務局あてが1通も送れなかった場合は成功にせず申込者に直接メールしてもらう案内を出す作り（`actions.ts` の `adminDelivered`）を必ず維持すること。CSRF は Server Actions の仕組みで担保（独自実装なし）。
  - **検証済み**＝`tsc --noEmit`・`next build`・4開催（宮崎/名古屋/両開催/相談）×特別割ON-OFF の価格切り替え・全プラン選択・年間会員ON-OFF・ブースON-OFF・金額合算・ステップ移動時の値の保持・STEP4でのFormData全22項目・必須バリデーションが最初の未入力ステップで止まること・375pxで横スクロールなし・タップ領域44px未満のlabelが0件・プラン1列・下固定バー表示・ステップナビの横スクロール。**実送信も合格（2026-08-18・受付番号 FJS-20260818-YY5P）**＝宮崎＋特別割/PRESENTER 40万/年間会員あり/ブースあり・合計60万で送信し、サーバーアクションが200で返り `adminDelivered` が true（＝事務局あてが届いた）。
- **Phase 12 の続き（2026-08-18・同日中の追加指示。すべて本番反映済み）**:
  - **年間会員の見出しから NAKAMA トップへリンク**（`ANNUAL_MEMBER.href`）。⚠️**必ず別タブ**（`target="_blank"`）＝このフォームは下書き保存を持たないので、同じタブで移動すると入力中の内容が全部消える。⚠️カード全体が `label` なので、リンクに `stopPropagation` を付けないと**押しただけで年間会員にチェックが入る**。
  - **図をモーダルで見せる**（`BOOTH_OPTION.image` と `PRESENTATION_IMAGE`）。ブース＝「ブースイメージを見る」ボタン、登壇＝プランカードの「登壇枠：30分／60分／60分＋セッション主催」自体がボタン（**枠が無いプランは押せない**）。⚠️**モーダル本体は `label` の外（form 直下）に置く**＝中に入れるとモーダル内のクリックでチェックが入る。⚠️トリガーは `preventDefault`＋`stopPropagation`（プランが選ばれない・チェックが入らない）。Esc／背景クリック／閉じるで閉じ、開いている間は `body` のスクロールを止める。**読み込み失敗時は短い一文に差し替える**＝alt の長い説明文がそのまま広がると「壊れている」ようにしか見えないため。
  - **画像＝`public/sponsor/booth-layout.png`（1634×818・801KB）と `presentation-stage.png`（1578×762・821KB）**。どちらも元はRGBAで約1.4MBあったので、**透過を白で埋めてPNG再圧縮**した（モーダルの地は白なので見た目は不変）。`<img>` はモーダルを開いたときだけ生成されるので、ページ表示では読み込まれない。⚠️**チャットに貼られた画像はファイル化できない**ので、ユーザーにデスクトップへ保存してもらって取り込んだ（`~/Desktop/stageimge.png` / `tenjiimase.png`）。
  - **⚠️キャプションで「〜が付きます」と書かない**＝什器は個別調整（`BOOTH_OPTION.note`）なので、含まれるものを断定できない。登壇側も「セッションタイトルに企業名が入ります」までに留め、客席数や進行役の有無を保証として書かない。
  - **押せないカードから枠と背景を外した**（ユーザー指摘「枠をつけるとボタンとして認識してクリックしなきゃと思う」）＝UI規約の「押せる＝影＋緑枠／押せない＝フラット」どおり。共通提供価値の5枚が対象。
  - **`/sponsor` の構成を入れ替えた**＝**プラン早見表（`PLAN_SUMMARY` の表）を削除**し、その位置に共通提供価値のカード5枚を置いた。申込フォーム側からは共通提供価値を**外した**（入力の邪魔になっていた）。ページ下部にあった箇条書きは二重になるので削除。カードは `(event)/sponsor/_components/CommonValueCards.tsx` に切り出して**サーバー／クライアント両方から使える**ようにしてある（フックを使わない）。⚠️**`PLAN_SUMMARY` は表を戻せるように残してあるが、現在どこからも使っていない**。⚠️早見表の下にあった「税別」と特別割価格の注記は残した（表が消えても伝える必要があるため）。
  - **プランカードを募集資料の見せ方に寄せた**（ユーザー指示。**黒背景は採らず白基調のまま構成だけ**）＝上端のアクセントバー／`PLAN 03｜PRESENTER` の英字ラベル／**日本語の通称を大きく**（`PLAN_NICKNAME`＝協賛のみ・シルバー・ゴールド・プレミアム・パートナー）／数字だけ大きい価格（`yenParts`）／`▸` の特典リスト。**通称と番号は画面表示だけで、送信値とメール本文のプラン名は `LIGHT`/`PRESENTER` のまま**。
  - **色分け＝`PLAN_ACCENT`（LIGHT グレー／STANDARD 濃いグレー／PRESENTER 金／STRATEGIC 赤みオレンジ／DIAMOND 深い緑）**。⚠️**Tailwind のクラスを動的に組み立てない**＝`bg-[var(${x})]` はビルド時のスキャンに引っかからずCSSが生成されない。**inline style で `var(--xxx)` を渡す**こと。⚠️資料はDIAMONDに紫を使っているが、NAKAMAの変数に紫が無く `globals.css` を触らない方針のため**深い緑**にした（ユーザー指定）。⚠️**選択中のカードも緑**なので、パートナーだけ選択済みに見えないか実物で確認すること。
  - **⚠️「おすすめ」は開催ごとに違う（ユーザー確定 2026-08-18）**＝`RECOMMENDED_PLAN`（`sponsor.ts`）＝**宮崎のみ・両開催＝ゴールド(PRESENTER)／名古屋のみ＝プレミアム(STRATEGIC)**。宮崎県法人の特別割は宮崎に対する価格違いなので宮崎と同じ。`planBadge(courseCode, planCode)` で出し分ける（**プランコードだけで決めない**＝当初その実装で作って直した）。DIAMOND は常に「最上位プラン」。募集資料は DIAMOND に「※推奨※」と書いてあるが、**画面はこの開催別の指定が正**。
  - **⚠️`btn()` の土台に `whitespace-nowrap` がある**ので、長いラベルは折り返せず枠からはみ出す（375pxで実際に発生）。`/sponsor` の入口ボタンを「Food Japan Summit 2026 協賛を申し込む」→**「協賛を申し込む」**に短縮して解消（`SUMMIT_TITLE` の import も不要になり削除）。**ボタンのラベルを伸ばすときは375pxで幅を確認すること**。

- **見積書の作成（2026-08-18・本番反映済み `41188a0` / `1431a6b`）**: 15万〜250万円の法人決裁で社内に回すためのもの。**申込を送らなくても作れる**。
  - **方式＝会員側の納品書・請求書と同じ**＝HTMLで組んでブラウザの「PDFとして保存」で出す。**PDFライブラリを入れない**（日本語フォントの埋め込みが不要になる）。⚠️**PDFはサーバーに保存しない**（電子帳簿保存法の検索機能・訂正削除防止の要件を負うため。`src/lib/invoice.ts` の既存方針を踏襲）。
  - **置き場所は2か所**＝STEP4の確認画面と、申込内容サマリーの下（プランが決まればどのステップからでも作れる）。⚠️会社名がまだ無いときは**宛名モーダル**で法人名・担当者名・メールを先に聞き、**入力値はそのまま STEP3 の欄にも入る**（二度打ちさせない）。「宛名なしで作成」も残してあり、罫線だけ印刷して手書きできる。
  - **⚠️宛名モーダルの入力欄に `name` を付けないこと**。付けると同じ name の欄がフォーム内に2つでき、**FormData に値が二重で載って送信内容が壊れる**。値は STEP3 の欄と同じ state を書き換えている。
  - **⚠️税抜・消費税10%・税込を並べて出す**（フォームの表示は税別なので、見積書に税込だけ出すと食い違って見える）。`invoice.ts` の `taxBreakdown()` は**税込から割り戻す**関数で向きが逆なので使えない＝`quoteTotals()` を別に用意した。有効期限は発行日から30日。年間会員は「相談」で金額が確定しないので明細に入れず備考で触れる（ブースは定価が決まっているので加算する）。
  - **⚠️適格請求書発行事業者の登録番号は載せていない**（番号を把握していないため。見積書に必須ではないが、載せるなら実際の番号を確認してから）。
- **申込フォームの締め切り（2026-08-18・本番反映済み `7a306c7` / `083c1d3`）**: 〜11/17 全開催 → **11/18〜 名古屋と相談のみ** → **12/16〜 募集終了**（ページごと「協賛の募集が終了しました。」に切り替え、押せるものを残さない）。
  - **⚠️両開催も宮崎と同時に締め切る**＝宮崎を含むプランなので、宮崎が終わったあとに両開催だけ売れない。
  - **⚠️判定は必ずJST**（`todayJst()`）。サーバーはUTCで動くので素の `getDate()` だと9時間ずれる。
  - **⚠️`/sponsor/apply` を静的生成から外した**（`export const dynamic = "force-dynamic"`）。日付で出し分けるので、静的だとビルド時点の状態で固まる。画面側はマウント後にブラウザの時計でも判定するが、**本当の関所は `actions.ts`**（古いタブ・時計の巻き戻しを弾く）。
  - **⚠️フォームだけ隠さない**＝リード文の「お選びいただけます」と相談リンクが残って矛盾するので、ページ側で丸ごと切り替えている。
- **`/sponsor` を協賛ティザーページに差し替え（2026-08-18・本番反映済み `c3f9e5c` 〜 `5af13ed`）**: 納品された `sponsor-top.html` ＋実装指示書をそのまま実装した黒基調1ページ。申込フォーム（白基調）とは意図的に別の顔。
  - **⚠️CSSはページ専用のCSSモジュール**（`sponsor-teaser.module.css`）。納品HTMLの `body{background:#000}` と `:root{--b:…}` をそのまま入れると**サイト全体の背景が黒くなり変数名も漏れる**ので、色変数はページの入れ物に載せ替えている。
  - **アセットは実際に参照されている4点だけ**配置し、**7.7MB→492KB**に圧縮（`public/sponsor/teaser/`）。ヒーローとTechGALAロゴは写真なのでJPEGへ（ヒーロー2MB→186KB）。ヒーローは遅延読み込みしない（指示書）。
  - **ユーザー指定で納品HTMLから変えたところ**＝キャッチコピー「協賛で／商談へつなげる。／共創をつくる。」／`02 TASTE` の見出し「試食・試飲・資料で、／反応を得る。」／`01 SPEAK` の見出し「ブランドを伝える。／次の相手を見つける。」／WHAT HAPPENS の見出し「協賛するメリット」／英語ティッカー（TRY IT…）を削除／CTAを「協賛に申し込む」に／ボタンを大きく（54→68px・14→17px）／フッターは「フードジャパンサミット実行委員会」のみ／途中に協賛の詳細セクションとCTAを追加（CTAはヒーロー下・途中・一番下の3か所）。
  - **⚠️h1 を大きくしすぎない**＝`clamp(2.2rem,5.2vw,5rem)`。これより大きいと「商談へつなげ／る。」と行の途中で折れる（実際に起きた）。コピーを変えたら1280pxと375pxの両方で確認すること。
  - **⚠️「協賛プランは15万円から」に（税別）を足している**（納品HTMLには無いが、金額を出す以上は消せない）。金額は `MIN_PLAN_PRICE` から導出。
  - **⚠️残っている食い違い**＝CTAの助詞が「協賛**に**申し込む」（ヒーロー下・一番下）と「協賛**を**申し込む」（途中）で割れている。未統一。（名古屋の会場表記のゆれは 2026-08-18 の開催概要差し替えで「名鉄グランドホテル（予定）」に統一されて解消）
  - `CommonValueCards.tsx` は差し替えでどこからも使われなくなったが、戻せるように残してある。
- **`/sponsor` の追い込み（2026-08-18・本番反映済み `d7cc304` 〜 `59c9c9b`）**:
  - **「協賛するメリット」01〜04に写真を追加**＝`.happen article` を**4列（番号／見出し／本文／画像）**にした（760px以下は画像を段の全幅）。**4枚とも 1200×675（16:9）に揃えてある**＝比率が違う画像を混ぜると段ごとに高さが変わって崩れる。NAKAMAバナー（1200×630）は左右を各40px削って16:9にした（ロゴとURLは残る。これ以上削らないこと）。
  - **04 の「FOOD JAPAN NAKAMA」は別タブリンク**（`NAKAMA_URL` を `sponsor.ts` に集約。年間会員カードと共用）。
  - **開催概要をフッター直前へ移動し、資料の詳細版に差し替え**（`EVENT_OUTLINE`）＝開催日時・来場者ターゲット・来場数目標・会場・プログラムを2カラムで。**申込判断の流れを止めないため位置は末尾**（ユーザー指示。上へ戻さないこと）。⚠️来場数目標はヒーロー下のFIGURES帯にも出ているので、片方だけ直すとページ内で矛盾する。
  - **セクションの上下余白を納品HTMLから約3割詰めた**（ユーザー指摘「空白が多い」）＝ページ全長 6,498px→5,953px。⚠️`.after` と `.final` のように余白が連続する境目は**2つ分が足し算**になるので、片方だけ広げると一気に間延びする。
  - **本文の一部を太字にできるようにした**＝`HAPPENS` の `body` を「文字列 ＋ `{ b: 太字 }`」のパーツ配列に変更（`Happen` 型）。
  - **⚠️`.final h2` はモバイルで小さくしている**（`clamp(1.5rem,7.2vw,2.4rem)`）。既定のままだと「次の地方創生をつくろう。」が375pxで**「地方／創生」と単語の途中で割れる**。文言を長くしたら375pxで必ず確認すること。
- **`/sponsor/apply` の追加項目（2026-08-18・本番反映済み `03221af` / `e4db6b8` / `93c56ce`）**:
  - **「ご紹介者」欄（任意）をウェブサイトの次に追加**。フォーム→`actions.ts`→事務局宛メールまで通してある。**申込者への控えには出さない**（控えは受付番号・開催・プラン・オプションだけで、他の会社情報も載せていないため）。
  - **共創テーマに7件追加**（マーケティング／ファンづくり／地方創生／関係人口の増加／サスティナブル／食料問題／食×芸術）。⚠️**「その他」は必ず末尾**。⚠️区切りは既存に合わせた全角 `×`（U+00D7）＝指示原文は `✕`（U+2715）だがリスト内で字形が揃わないため統一した。
  - **希望する協賛特典の先頭に「企業ロゴ・ブランドロゴの掲載」**を追加。
  - **見出しの変更**＝「お申し込み者の情報」→**「協賛お申込みフォーム」**／「貴社は、Food Japan Summitで何を実現したいですか？」→**「Food Japan Summitで何を実現したいですか？」**。
  - **ロゴデータをフォームから直接提出できるようにした**＝提出方法に「こちらから提出する（Illustratorデータ／PDF）」を追加し、**選んだときだけ**添付欄を出す（未描画にしているので、選んでいない人のファイルが送信に混ざらない）。**上限20MB**・`.ai`/`.pdf`/`.eps`。⚠️**既定は従来どおりメール提出**（`LOGO_SUBMISSION_DEFAULT`）＝先頭の添付を初期選択にすると、ロゴをまだ用意していない人が進めなくなる。
  - **⚠️ファイルは Server Action を通さない**（Vercelの4.5MB制限。上の「実装上の注意」参照）。`logo-upload.ts` が署名付きアップロードURLだけを発行し、ブラウザが Storage へ直接送る。フォームが送るのは**保存先パスと表示名だけ**。事務局宛メールには**30日間有効のダウンロードリンク**が載る（メール添付ではない）。
  - 実機確認済み＝6MBのアップロード成功／署名付きURLで6,291,456バイト取得／署名なしURLは400で遮断／`../message-attachments/…` などのパスは `isLogoPath()` が拒否。
- **⚠️`<label>` の中に `<button>` を入れないこと（2026-08-18 に実際に踏んだ）**: `label` の対象になるのは中で最初に見つかる「ラベル付け可能な要素」で、**`button` もそこに含まれる**。ブース出展カードで「ブースイメージを見る」ボタンがチェックボックスより前にあったため、**カードのどこを押してもモーダルが開き、チェックが一切入らなかった**。`div` ＋ `onClick` で切り替え、ボタン側で `stopPropagation` する形に直した。`<a>` はラベル付け可能でないので年間会員カードは無事だった。
- **CASE 01 を白キクラゲに差し替えて公開（2026-08-18・本番反映済み `647612a`）**: 採用先を「塚田農場」から**「裏の山の木の子」（塚田農場のグループ企業が展開）**へ。生産者（きくらげ堂みやざき・恩田敦司さん）と食材（白きくらげ「きくらげ姫」）は**旧版のまま実名**（ユーザー確認）。用途は「冬の鍋メニュー」→「冬メニュー」に緩めた（新素材が鍋と断定していないため）。掲載承諾は取得済み。
  - slug と画像ファイル名から `tsukada` を外した（`miyazaki-shirokikurage` / `case-shirokikurage.png`）。採用先が変わって実態と合わないため。
  - **⚠️出典のUMK記事は採用先を「塚田農場」として報じている**。本文でグループ企業である旨を明記して整合させているが、読み比べると表記が違うことは伝わる。
  - **⚠️素材を差し替えたら `imageWidth`/`imageHeight` も必ず直す**。仮の値（1512×1024）のまま本番に出て、**next/image が誤った比率で枠を取り画像が横に押し潰された**（文字が読めない状態）。実寸 1114×716 に直して解消。
- **注目記事に「FoodJapanSummit共創」タグ＋編集モーダル（2026-08-18・本番反映済み `eb03109` / `6f11d3a`）**:
  - `CuratedArticle.fromSummit` を追加（migration `curated_article_from_summit`）。公開トップの記事カードに出典バッジと並べて金色のタグを出す。トップのセクション説明文も差し替え。
  - **⚠️schema の一括置換で `banners` にも同じ列が入りかけた**（`sortOrder` と `active` の2行が Banner と CuratedArticle で完全に同一のため、置換が両方に効いた）。**`--create-only` で生成SQLを目視して気づいた**。本番DB1本で動いているので、**migration は必ず `--create-only` → SQL確認 → `migrate deploy`** の順で当てること（`migrate dev` はリセットの危険がある）。
  - **記事の編集モーダルを追加**＝これまで追加・表示切替・削除しかできず、誤字を直すにも削除して登録し直すしかなかった（掲載順・掲載期間もやり直しになる）。行のボタンは「編集」「削除」の2つに整理し、表示・非表示と共創タグはモーダルの中へ。入力欄は `ArticleFields.tsx` に切り出して追加フォームと共通化（欄がずれると「追加では入れられるのに編集で消える」事故になる）。
  - **⚠️編集では空欄をURLから自動取得しない**（追加時とは逆）。編集で空にするのは「消したい」意図なので、埋め戻すと概要やサムネイルを消せなくなる。
  - **⚠️`<input type="date">` に渡す日付はJSTで作る**（`toDateInput()`）。素の `toISOString()` だとサーバーがUTCで動くぶん1日ずれ、**保存し直すたびに掲載開始日が1日ずつ早まっていく**。
  - **⚠️エラー時は入力値を返してフォームを作り直す**。React 19 はサーバーアクション完了時に form をリセットするので、返さないと**入力中の内容が消える**（`c08dcb7` と同じ罠）。
- **⚠️管理画面・会員側の部品は `/preview` に一時ページを作って確認する**（2026-08-18 も使用）。開発ブラウザからはログインできない。**確認後にページを消したら `.next/dev/types` と `.next/types` の旧パスの型も消すこと**（残ると `tsc` が落ちる）。

## やることリスト（対外募集開始前）
0000. **【追加】残っている宿題（2026-08-17 更新）**:
   ①**8/26施行の開封課金を会員へ周知**（お知らせ＋案内メール。下記000の①）。**文案は `docs/member-notice-20260817.md` に作成済み・未送信**。8月25日までに送ること（施行日当日では予告にならない）。
   ②**事業者情報の入力を促す案内メール**（**承認済みだが記入率0%の3社**＝toshi.taniguchi@nifty.com／hiro0731@gmail.com／tongatuned31@gmail.com。2026-08-17 実測。**うち2名は案内メール未同意なので種別は必ず「利用案内」**）。⚠️**旧記録「DRAFT の4名」「umetaku1 はビジネス会員なのに未入力」は誤り**＝`umetaku1@gmail.com` は株式会社青島クラフトで、記入率59%・ビジネス会員になっており**対象外**。**文案は同じく `docs/member-notice-20260817.md` の②**。`docs/idle-member-followup-20260815.md` の1通目と目的が重なるので**どちらか一方だけ送る**。**送信はユーザー**。⚠️2通は**別々に送る**（料金の変更通知とお願いを混ぜない）。⚠️どちらも**種別「利用案内」で送る**＝未同意者にも届く。ビジネス会員やオプションの勧誘を混ぜた瞬間に広告になり、未同意者へ送れなくなる。
   ③**弁護士への事後確認に3件追加**＝7回目（開封課金）・8回目（第17条の2＝AI下書き）・**9回目（第27条の2＝案内メールの同意を規約同意で取得する方式への変更）**。論点＝**規約同意への同梱で特定電子メール法のオプトインとして足りるか**（同意した事実が容易に認識できる表示になっているか）、**未同意の登録者へ利用案内メール（広告なし）を送ってよいか**、既存会員の同意状態を変更しない扱いでよいか。
   ④**電気通信事業の届出＝完了**（2026-08-17。事前相談・届出とも提出済み。残るのは受理番号の控えと運用規程＝下記2）。
   ⑤UIの続き＝**公開トップは 2026-08-17 に置き換え済み**（上記「トップの置き換えと実績ページ」）。残りは /about・/pricing・/flow・/faq の書式統一 → 指示書Phase 1（ログイン後ホーム「みんなの案件」化・検索タブ・0件画面・3ステップ掲載フォーム）。**着手前に範囲の確認が必要**。
   ⑥**塚田農場の事例の掲載承諾をもらう**（きくらげ堂みやざき・恩田敦司さん／APホールディングス「塚田農場」）。承諾が取れたら `src/lib/cases.ts` の `published` を true に戻し、`public/llms.txt` に1行戻す。記事本文・画像・出典は作成済みなので書き直し不要。
   ⑦**目的別入口カードの写真3枚**（売りたい／探している／共創したい）。現在は線画アイコンで代替中。
   ⑧**⚠️プライバシーポリシーの改定履歴に漏れがあったので追記した（2026-08-17）**＝2026-08-12（commit `e3f4860`）に「会員間のメッセージ（添付を含む）を最後のやり取りから1年で削除する」旨を第10項に足したのに、**改定履歴に対応する行が無かった**（本文だけ変わって履歴が据え置き）。利用者のデータが消える材料的な変更なので、いつ効力が生じたかを履歴で示せる状態に戻した。**教訓＝`legal.ts` の本文を触ったら、必ず同じコミットで改定履歴にも1行足す**（規約・プライバシーとも履歴は文字列の末尾にある）。利用規約側は11件すべて記載済みで漏れなし、特商法も実装と同期していることを確認済み。
000. **【追加】2026-08-12 開封課金（リードの初回開封に1クレジット）の周知**:
   ①**施行日 2026年8月26日までに会員へ周知する**（/admin のお知らせ＋案内メール同意者へのメール。無料範囲を狭める不利益変更のため、規約は「改定8/12・施行8/26」で先に反映済み）。
   ②弁護士への事後確認（下記1）に**7回目の改定として本件を追加**（あわせて**8回目＝第17条の2のAI下書き支援**も）（論点＝不利益変更の周知期間と方法・前払式の紹介クレジットの資金決済法該当性との関係）。
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
1. **【最重要】弁護士へ照会依頼書を送付**（**作成済み・未送付**）: **`docs/FOOD_JAPAN_NAKAMA_弁護士照会依頼書_20260817.docx`（2026-08-17 作成。これ1通を送る）**。⚠️**旧2通（`…弁護士確認用_20260810.docx` と `…追補_20260811_50クレジット版.docx`）は送らない**＝差分を積み重ねる形式で現状が追えなくなったため、**現行の姿を一本にまとめ直した新規書面**に置き換えた（ユーザー指示 2026-08-17「一度まとめてこれを見てくれの方がいい」「新規で見ていただく形で」）。旧2通と `…追補_修正版_20260811.docx`（ユーザー手入れ版）は**経緯として残す**。
   - 構成＝1.依頼の趣旨／2.サービス概要／3.現行の課金モデル（無料範囲・紹介料・クレジット価格と期限・ビジネス会員・掲載オプション・個別契約）／4.改定の経緯（規約10回＋プライバシー4回の表）／5.事実関係（本番DB実測）／6.論点14件／7.参照先。
   - **論点14件**＝(1)紹介クレジットの資金決済法該当性【最重要】(2)月次付与の繰越なし・失効の有効性 (3)180日失効と未読返還（元ロット失効時は返還しない）(4)短期間に10回改定した約款変更手続 (5)撤回した規定（引き合い課金）の履歴の書き方 (6)開封課金＝不利益変更の周知期間と方法 (7)第17条の2＝AI下書き (8)第27条の2＝案内メールの同意 (9)NDA雛形（未確認のまま稼働中）(10)保存期間1年削除 (11)取引条件の提示・合意＝当事者にならない整理 (12)帳票＝作成支援ツールの位置づけ・媒介者交付特例不使用 (13)電気通信事業の届出後の運用（受理番号の表示要否）(14)表示（先行紹介の表示・無償3クレジットの景品類該当性・広告表記・実績ページの他社商標）。
   - **事実関係（2026-08-17 本番DB実測＋ユーザー確認）**＝会員5社（全社承認済み・DRAFTは0）／うちビジネス会員2社（当社＋外部1社。**いずれも100%割引クーポン適用で請求額0円**＝ユーザー確認済み）／掲載中の案件0・下書き含めて0／共創PJ0／スレッド0・メッセージ0／注文0（決済実績なし）／解放記録0・開封記録0・掲載オプション0／付与済みクレジット109（無償3×3社＝9、月次50×2社＝100・期限2026-09-16）。**当社が会員から金銭を受領した実績は0円**。書面にはこの点と、「過去の販売実績にかかわらず今後の設計についてご判断を」という依頼を明記した。**⚠️CLAUDE.md の旧記録（DRAFT4名・PAIDは自社1社のみ）は古い**ので、次に事実を書くときは必ず実測し直すこと。
   - 生成スクリプト＝scratchpad の `build-legal-doc.js`（docx npm）。**`docx` はこの環境に未インストールなので scratchpad に入れて実行した（プロジェクトには入れていない）。LibreOffice・pandoc も無いのでPDF目視はできず、docxを解析して見出し・表・数値・論点番号の抜けを検証した**。
2. **電気通信事業の届出＝完了（2026-08-17 ユーザー報告）**: 事前相談を実施し、**届出は提出済み**。会員間1対1メッセージが「他人の通信の媒介」に当たるという整理のもと、電気通信事業者として届け出た（相談時の想定問答＝`docs/telecom-notification-inquiry.md`）。**この項目はもう待たなくてよい＝対外募集の開始をここで止める必要はない**。
   **残る運用側の宿題**：①届出の**受理・届出番号を控える**（規約・特商法・会社情報に表示するかを判断するため。表示が要るかは弁護士確認に含める）②**通信の秘密の運用規程**を整える（下記4。届け出た以上、非公開メッセージを閲覧しうる場面の権限・記録手順は文書化しておく）③届け出た事業の範囲（メッセージ機能）を大きく変える場合は**変更届**が要るか確認する。
3. **9/9以降: 自社会員を手動でビジネス会員に戻す**: テストサブスクは期間終了時キャンセル予約済み→2026-09-09の満了時にWebhookで自社会員（グラブデザイン）が「未決済」に落ちる。/admin/members→「入金確認済み→Premium会員（課金中）にする」で戻す（課金は発生しない）。
4. 運用規程の整備（Claude が雛形作成可）: データ保存期間表／本人確認書類の取扱規程／非公開メッセージ閲覧時の権限・記録手順（届出する場合は特に必要）。
5. 弁護士回答の残論点があれば `src/lib/legal.ts`（規約/プライバシー）・`/tokushoho` に反映（実装との矛盾チェック必須）。
6. メルマガ・イベント案内を始める際: 特定電子メール法対応（事前同意・同意記録は実装済み=users.marketing_opt_in_at。**配信停止手段（メール内リンク等）の整備が配信開始前に必要**）。条件一致通知・相手へ届けるセットは同意者が貯まったら有効化。
7. 残る旧状態の掃除: **2026-08-11に本番DBを実測したところ、umetaku1会員は「お支払い待ち（旧）」ではなく `status=DRAFT`（プロフィール未入力・記入率0%）かつ `paymentStatus=PAID`（ビジネス会員）だった**。ほかに hiro0731@gmail.com / toshi.taniguchi@nifty.com / tongatuned31@gmail.com も DRAFT のまま（いずれも会員管理の修正で表示されるようになった）。/admin/members で会社名を開き、承認する（承認時に3件クレジット付与）か、課金を解除するかを判断する。
8. ~~Stripe本番Liveの100%OFFクーポン`FJS2026TEST`を無効化/削除~~ **→ 2026-08-11 ユーザー対応済み**。残り: Supabase の Logs で外部IPからの `/rest/v1/` アクセス有無を確認（RLS穴の悪用有無の確認）。
9. ~~**⚠️割引つきサブスクは自動でPremiumにならない仕様になった**~~ → **2026-08-11 夜に解消**（値引き前の金額で判定し、すでに会員なら割引つき請求でも月次クレジットを付与。昇格だけは定価どおりの支払いに限定）。旧記述は以下（経緯として残す）: `invoice.paid` は「定期課金かつ税込22,000円ちょうど」の請求書だけをPremiumとして扱う。クーポンや割引での申込みは自動反映されないため、キャンペーンをやる場合は①/admin/membersの手動Premium化で運用するか、②Stripeに正式なPrice（現在は都度 price_data 生成）を作り、金額ではなくprice IDで判定するようWebhookを改修する。既存の自社¥0契約は9/9満了→手動戻し（項目3）の流れで整合している。

## 将来の検討（今は実装しない）
- **協賛ロゴ（`sponsor-logos`）の削除運用**（2026-08-18）: アップロードされたファイルは**自動削除されない**ので、申込のたびに溜まる。イベント後に不要になったら消す運用が要る。定期削除を作るなら、事務局がロゴを受け取り終えたかどうかを判断できないと消せないので、**保存期間を決める（例＝イベント終了から6か月）**ところから。⚠️申込内容はDBに残らずメールだけなので、**ファイルを消すと紐づけが完全に失われる**（消す前に必要なものを退避すること）。
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
