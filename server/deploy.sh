#!/bin/bash
# Lansează serverul cu o singură comandă:  BA_SECRET=... ./deploy.sh   (sau: make deploy)
# Cere AWS CLI configurat (aws configure) și SAM CLI. Nu scrie secretul nicăieri.
set -euo pipefail
cd "$(dirname "$0")"

if [ -z "${BA_SECRET:-}" ] || [ "${#BA_SECRET}" -lt 32 ]; then
  echo "Lipsește BA_SECRET (cel puțin 32 de caractere). Generează unul cu: make secret" >&2
  exit 1
fi
command -v sam >/dev/null || { echo "Lipsește SAM CLI (https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)" >&2; exit 1; }

STACK="${STACK_NAME:-ba-server}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-eu-central-1}}"
PWA_ORIGIN="${PWA_ORIGIN:-https://alexxgalea.github.io}"

# Pachetul: codul + dependențele pentru Linux x86_64, Python 3.14 (boto3 vine cu runtime-ul).
rm -rf .build
mkdir -p .build/app
pip install --quiet --upgrade --target .build/app \
  --platform manylinux2014_x86_64 --platform manylinux_2_28_x86_64 \
  --implementation cp --python-version 3.14 --only-binary=:all: \
  -r requirements.txt
cp -r ba_server run.sh .build/app/
chmod +x .build/app/run.sh
find .build/app -name '__pycache__' -type d -prune -exec rm -rf {} +

sam deploy \
  --template-file template.yaml \
  --stack-name "$STACK" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides "AppSecret=$BA_SECRET" "PwaOrigin=$PWA_ORIGIN" "GeminiApiKey=${GEMINI_API_KEY:-}"

echo
echo "Adresa serverului:"
aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" --output text
