# クイックスタートガイド

5分で1000回リクエストに対応したAWSバックエンドのセットアップ

## 前提条件

- AWS CLI v2インストール済み
- AWS SAM CLIインストール済み
- AWS認証情報設定済み（`aws configure`）
- Node.js 18インストール済み

## 1. RDSデータベースの作成（10分）

### オプションA: AWS CLIで作成

```bash
aws rds create-db-instance \
  --db-instance-identifier 16bp-production \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 15.3 \
  --master-username postgres \
  --master-user-password "YOUR_SECURE_PASSWORD_HERE" \
  --allocated-storage 20 \
  --publicly-accessible \
  --backup-retention-period 7 \
  --region ap-northeast-1

# エンドポイントを取得（約5分後）
aws rds describe-db-instances \
  --db-instance-identifier 16bp-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### オプションB: AWSコンソールで作成

1. RDS → データベース作成
2. エンジン: **PostgreSQL 15**
3. テンプレート: **本番稼働用**
4. DB識別子: `16bp-production`
5. マスターユーザー名: `postgres`
6. マスターパスワード: **強力なパスワード**
7. インスタンスクラス: **db.t3.small**
8. ストレージ: 20GB SSD
9. パブリックアクセス: **はい**
10. セキュリティグループ: デフォルトVPC
11. 作成

## 2. データベーススキーマの適用（1分）

```bash
cd aws

# RDSエンドポイントを環境変数に設定
export DB_ENDPOINT="your-rds-endpoint.amazonaws.com"

# スキーマを適用
psql -h $DB_ENDPOINT \
     -U postgres \
     -d postgres \
     -f database/schema.sql

# パスワードを入力（RDS作成時に設定したもの）
```

## 3. SESメール送信の設定（5分）

```bash
# 送信元メールアドレスを検証
aws ses verify-email-identity \
  --email-address noreply@16bodypersonalities.com \
  --region ap-northeast-1

# ✉️ 確認メールが届くのでリンクをクリック
```

## 4. パラメータファイルの作成（2分）

```bash
cd aws

# サンプルをコピー
cp parameters-production.json.example parameters-production.json

# エディタで編集
nano parameters-production.json
```

以下を設定:

```json
[
  {
    "ParameterKey": "DBHost",
    "ParameterValue": "your-rds-endpoint.amazonaws.com"
  },
  {
    "ParameterKey": "DBPassword",
    "ParameterValue": "YOUR_ACTUAL_PASSWORD"
  },
  {
    "ParameterKey": "FromEmail",
    "ParameterValue": "noreply@16bodypersonalities.com"
  }
]
```

## 5. デプロイ（5分）

```bash
cd aws

# 依存関係をインストール（初回のみ）
cd lambda/layers/db-layer/nodejs && npm install && cd ../../../..

# db.t3.small 用のテンプレートでデプロイ
sam build --template template-small.yaml

sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name 16bp-backend-production \
  --s3-bucket 16bp-deployment-production \
  --parameter-overrides file://parameters-production.json \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1 \
  --no-fail-on-empty-changeset
```

デプロイ完了後、APIエンドポイントが表示されます:

```
API Endpoint: https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/prod
```

## 6. 動作確認（2分）

```bash
# API_URLを環境変数に設定
export API_URL="https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/prod"

# 統計エンドポイントをテスト
curl $API_URL/stats

# 診断保存をテスト
curl -X POST $API_URL/diagnoses \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BNLS",
    "scores": {
      "frame": {"mean": 2.5, "sd": 0.8},
      "surface": {"mean": 3.2, "sd": 0.6},
      "balance": {"mean": 2.8, "sd": 0.7},
      "line": {"mean": 4.1, "sd": 0.5}
    },
    "sessionId": "test-session",
    "userAgent": "curl-test"
  }'
```

期待されるレスポンス:

```json
{
  "ok": true,
  "id": 1,
  "sessionId": "test-session",
  "code": "BNLS",
  "createdAt": "2025-01-01T12:00:00.000Z"
}
```

## 7. 負荷テスト（オプション）

```bash
# k6をインストール
brew install k6

# 負荷テストを実行
cd aws
k6 run load-test.js --env API_URL=$API_URL
```

## 8. フロントエンドの更新

`FRONTEND_MIGRATION.md` を参照して以下のファイルを更新:

- `app.html`
- `index.html`
- `premium.html`
- `premium-thanks.html`
- `contact.html`
- `resultView.js`

すべてのファイルで以下を置き換え:

```javascript
// 変更前
const GAS_URL = "https://script.google.com/macros/s/.../exec";

// 変更後
const API_BASE_URL = "https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/prod";
```

## 構成概要

### Lambda同時実行数

| 関数 | 予約数 | 用途 |
|-----|-------|------|
| saveDiagnosis | 100 | 診断保存（メイン） |
| getStats | 20 | 統計取得（キャッシュ有効） |
| savePremium | 30 | プレミアム保存 |
| getPremium | 20 | プレミアム取得 |
| resendPremium | 10 | メール再送 |
| saveContact | 10 | お問い合わせ |

**合計**: 190同時実行

### API Gatewayスロットリング

- **バーストリミット**: 100リクエスト
- **定常レート**: 50リクエスト/秒

### RDS設定

- **インスタンス**: db.t3.medium
- **最大接続数**: 413接続
- **Lambda接続数**: 2接続/関数 × 190 = 380接続（余裕あり）

### キャッシュ

- **統計データ**: 5分間キャッシュ
- **DB負荷**: 約80%削減

## コスト

### 月間100万リクエスト（高負荷想定）

| サービス | 月額 |
|---------|------|
| Lambda | $0.20 |
| API Gateway | $3.50 |
| **RDS (db.t3.medium)** | **$60** |
| RDS Storage | $2.30 |
| Data Transfer | $1.00 |
| CloudWatch Logs | $2.50 |

**合計**: 約**$70/月**

## 次のステップ

1. ✅ フロントエンドの更新
2. ✅ 本番環境でテスト
3. ✅ CloudWatch アラームの設定確認
4. ✅ バックアップ設定の確認
5. ⏭️ 必要に応じてElastiCache導入検討

## トラブルシューティング

### デプロイエラー

```bash
# S3バケットが存在しない
aws s3 mb s3://16bp-deployment-production --region ap-northeast-1

# CloudFormationスタックの状態確認
aws cloudformation describe-stacks --stack-name 16bp-backend-production
```

### DB接続エラー

```bash
# セキュリティグループでLambdaからのアクセスを許可
# RDSセキュリティグループに以下を追加:
# Type: PostgreSQL
# Port: 5432
# Source: Lambda セキュリティグループ または 0.0.0.0/0
```

### Lambda タイムアウト

```bash
# CloudWatch Logsでエラーを確認
aws logs tail /aws/lambda/16bp-saveDiagnosis --follow
```

## サポート

- **詳細なセットアップ**: `README.md`
- **高負荷対応**: `HIGH_LOAD_GUIDE.md`
- **フロントエンド移行**: `FRONTEND_MIGRATION.md`

---

© 2025 16BodyPersonalities Project
