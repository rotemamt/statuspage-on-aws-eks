#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="992382545251"
ECR_REPO="ro-ro-statuspage-dev-repo"
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${ECR_REPO}"
CONTEXT="poc"

SHA="$(git rev-parse --short HEAD)"
if [ -n "$(git status --porcelain)" ]; then
  TAG="${SHA}-dirty-$(date +%Y%m%d%H%M%S)"
  echo "warning: working tree is dirty, tagging ${TAG}"
else
  TAG="${SHA}"
fi
echo "==> ${IMAGE}:${TAG}"

docker build --platform linux/amd64 -t "${IMAGE}:${TAG}" "${CONTEXT}"

echo "==> trivy scan (report-only)"
trivy image --severity HIGH,CRITICAL "${IMAGE}:${TAG}" || true

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

docker push "${IMAGE}:${TAG}"
echo "✅ ${IMAGE}:${TAG}"
