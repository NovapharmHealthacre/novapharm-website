# Governed image inventory reconciliation | 6 November 2026

**Scope:** Isolated draft security PR #89 only. No deployment or production approval.

The full root production-readiness check initially passed the remediated production npm audit but failed at `images:inventory:validate` because `audit/generated/image-inventory.json` was stale compared with the current source and registered image assets.

### Forensic correction
- Rebuilt the inventory from original tracked media and registered evidence with `npm run images:inventory`.
- Validated the rebuilt inventory independently via `npm run images:inventory:validate`.
- Diagnosed first apply-job failure: audit artifact downloaded inside the repository was treated as additional untracked JSON by the image inventory scanner, perturbing the authoritative reference counts.
- Corrected the workflow to place the immutable generated artifact outside the repository checkout in `$RUNNER_TEMP`.
- Revalidated the exact candidate before committing to the isolated PR branch. No image source/master or provenance register was deleted or fabricated.
- Source evidence: [GitHub Actions run 42217350711](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42217350711), both `generate` and `apply` jobs passed.
- Resulting image-inventory reconciliation commit: `21abae02096f2cff0857716660564968241ae762`.
- Paired security patch: [PR #89](https://github.com/NovapharmHealthacre/novapharm-website/pull/89); [Issue #84](https://github.com/NovapharmHealthacre/novapharm-website/issues/84).

### Acceptance limits
Image inventory validation passed for its generated candidate, and the audit-clean dependency update is on the branch. This **does not** imply the full root readiness, WebKit/Chromium, app build, six-service artifact, identity, warehouse or live AWS/production gates have passed. A fresh full GitHub check is required for the combined final SHA. Do not merge to `main` until release-blocking checks and approvals pass.
