# 高負荷対応ガイド

5分で1000回リクエスト（1秒あたり3.3リクエスト）の負荷に対応するための設定ガイド

## 想定負荷

- **通常時**: 1秒あたり1-2リクエスト
- **ピーク時**: 5分で1000リクエスト（1秒あたり約3.3リクエスト）
- **最大同時実行**: 100-150 Lambda関数

## アーキテクチャ最適化

### 1. Lambda同時実行数の制限

**目的**: RDS接続数の枯渇を防ぐ

```yaml
# template-high-load.yaml
SaveDiagnosisFunction:
  ReservedConcurrentExecutions: 100  # 書き込みが多いので多めに確保

GetStatsFunction:
  ReservedConcurrentExecutions: 20   # キャッシュ有効なので少なめ
  ProvisionedConcurrencyConfig:
    ProvisionedConcurrentExecutions: 2  # コールドスタート回避
```

**合計予約同時実行数**: 190

### 2. RDS接続プール設定

**db.t3.micro の最大接続数**: 約87接続
**db.t3.small の最大接続数**: 約198接続

#### Lambda1つあたりの接続数計算

```
最大Lambda数: 190
Lambda1つあたりの最大接続: 2
必要な接続数: 190 × 2 = 380接続
```

**⚠️ db.t3.microでは不足！**

#### 推奨RDSインスタンス

| インスタンス | 最大接続数 | Lambda接続数 | 月額費用 |
|------------|-----------|------------|---------|
| db.t3.micro | 87 | 不足 | $15 |
| db.t3.small | 198 | 不足 | $30 |
| **db.t3.medium** | **413** | ✅ 十分 | **$60** |
| db.m5.large | 1000+ | 十分 | $140 |

#### DB接続プール設定（環境変数）

```yaml
Environment:
  Variables:
    DB_POOL_MAX: '2'         # Lambda1つあたりの最大接続数
    DB_POOL_MIN: '0'         # アイドル時は接続を保持しない
    DB_POOL_IDLE_TIMEOUT: '30000'  # 30秒でアイドル接続を切断
```

### 3. API Gatewayスロットリング

**目的**: 急激な負荷でRDSがダウンしないよう保護

```yaml
MethodSettings:
  - ResourcePath: "/*"
    HttpMethod: "*"
    ThrottlingBurstLimit: 100   # バースト時の最大リクエスト数
    ThrottlingRateLimit: 50     # 1秒あたりの定常リクエスト数
```

**制限を超えたリクエスト**: `429 Too Many Requests` を返却

### 4. 統計データのキャッシュ延長

```yaml
GetStatsFunction:
  Environment:
    Variables:
      CACHE_TTL: '300'  # キャッシュを5分（300秒）に延長
```

#### キャッシュヒット率の向上

- 60秒 → 5分に延長することで、DB負荷を**約80%削減**
- 統計データは頻繁に変わらないため、5分のキャッシュでもUXに影響なし

### 5. CloudWatch アラーム

#### Lambdaエラー監視

```yaml
SaveDiagnosisErrorAlarm:
  MetricName: Errors
  Threshold: 5  # 1分間に5回エラー発生でアラート
```

#### APIスロットリング監視

```yaml
ApiThrottleAlarm:
  MetricName: Count
  Threshold: 10  # 1分間に10回スロットリングでアラート
```

## デプロイ手順

### 標準構成（低負荷）

```bash
cd aws
./deploy.sh production
```

### 高負荷構成

```bash
cd aws

# 高負荷用テンプレートを使用
sam build --template template-high-load.yaml

sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name 16bp-backend-production \
  --s3-bucket 16bp-deployment-production \
  --parameter-overrides file://parameters-production.json \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

## RDSのアップグレード

### db.t3.micro → db.t3.medium

```bash
# バックアップを取得（念のため）
aws rds create-db-snapshot \
  --db-instance-identifier 16bp-production \
  --db-snapshot-identifier 16bp-backup-$(date +%Y%m%d)

# インスタンスクラスを変更
aws rds modify-db-instance \
  --db-instance-identifier 16bp-production \
  --db-instance-class db.t3.medium \
  --apply-immediately

# 変更状態を確認（数分かかる）
aws rds describe-db-instances \
  --db-instance-identifier 16bp-production \
  --query 'DBInstances[0].DBInstanceStatus'
```

### ダウンタイム

- **apply-immediately**: 約5-10分のダウンタイム
- **メンテナンスウィンドウ**: ダウンタイムなし（週1回の自動メンテナンス時）

## パフォーマンス監視

### CloudWatch Metricsの確認

```bash
# Lambda同時実行数
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name ConcurrentExecutions \
  --dimensions Name=FunctionName,Value=16bp-saveDiagnosis \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-01T01:00:00Z \
  --period 60 \
  --statistics Maximum

# RDS接続数
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=16bp-production \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-01T01:00:00Z \
  --period 60 \
  --statistics Maximum
```

### ログの確認

```bash
# Lambda エラーログ
aws logs tail /aws/lambda/16bp-saveDiagnosis --follow

# API Gateway アクセスログ
aws logs tail /aws/apigateway/16bp-backend-production --follow
```

## 負荷テスト

### Apache Benchを使った負荷テスト

```bash
# 診断保存エンドポイント
ab -n 1000 -c 10 -p test-data.json -T application/json \
  https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod/diagnoses

# 統計取得エンドポイント
ab -n 1000 -c 20 \
  https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod/stats
