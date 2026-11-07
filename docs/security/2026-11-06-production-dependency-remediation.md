# Production dependency security remediation | 6 November 2026

## Status

**Candidate patch committed to isolated PR #89. NOT merged, NOT production accepted, and not an AWS deployment.**

- Repository: `NovapharmHealthacre/novapharm-website`
- PR: https://github.com/NovapharmHealthacre/novapharm-website/pull/89
- Evidence-generating GitHub Actions run: https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42215305082
- Audited dependency commit: `5d9d64baeadcc537f8b27970baa29cc79b47a304`
- This documentation commit triggers fresh complete repository checks against the updated lockfiles.
- Related blocking issue: https://github.com/NovapharmHealthacre/novapharm-website/issues/84

## What changed

- Next.js: `16.2.12` to `16.4.5` across five web applications and the version-scoped root override.
- Sharp: `0.35.3` to `0.35.5` and root override.
- Azure Identity: `4.13.1` to `4.14.1`, resolving MSAL Node to the patched 7.x release.
- Azure Monitor OpenTelemetry: `1.19.0` to `1.21.0`.
- JS-YAML: root development dependency and override `3.15.2`.
- Source-map-js: override `1.2.2`.
- gRPC JavaScript: override `1.14.6`.
- MSSQL: `12.6.0` to `12.7.0`.
- Regenerated npm and pnpm dependency locks and the pnpm workspace supply-chain policy metadata.

## Verified candidate evidence

A GitHub-hosted Node 24 run regenerated both lockfiles and successfully executed `npm ci --ignore-scripts`. Its **production dependency audit returned zero findings at all severities** with `npm audit --omit=dev --audit-level=high --json`. The dependent job reinstalled the generated files, reran the release-blocking audit and committed the files only after that revalidation succeeded.

These checks are **not** sufficient on their own for production release.

## Required remaining acceptance

- Validate the complete root production-readiness suite and typechecks, including Next.js 16.4.5 compatibility.
- Complete corporate/public visual, browser and cross-platform checks.
- Confirm Azure Identity and the legacy SQL/telemetry integration are not broken prior to actual AWS cutover.
- Verify zero release-blocking vulnerabilities on the final accepted merge SHA, not merely on the generator commit.
- Inspect pinned supply-chain integrity, migration functionality, app-specific build outputs and protected portal behavior.
- Verify code review, branch protection and release approvals; leave Issue #84 open until acceptance.

Do not claim any AWS resource, managed contact form, secure portal or live application has been deployed by this dependency PR.
