#!/usr/bin/env bash
# Deploy ONLY the non-production metadata preflight script, after verifying the AWS account.
set -euo pipefail
export AWS_PAGER=""
REGION="eu-north-1"
ACCOUNT="250675045172"
BUCKET="novapharm-intelligence-analytics-review-${ACCOUNT}-${REGION}"
STACK="novapharm-intelligence-analytics-review"
KEY="jobs/review_candidate_preflight.py"
SCRIPT="infrastructure/aws/glue_review_candidate_preflight.py"

if [[ "${NOVAPHARM_ANALYTICS_REVIEW_DEPLOY:-}" != "approved_metadata_only" ]]; then
  echo "Refusing upload without NOVAPHARM_ANALYTICS_REVIEW_DEPLOY=approved_metadata_only" >&2
  exit 2
fi
if [[ ! -f "$SCRIPT" ]]; then
  echo "Run this helper from the exact repository root." >&2
  exit 2
fi
actual_account="$(aws sts get-caller-identity --region "$REGION" --query Account --output text)"
if [[ "$actual_account" != "$ACCOUNT" ]]; then
  echo "Wrong AWS account; deployment refused." >&2
  exit 2
fi
state="$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" --query 'Stacks[0].StackStatus' --output text)"
if [[ "$state" != "CREATE_COMPLETE" && "$state" != "UPDATE_COMPLETE" ]]; then
  echo "Review CloudFormation stack not accepted: $state" >&2
  exit 2
fi
expected="$(sha256sum "$SCRIPT" | cut -d ' ' -f1)"
aws s3api put-object --region "$REGION" --bucket "$BUCKET" --key "$KEY" \
  --body "$SCRIPT" --server-side-encryption AES256 --content-type text/x-python \
  --metadata "source-sha256=$expected,release-gate=metadata-review-only" >/dev/null

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
aws s3api get-object --region "$REGION" --bucket "$BUCKET" --key "$KEY" "$tmp" >/dev/null
actual="$(sha256sum "$tmp" | cut -d ' ' -f1)"
if [[ "$expected" != "$actual" ]]; then
  echo "Uploaded S3 script failed independent readback SHA-256." >&2
  exit 1
fi
echo "Verified S3 review script at sha256=$expected; no Glue run or customer deployment started."