```

### test-data.json

```json
{
  "code": "BNLS",
  "scores": {
    "frame": {"mean": 2.5, "sd": 0.8},
    "surface": {"mean": 3.2, "sd": 0.6},
    "balance": {"mean": 2.8, "sd": 0.7},
    "line": {"mean": 4.1, "sd": 0.5}
  },
  "sessionId": "test-session-id",
  "userAgent": "Apache Bench"
}
```

### k6を使った負荷テスト（推奨）

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },   // 1分かけて10ユーザーまで増加
    { duration: '5m', target: 10 },   // 5分間10ユーザーを維持
    { duration: '1m', target: 0 },    // 1分かけて0に減少
  ],
};

const API_URL = 'https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod';

export default function() {
  // 診断保存
  let payload = JSON.stringify({
    code: 'BNLS',
    scores: {
      frame: {mean: 2.5, sd: 0.8},
      surface: {mean: 3.2, sd: 0.6},
      balance: {mean: 2.8, sd: 0.7},
      line: {mean: 4.1, sd: 0.5}
    },
    sessionId: `test-${__VU}-${__ITER}`,
    userAgent: 'k6'
  });

  let res = http.post(`${API_URL}/diagnoses`, payload, {
    headers: { 'Content-Type': 'application/json' }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has ok': (r) => JSON.parse(r.body).ok === true,
  });

  sleep(1);
}
```

実行:

```bash
k6 run load-test.js
```

## コスト見積もり（高負荷時）

### 月間100万リクエスト（5分で1000回 × 1日 × 30日）

| サービス | 使用量 | 月額費用 |
|---------|--------|---------|
| **Lambda** | 100万リクエスト<br>512MB × 500ms平均 | $0.20（無料枠内） |
| **API Gateway** | 100万リクエスト | $3.50 |
| **RDS** | db.t3.medium（24h稼働） | **$60** |
| **RDS Storage** | 20GB SSD | $2.30 |
| **Data Transfer** | 10GB | $1.00 |
| **SES** | 10,000通 | $0（62,000通まで無料） |
| **CloudWatch Logs** | 5GB | $2.50 |

**合計**: 約**$70/月**

### コスト最適化オプション

#### 1. RDSのスケジューリング（開発環境）

```bash
# 毎日深夜0時に停止
aws rds stop-db-instance --db-instance-identifier 16bp-dev

# 朝9時に起動
aws rds start-db-instance --db-instance-identifier 16bp-dev
```

**節約**: 約50%（月$30）

#### 2. CloudWatch Logsの保持期間短縮

```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/16bp-saveDiagnosis \
  --retention-in-days 7
```

**節約**: 約$1.50/月

#### 3. Lambda MemorySize の最適化

```yaml
# 512MB → 256MB（パフォーマンス測定後）
MemorySize: 256
```

**節約**: 約50%のLambda料金

## さらなる最適化（将来）

### 1. ElastiCache（Redis）の導入

統計データをRedisにキャッシュ:

```yaml
# ElastiCache Redis
CacheCluster:
  Type: AWS::ElastiCache::CacheCluster
  Properties:
    CacheNodeType: cache.t3.micro  # $13/月
    Engine: redis
    NumCacheNodes: 1
```

**効果**:
- DB負荷を80-90%削減
- レスポンス時間を50ms以下に短縮

### 2. Aurora Serverless v2

RDSの代わりにAurora Serverless v2を使用:

```yaml
# 自動スケーリング（0.5-16 ACU）
MinCapacity: 0.5  # $0.12/hour × 0.5 = $43/月
MaxCapacity: 2    # ピーク時のみスケール
```

**効果**:
- 負荷に応じて自動スケール
- アイドル時のコスト削減

### 3. DynamoDB への移行

PostgreSQL → DynamoDBに移行:

**メリット**:
- 無制限のスケーラビリティ
- 接続数の制限なし
- 低レイテンシ

**デメリット**:
- SQLが使えない
- 複雑なクエリが難しい

## トラブルシューティング

### 症状: 429 Too Many Requests

**原因**: API Gatewayのスロットリング

**対処法**:
```yaml
# template-high-load.yaml
ThrottlingRateLimit: 50 → 100  # 制限を緩和
```

### 症状: Lambda Timeout

**原因**: DB接続プールの枯渇

**対処法**:
1. RDSインスタンスをアップグレード
2. Lambda同時実行数を減らす
3. DB接続プールの設定を最適化

### 症状: RDS CPU 使用率が高い

**原因**: 統計クエリの負荷

**対処法**:
1. 統計ビューのマテリアライズド化
2. ElastiCacheの導入
3. RDSインスタンスのアップグレード

## まとめ

### 最小構成（月$20）

- RDS: db.t3.micro
- Lambda同時実行数: 制限なし
- キャッシュ: 60秒

**対応可能負荷**: 1秒あたり1-2リクエスト

### 推奨構成（月$70）

- **RDS: db.t3.medium**
- **Lambda同時実行数: 190（制限あり）**
- **キャッシュ: 5分**
- **API Gatewayスロットリング: 有効**

**対応可能負荷**: 1秒あたり5-10リクエスト（5分で1000回以上）

### 高性能構成（月$150）

- RDS: Aurora Serverless v2
- ElastiCache: Redis
- Lambda Provisioned Concurrency
- CloudFront CDN

**対応可能負荷**: 1秒あたり50-100リクエスト

---

© 2025 16BodyPersonalities Project
