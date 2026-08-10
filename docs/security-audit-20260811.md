# セキュリティ検査 Phase 6（2026-08-11）

前回検査（`docs/security-audit-20260809.md`）以降に追加された **課金システム Phase 1・引き合い課金・Premium・掲載オプション・cron・公開範囲設定** を主対象に再検査した。
あわせて Supabase（DB/ストレージ）側の防御、依存パッケージ、前回の未対応6項目の現状も確認した。

検査方法: 全 Server Action（20ファイル・86関数）の認可総点検、課金経路のコード検査、
本番Supabaseへの実接続による権限・RLSの実測、本番URLへの実リクエストによる挙動確認。

---

## 0. 最重要 — 本番DBが匿名キーで全読み書きできる状態だった（**修正済み**）

**深刻度: 最高（Critical）／状態: 2026-08-11 に修正・検証済み**

### 何が起きていたか

Supabase の `public` スキーマの**全31テーブル**で

- Row Level Security（RLS）が **無効**
- `anon`（匿名）・`authenticated` ロールに **SELECT/INSERT/UPDATE/DELETE/TRUNCATE の全権限**が付与

という状態だった。`anon` キーは `NEXT_PUBLIC_SUPABASE_ANON_KEY` としてブラウザの JavaScript に埋め込まれ、
サイトを開いた誰もが取得できる。Supabase の PostgREST（`https://<ref>.supabase.co/rest/v1/<table>`）は
このキーで認証されるため、**アプリの認可（Server Action の所有権チェック等）を一切通らずに DB を直接操作できた**。

これは Prisma で作ったテーブルに Supabase の既定権限（`ALTER DEFAULT PRIVILEGES ... GRANT ALL TO anon, authenticated`）が
自動適用されたことによるもので、アプリのコードの問題ではない。そのため従来のコード検査では検出されなかった。

### 実際に確認した事実（検査時の実測）

| 操作 | 結果 |
|---|---|
| `GET /rest/v1/users?select=id,email` | **200**：全ユーザーのメールアドレスを取得 |
| `GET /rest/v1/members?select=*` | **200**：会員の全カラム（説明・所在地・連絡先等）を取得 |
| `PATCH /rest/v1/users`（存在しないID指定） | **200**：UPDATE 権限あり（0行更新で無害に確認） |
| `POST /rest/v1/audit_logs` | **400（NOT NULL違反）**＝権限チェックは通過。INSERT 権限あり |

想定される被害: 全会員・全ユーザーの個人情報の一括ダウンロード、メッセージ本文の閲覧、
`members.payment_status` を自分で `PAID` に書き換えて Premium 特典を無償取得、
`contact_credit_ledger` に紹介クレジットを自己付与、`billing_orders` の改ざん、
**`audit_logs` の削除による証跡消去**、全テーブルの `TRUNCATE`（全データ消去）。

> 幸い、実行時点で `messages` / `threads` / `consultations` は0件（テストデータ削除済み）だった。
> 漏えいの実害有無は Supabase のログ（Dashboard → Logs → PostgREST/`request` ログ）で
> 外部IPからの `/rest/v1/` アクセス有無を確認するのが確実。

### 実施した修正

```sql
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
-- 今後 Prisma が作るテーブルに再付与されないよう既定権限も是正
alter default privileges for role postgres in schema public
  revoke all on tables, sequences, functions from anon, authenticated;
-- 多層防御：全テーブルで RLS を有効化（ポリシー無し＝既定拒否）
alter table public."<各テーブル>" enable row level security;
```

### 修正後の検証（すべて実測）

- `GET /rest/v1/users` → **401 `permission denied for table users`**（members・audit_logs も同様）
- 新規テーブルを作って権限を確認 → **anon/authenticated への付与なし**（既定権限の是正が有効）
- 本番アプリ `/api/health` → **200 `{"ok":true}`**、トップ・ログインページとも 200

アプリは Prisma が `postgres` ロールで直接接続しており（`src/lib/db.ts`）、
コード中に PostgREST 経由のテーブルアクセス（`supabase.from(...)`）は**1箇所も無い**ことを確認済み。
そのため権限剥奪による機能影響は無い。テーブル所有者（postgres）は RLS の影響を受けない。

