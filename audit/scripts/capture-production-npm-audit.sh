#!/usr/bin/env bash
# Review-only candidate: preserve npm audit diagnostics without weakening the gate.
# Run from the directory containing the intended package-lock.json.
set -Eeuo pipefail
output_dir="${1:-/tmp/novapharm-production-audit}"
mkdir -p "$output_dir"
report="$output_dir/npm-audit-production.json"
summary="$output_dir/npm-audit-exit-status.txt"
# Do not pipe through tee: capture npm's actual exit code.
set +e
npm audit --omit=dev --audit-level=high --json > "$report" 2> "$output_dir/npm-audit-stderr.txt"
audit_exit=$?
set -e
printf 'npm audit exit code: %s\n' "$audit_exit" > "$summary"
printf 'report: %s\n' "$report" >> "$summary"
# An empty report is itself a failed diagnostic.
if [[ ! -s "$report" ]]; then
  printf 'npm audit emitted an empty JSON report\n' >> "$summary"
  if [[ "$audit_exit" -eq 0 ]]; then audit_exit=1; fi
fi
# Preserve nonzero audit status, including network/registry errors.
exit "$audit_exit"
