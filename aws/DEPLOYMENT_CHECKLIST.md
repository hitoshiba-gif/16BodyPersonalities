# デプロイ前チェックリスト

本番環境にデプロイする前に、以下をすべて確認してください。

## ✅ 事前準備

### AWS環境

- [ ] AWSアカウントを作成済み
- [ ] AWS CLI v2インストール済み（`aws --version`）
- [ ] AWS SAM CLIインストール済み（`sam --version`）
- [ ] AWS認証情報を設定済み（`aws configure`）
- [ ] リージョンを `ap-northeast-1` に設定済み

### ローカル環境

- [ ] Node.js 18以上インストール済み（`node --version`）
- [ ] PostgreSQL clientインストール済み（`psql --version`）
- [ ] Git設定済み

## ✅ RDSデータベース

### 作成確認

- [ ] RDSインスタンス作成済み（`16bp-production`）
- [ ] インスタンスクラス: `db.t3.small`
- [ ] エンジン: PostgreSQL 15
- [ ] ストレージ: 20GB SSD
- [ ] パブリックアクセス: 有効
- [ ] バックアップ保持期間: 7日

### 接続確認

```bash
# RDSエンドポイントを取得
aws rds describe-db-instances \
  --db-instance-identifier 16bp-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

- [ ] RDSエンドポイントを取得済み
- [ ] PostgreSQLに接続できることを確認

```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d postgres -c "SELECT version();"
```

### スキーマ適用

- [ ] `database/schema.sql` を適用済み

```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d postgres -f database/schema.sql
```

- [ ] テーブル作成を確認

```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d postgres -c "\dt"
```

期待されるテーブル:
- `diagnoses`
- `premium_reports`
- `contacts`

### セキュリティグループ

- [ ] RDSセキュリティグループでポート5432を開放
- [ ] Lambda用セキュリティグループからのアクセスを許可

## ✅ SES（メール送信）

### メールアドレス検証

```bash
aws ses verify-email-identity \
  --email-address noreply@16bodypersonalities.com \
  --region ap-northeast-1
```

- [ ] 検証メールを受信
- [ ] メールのリンクをクリックして検証完了
- [ ] ステータスが "Verified" になっていることを確認

```bash
aws ses get-identity-verification-attributes \
  --identities noreply@16bodypersonalities.com \
  --region ap-northeast-1
```

### サンドボックス解除（本番環境のみ）

- [ ] SESサンドボックスモードを解除申請済み（必要な場合）
- [ ] 任意のメールアドレスに送信可能であることを確認

## ✅ パラメータファイル

### 作成確認

- [ ] `parameters-production.json` を作成済み

```bash
cat aws/parameters-production.json
```

### 必須パラメータチェック

- [ ] `DBHost`: RDSエンドポイント（正しいか確認）
- [ ] `DBPassword`: 強力なパスワード（20文字以上推奨）
- [ ] `FromEmail`: 検証済みメールアドレス
- [ ] `BaseURL`: 本番環境URL（`https://16bodypersonalities.com`）

### パスワードの安全性

- [ ] パスワードに特殊文字を含む
- [ ] パスワードを `.gitignore` に追加（漏洩防止）
- [ ] パスワードマネージャーに保存

## ✅ デプロイ準備

### S3バケット

```bash
aws s3 mb s3://16bp-deployment-production --region ap-northeast-1
```

- [ ] S3バケット作成済み（`16bp-deployment-production`）

### Lambda依存関係

```bash
cd aws/lambda/layers/db-layer/nodejs
npm install --production
cd ../../../../
```

- [ ] Lambda Layerの依存関係インストール済み
- [ ] `node_modules` フォルダが存在することを確認

### テンプレート選択

- [ ] 使用するテンプレートを決定
  - `template.yaml`: 開発環境（db.t3.micro）
  - `template-small.yaml`: 本番環境・推奨（db.t3.small）
  - `template-high-load.yaml`: 大規模環境（db.t3.medium）

## ✅ デプロイ実行

### ビルド

```bash
cd aws
sam build --template template-small.yaml
```

- [ ] ビルドが成功（エラーなし）
- [ ] `.aws-sam/build/` ディレクトリが作成されている

### デプロイ（ドライラン）

```bash
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name 16bp-backend-production \
  --s3-bucket 16bp-deployment-production \
  --parameter-overrides file://parameters-production.json \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1 \
  --no-execute-changeset
```

- [ ] ChangeSetが作成される
- [ ] 変更内容を確認

### デプロイ（本番）

```bash
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name 16bp-backend-production \
  --s3-bucket 16bp-deployment-production \
  --parameter-overrides file://parameters-production.json \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

- [ ] デプロイが成功
- [ ] スタック作成完了（約5分）

### APIエンドポイント取得

```bash
aws cloudformation describe-stacks \
  --stack-name 16bp-backend-production \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

- [ ] APIエンドポイントを取得
- [ ] メモまたはコピー保存

## ✅ 動作確認

### 統計エンドポイント

```bash
curl https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod/stats
```