### 今後の運用ルール（重要）

- **新しいテーブルを追加したら RLS を有効化する**（権限は既定で付かないが、多層防御のため）
- Supabase Dashboard の Advisors（Security Lint）に「RLS disabled in public」警告が出ていないか定期確認
- `anon` キーは「公開情報」として扱う。秘匿すべき値ではない前提で設計する

---

## 1. 高（対外募集開始前に対応すべき）

### 高-1. `/ledger/[id]/propose` が公開範囲（visibility）を検査していない

`src/app/(app)/ledger/[id]/propose/page.tsx:31-41` / `propose/actions.ts:20-34`

詳細ページ（`ledger/[id]/page.tsx:67`）は `private`（非公開募集）を所有者・事務局以外に `notFound()` にしているが、
**同じIDで `/propose` を開くとタイトル・掲載者名・期限が表示され、提案送信まで通る**。
`applicant_only`（応募者限定公開・11,000円）で伏せているはずの社名も、propose ページでは無条件に表示される。
有料オプションの商品価値がURL1つで無効化される。

修正: 両方の `findFirst` に `visibility: "public"`（または `{ not: "private" }` ＋ applicant_only 時の社名マスク）を追加。

### 高-2. メッセージ添付が公開バケットの恒久URL

`src/app/(app)/messages/actions.ts:35-37, 327`（`getPublicUrl`）／リポジトリ全体で `createSignedUrl` は0件

見積書・仕様書などの添付が `member-images`（公開バケット）に置かれ、URLを知れば**認証なしで誰でも取得できる**。
退会・会員削除後もファイル実体は残る（`deleteMember` は Storage を削除しない）。規約17条（通信の秘密）と乖離。
前回検査からの積み残しだが、引き合い課金でメッセージが有料コンテンツになったため重要度が上がった。

修正: 添付を private バケットへ移し、参加者検証＋引き合い課金ゲートを通した短命の署名付きURLで配信。既存URLは移行が必要。

### 高-3. 認証系（ログイン・パスワード再設定）にレート制限が無い

`src/app/(auth)/actions.ts:17-32, 91-117`

- `signIn` はサーバー側で `signInWithPassword` を呼ぶため、Supabase から見た送信元は常に Vercel のIP。
  アプリ側にも回数制限が無く、**特定アカウントへの総当たりが事実上無制限**。
- `requestPasswordReset` は無認証で、service_role の `generateLink` ＋自前 Resend 送信のため
  Supabase 標準のメール制限を経由しない。**登録済みアドレスへ無制限にリセットメールを送れる**
  （メール爆撃・Resend 配信枠の枯渇・送信ドメイン評判の毀損）。

相談フォームには実装済みのレート制限（`consultation/actions.ts:39,84-92`）が、より重要な認証系には無い。

修正: 同方式（DBベース）で「同一メール 5回/時」「同一IP 20回/時」を適用。Supabase 側の Auth Rate Limits も確認。

### 高-4. Stripe の決済額を検証せずに会員を Premium 昇格させている

`src/app/api/stripe/webhook/route.ts:75-79, 165-184`

`invoice.paid` は「その顧客の支払い済み請求書」であれば金額・商品を問わず `markPaid` を呼ぶ。
`session.amount_total` / `invoice.amount_paid` / `BillingOrder.totalAmount` との突合はコード上どこにも無い。

**実際に成立する経路**: `/billing` の申し込みは `allow_promotion_codes: true`（`billing/actions.ts:73`）で
決済画面にクーポン入力欄が出る。プロジェクトの記録によれば **100%OFFのプロモコード `FJS2026TEST` が本番（Live）に実在**する。
このコードを知った利用者は誰でも **¥0で Premium 会員**になれる（引き合い課金の解除・提案無制限・オプション20%割引）。

修正（順に効果が大きい）:
1. **Stripe ダッシュボードで `FJS2026TEST` を無効化/削除**（本番Live・ユーザー作業）
2. 招待制の割引が不要なら `allow_promotion_codes` を false にする
3. `checkout.session.completed` で `session.id` / `amount_total` / `currency` を注文と突合、
   `invoice.paid` は自社プランの価格であることを確認してから昇格

