# 公開前 実送信テスト手順書（NAKAMA）

作成: 2026-08-09 ／ 対象本番: https://nakama.food-japan-summit.jp/
このファイルは「あなた自身が本番で回す」ためのチェックリストです。**本番DBへの書き込み・実メール送信・（③は）実カード課金**を伴うため、Claude は代理実行しません。

---

## ① Stripe 本番稼働の最終確認（¥22,000）

コード上は `src/lib/stripe.ts` 単一プラン `nakama` = ¥22,000（税込）で確定済み。残るは「本番キー・本番Webhookで動いているか」の確認だけ。

- [ ] **Vercel 環境変数**（Vercel → food-japan → プロジェクト → Settings → Environment Variables, Production）
  - `STRIPE_SECRET_KEY` が `sk_live_…` で始まる
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` が `pk_live_…`
  - `STRIPE_WEBHOOK_SECRET` が本番Webhookの `whsec_…`
  - `NEXT_PUBLIC_APP_URL` = `https://nakama.food-japan-summit.jp`
  - `EMAIL_FROM` = `FOOD JAPAN NAKAMA <info@grab-design.com>`
- [ ] **本番Webhook**（dashboard.stripe.com、右上が「本番環境／Live」であること）
  - エンドポイント `https://nakama.food-japan-summit.jp/api/stripe/webhook` が存在
  - 送信イベント: `checkout.session.completed` / `invoice.paid` / `customer.subscription.deleted`
- [ ] **カスタマーポータル**（dashboard.stripe.com/settings/billing/portal）が **Liveで有効化**済み（test/live 各1回の有効化が必要）

> ※ 商品/価格は事前作成不要（Checkout が `price_data` で¥22,000を都度生成）。ダッシュボードに商品が無くても正常。

---

## ② 相談フォーム 実送信テスト（/consultation）

1. [ ] https://nakama.food-japan-summit.jp/consultation を開く
2. [ ] 相談種別=「共創プロデュース」、会社=`テスト（削除予定）`、氏名=`テスト太郎`、
       メール=**自分が受信できるアドレス**、商品概要・課題を適当に入力、個人情報同意にチェック
3. [ ] 送信 → 画面に **受付番号 `NK-YYYYMMDD-xxxx`** が出る
4. [ ] **管理通知**: `info@grab-design.com` に「新規相談」メールが届く
5. [ ] **自動返信**: 入力したメールアドレスに受付確認メールが届く（差出人 info@grab-design.com）
6. [ ] **管理画面**: /admin → 相談管理（/admin/consultations）にこの1件が表示される

### 後片付け（重要）
- 相談は**管理画面から削除できません**（ステータス更新のみ: new/reviewing/contacted/proposed/won/lost）。
  - 運用上はステータスを `lost` にして無視でOK。
  - 完全に消したい場合は DB から削除が必要（Claude に「本番の相談テストデータを消して」と依頼 → Supコンソールか Prisma で `Consultation` の該当 refNo を削除）。

### 不達だったときの切り分け
- Resend ダッシュボードで送信ログ確認（ドメイン grab-design.com は認証済み）。
- 受付番号は出たがメールが来ない → 送信はベストエフォート設計（受付は成立）。`EMAIL_FROM` と Resend APIキー、`info@grab-design.com` の受信（迷惑メール）を確認。

---

## ③ 登録 → 決済フロー 実テスト

**実カードだと¥22,000が実際に課金されます。** 課金を避けるなら「A. ¥0クーポン方式」を推奨。

### 事前準備（A方式を使う場合）: 本番100%オフ・クーポン作成
- [ ] dashboard.stripe.com（**Live**）→ 商品 → クーポン → 新規作成: 割引100% / 期間=1回（または「継続」なら初回以降も¥0）
- [ ] そのクーポンに**プロモーションコード**（例 `NAKAMA-TEST-0`）を発行
> テスト用コード `FJS2026TEST` は **テストモード専用**。本番Checkoutでは使えないため、Liveで新規作成が必要。

### 手順
1. [ ] （別ブラウザ/シークレットで）https://nakama.food-japan-summit.jp/signup にアクセス
2. [ ] テスト用メール（例 `umetaku+test@grab-design.com` などエイリアス推奨）で新規登録
3. [ ] 登録完了後 **自動で /billing に遷移**する（＝登録＝決済導線）
4. [ ] プランカード「NAKAMA 月額会員 ¥22,000/月（税込）」の **「お支払いへ進む」** を押す
5. [ ] Stripe Checkout が開く。金額が **¥22,000** で表示される
   - **A方式**: 「プロモーションコード」欄に `NAKAMA-TEST-0` を入力 → 合計 ¥0 → 決済
   - **B方式**: 実カードで¥22,000決済（テスト後に Stripe で**返金**）
6. [ ] 決済後 `/billing?success=1` に戻り、状態バッジが **「課金中」**、ポータルボタンが出る
7. [ ] （数秒〜十数秒で Webhook 反映）ページ再読込しても「課金中」のまま＝`paymentStatus=PAID` 同期OK
8. [ ] **カスタマーポータル**: /billing のポータルボタン → 解約・領収書・カード変更画面が開く

### 後片付け（重要）
- [ ] Stripe: テストのサブスクを**解約**（ポータル、または Stripe ダッシュボード）
- [ ] B方式で課金した場合は Stripe で**返金**
- [ ] アプリ: /admin → 会員管理でテスト会員を**完全削除**（`deleteMember`＝ログイン認証ごと削除・元に戻せない）
- [ ] 解約Webhook（`customer.subscription.deleted`）で `paymentStatus` が `UNPAID` に戻ることも確認できると尚良い

---

## 合否チェックリスト（受入条件 §16 対応）
- [ ] 未課金ユーザーは会員限定の案件詳細を**API経由でも**取得できない（プレビュー壁のみ概要表示）
- [ ] 既存会員（株式会社グラブデザイン）のログイン・課金・解約が壊れていない
- [ ] 相談フォーム: 入力検証・保存・管理通知・自動返信が動く
- [ ] Webhook が重複しても会員状態が破損しない（`paymentStatus` は Webhook が正）
- [ ] モバイルで主要CTAと料金（¥22,000税込）が読める
- [ ] 本番用の秘密情報がクライアントバンドルに出ていない（`NEXT_PUBLIC_` 以外はサーバー限定）

## 未確定（事業側で確定が必要・§18）
- 法務文言（利用規約/プライバシー `src/lib/legal.ts`・施行日 2026-08-07 仮）の最終確定
- 既存会員への料金・サービス変更の適用日と通知方法
