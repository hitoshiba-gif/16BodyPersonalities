# 16BodyPersonalities AWS Backend

GAS（Google Apps Script）からAWS（CloudFront + API Gateway + Lambda + PostgreSQL）への移行プロジェクト

## アーキテクチャ

```
[Client Browser]
    ↓
[CloudFront] (CDN - オプション)
    ↓
[API Gateway] (REST API)
    ↓
[Lambda Functions] (Node.js 18)
    ├─ saveDiagnosis    - 診断結果保存
    ├─ getStats         - 統計情報取得
    ├─ savePremium      - プレミアム保存・トークン発行
    ├─ getPremium       - プレミアムレポート取得
    ├─ resendPremium    - プレミアムURL再送
    └─ saveContact      - お問い合わせ保存
    ↓
[Lambda Layer] (共通DB接続)
    ↓
[RDS PostgreSQL] (データベース)
```

## ディレクトリ構成

```
aws/
├── database/
│   └── schema.sql                    # PostgreSQLスキーマ定義
├── lambda/
│   ├── layers/
│   │   └── db-layer/
│   │       └── nodejs/
│   │           ├── db.js             # DB接続プール
│   │           ├── utils.js          # ユーティリティ関数
│   │           └── package.json      # 依存関係（pg）
│   └── functions/
│       ├── saveDiagnosis/
│       │   ├── index.js
│       │   └── package.json
│       ├── getStats/
│       │   ├── index.js
│       │   └── package.json
│       ├── savePremium/
│       │   ├── index.js
│       │   └── package.json
│       ├── getPremium/
│       │   ├── index.js
│       │   └── package.json
│       ├── resendPremium/
│       │   ├── index.js
│       │   └── package.json
│       └── saveContact/
│           ├── index.js
│           └── package.json
├── template.yaml                     # SAMテンプレート
├── deploy.sh                         # デプロイスクリプト
├── parameters-production.json.example # パラメータサンプル
└── README.md                         # このファイル
```

## 前提条件

### 必要なツール

- **AWS CLI** v2以上
- **AWS SAM CLI** v1.80以上
- **Node.js** v18以上
- **PostgreSQL Client** (psql)

### インストール

```bash
# AWS CLI
brew install awscli

# SAM CLI
brew tap aws/tap
brew install aws-sam-cli

# Node.js
brew install node@18
```

### AWS認証情報の設定

```bash
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region name: ap-northeast-1
# Default output format: json
```

## セットアップ手順

### 1. RDS PostgreSQLの作成

#### オプションA: AWSコンソールから手動作成

1. RDS → データベース作成
2. エンジン: PostgreSQL 15
3. テンプレート: 本番稼働用
4. DB インスタンス識別子: `16bp-production`
5. マスターユーザー名: `postgres`
6. マスターパスワード: **安全なパスワードを設定**
7. インスタンスクラス: `db.t3.micro` (開発) or `db.t3.small` (本番)
8. ストレージ: 20GB (SSD)
9. VPC: デフォルトVPC
10. パブリックアクセス: **はい** (Lambda からアクセスする場合)
11. セキュリティグループ: PostgreSQL (5432) を Lambda セキュリティグループから許可

#### オプションB: AWS CLIで作成

```bash
aws rds create-db-instance \
  --db-instance-identifier 16bp-production \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --publicly-accessible \
  --region ap-northeast-1
```

### 2. データベーススキーマの適用

RDSエンドポイントを確認:

```bash
aws rds describe-db-instances \
  --db-instance-identifier 16bp-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

スキーマを適用:

```bash
cd aws
psql -h YOUR_RDS_ENDPOINT.amazonaws.com \
     -U postgres \
     -d postgres \
     -f database/schema.sql
```

### 3. SESのセットアップ（メール送信用）

#### メールアドレスの検証

```bash
# 送信元メールアドレスを検証
aws ses verify-email-identity \
  --email-address noreply@16bodypersonalities.com \
  --region ap-northeast-1