### 高-5. 決済イベントで審査を飛ばして `APPROVED` になる

`src/app/api/stripe/webhook/route.ts:174-181`

`markPaid` は `SUSPENDED`/`REJECTED` 以外なら `status: "APPROVED"` を無条件に付与する。
`DRAFT`（登録直後・プロフィール未入力）でも決済1回で承認済みになり、メッセージ送信・掲載・検索表示の権限を得る。
高-4 と連鎖すると「クーポンで¥0決済 → 事務局審査を通さず承認済み会員」が成立する。

修正: `AWAITING_PAYMENT`（＝承認済み・課金待ち）からの昇格のみ許可し、`DRAFT`/`PENDING` は `paymentStatus` のみ更新。

---

## 2. 中（設計・運用の穴。公開規模が大きくなる前に）

### 中-1. 引き合い課金は「返信しなければ何通でも無料で読める」

`src/lib/inquiry-gate.ts:53-62` / `messages/[id]/page.tsx:103`

マスク基準が `freeUntil = 自分の初回返信の時刻` で、**一度も返信しなければ `null` → マスクは永久に発生しない**。
売り手はアプリ内で返信せず、無料の1通目に自分の連絡先を書いて場外へ誘導すれば課金は一切発生しない。
仕様「2往復目の相手メッセージ以降はモザイク」とも一致していない（返信前なら相手の5通目まで平文）。

修正: `freeUntil` を「相手からの最初の1通」基準に変える（相手メッセージを時系列で1件だけ無料にする）。

### 中-2. スレッドが会員ペア単位のため、先にスレッドを作れば課金が永久に無効化される

`messages/actions.ts:76-83, 151-158`（`thread.findFirst` に `offeringId` 条件が無い）／`inquiry-gate.ts:45,48`

スレッドは `(fromMemberId, toMemberId)` のペアで1本しか作られず、ゲート判定は**スレッド生成時**の
`offeringId` と「誰が始めたか」だけを見る。したがって:

- `/producers/<相手>` の「問い合わせする」（`startConversation`）で**空のスレッド**を先に作っておくと、
  以後その相手から自分の「売りたて」案件に問い合わせが来ても `offeringId=null` のままで**制限されない**
- 同じ理由で紹介料も回避できる。売り手が「探している」の掲載者を `/producers` から直接叩けば、
  `ContactUnlock` を買わずに提案本文を届けられる（`startConversation`・`sendInterest` はクレジットを見ない）

修正: `Thread` を `(fromMemberId, toMemberId, offeringId)` で分離し、ゲート判定を**メッセージ単位の文脈**で行う。
メッセージ作成をゲート込みの単一関数に集約し、`sendInterest`/`sendProposal` もそこを通す。

### 中-3. ロック中でも `sendInterest` / `sendProposal` から書き込める

`messages/actions.ts:101-103` / `propose/actions.ts:124-126`

ゲートを見ているのは `sendMessage` だけ。同じスレッドへ書き込む他2経路には判定が無いため、
返信がロックされた売り手が別の案件ページの問い合わせフォームから返信を届けられる。

### 中-4. クレジットの並行消費（二重使用）

`src/lib/contact-credits.ts:114-148`

`$transaction` に分離レベル指定が無く（READ COMMITTED）、ロット行に `FOR UPDATE` もかけていない。
残高1件の会員が**異なる2つの案件**へ同時に提案すると、1件分の支払いで2件解放できる。
冪等キーは unlock ごと（`consume:${contactUnlockId}`）、`ContactUnlock` の unique も案件が違えば効かない。
さらに `lotRemaining` が `Math.max(0, ...)` で負をクリップするため、**発生した赤字が残高表示に出ない**。

修正: `isolationLevel: "Serializable"`（＋リトライ）か `pg_advisory_xact_lock(会員×種別)` で直列化。クリップも撤去。

### 中-5. 返金・チャージバックで付与済みの効果が取り消されない

`src/app/api/stripe/webhook/route.ts:63-73`

