# 16BodyPersonalities AWS移行プロジェクト

GASからAWS（CloudFront + API Gateway + Lambda + PostgreSQL）への完全移行パッケージ

## 📚 ドキュメント一覧

### 🚀 クイックスタート

1. **[QUICK_START.md](QUICK_START.md)** ⭐️
   - 最速30分でデプロイ完了
   - db.t3.small推奨構成
   - 5分で1000回リクエストに対応

### 📖 詳細ガイド

2. **[README.md](README.md)**
   - 完全なセットアップ手順
   - アーキテクチャ詳細
   - トラブルシューティング

3. **[HIGH_LOAD_GUIDE.md](HIGH_LOAD_GUIDE.md)**
   - 高負荷対応の設計
   - RDS接続プール最適化
   - パフォーマンスチューニング

4. **[TEMPLATE_COMPARISON.md](TEMPLATE_COMPARISON.md)**
   - 3つのテンプレート比較
   - 用途別の選択ガイド
   - コスト比較

5. **[FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md)**
   - フロントエンド修正手順
   - ファイル別の詳細変更内容
   - GAS → AWS API変換

6. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)**
   - デプロイ前チェックリスト
   - 項目別の確認手順
   - 本番環境デプロイガイド

---

## 🏗️ アーキテクチャ

```
[Client Browser]
    ↓
[CloudFront (Optional)]
    ↓
[API Gateway]
  ├─ /diagnoses      → saveDiagnosis Lambda
  ├─ /stats          → getStats Lambda (キャッシュ5分)
  ├─ /premium        → savePremium Lambda
  ├─ /premium/{token}→ getPremium Lambda
  ├─ /premium/resend → resendPremium Lambda
  └─ /contact        → saveContact Lambda
    ↓
[Lambda Layer] (DB接続プール)
    ↓
[RDS PostgreSQL]
  ├─ diagnoses (診断結果)
  ├─ premium_reports (プレミアムレポート)
  └─ contacts (お問い合わせ)
```

---

## 📁 ファイル構成

```
aws/
├── 📄 INDEX.md                          # このファイル
├── 📄 QUICK_START.md                    # クイックスタートガイド ⭐️
├── 📄 README.md                         # 詳細セットアップガイド
├── 📄 HIGH_LOAD_GUIDE.md                # 高負荷対応ガイド
├── 📄 TEMPLATE_COMPARISON.md            # テンプレート比較
├── 📄 FRONTEND_MIGRATION.md             # フロントエンド移行ガイド
├── 📄 DEPLOYMENT_CHECKLIST.md           # デプロイチェックリスト
│
├── 🔧 template.yaml                     # SAMテンプレート（標準）
├── 🔧 template-small.yaml               # SAMテンプレート（推奨・db.t3.small）
├── 🔧 template-high-load.yaml           # SAMテンプレート（高負荷・db.t3.medium）
│
├── 🚀 deploy.sh                         # デプロイスクリプト
├── 🛠️ setup-env.sh                      # 環境変数セットアップヘルパー
├── 📊 load-test.js                      # k6負荷テストスクリプト
│
├── 📝 parameters-production.json.example # パラメータサンプル
├── 📝 .env.example                      # 環境変数サンプル
├── 🔒 .gitignore                        # Git除外設定
│
├── database/
│   └── 📜 schema.sql                    # PostgreSQLスキーマ定義
│
└── lambda/
    ├── layers/
    │   └── db-layer/
    │       └── nodejs/
    │           ├── 📦 db.js             # DB接続プール
    │           ├── 🛠️ utils.js          # ユーティリティ関数
    │           └── 📋 package.json      # 依存関係（pg）
    │
    └── functions/
        ├── saveDiagnosis/               # 診断結果保存
        ├── getStats/                    # 統計情報取得
        ├── savePremium/                 # プレミアム保存
        ├── getPremium/                  # プレミアム取得
        ├── resendPremium/               # URL再送信
        └── saveContact/                 # お問い合わせ保存
```

---

## 🎯 推奨デプロイフロー

### Step 1: 環境確認（5分）

```bash
# 前提条件チェック
aws --version           # AWS CLI v2
sam --version           # SAM CLI
node --version          # Node.js 18+
psql --version          # PostgreSQL client
```

### Step 2: RDS作成（10分）

```bash
# db.t3.small推奨
aws rds create-db-instance \
  --db-instance-identifier 16bp-production \
  --db-instance-class db.t3.small \
  --engine postgres \
  --master-username postgres \
  --master-user-password "YOUR_PASSWORD" \
  --allocated-storage 20 \
  --publicly-accessible \
  --region ap-northeast-1
```

### Step 3: スキーマ適用（2分）

```bash
cd aws
psql -h YOUR_RDS_ENDPOINT -U postgres -d postgres -f database/schema.sql
```

### Step 4: SES設定（5分）

```bash
aws ses verify-email-identity \
  --email-address noreply@16bodypersonalities.com \
  --region ap-northeast-1
# メール確認リンクをクリック
```

### Step 5: パラメータ設定（3分）

```bash
cp parameters-production.json.example parameters-production.json
nano parameters-production.json  # DB情報を設定
```

### Step 6: デプロイ（5分）

