#!/bin/bash

# 16BodyPersonalities AWS デプロイスクリプト
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e  # エラーで停止

ENV=${1:-production}
STACK_NAME="bp16-backend-${ENV}"
S3_BUCKET="bp16-deployment-${ENV}"
REGION="ap-northeast-1"

echo "========================================="
echo "16BodyPersonalities AWS Deployment"
echo "Environment: ${ENV}"
echo "Stack: ${STACK_NAME}"
echo "Region: ${REGION}"
echo "========================================="

# S3バケット存在確認・作成
echo "Checking S3 bucket..."
if ! aws s3 ls "s3://${S3_BUCKET}" 2>&1 > /dev/null; then
  echo "Creating S3 bucket: ${S3_BUCKET}"
  aws s3 mb "s3://${S3_BUCKET}" --region ${REGION}
else
  echo "S3 bucket already exists: ${S3_BUCKET}"
fi

# Lambda Layer の依存関係をインストール
echo "Installing Lambda Layer dependencies..."
cd lambda/layers/db-layer
npm install --production
cd ../../../

# 各Lambda関数の依存関係をインストール
echo "Installing Lambda function dependencies..."
for func_dir in lambda/functions/*/; do
  if [ -f "${func_dir}package.json" ]; then
    echo "  Installing dependencies for $(basename $func_dir)..."
    cd "${func_dir}"
    npm install --production
    cd - > /dev/null
  fi
done

# パラメータファイルの確認
PARAM_FILE="parameters-${ENV}.json"
if [ ! -f "${PARAM_FILE}" ]; then
  echo "ERROR: Parameter file not found: ${PARAM_FILE}"
  echo "Please create ${PARAM_FILE} with the following format:"
  cat << 'EOF'
[
  {
    "ParameterKey": "DBHost",
    "ParameterValue": "your-rds-endpoint.amazonaws.com"
  },
  {
    "ParameterKey": "DBUser",
    "ParameterValue": "postgres"
  },
  {
    "ParameterKey": "DBPassword",
    "ParameterValue": "your-secure-password"
  },
  {
    "ParameterKey": "FromEmail",
    "ParameterValue": "noreply@16bodypersonalities.com"
  }
]
EOF
  exit 1
fi

# SAM ビルド
echo "Building SAM application..."
sam build

# パラメータをJSONから読み取って文字列に変換
PARAMS=$(cat ${PARAM_FILE} | jq -r '.[] | "\(.ParameterKey)=\(.ParameterValue)"' | tr '\n' ' ')

# SAM デプロイ
echo "Deploying to AWS..."
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name ${STACK_NAME} \
  --s3-bucket ${S3_BUCKET} \
  --parameter-overrides ${PARAMS} \
  --capabilities CAPABILITY_IAM \
  --region ${REGION} \
  --no-fail-on-empty-changeset

# スタック情報取得
echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="

API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

echo "API Endpoint: ${API_ENDPOINT}"
echo ""
echo "Next steps:"
echo "1. Update frontend files with new API endpoint: ${API_ENDPOINT}"
echo "2. Configure SES email identity in AWS Console"
echo "3. Test API endpoints"
echo ""
echo "API Endpoints:"
echo "  POST   ${API_ENDPOINT}/diagnoses       - Save diagnosis"
echo "  GET    ${API_ENDPOINT}/stats           - Get statistics"
echo "  POST   ${API_ENDPOINT}/premium         - Save premium"
echo "  GET    ${API_ENDPOINT}/premium/{token} - Get premium"
echo "  POST   ${API_ENDPOINT}/premium/resend  - Resend premium"
echo "  POST   ${API_ENDPOINT}/contact         - Save contact"
echo "========================================="