`charge.refunded` は `billingOrder.status` を `refunded` にするだけで、
`ContactCreditLedger` のクレジットも `ListingPromotion`（注目表示・最上部PR）も無効化されない。
返金後もクレジットは使え、掲載も出続ける。部分返金でも全額返金として扱う（`amount_refunded` を見ていない）。
`charge.dispute.created`（チャージバック）は未処理。

### 中-6. オープンリダイレクト（バックスラッシュ）

`src/app/(auth)/actions.ts:11-15` / `auth/callback/route.ts:11-14` / `auth/confirm/route.ts:13-16`

判定が `startsWith("/") && !startsWith("//")` のため `/\evil.com` が通過する。実測（Node の URL 解決）:

```
"/\evil.com"  → 判定通過 → https://evil.com/
"//evil.com"  → 判定で拒否
```

`/login?next=/%5Cevil.com` を踏ませると、正規ドメインでログインした直後に外部サイトへ飛ぶ（フィッシング）。
Googleログイン・パスワード再設定も同じ判定を使う。

修正: 3ファイル共通のヘルパーにし、バックスラッシュ・制御文字を弾いたうえで
`new URL(n, origin).origin === origin` を確認する。

### 中-7. 非承認（REJECTED）・未審査の会員がメッセージを送信できる

`src/lib/auth.ts:84-86`（遮断は `User.status === "SUSPENDED"` のみ）／`messages/actions.ts:66-71, 144-149`

送信系アクションは**相手**が APPROVED かは検証するが、**送信者自身**の会員状態を見ていない。
審査で非承認にした事業者がログインしたまま、承認済み会員へメッセージ・興味表明・応募を送り続けられる。

修正: `requireApprovedMember()` を新設し、送信系（sendInterest/startConversation/sendMessage/sendProposal/applyToProject）で要求。

### 中-8. セキュリティヘッダが1つも設定されていない

`next.config.ts`（`headers()` が無い）／本番の実測でも `strict-transport-security` のみ（Vercel 由来）

CSP・X-Frame-Options・X-Content-Type-Options・Referrer-Policy・Permissions-Policy がすべて未設定。
`/admin` や `/billing` を iframe 化したクリックジャッキング、Referer 経由のURL漏れ、
公開バケット添付の MIME スニッフィングが成立しうる。

修正: `next.config.ts` に `headers()` を追加（まず `frame-ancestors 'none'`・`nosniff`・`Referrer-Policy` から。CSP は Report-Only で開始）。

### 中-9. REVIEWER が価格・一斉送信に影響する操作を実行できる

`src/app/(app)/admin/billing-actions.ts:107-144, 147-197`

「課金操作は SuperAdmin」というポリシー（`markMemberPaid` 等では適用済み）に対し、
**紹介料を 1,100→3,300円 に変える優良案件マーク**と**最大100名への一斉メール送信**が `requireAdmin`（REVIEWER 可）のまま。
監査ログは残るため事後追跡は可能。

### 中-10. updatePassword に現行パスワードの確認が無い

`src/app/(auth)/actions.ts:120-155`

セッションを奪われた場合、旧パスワードを知らない攻撃者がパスワードを変更して乗っ取りを固定化できる。
リセットリンク経由と共用のため、フローを2本に分けた再設計が必要。

### 中-11. 文字数上限の未適用領域

メッセージ本文・下書き・テンプレート（`messages/actions.ts:193, 258-290`）、プロフィール全24項目（`lib/member.ts:112-122`）、
お知らせ（`admin/announcement-actions.ts:9-10`）に上限が無い。Server Action の上限は 8MB（`next.config.ts`）なので、
1回8MB弱のテキストを無制限に投入できる。クライアント側の `maxLength` は全 .tsx で0件。

### 中-12. `buyProposalProduct` が `offeringId` を検証していない

`src/app/(app)/ledger/[id]/propose/actions.ts:180-209`

対になる `buyListingOption`（`options/actions.ts:23-27`）は所有権を確認しているが、
`buyProposalProduct` には存在確認すら無く `offeringId` がそのまま `createOneTimeCheckout` へ渡る。
`billing.ts:148` が contact 系商品を所有権チェックから除外しているため下流でも止まらない。

