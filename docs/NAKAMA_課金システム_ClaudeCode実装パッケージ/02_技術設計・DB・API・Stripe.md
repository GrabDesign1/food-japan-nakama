# NAKAMA 課金システム 技術設計

## 1. 前提

実装方式は既存リポジトリのフレームワーク、ORM、認証、DB、メール、監査方式へ合わせる。以下の名前は概念名であり、既存命名を調査して対応させる。

決済は既存Stripe構成があれば再利用する。なければ、初回提案・掲載オプションにはStripe Checkoutの一回払い、月額22,000円会員にはSubscriptionを採用する。カード情報をNAKAMAのサーバーへ保存しない。

## 2. 状態モデル

### Order

`draft -> pending_payment -> paid -> fulfilling -> fulfilled -> expired`

例外：`payment_failed`, `cancelled`, `refund_pending`, `partially_refunded`, `refunded`

### Promotion

`pending_payment -> pending_review -> scheduled -> active -> paused -> expired`

例外：`rejected`, `cancelled`

決済状態と掲載状態を同一カラムにしない。支払い済みでも審査待ち・掲載予定・否認が存在するためである。

## 3. 推奨データモデル

### billing_products

- id
- code（不変・一意）
- name
- description
- billing_type: `one_time | quote | subscription | cpc`
- audience: `sell | seek | both | banner`
- effect_type: `featured | top_pr | urgent | matched_notice | private | applicant_only | sns | article | search_support | meeting_support | banner`
- price_amount
- currency
- tax_behavior
- duration_days
- unit_limit
- requires_review
- active
- sort_order
- stripe_product_id / stripe_price_id（使用する場合）
- created_at / updated_at

### billing_orders

- id
- order_number（推測困難な連番またはUUID表示用番号）
- user_id / organization_id
- listing_id（nullable）
- status
- subtotal_amount / tax_amount / total_amount / currency
- product_snapshot_json
- stripe_checkout_session_id（unique, nullable）
- stripe_payment_intent_id（unique, nullable）
- paid_at / cancelled_at / refunded_at
- idempotency_key（unique）
- created_at / updated_at

### billing_order_items

- id
- order_id
- product_id
- quantity
- unit_amount / tax_amount / total_amount
- effect_type
- duration_days_snapshot
- metadata_json

### listing_promotions

- id
- listing_id
- order_item_id（unique）
- effect_type
- status
- starts_at / ends_at
- review_status / reviewed_by / reviewed_at / review_note
- priority_score（Phase 1では管理用）
- created_at / updated_at

### ad_placements / banner_campaigns

- placement code, name, page scope, dimensions, inventory rule
- campaign owner, creative URL, destination URL
- starts_at / ends_at
- review status, delivery status
- impression_count / click_count（集計値。原本イベントと分離）

### billing_events

- id
- provider
- provider_event_id（unique）
- event_type
- payload_hash
- processing_status
- processed_at
- error_message（秘密情報を含めない）
- created_at

### audit_logs

- actor_id / actor_type
- action
- target_type / target_id
- before_json / after_json（機密情報を除外）
- created_at

### contact_credit_accounts / contact_credit_ledger

残高を直接上書きするだけでなく、台帳方式で増減理由を記録する。

- account_id / organization_id
- ledger entry id
- order_item_id（購入時）
- contact_unlock_id（消費時）
- entry_type: `purchase | reserve | consume | release | refund | expire | admin_adjustment`
- quantity_delta
- expires_at
- idempotency_key（unique）
- created_at

### contact_unlocks

- id
- seller_organization_id
- seeker_listing_id
- seeker_organization_id
- thread_id（送信成功後）
- status: `pending_payment | reserved | unlocked | released | refunded`
- message_id / opened_at
- unread_refund_due_at / unread_refunded_at
- pricing_tier: `standard | verified_lead`
- order_id / credit_ledger_entry_id
- unlocked_at
- unique key: seller organization + seeker listing + seeker organization
- created_at / updated_at

### membership_subscriptions / membership_usage_ledger

既存の月額22,000円契約がある場合は既存モデルを優先する。なければ次の情報を追加する。

- subscription id / organization_id / stripe_subscription_id / status / current_period_start / current_period_end
- 月次利用枠：通常案件30件、確認済み優良案件3件
- usage ledger: subscription id / usage_month / pricing_tier / entry_type (`grant | reserve | consume | release | expire | admin_adjustment`) / quantity_delta / contact_unlock_id / idempotency_key
- 月初または契約更新時に付与し、当月末または次回更新時に未使用枠を失効する

## 4. DB制約

- 金額は整数の最小通貨単位で保存する
- total_amount >= 0
- ends_at > starts_at
- provider_event_id、checkout_session_id、payment_intent_idは一意
- order_itemとpromotionの二重生成をDB制約で防ぐ
- 既存案件を壊さないよう新規カラムはnullableまたは安全な既定値
- 本番マイグレーション前にバックアップとロールバック手順を用意

## 5. API／Server Action

既存方式へ合わせ、最低限次の責務を用意する。