期待されるレスポンス:
```json
{
  "ok": true,
  "total": 0,
  "byType": {},
  "byBase": {"WAVE": 0, "NATURAL": 0, "STRAIGHT": 0}
}
```

- [ ] ステータス200
- [ ] JSON形式のレスポンス
- [ ] `ok: true`

### 診断保存エンドポイント

```bash
curl -X POST https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod/diagnoses \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BNLS",
    "scores": {"frame": {"mean": 2.5, "sd": 0.8}, "surface": {"mean": 3.2, "sd": 0.6}, "balance": {"mean": 2.8, "sd": 0.7}, "line": {"mean": 4.1, "sd": 0.5}},
    "sessionId": "test-deploy-check",
    "userAgent": "curl"
  }'
```

- [ ] ステータス200
- [ ] `id` が返される
- [ ] `ok: true`

### データベース確認

```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d postgres \
  -c "SELECT * FROM diagnoses WHERE session_id = 'test-deploy-check';"
```

- [ ] データが保存されている
- [ ] `code` が `BNLS` になっている

### プレミアム保存テスト

```bash
curl -X POST https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod/premium \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BNLS",
    "scores": {"frame": {"mean": 2.5, "sd": 0.8}},
    "answers": {"frame": [3,4,2,3,4,3,2,4,3,3,4,2]},
    "sessionId": "test-premium",
    "noMail": true
  }'
```

- [ ] ステータス200
- [ ] `token` が返される
- [ ] `link` が含まれる

### プレミアム取得テスト

```bash
# 上記で取得したtokenを使用
curl https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod/premium/TOKEN_HERE
```

- [ ] ステータス200
- [ ] `data.code` が `BNLS` になっている

## ✅ 監視設定

### CloudWatch Logs

```bash
aws logs tail /aws/lambda/16bp-saveDiagnosis --follow
```

- [ ] ログが出力されている
- [ ] エラーがない

### CloudWatch Alarms

```bash
aws cloudwatch describe-alarms \
  --alarm-names 16bp-saveDiagnosis-errors 16bp-api-throttles
```

- [ ] アラームが作成されている
- [ ] 状態が `OK` になっている

### RDS監視

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=16bp-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum
```

- [ ] 接続数が確認できる
- [ ] 最大接続数が198未満（db.t3.small）

## ✅ フロントエンド更新

### ファイル修正

- [ ] `app.html` のGAS_URLを更新
- [ ] `index.html` のGAS_URLを更新
- [ ] `premium.html` のGAS_URLを更新
- [ ] `premium-thanks.html` のGAS_URLを更新
- [ ] `contact.html` のGAS_URLを更新
- [ ] `resultView.js` のGAS_URLを更新

### ブラウザテスト

- [ ] ローカルサーバーで動作確認（`python3 -m http.server 8000`）
- [ ] 診断が正常に動作
- [ ] 統計が表示される
- [ ] お問い合わせフォームが送信できる

### 本番デプロイ

- [ ] 修正したファイルを本番環境にアップロード
- [ ] ブラウザキャッシュをクリア
- [ ] 本番環境で動作確認

## ✅ 負荷テスト（オプション）

```bash
cd aws
k6 run load-test.js --env API_URL=https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod
```

- [ ] k6をインストール済み
- [ ] 負荷テストを実行
- [ ] エラー率が5%未満
- [ ] 95%のリクエストが1秒以内

## ✅ セキュリティ

### 認証情報

- [ ] `parameters-production.json` を `.gitignore` に追加
- [ ] DBパスワードがGitリポジトリに含まれていない
- [ ] AWS認証情報が安全に保管されている

### ネットワーク

- [ ] RDSのセキュリティグループが適切に設定されている
- [ ] 不要なポートが開いていない

## ✅ バックアップ

### RDSバックアップ

```bash
aws rds create-db-snapshot \
  --db-instance-identifier 16bp-production \
  --db-snapshot-identifier 16bp-initial-backup-$(date +%Y%m%d)
```

- [ ] 初期バックアップを作成
- [ ] 自動バックアップが有効（7日保持）

### コードバックアップ

- [ ] Gitにコミット
- [ ] リモートリポジトリにプッシュ

## ✅ ドキュメント

- [ ] APIエンドポイントをドキュメントに記載
- [ ] デプロイ日時を記録
- [ ] 連絡先を記載（トラブル時）

## ✅ 最終確認

### 本番環境チェック

- [ ] 診断が完了する
- [ ] 結果が表示される
- [ ] 統計が更新される
- [ ] プレミアム購入が動作する
- [ ] メールが届く（テスト送信）

### パフォーマンス

- [ ] ページ読み込みが3秒以内
- [ ] API レスポンスが1秒以内
- [ ] エラーが発生していない

## 🎉 デプロイ完了

すべてのチェック項目が完了したら、デプロイ成功です！

### 次のステップ

1. 本番環境のモニタリング開始
2. ユーザーフィードバックの収集
3. パフォーマンスの継続的な改善

---

© 2025 16BodyPersonalities Project