実害は限定的（紹介料商品の履行は `offeringId` を使わないため掲載効果の乗っ取りは起きない）だが、
`billingOrder.offeringId` に他人の案件IDが記録される帰属汚染が起きる。`loadTarget` と同条件で検証すべき。

### 中-13. 退会フローとストレージ孤児（規約19条との乖離）

会員セルフサービスの退会導線が無く（FAQ でメール案内のみ）、`deleteMember` は Storage を一切削除しない。
プロフィール写真・ロゴ・台帳/PJ画像・**メッセージ添付**が公開URLのまま残り、
「削除しました」と回答できない状態。`offerings/tmp/`・`projects/tmp/` の放置ファイルも未掃除。

---

## 3. 低（改善候補）

- **cron が非本番環境で無認証**（`api/cron/billing-daily/route.ts:27-31`）。本番は 401 を実測確認済みだが、
  `NODE_ENV` 条件を外して「シークレット未設定なら拒否」に統一するのが安全。比較も `crypto.timingSafeEqual` に。
- **`unitLimit` / `requiresReview` がスナップショットでない**（`billing.ts:376-389`）。
  商品行の削除・改名で `?? 5` にフォールバックし、10件パック購入者に5件しか付与されない事故が起こりうる。
- **単品クレジットに未表示の180日期限**（`billing.ts:292-305`）。UIは「1件購入」としか書いていない。
- **未読返還が期限切れロットへ戻ると使えない**（`contact-credits.ts:151-180`）。台帳と表示残高が食い違う。
- **`$transaction` 内で P2002 を握りつぶす設計は Postgres では機能しない**（`billing.ts:306-309` 他）。
  現時点で悪用経路は無いが、`upsert` / `createMany({skipDuplicates})` に置き換えるのが健全。
- **applicant_only で都道府県・市区町村・業種が非開示になっていない**（`ledger/[id]/page.tsx:123,219,223`）。
- **条件一致通知の上限100がハードコード**で商品の `unitLimit` と二重管理（`billing-actions.ts:160`）、`visibility` 未チェック（`:157`）。
- **お知らせ・記事・バナー・相談ステータスの操作に監査ログが無い**。
- **テナント条件の欠落**（実害なし・マルチテナント化時に効く）: `favorites/actions.ts:19-20`、`deals/actions.ts:8-16`、
  `billing.ts:110-161`（BillingProduct）、スポンサー枠クエリ、各所の `thread.findFirst`。
- **Checkout の連打抑止がクライアント側（`disabled={pending}`）のみ**（`options/BuyOptionButton.tsx:23`）。
  二重課金は Webhook 側の冪等性で防げるが、`pending_payment` 注文と Stripe セッションが無制限に生成される。
- **`sendMessage` の拒否がすべて無言 `return`**（`messages/actions.ts:176,182,198`）。障害と攻撃の区別がつかず証跡も残らない。
- **`.env.local.stripetest` がローカルに残置**（gitignore済・未コミット。バックアップ共有時の誤流出に注意）。

---

## 4. 問題なしと確認した項目

- **認可が完全に抜け落ちた Server Action は 1つも無い**（20ファイル・86関数を全数確認）。
  2026-08-10 追加分（課金・提案・オプション・admin/members・PJ承認）もセッション＋所有権/テナント＋ロール要求を備える。
- **金額はすべてサーバー側DB由来**。クライアントが送れるのは `productCode` のみで、許可リストと `active` 判定あり。
  数量は1固定。割引の判定ソースは自社DBの `paymentStatus`（Stripe直参照ではない）。
- **Stripe Webhook はフェイルクローズ**（シークレット未設定=500・署名なし/検証失敗=400）。`StripeEvent` で冪等化。
  偽イベントの注入は成立しない。Checkout の `success_url`/`cancel_url` にユーザー入力は混入しない。
- **引き合い課金のモザイクはサーバー側で実施**。マスク対象の本文・添付URLはHTMLにも RSC ペイロードにも含まれない。
  クライアントに渡すのは自分の下書き・テンプレートのみ。既読処理・下書き・テンプレ・管理画面からの本文漏れも無し。
