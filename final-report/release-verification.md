# Release Verification

## Candidate

- Repository: `NovapharmHealthacre/novapharm-website`
- Branch: `codex/ultra-premium-rebuild`
- Implementation commit: `14b28a7cf56617766e7cc9e8047ececba3430dc0`
- Release head: `95bc3e6d22b62fe96eb954b236e00935e3c6c040`
- Prepared: 11 July 2026

## Local Quality Gate

`npm run check` passed after the final implementation changes:

- Production page build.
- 26 public page contracts.
- Six 900-1,400-word article contracts.
- 39 locked public workspace shells.
- 1,227 local links, assets and anchors.
- JavaScript/MJS syntax checks.
- Canonical domain workflow validation.
- HTTP CSRF, authentication, persistent-session, contact, onboarding-upload, health and logout integration tests.

## GitHub Quality Gate

The `Production readiness` workflow completed successfully against release head `95bc3e6d22b62fe96eb954b236e00935e3c6c040`. Pull request 2 is open, ready for review and mergeable.

## SharePoint Verification

The live Executive Platform folder contains 18 modules, the hub, two controlled PDFs and the local Chart.js runtime. No anonymous sharing link exists. Site Owners, Members and Visitors are inherited; board-only ACL narrowing is a required SharePoint administrator action before confidential data is introduced.

## Deliberate External Gates

- Pull-request approval and merge to `main`.
- Node hosting service and persistent disk.
- Production secrets, email sender verification and Graph app credentials.
- Custom-domain DNS and HTTPS cutover.
- Deployed visual regression and Lighthouse measurements.
- Privacy, retention, malware scanning, penetration test and board-folder permission approval.

The candidate must not be called fully live until these gates are completed.
