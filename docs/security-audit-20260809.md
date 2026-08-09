# セキュリティ・運用検査レポート（2026-08-09）

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
