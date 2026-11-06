#!/usr/bin/env bash
# Interactive setup for NovaPharm's NEW AWS project. Run on a trusted owner computer.
set -euo pipefail

PROFILE="${NOVAPHARM_AWS_PROFILE:-novapharm-aws}"
PROJECT_REGION="eu-north-1"
TOOLKIT_REGION="us-east-1"

case "$(uname -s)" in
  Darwin) echo "Detected macOS." ;;
  Linux) echo "Detected Linux." ;;
  *) echo "Unsupported OS for this bash script. Use the official Windows PowerShell setup." >&2; exit 1 ;;
esac

for prerequisite in curl uv aws node; do
  if ! command -v "$prerequisite" >/dev/null 2>&1; then
    echo "Missing prerequisite: $prerequisite. Follow the official AWS Agent Toolkit setup instructions and rerun." >&2
    exit 1
  fi
done

aws --version
echo "AWS new experience project region: $PROJECT_REGION"
echo "Named AWS CLI profile: $PROFILE"
echo "Agent Toolkit service region: $TOOLKIT_REGION"
echo "Browser-based login is required. Never share passwords, keys or authentication codes."
echo "AWS login sessions normally remain valid 12 hours, with renewal possible for up to 90 days per AWS documentation."

aws configure set region "$PROJECT_REGION" --profile "$PROFILE"
aws login --region "$PROJECT_REGION" --profile "$PROFILE"

ACCOUNT="$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)"
if [[ ! "$ACCOUNT" =~ ^[0-9]{12}$ ]]; then
  echo "AWS authentication failed to return a valid account ID." >&2
  exit 1
fi

echo "AWS project authentication succeeded."
echo "Starting official Agent Toolkit configuration. Complete its interactive prompts."
aws configure agent-toolkit --yes --region "$TOOLKIT_REGION" --profile "$PROFILE"
aws agent-toolkit list-available-skills --region "$TOOLKIT_REGION" --profile "$PROFILE" >/dev/null
echo "Agent Toolkit skill discovery succeeded."
echo "Review each generated aws-mcp entry and set AWS_MCP_PROXY_PROFILES=$PROFILE, preserving unrelated settings."

tmpfile="$(mktemp)"
trap 'rm -f "$tmpfile"' EXIT
aws freetier get-account-plan-state --region "$TOOLKIT_REGION" --profile "$PROFILE" --output json > "$tmpfile"
EXPECTED_ACCOUNT="$ACCOUNT" node scripts/aws/check-free-plan.mjs "$tmpfile"
echo "Free-trial eligibility preflight succeeded. No AWS resources have been deployed."
echo "Before provisioning, verify project permissions, costs, IAM/OIDC trust, quotas and regulated-workload limits."
