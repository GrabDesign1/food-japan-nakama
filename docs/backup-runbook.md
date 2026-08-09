# バックアップ・復旧ランブック（2026-08-10 初版）

会員の個人情報・掲載データ・メッセージを預かるサービスとして、安全管理措置（個人情報保護法）の一環でバックアップ体制を整える。**コード変更は不要。すべて運用側の設定作業。**

## 現状（2026-08-10時点の課題）

- DB: Supabase（project ref `zbyxhtswjrrhlcnzouew`, ap-northeast-1）。**プランがFreeの場合、日次バックアップ・PITRは存在しない**。
- ストレージ: `member-images` バケット（公開）。**バックアップなし・バージョニングなし**。
- 復旧手順・責任者・訓練: 未定義。

## やること（優先順）

### 1. Supabase のバックアップを有効化【最優先・15分】
1. https://supabase.com/dashboard → プロジェクト → Settings → Billing でプランを確認。
2. **Pro プラン（$25/月）にアップグレード**すると日次バックアップ（7日保持）が自動で付く。
3. 可能なら Add-on の **PITR（Point-in-Time Recovery）** も有効化（誤削除の「直前」に戻せる。日次バックアップだと最大24時間分のデータが失われる）。
4. Database → Backups でバックアップが取れていることを翌日確認。

### 2. ストレージ（member-images）の定期コピー【30分】
最小構成: 手元のMacで月1回（掲載が増えたら週1回）実行して外付けHDD/別クラウドに保管。

```bash
# Supabase CLI でバケットを丸ごとダウンロード（要 supabase login）
npx supabase storage cp -r ss:///member-images ./backup-member-images-$(date +%Y%m%d) --experimental --project-ref zbyxhtswjrrhlcnzouew
```

自動化する場合は GitHub Actions + rclone で S3/Backblaze に日次同期（必要になったら実装を依頼してください）。

### 3. 環境変数の退避【15分】
- Vercel → Settings → Environment Variables の全キーと値を、会社のパスワードマネージャ（1Password等）に「FOOD JAPAN NAKAMA 本番環境変数」として保存。
- 対象: DATABASE_URL / DIRECT_URL / SUPABASE系 / STRIPE系 / RESEND_API_KEY / EMAIL_FROM / NEXT_PUBLIC_APP_URL。
- ローテーションしたら必ず更新する。

### 4. 復旧手順の確認（年1回リハーサル）
| 障害 | 復旧手段 | 目安時間 |
|---|---|---|
| 会員を誤って完全削除 | Supabase PITR で直前に復元（PITRなしなら日次バックアップ＝最大24h巻き戻り） | 30分〜 |
| DB全損 | Supabaseバックアップから復元 → Vercel再デプロイ | 1〜2時間 |
| 画像消失 | 手順2のコピーから `member-images` に再アップロード | 件数次第 |
| Supabaseプロジェクト自体の障害 | 新プロジェクト作成 → `prisma migrate deploy` でスキーマ再構築 → バックアップから`pg_restore` → 環境変数差し替え | 半日 |
| コード事故 | GitHub `GrabDesign1/food-japan-nakama` から前コミットへ revert → 自動デプロイ | 15分 |

- 復旧責任者: 梅原（バックアップの確認も含む）。
- RPO（許容データ損失）: PITRあり=数分／日次のみ=24時間。RTO（復旧目標時間）: 半日以内。

## 関連（実装済みの保護策）
- 会員の完全削除は Stripe解約成功が前提＋監査ログに記録される（/admin/audit）。
- 画像削除はレコードに登録されたURL・自分のフォルダ配下のみに制限済み（他人のファイルは消せない）。