- **`visibility` の適用漏れは propose 以外に無い**（sitemap・/preview・検索・LP・producers・favorites・dashboard・
  スポンサー枠を1つずつ確認）。案件別の OGP 生成は存在しない。
- **条件一致通知の宛先はサーバー側で確定**（同意者のみ・ACTIVE・承認済み・掲載者除外・上限100）。広告表記と配信停止案内あり。
- **middleware の `PUBLIC_PATHS` に認証必須パスの混入は無い**。`/produce` と `/producers` の誤マッチも解消済み。
- **生SQLはアプリコードに0件**（`$queryRaw` 等なし）。全て Prisma の型付きクエリでインジェクション耐性は高い。
- **秘密情報のコミットは無し**（`.env*` は gitignore、追跡ファイル291件に sk_live/whsec 等の実値なし）。
- **npm audit: 脆弱性0件**（production・全依存とも）。
- **本番 cron エンドポイントは未認証で 401**（実測）。
- **Storage への匿名書き込みは RLS で拒否**（実測）。ただし読み取りは公開バケットのため誰でも可（高-2）。
- **初回無料3件のクレジットは量産できない**（`signup3:${memberId}` の冪等キー・管理者操作経由のみ）。
- **未読返還の開封記録を送り手が操作することはできない**（自案件への提案は禁止）。

---

## 4-2. 実施した修正（2026-08-11・未コミット／本番未デプロイ）

migration=`security_phase6`（追加のみ＝既存データに影響なし。**本番DBには適用済み**）:
`Message.offeringId`（引き合い課金をメッセージ単位で判定するため）/ `AuthAttempt`（認証レート制限）/ `StripeEvent.processedAt`（処理済み判定）。

| 指摘 | 対応 |
|---|---|
| 0章 RLS・anon全権限 | **修正・検証済み**（本章0を参照。DB権限の変更のみでコード変更なし） |
| 高-1 propose の visibility | `propose/page.tsx`・`loadTarget` に `visibility: { not: "private" }` を追加。applicant_only は掲載者名を「非公開（提案・承認後に開示）」に |
| 高-3 認証レート制限 | `src/lib/security.ts` に DBベースのレート制限（同一メール5回/時・同一IP20回/時）。`signIn` の失敗と `requestPasswordReset` に適用。再設定は制限中も同じ文面を返しアカウントの有無を漏らさない |
| 高-4 決済額の未検証 | `fulfillPaidOrder` に実支払額の突合（session.id / amount_total / currency と注文行）。不一致は履行せず `payment_failed`。`invoice.paid` は自社プラン額・定期課金であることを確認してから昇格 |
| 高-5 審査を飛ばす昇格 | `markPaid` の `APPROVED` 付与を `AWAITING_PAYMENT` からのみに限定（DRAFT/PENDING は課金状態だけ更新） |
| 中-1 返信しなければ無料 | ゲートの基準を「自分の初回返信」→「**相手からの1通目**」に変更。2通目以降は返信の有無に関係なくマスク |
| 中-2 スレッド先行作成の回避 | 判定を**メッセージ単位**に変更（`Message.offeringId`）。一度引き合いが始まったスレッドでは以後の受信も同じ会話として扱う。`thread.findFirst` に `tenantId` を追加 |
| 中-3 sendInterest からの迂回 | 既存スレッドへの `sendInterest` にもゲートを適用。通知メールは `previewForRecipient` を全経路で通し、モザイク対象の本文をメールに出さない |
| 中-4 クレジット二重消費 | `consumeOneCreditTx` の先頭で `pg_advisory_xact_lock(会員×種別)` を取得して直列化 |
| 中-5 返金で効果が残る | `revokeRefundedOrder` を新設。全額返金・チャージバック時に未消費クレジットを打ち消し、掲載効果を cancelled、公開範囲を public へ戻す。部分返金は対象外 |
| 中-6 オープンリダイレクト | `safeInternalPath`（バックスラッシュ・制御文字を弾き、解決後のoriginを検証）を新設し、`signIn`/`auth/callback`/`auth/confirm`/`createOneTimeCheckout` の4か所を共通化 |
| 中-7 非承認会員の送信 | `canSendToOthers`（REJECTED/SUSPENDED を拒否）を sendInterest / startConversation / sendMessage / sendProposal / applyToProject に適用。※審査前（DRAFT/PENDING）は従来どおり送信可＝基本利用無料の方針を変えないため |
| 中-8 セキュリティヘッダ | `next.config.ts` に `headers()`。X-Frame-Options: DENY / frame-ancestors 'none' / nosniff / Referrer-Policy / Permissions-Policy を強制、CSP本体は Report-Only で開始 |
| 中-11 文字数上限 | メッセージ・提案本文・下書き（4,000）、テンプレート（名100・本文4,000）、プロフィール24項目（1行200・本文4,000）、お知らせ（題200・本文8,000） |
| 中-12 buyProposalProduct | `loadTarget` で offeringId を検証してから Checkout を作る |
| 低 cron 認証 | `timingSafeEqual` による定数時間比較。CRON_SECRET があれば環境を問わず検証し、本番・Vercelで未設定なら 500 で拒否 |
| 低 クレジット付与数 | 付与数を商品マスターの現在値ではなく**注文時の商品コード**から決定（`PACK_QUANTITY`）。決定できなければ例外＝再送に載せる |
| 低 Webhook の取りこぼし | イベント記録の失敗を P2002 だけ「重複」と判定（DB障害は500で再送）。`processedAt` 未設定の記録は再送時に処理し直す。`async_payment_succeeded/failed`・`checkout.session.expired` にも対応 |

