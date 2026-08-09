# セキュリティ・運用検査レポート（2026-08-09）

> **2026-08-10 追記: 主要な指摘は修正済み。** 修正内容と残課題は本ファイル末尾の「修正状況（2026-08-10）」を参照。

指定8項目（Stripe Webhook改ざん対策／権限管理／会員間メッセージの閲覧制御／入力値検証／画像アップロード制限／退会・解約処理／バックアップ／監査ログ）を、読み取り専用でコード全体を検査した結果。**修正は未実施**（本レポートは指摘のみ。修正には承認をください）。

## 総合判定

**「問題なし」とは言えない。公開・対外募集の前に、少なくとも下の「最優先6件」の修正が必要。**
一方で、SQLインジェクション・HTML描画XSS・オープンリダイレクト・CSRFといった典型的Web脆弱性への耐性は高く、Stripeの価格改ざん・他人になりすました決済も不可能な設計になっている。弱点は (a) フェイルオープン（未設定時に検証をスキップ）、(b) URL文字列を信頼した権限判断、(c) 無認証エンドポイントの濫用対策不在、(d) 記録（監査ログ）とバックアップの不在、に集中している。

## 最優先6件（公開前に修正すべき・すべて「高」）

| # | 内容 | 場所 |
|---|---|---|
| 1 | **Stripe Webhookがフェイルオープン**。`stripe-signature`ヘッダ無しのPOSTは署名検証を素通りし、生JSONを信用する。`{"type":"checkout.session.completed","data":{"object":{"metadata":{"memberId":"..."}}}}` を投げるだけで任意会員をPAID+APPROVED化できる。**本番でも成立する**（sigが無ければelse分岐に落ちる）。→ secret/sig欠如時は400で拒否に | `src/app/api/stripe/webhook/route.ts:16-20` |
| 2 | **会員削除してもStripe課金が続く**。DBにstripeCustomerId/subscriptionIdを保存しておらず、`deleteMember`はStripeを一切呼ばない。削除された会員はログイン不可＝自力解約も不可、毎月¥22,000が請求され続ける | `src/app/(app)/admin/actions.ts:85-110`, schema |
| 3 | **SUSPENDED（利用停止）が機能していない**。停止してもログイン・メッセージ送信・掲載編集がすべて可能（getSessionUser/middlewareがstatusを見ていない）。規約18条の実装が無い | `src/lib/auth.ts:18-70` |
| 4 | **ログイン会員がストレージ内の任意ファイルを削除できる**。画像削除系アクションがURL文字列からパスを復元しservice_roleで無条件削除。他社のロゴ・バナー・他人のメッセージ添付も消せる（バックアップも無いため復旧不能） | `profile/actions.ts:195-217`, `ledger/actions.ts:216-233`, `projects/actions.ts:118-135` |
| 5 | **`markThreadRead`が無認証の公開Server Action**。誰でも任意スレッドを既読化できる（未読バッジ改ざん→メッセージ見落とし誘発） | `messages/actions.ts:214-219` |
| 6 | **相談フォームがメール踏み台になる**。レート制限・CAPTCHA無しで、入力された任意アドレスへ自動返信を送る＝スパム送信の踏み台。grab-design.comのドメイン評判を毀損しうる | `(public)/consultation/actions.ts`, `lib/email.ts` |

## 項目別の要点

### 1. Stripe Webhook改ざん対策 — ✗ 要修正
- 署名検証はconstructEventを正しく使用、生ボディの扱いも正しい。ただし上記#1のフェイルオープンが致命的。
- 冪等性なし（stripe_event_id未保存。HANDOVER 336が要求）。古いイベントの再送で解約済み会員がPAIDに巻き戻る。順序逆転too。
- `invoice.paid`は実質デッドコード（Invoiceのmetadataには memberId が載らない。subscription_details.metadata側を見る必要）→ **2か月目以降の継続課金が会員状態に反映されない**。
- `invoice.payment_failed`/`customer.subscription.updated`未処理 → 決済失敗してもPAIDのまま（subscription.deletedまで数週間使い放題）。
- DB更新失敗でも200を返す（Stripeが再送しない）。webhookが`status:"APPROVED"`を無条件上書き（SUSPENDED会員が復活）。

### 2. 権限管理 — △ 会員側は概ね良、管理側に穴
- 全63 Server Actionを検査。会員向けアクションの所有権チェックはほぼ適切（ownOffering/ownProject/ownDealパターン）。
- **REVIEWERが自分用ADMINアカウントを作成できる（権限昇格）**。`createAdminAccount`がrequireAdmin止まり。`revokeAdmin`もロール階層チェックが無く、REVIEWERがTENANT_ADMINを剥奪可能＝事務局ロックアウトが可能。【高】
- **middlewareの`/produce`前方一致が`/producers/*`を公開扱いにする**（現在はページ側の自前チェックで実害なしだが、多層防御が1層死んでいる）。【高】
- `setMemberReview`/`adminReviewProject`にtenantId条件が無い（現状1テナントで実害低）。
- 未審査アカウントでも登録すれば承認済み会員の詳細・台帳を全部閲覧できる（有料ゲートはメッセージ送信のみ）。仕様の権限表（案件詳細=有料会員のみ）と乖離。`applyToProject`にもPAIDチェックが無い。
- `updatePassword`が現在のパスワード確認なしで変更可能（セッション奪取時の乗っ取り固定化）。【中】