- `GET products?audience=`：有効商品取得
- `POST checkout-sessions`：所有権・商品・案件状態をサーバーで検証しCheckout作成
- `POST stripe-webhook`：署名検証、イベント冪等処理、注文・掲載状態更新
- `GET my-orders`：本人・所属組織の購入履歴
- `GET listing-promotions/:listingId`：所有者・管理者向け状態
- `POST admin/promotions/:id/review`：承認・否認
- `POST admin/orders/:id/refund`：権限確認後、返金実行または申請記録
- `POST ads/:id/impression` / `click`：Phase 2以降。bot・自己クリックを除外可能な設計
- `POST listings/:id/contact-intent`：無料返信か、既存解放済みか、初回紹介料対象かを判定
- `POST contact-unlocks/:id/checkout`：1件紹介のCheckout作成
- `POST contact-unlocks/:id/use-credit`：クレジットを予約し、送信成功後に消費
- `GET contact-credits`：組織の利用可能残高と期限
- `GET membership-entitlements`：月額会員の当月利用枠・残数・次回更新日
- 14日未読返還バッチ：opened_atがなく期限を迎えたunlockへ、冪等に1クレジット返還

初回提案時は、月額会員の当月利用枠、購入クレジット、単発Checkoutの順で選択できる。いずれも `contact_unlocks` の一意制約を先に確認し、既に解放済みなら新たに消費・請求しない。

金額、期間、効果、税はクライアント送信値を信用せず、サーバーの商品マスターから再取得する。

初回紹介料の判定もクライアントへ任せない。既存スレッドの起点、送信者・受信者、案件所有組織、contact_unlockの一意制約をサーバーで確認する。

通常1,100円と確認済み案件3,300円の判定は、購入開始時と送信直前の両方でサーバー確認する。確認済み状態が途中で解除された場合、売り手に不利な価格変更を行わず、安い方を適用する。

無料3件はユーザー単位ではなく確認済みorganization単位で付与する。台帳のidempotency keyと一意制約により重複付与を防止する。

## 6. Stripe

### Checkout作成

- 一回払いは `mode=payment`
- success URLとcancel URLは許可済み自サイトURLのみ
- metadataには内部IDだけを入れ、個人情報・説明文・秘密情報を入れない
- Stripeのidempotency keyを注文単位で使う
- Checkout作成前に自DBへpending orderを作成
- 画面リダイレクトだけでpaidにしない

### Webhook

- raw bodyで署名検証
- `checkout.session.completed` または実際の決済成功イベントでpaid化
- `payment_intent.payment_failed`、`charge.refunded`等を同期
- provider_event_idで重複処理を防止
- DBトランザクション内で注文確定とpromotion作成を行う
- メール送信はトランザクション外のキューまたは再試行可能処理
- 処理失敗は安全に再実行可能にする

### 環境変数

既存命名を優先し、例として以下を利用する。

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`（必要な場合のみ）
- `APP_BASE_URL`

`.env`、秘密鍵、Webhook payload全文をGitへ追加しない。

## 7. 掲載反映バッチ

- 開始日時を迎えたscheduledをactiveへ
- 終了日時を過ぎたactiveをexpiredへ
- 終了3日前通知は一度だけ
- バッチが重複実行されても二重通知・二重更新しない
- タイムゾーンはDBではUTC、表示はAsia/Tokyo
- cronが停止しても閲覧クエリ側で期限切れを有効扱いしない

## 8. 権限・セキュリティ

- 購入者が対象案件の所有者または所属組織の許可ユーザーか確認
- 管理APIは管理権限必須
- IDOR対策：URLのorder/listing IDだけを信用しない
- CSRF、XSS、open redirect、SQL injectionは既存防御方式を維持
- 金額改ざんをサーバー検証
- レート制限：Checkout作成、クリック、通知配信、Webhook以外の公開API
- ログへカード情報、Stripe secret、メール本文、個人情報を出さない
- 管理操作と返金は監査ログを残す

## 9. 表示・クリック計測

Phase 1では注目枠の表示回数と詳細クリックを集計できる構造だけ用意する。広告主本人、管理者、既知bot、短時間の反復クリックは課金対象外にできるよう、生イベントと課金集計を分ける。

CPCを開始するまではクリック数から料金を引かない。

## 10. 既存月額22,000円との共存

調査で既存subscriptionが見つかった場合：

- 新規販売導線と既存契約管理を分離
- 契約件数・status・次回請求日を個人情報なしで報告
- 管理者承認なしにcancel、refund、Price削除を行わない
- Webhookを削除せず、新旧イベントを判別
- 移行日は別途決定

新規月額会員を実装する場合の権利は、通常案件の初回提案30件／月、確認済み優良案件3件／月、販促オプション20%割引とする。人が行う紹介・営業・商談・企画・制作は月額利用枠に含めない。

## 11. 可観測性

最低限の運用指標：

- Checkout開始数、決済成功率、失敗数
- 商品別売上
- active／scheduled／審査待ち件数
- Webhook失敗・再試行件数
- 掲載終了予定
- 表示、クリック、CTR（課金とは分離）
- 初回提案開始数、決済完了数、提案送信成功数
- 紹介クレジット購入・予約・消費・返還・失効
- 有料提案から返信、商談、成約への転換（取得できる範囲）
- 14日未読返還数と、開封・返信率