# 確認メールが届くので、リンクをクリックして検証
```

#### サンドボックス解除（本番環境）

SESはデフォルトでサンドボックスモードです。本番環境では解除が必要:

1. AWS Console → SES → Account dashboard
2. "Request production access" をクリック
3. フォームを記入して送信

### 4. パラメータファイルの作成

```bash
cd aws
cp parameters-production.json.example parameters-production.json
```

`parameters-production.json` を編集:

```json
[
  {
    "ParameterKey": "DBHost",
    "ParameterValue": "16bp-production.xxxxxx.ap-northeast-1.rds.amazonaws.com"
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

### 5. デプロイ

```bash
cd aws
./deploy.sh production
```

デプロイ完了後、APIエンドポイントが表示されます:

```
API Endpoint: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

## API エンドポイント

### 診断結果保存

```bash
POST /diagnoses
Content-Type: application/json

{
  "code": "BNLS",
  "scores": {
    "frame": { "mean": 2.5, "sd": 0.8 },
    "surface": { "mean": 3.2, "sd": 0.6 },
    "balance": { "mean": 2.8, "sd": 0.7 },
    "line": { "mean": 4.1, "sd": 0.5 }
  },
  "answers": { ... },
  "sessionId": "uuid-here",
  "userAgent": "Mozilla/5.0..."
}
```

### 統計情報取得

```bash
GET /stats

Response:
{
  "ok": true,
  "total": 1234,
  "byType": {
    "BNLS": 45,
    "MNLC": 32,
    ...
  },
  "byBase": {
    "WAVE": 450,
    "NATURAL": 384,
    "STRAIGHT": 400
  }
}
```

### プレミアム保存

```bash
POST /premium
Content-Type: application/json

{
  "code": "BNLS",
  "scores": { ... },
  "answers": { ... },
  "sessionId": "uuid",
  "stripe_session": "cs_test_...",
  "email": "user@example.com",
  "noMail": false
}

Response:
{
  "ok": true,
  "token": "abc123...",
  "link": "https://16bodypersonalities.com/premium.html?token=abc123...",
  "emailSent": true
}
```

### プレミアムレポート取得

```bash
GET /premium/{token}

Response:
{
  "ok": true,
  "data": {
    "code": "BNLS",
    "scores": { ... },
    "answers": { ... }
  }
}
```

## トラブルシューティング

### デプロイエラー

#### S3バケット権限エラー

```bash
# バケットポリシーを確認
aws s3api get-bucket-policy --bucket 16bp-deployment-production
```

#### Lambda実行エラー

```bash
# CloudWatch Logsを確認
aws logs tail /aws/lambda/16bp-saveDiagnosis --follow
```

### データベース接続エラー

#### タイムアウト

- セキュリティグループでLambdaからのアクセスを許可しているか確認
- RDSエンドポイントが正しいか確認

#### 認証エラー

- DBパスワードが正しいか確認
- ユーザー名が `postgres` になっているか確認

### メール送信エラー

#### SES検証エラー

```bash
# メールアドレスの検証状態を確認
aws ses get-identity-verification-attributes \
  --identities noreply@16bodypersonalities.com
```

## 監視とメンテナンス

### CloudWatch アラーム設定

```bash
# Lambda エラーアラーム
aws cloudwatch put-metric-alarm \
  --alarm-name 16bp-lambda-errors \
  --alarm-description "Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### 統計ビューの更新

PostgreSQLのマテリアライズドビューは定期的に更新が必要:

```bash
# 手動更新
psql -h YOUR_RDS_ENDPOINT \
     -U postgres \
     -d 16bp_production \
     -c "REFRESH MATERIALIZED VIEW CONCURRENTLY diagnosis_stats;"
```

## コスト見積もり

### 月間コスト（想定: 月10,000リクエスト）

- **Lambda**: $0.20 (無料枠内)
- **API Gateway**: $3.50
- **RDS (db.t3.micro)**: $15
- **データ転送**: $1
- **SES**: $0 (月62,000通まで無料)

**合計**: 約 $20/月

### コスト最適化

- Lambda: メモリサイズを最適化（512MB → 256MBに削減可能）
- RDS: 開発環境では停止して課金を削減
- CloudWatch Logs: 保持期間を設定（デフォルト: 無期限 → 30日）

## 次のステップ

1. **フロントエンドの更新**
   - `app.html`, `index.html`, `premium.html` などのGAS_URLを新しいAPI エンドポイントに変更
   - CORS設定の確認

2. **CloudFrontの設定** (オプション)
   - API Gatewayの前段にCloudFrontを配置してキャッシュとパフォーマンス向上

3. **CI/CDパイプラインの構築**
   - GitHub Actions を使用した自動デプロイ

4. **バックアップ設定**
   - RDSの自動バックアップを有効化
   - スナップショットの定期作成

## サポート

問題が発生した場合は、以下を確認してください:

1. CloudWatch Logs でエラーログを確認
2. RDSの接続状態を確認
3. セキュリティグループの設定を確認

---

© 2025 16BodyPersonalities Project
