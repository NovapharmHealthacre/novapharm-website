# Release Verification

## Candidate

- Repository: `NovapharmHealthacre/novapharm-website`
- Branch: `codex/ultra-premium-rebuild`
- Pull request: `2`
- Release head: use the current head shown on pull request 2 after the final audit commit
- Prepared: 11 July 2026

## Local Quality Gate

`npm run check` passed after the final implementation changes:

- Production page build.
- 26 public page contracts.
- Six 900-1,400-word article contracts.
- 39 locked public workspace shells.
- 1,333 local links, assets and anchors.
- JavaScript/MJS syntax checks.
- Secret, artefact and public-claims checks.
- Canonical domain workflow validation.
- HTTP CSRF, authentication, role-boundary, persistent-session, contact, onboarding-upload, health, lockout, rate-limit and logout integration tests.
- Current-schema database backup and integrity verification.

## GitHub Quality Gate

The `Production readiness` workflow must complete successfully against the final audit head before merge approval. Pull request metadata is the authoritative source for that SHA and status.

## SharePoint Verification

The live Executive Platform folder contains 18 modules, the hub, two controlled PDFs and the local Chart.js runtime. No anonymous sharing link exists. Site Owners, Members and Visitors are inherited; board-only ACL narrowing is a required SharePoint administrator action before confidential data is introduced.

## Deliberate External Gates

- Rotation of the previously published password and an owner decision on repository-history remediation.
- Rendered Safari and Chromium visual acceptance at desktop, tablet and mobile widths.
- Passing final pull-request workflow, approval and merge to `main`.
- Node hosting service and persistent disk.
- Production secrets, email sender verification and Graph app credentials.
- Custom-domain DNS and HTTPS cutover.
- Deployed visual regression and Lighthouse measurements.
- Privacy, retention, malware scanning, penetration test and board-folder permission approval.

The candidate must not be called fully live until these gates are completed.