### 3. 会員間メッセージの閲覧制御 — ○ 概ね良（規約17条と整合）
- スレッド閲覧・送信・下書き・テンプレは参加者/本人スコープ済み。IDORは塞がっている。
- **事務局UIにメッセージ本文を表示する経路は存在しない**＝規約17条（通信の秘密）とコードが整合。今日追加した/admin/inquiriesもメタ情報のみで整合を維持。
- 例外: #5のmarkThreadRead(無認証)、saveDraft(参加者未検証)、メッセージ添付が公開バケット＋無期限URL（見積書等がURLを知る誰でも取得可能。署名付きURL+privateバケット推奨)。attachmentUrlのスキーム未検証（data:URLフィッシング可）。

### 4. 入力値検証 — △
- zod等なし・全て手書き。列挙値のホワイトリスト・数値クランプ・オープンリダイレクト対策など良い箇所も多い。生SQLゼロ、ユーザー入力のHTML描画ゼロ。
- 全文字列フィールドが長さ無制限（クライアントmaxLength 0件・DB全てTEXT）。8MBのテキストを無制限件数投入可能。
- 通知メールへのHTMLインジェクション（email.tsがエスケープせず埋め込み→事務局宛メールに偽装リンクを差し込める）。
- 認証系（ログイン・パスワードリセット）にレート制限なし。パスワード要件は8文字のみ。

### 5. 画像アップロード制限 — ✗ 要修正
- 全アップロードがServer Action経由+所有権チェックあり・キーにUUID：基本構造は良い。
- **`image/svg+xml`が通る**（file.typeのstartsWith("image/")のみ。クライアント申告値）→公開URLを直接開くとスクリプト実行（保存型XSS）。sharpは依存にあるが未使用＝再エンコード無し。
- メッセージ添付は**種別検証ゼロ**（text/htmlも実行ファイルも可）＋公開バケット。
- 拡張子のサニタイズ無し（`file.name.split(".").pop()`にパス断片を入れられる）。
- ストレージRLS/ポリシー定義なし（全てservice_role書き込み＝認可はアプリコードのみ）。