```bash
# db.t3.small用（推奨）
sam build --template template-small.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name 16bp-backend-production \
  --s3-bucket 16bp-deployment-production \
  --parameter-overrides file://parameters-production.json \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

### Step 7: 動作確認（2分）

```bash
# APIエンドポイント取得
export API_URL=$(aws cloudformation describe-stacks \
  --stack-name 16bp-backend-production \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# 統計取得テスト
curl $API_URL/stats
```

### Step 8: フロントエンド更新

`FRONTEND_MIGRATION.md` を参照して、HTMLファイルのGAS URLを更新

---

## 💰 コスト比較

| 構成 | RDS | Lambda | API Gateway | 合計/月 |
|------|-----|--------|------------|---------|
| **開発** | db.t3.micro ($15) | $0.20 | $3.50 | **$20** |
| **本番（推奨）** | db.t3.small ($30) | $0.20 | $3.50 | **$35** |
| **大規模** | db.t3.medium ($60) | $0.20 | $3.50 | **$70** |

### 負荷対応能力

| 構成 | リクエスト/秒 | 5分間の総リクエスト | Lambda同時実行 |
|------|-------------|------------------|--------------|
| 開発 | 1-2 | 300-600 | 無制限 |
| **本番** | **3-5** | **900-1,500** | **150** |
| 大規模 | 5-10 | 1,500-3,000 | 190 |

---

## 🔧 テンプレート選択

### template.yaml
- **用途**: 開発・テスト環境
- **RDS**: db.t3.micro
- **コスト**: $20/月
- **負荷**: 低

### template-small.yaml ⭐️（推奨）
- **用途**: 本番環境
- **RDS**: db.t3.small
- **コスト**: $35/月
- **負荷**: 中（5分で1000回対応）

### template-high-load.yaml
- **用途**: 大規模トラフィック
- **RDS**: db.t3.medium
- **コスト**: $70/月
- **負荷**: 高

---

## 📊 API エンドポイント

| メソッド | パス | 機能 | Lambda |
|---------|------|------|--------|
| POST | `/diagnoses` | 診断結果保存 | saveDiagnosis |
| GET | `/stats` | 統計情報取得 | getStats |
| POST | `/premium` | プレミアム保存 | savePremium |
| GET | `/premium/{token}` | プレミアム取得 | getPremium |
| POST | `/premium/resend` | URL再送信 | resendPremium |
| POST | `/contact` | お問い合わせ | saveContact |

---

## 🧪 負荷テスト

```bash
# k6インストール
brew install k6

# 5分で1200回リクエストをシミュレート
k6 run load-test.js --env API_URL=$API_URL
```

期待される結果:
- ✅ エラー率: 5%未満
- ✅ 95%のリクエスト: 1秒以内
- ✅ スロットリング: 10回未満

---

## 🚨 トラブルシューティング

### よくある問題

1. **RDS接続エラー**
   - セキュリティグループでポート5432を開放
   - パスワードが正しいか確認

2. **Lambda Timeout**
   - DB接続数を確認
   - RDSインスタンスをアップグレード

3. **429 Too Many Requests**
   - API Gatewayスロットリング制限を確認
   - 制限を緩和（template編集）

4. **SESメール送信失敗**
   - メールアドレスが検証済みか確認
   - サンドボックスモードか確認

詳細は `README.md` のトラブルシューティングセクション参照

---

## 📈 監視

### CloudWatch Logs

```bash
# Lambda ログ
aws logs tail /aws/lambda/16bp-saveDiagnosis --follow

# API Gateway ログ
aws logs tail /aws/apigateway/16bp-backend-production --follow
```

### CloudWatch Metrics

- Lambda同時実行数
- RDS接続数
- API Gatewayリクエスト数
- エラー率

### CloudWatch Alarms

- Lambda エラーアラーム
- API スロットリングアラーム
- RDS CPU使用率アラーム

---

## 🔄 アップグレード手順

### db.t3.micro → db.t3.small

```bash
# バックアップ
aws rds create-db-snapshot \
  --db-instance-identifier 16bp-production \
  --db-snapshot-identifier backup-$(date +%Y%m%d)

# アップグレード
aws rds modify-db-instance \
  --db-instance-identifier 16bp-production \
  --db-instance-class db.t3.small \
  --apply-immediately

# スタック更新
sam build --template template-small.yaml
sam deploy ...
```

---

## 🎓 学習リソース

### AWS公式ドキュメント

- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Amazon RDS](https://docs.aws.amazon.com/rds/)
- [API Gateway](https://docs.aws.amazon.com/apigateway/)
- [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/)

### サンプルコード

- `lambda/functions/*` - Lambda関数の実装例
- `load-test.js` - k6負荷テストの例

---

## 📞 サポート

### 問題が発生したら

1. `DEPLOYMENT_CHECKLIST.md` で確認
2. `README.md` のトラブルシューティング参照
3. CloudWatch Logsでエラーログ確認
4. GitHubでIssue作成

---

## ✅ 次のステップ

1. ✅ `QUICK_START.md` に従ってデプロイ
2. ✅ 動作確認
3. ✅ フロントエンド更新
4. ✅ 負荷テスト実行
5. ⏭️ 本番環境でユーザーテスト
6. ⏭️ パフォーマンス監視
7. ⏭️ 必要に応じてスケールアップ

---

## 🎉 まとめ

このパッケージには、GASからAWSへ移行するために必要なすべてが含まれています：

- ✅ PostgreSQLスキーマ
- ✅ Lambda関数6つ（完全実装）
- ✅ SAMテンプレート3種類
- ✅ デプロイスクリプト
- ✅ 負荷テストスクリプト
- ✅ 詳細ドキュメント6つ
- ✅ チェックリスト

**まずは `QUICK_START.md` から始めてください！**

---

© 2025 16BodyPersonalities Project
