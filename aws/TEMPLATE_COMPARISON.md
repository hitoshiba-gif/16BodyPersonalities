# テンプレート選択ガイド

3つのテンプレートから用途に応じて選択してください

## テンプレート比較表

| 項目 | template.yaml<br>（標準） | **template-small.yaml**<br>（推奨） | template-high-load.yaml<br>（高負荷） |
|------|------------------------|----------------------------|-------------------------------|
| **RDS推奨** | db.t3.micro | **db.t3.small** | db.t3.medium |
| **RDS接続数** | 87 | **198** | 413 |
| **Lambda同時実行** | 無制限 | **150** | 190 |
| **DB接続/Lambda** | 2 | **1** | 2 |
| **必要接続数** | 不明 | **150** | 380 |
| **API スロットリング** | なし | **あり（30/秒）** | あり（50/秒） |
| **統計キャッシュ** | 60秒 | **300秒** | 300秒 |
| **Provisioned Concurrency** | なし | **あり（2）** | あり（2） |
| **対応リクエスト/秒** | 1-2 | **3-5** | 5-10 |
| **5分間の総リクエスト** | 300-600 | **900-1,500** | 1,500-3,000 |
| **月額コスト** | $20 | **$35** | $70 |

## 推奨構成

### 🏁 スタートアップ / テスト環境 → `template.yaml`

**こんな場合に:**
- まだユーザーが少ない（1日100人未満）
- 開発・テスト環境
- コストを最小限に抑えたい

**デプロイ:**
```bash
sam build --template template.yaml
sam deploy --stack-name 16bp-backend-dev ...
```

**月額コスト:** 約$20

---

### ⭐️ 本番環境（推奨） → `template-small.yaml`

**こんな場合に:**
- 本番環境
- 中規模のトラフィック（1日500-1000人）
- コストとパフォーマンスのバランス
- **5分で1000回リクエストに対応したい**

**デプロイ:**
```bash
sam build --template template-small.yaml
sam deploy --stack-name 16bp-backend-production ...
```

**月額コスト:** 約$35

**接続数計算:**
```
Lambda同時実行数: 150
各Lambdaの接続数: 1
必要な接続数: 150 × 1 = 150
db.t3.smallの接続数: 198
余裕: 48接続 ✅
```

---

### 🚀 大規模トラフィック → `template-high-load.yaml`

**こんな場合に:**
- 大規模トラフィック（1日3000人以上）
- バイラル拡散の可能性
- 高いパフォーマンスが必要
- コストよりも安定性重視

**デプロイ:**
```bash
sam build --template template-high-load.yaml
sam deploy --stack-name 16bp-backend-large ...
```

**月額コスト:** 約$70

**接続数計算:**
```
Lambda同時実行数: 190
各Lambdaの接続数: 2
必要な接続数: 190 × 2 = 380
db.t3.mediumの接続数: 413
余裕: 33接続 ✅
```

---

## 詳細比較

### Lambda同時実行数の配分

| 関数 | template.yaml | template-small.yaml | template-high-load.yaml |
|------|---------------|---------------------|------------------------|
| saveDiagnosis | 無制限 | 60 | 100 |
| getStats | 無制限 | 20 | 20 |
| savePremium | 無制限 | 30 | 30 |
| getPremium | 無制限 | 20 | 20 |
| resendPremium | 無制限 | 10 | 10 |
| saveContact | 無制限 | 10 | 10 |
| **合計** | **無制限** | **150** | **190** |

### API Gatewayスロットリング

| 設定 | template.yaml | template-small.yaml | template-high-load.yaml |
|------|---------------|---------------------|------------------------|
| ThrottlingBurstLimit | なし | 50 | 100 |
| ThrottlingRateLimit | なし | 30/秒 | 50/秒 |

### コスト内訳（月間100万リクエスト想定）

| サービス | template.yaml | template-small.yaml | template-high-load.yaml |
|---------|---------------|---------------------|------------------------|
| Lambda | $0.20 | $0.20 | $0.20 |
| API Gateway | $3.50 | $3.50 | $3.50 |
| **RDS** | **$15** | **$30** | **$60** |
| RDS Storage | $2.30 | $2.30 | $2.30 |
| Data Transfer | $1.00 | $1.00 | $1.00 |
| CloudWatch | $0.50 | $2.50 | $2.50 |
| **合計** | **$22.50** | **$39.50** | **$69.50** |

## 切り替え手順

### template.yaml → template-small.yaml へアップグレード

#### 1. RDSをアップグレード

```bash
# バックアップ作成
aws rds create-db-snapshot \
  --db-instance-identifier 16bp-production \
  --db-snapshot-identifier 16bp-backup-$(date +%Y%m%d)

# インスタンスクラス変更（約5-10分のダウンタイム）
aws rds modify-db-instance \
  --db-instance-identifier 16bp-production \
  --db-instance-class db.t3.small \
  --apply-immediately
```

#### 2. スタックを更新

```bash
sam build --template template-small.yaml

sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name 16bp-backend-production \
  --s3-bucket 16bp-deployment-production \
  --parameter-overrides file://parameters-production.json \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

### template-small.yaml → template-high-load.yaml へアップグレード

同様の手順で `db.t3.small` → `db.t3.medium` にアップグレード後、`template-high-load.yaml` をデプロイ

---

## トラブルシューティング

### RDS接続数エラー

**症状:**
```
remaining connection slots are reserved for non-replication superuser connections
```

**原因:** Lambda同時実行数 × 接続プール数 > RDS接続数

**対処法:**

#### オプション1: RDSをアップグレード
```bash
# small → medium
aws rds modify-db-instance \
  --db-instance-identifier 16bp-production \
  --db-instance-class db.t3.medium \
  --apply-immediately
```

#### オプション2: Lambda同時実行数を減らす
```yaml
# template-small.yaml を編集
SaveDiagnosisFunction:
  ReservedConcurrentExecutions: 60 → 40
```

#### オプション3: 接続プール設定を調整
```yaml
Environment:
  Variables:
    DB_POOL_MAX: '1' → '0.5'  # さらに減らす
    DB_POOL_IDLE_TIMEOUT: '30000' → '10000'  # 早めに切断
```

### APIスロットリングエラー

**症状:** `429 Too Many Requests`

**対処法:**
```yaml
# template-small.yaml を編集
MethodSettings:
  ThrottlingRateLimit: 30 → 50  # 制限を緩和
```

---

## 推奨デプロイパターン

### パターン1: スモールスタート

```
開発環境: template.yaml (db.t3.micro)
    ↓ ユーザー増加
本番環境: template-small.yaml (db.t3.small)  ← ここからスタート推奨
    ↓ さらに増加
大規模環境: template-high-load.yaml (db.t3.medium)
```

### パターン2: 最初から本番想定

```
本番環境: template-small.yaml (db.t3.small)  ← 最初からこれを使用
```

### パターン3: 高トラフィック確定

```
本番環境: template-high-load.yaml (db.t3.medium)  ← バイラル拡散が予想される場合
```

---

## まとめ

### 💡 迷ったら `template-small.yaml` を選択

- ✅ 5分で1000回リクエストに対応
- ✅ コストとパフォーマンスのバランス◎
- ✅ 月額$35で安心の本番運用
- ✅ 必要に応じてアップグレード可能

### 📋 選択フローチャート

```
Q: 本番環境？
   Yes → Q: 1日500人以上のユーザーが見込める？
          Yes → template-small.yaml ⭐️
          No  → template.yaml（様子見）

   No → 開発環境？
         Yes → template.yaml
         No  → 大規模？ → template-high-load.yaml
```

---

© 2025 16BodyPersonalities Project