### 6. 退会・解約処理 — ✗ 要修正
- 解約（Stripeポータル）→subscription.deleted→UNPAID化は機能する。
- **会員自身の「退会」機能が存在しない**（規約19条は退会後のデータ削除/匿名化を約束済み＝法務と実装の乖離）。
- 削除時の孤児: MessageDraft/MessageTemplate/ProjectApplication/Favorite(された側)/Consultation/**Storage画像全部**が残る。退会後も画像は公開URLのまま。
- ポータルの顧客特定がメール一致のみ（Checkoutの度に新Customer作成→重複時に誤った顧客のポータルを開きうる）。→ stripeCustomerId保存で#2と一緒に解消。

### 7. バックアップ — ✗ 未整備（運用課題）
- リポジトリ・docsにバックアップ/復旧の記述ゼロ。SupabaseがFreeプランなら日次バックアップ・PITRとも無い可能性が高い（**要確認**）。
- 不可逆な物理削除機能（deleteMember）が存在するのに復旧手段なし。Storageのバックアップも無し（#4の任意削除と組み合わさると全画像消失が可能）。
- 推奨: Supabase Pro+PITR（または日次pg_dump）、member-imagesバケットの定期同期、復旧ランブック、環境変数の退避手順。

### 8. 監査ログ — ✗ 未実装
- audit_logsテーブルなし（HANDOVER 189/279が規定、規約17条の「記録の下で」も未担保）。
- 会員削除・手動PAID化・管理者アカウント作成/剥奪・掲載承認がすべて無記録。ログイン成否も記録なし。
- 最小実装: AuditLogモデル+管理者アクション8種への記録+認証イベント記録+追記専用。

## 推奨する修正順序

1. Webhookフェイルクローズ化（数行・効果最大）+ 冪等化（stripe_event_idテーブル）+ invoice.paid修正 + payment_failed対応
2. Member に stripeCustomerId/subscriptionId 保存 + deleteMemberでStripe解約 + ポータルをID参照に
3. getSessionUserでSUSPENDED拒否 + suspendMemberでOffering非公開化
4. 画像削除の所有権検証（URLでなくレコード検証）+ アップロードのMIMEホワイトリスト（svg除外）+ 拡張子サニタイズ
5. markThreadRead/saveDraftの認証・参加者検証
6. 相談フォームのレート制限+honeypot
7. 管理者ロール階層化（TENANT_ADMIN限定操作）+ middlewareのパス完全一致化
8. 監査ログ実装／退会フロー実装／バックアップ体制（運用）

検査の詳細（全Server Action判定表・行番号つき根拠）は本ファイルの元になった検査ログをセッション内で参照。修正着手の承認をいただければ、上記順で実装します。

---

## 修正状況（2026-08-10）

### 修正済み（本番反映）

| 指摘 | 対応 |
|---|---|
| 高1 Webhookフェイルオープン | フェイルクローズ化（secret未設定=500、署名なし=400、検証失敗=400+ログ）。**加えて**: StripeEventテーブルで冪等化（再送・リプレイで巻き戻らない）、`invoice.paid`をsubscription_details.metadata＋stripeCustomerId逆引きで修正（継続課金が反映される）、`invoice.payment_failed`/`customer.subscription.updated`対応、SUSPENDED/REJECTEDは決済イベントで復活させない、DB失敗時は500でStripeの再送に乗せる |
| 高2 削除後の課金継続 | Member に stripeCustomerId/stripeSubscriptionId を保存（Webhookで自動記録）。deleteMember は先にStripe解約→失敗したら削除を中止してエラー表示。Checkoutは既存顧客を再利用（重複Customer防止）、ポータルは保存IDを優先 |
| 高3 SUSPENDED無効 | getSessionUser で SUSPENDED を遮断→公開ページ `/suspended` へ。suspendMember/reactivateMember で Supabase Auth もバン/解除。停止・未承認会員の掲載は検索・公開プレビュー・詳細ページから非表示 |
| 高4 任意ファイル削除 | 全削除系を「レコードに登録済みのURL」かつ「自分のフォルダ配下のパス」のみに制限（src/lib/upload.ts の storagePathFromUrl） |
| 高5 markThreadRead無認証 | セッション＋スレッド参加者検証を追加（引数のmyMemberId廃止）。saveDraft にも参加者検証 |
| 高6 相談フォーム踏み台 | honeypot＋DBベースのレート制限（同一IP 5件/時・全体30件/時。Consultationにip列追加）＋入力長制限＋refNo衝突対策 |
| 中 SVG XSS | 全画像アップロードをマジックバイト検証（JPEG/PNG/WebP/GIF/AVIFのみ・SVG不可）、contentType/拡張子はサーバー判定値に。メッセージ添付はcontentTypeを安全な型に強制（HTML実行不可）＋8MB統一 |
| 中 REVIEWER権限昇格 | 管理者作成/剥奪・課金操作・完全削除を requireSuperAdmin（TENANT_ADMIN/ADMIN）に限定。TENANT_ADMINは剥奪不可 |
| 中 middleware前方一致 | 完全一致 or 「/」区切り配下のみ公開扱い（/produce と /producers の衝突解消） |
| 中 tenant境界 | setMemberReview / adminReviewProject / sendInterest / startConversation / applyToProject / toggleFavoriteMember に tenant・相手検証を追加。applyToProject に月額会員ゲート追加（仕様11章準拠） |
| 中 attachmentUrl未検証 | 自ストレージの公開URLのみ受付（data:等は破棄） |
| 中 メールHTMLインジェクション | email.ts の全ユーザー由来値をエスケープ |
| 中 監査ログ不在 | AuditLogテーブル＋writeAudit。審査/停止/削除/課金/管理者作成・剥奪/掲載承認・非公開化 計14操作を記録。閲覧= /admin/audit |
| 低 /api/health情報露出 | 件数・エラー詳細を返さない（{ok}のみ） |
| 低 バナーlinkUrl `//` | 拒否に変更 |

### 運用側で必要な作業（ユーザー対応）

1. **Stripeダッシュボードで Webhook に2イベント追加**: `invoice.payment_failed` と `customer.subscription.updated`（現在の3イベントに追加。dashboard.stripe.com → Developers → Webhooks → 対象エンドポイント → イベント追加）。追加しないと決済失敗・プラン状態変化が反映されない。
2. **Supabaseプラン確認＋バックアップ有効化**: `docs/backup-runbook.md` の手順1〜3（Pro化・PITR・ストレージコピー・環境変数退避）。
3. 既存会員（グラブデザイン）の stripeCustomerId は次回のWebhookイベントかポータル操作で自動保存される。

### 未対応（次回以降・要承認）

- 会員セルフサービスの退会フロー（規約19条。UX設計が必要）
- メッセージ添付の private バケット＋署名付きURL化（既存URLの移行を伴う）
- ログイン・パスワードリセットのレート制限（Supabase側設定の確認含む）
- updatePassword の現行パスワード確認（リセットフローと共用のため再設計が必要）
- 全フィールドの文字数上限の全面適用（今回は公開フォームのみ）・退会/削除時のストレージ孤児ファイル一括削除