### 検証結果（すべて実測）

- `npx tsc --noEmit` エラーなし／`vitest` 18件合格／`npx next build` 成功。ESLintのエラー2件は**変更前から存在**するもの（`deals/page.tsx`・`ProductSaveForm.tsx`）
- **引き合い課金の回避が塞がれたことをE2Eで確認**：売り手が先に空スレッドを作ってから買い手が問い合わせる（旧・回避手口）シナリオで、1通目は閲覧可・**2通目以降はマスク**。売り手がPremiumならマスクなし、送信側の買い手は制限なし
- **本文がHTMLに含まれないことをHTTPレスポンスで確認**：マスク対象メッセージの本文はレスポンス本文に1文字も出現しない
- 返信ロック：無料の1通を返信した後は `canReplyFree=false`（サーバー側で `/billing` へ）
- 非公開募集（private）の `/ledger/<id>/propose` は案件名・掲載者名を出さずに 404 相当。**公開中のWANT案件は従来どおり提案可能**（回帰なし）
- レート制限：同一メールの失敗5回目で制限、別メールは巻き込まれない
- セキュリティヘッダが全ページで出力されることを確認
- 検証用の一時アカウント・案件・スレッドは**すべて削除済み**（本番の会員・案件・メッセージに変更なし）

---

## 5. 対応の推奨順

**すぐ（ユーザー作業）**
1. Stripe 本番の 100%OFF プロモコード `FJS2026TEST` を無効化/削除（高-4）
2. Supabase の PostgREST ログで、外部からの `/rest/v1/` アクセス有無を確認（0章）

**公開・対外募集の前（実装）**
3. propose ページの `visibility` 検査（高-1）— 数行で塞げる
4. 決済額の突合と `APPROVED` 自動昇格の停止（高-4・高-5）
5. 認証系のレート制限（高-3）
6. オープンリダイレクトの修正（中-6）— 3ファイル共通ヘルパー
7. セキュリティヘッダの追加（中-8）
8. 送信者の会員状態チェック（中-7）

**課金モデルの実効性（売上に直結）**
9. 引き合い課金の基準を「相手の初回メッセージ」に変更（中-1）
10. スレッドを案件単位に分離し、ゲート判定をメッセージ単位に（中-2・中-3）
11. クレジット消費の直列化（中-4）
12. 返金時の効果取り消し（中-5）

**運用整備**
13. 添付の private バケット化（高-2）
14. 退会フローとストレージ削除（中-12）
15. 文字数上限の全面適用（中-11）
