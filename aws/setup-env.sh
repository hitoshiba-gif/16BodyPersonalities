#!/bin/bash

# 環境変数セットアップヘルパー
# Usage: source ./setup-env.sh

echo "========================================="
echo "16BodyPersonalities 環境変数セットアップ"
echo "========================================="

# .envファイルの確認
if [ ! -f ".env" ]; then
  echo "⚠️  .env ファイルが見つかりません"
  echo "📝 .env.example をコピーして .env を作成してください："
  echo ""
  echo "  cp .env.example .env"
  echo "  nano .env  # エディタで編集"
  echo ""
  exit 1
fi

# .envファイルを読み込み
echo "✅ .env ファイルを読み込んでいます..."
export $(cat .env | grep -v '^#' | xargs)

# 必須変数のチェック
REQUIRED_VARS=(
  "DB_HOST"
  "DB_PASSWORD"
  "FROM_EMAIL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo ""
  echo "❌ 以下の必須変数が設定されていません："
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  echo ""
  echo "📝 .env ファイルを編集して、これらの変数を設定してください"
  exit 1
fi

# 設定内容の表示
echo ""
echo "✅ 環境変数が設定されました："
echo "  AWS_REGION: $AWS_REGION"
echo "  DB_HOST: $DB_HOST"
echo "  DB_NAME: $DB_NAME"
echo "  DB_USER: $DB_USER"
echo "  DB_PASSWORD: ******** (非表示)"
echo "  FROM_EMAIL: $FROM_EMAIL"
echo "  BASE_URL: $BASE_URL"
echo "  STACK_NAME: $STACK_NAME"
echo ""

# RDS接続テスト
echo "🔍 RDS接続をテストしますか？ (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo "📡 RDSに接続中..."
  if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();" 2>&1
    if [ $? -eq 0 ]; then
      echo "✅ RDS接続成功！"
    else
      echo "❌ RDS接続失敗。以下を確認してください："
      echo "  - DB_HOST が正しいか"
      echo "  - DB_PASSWORD が正しいか"
      echo "  - セキュリティグループでアクセスが許可されているか"
    fi
  else
    echo "⚠️  psql コマンドが見つかりません"
    echo "PostgreSQL clientをインストールしてください："
    echo "  brew install postgresql"
  fi
fi

echo ""
echo "========================================="
echo "セットアップ完了"
echo "========================================="
echo ""
echo "次のコマンドでデプロイできます："
echo "  ./deploy.sh production"
echo ""
