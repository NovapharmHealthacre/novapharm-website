# Release Verification

## Remote state

- Repository: `NovapharmHealthacre/novapharm-website`
- Pull Request 2: closed and merged
- Current verified `main`: `189da77fdaff9ac5c79d39af60e93dbb06a48e58`
- Post-launch branch: `codex/post-launch-production-completion`
- Branch starting state: identical to the verified `main` merge commit before this candidate is published
- Production DNS, GitHub Pages and SharePoint permissions: unchanged by this branch

## Local Node 24 gate

Execution on 13 July 2026 used Node `v24.14.0`:

- `npm ci --ignore-scripts`: passed.
- `npm run check`: passed.
- 33 public pages, six long-form Insights articles and 40 data-free protected shells: passed.
- 1,890 local links and asset references: passed.
- 48 JavaScript/MJS/TypeScript files and eight modular stylesheets: passed syntax checks.
- 230 current-tree files: passed secret and artefact scan.
- Integration, production security, preview security, session restart, legacy database migration, cookie consent and backup/restore suites: passed.
- `npm audit --omit=dev --audit-level=high`: executed but not completed because this sandbox could not resolve `registry.npmjs.org`; no pass is claimed.

## Evidence boundaries

- Real rendered Chromium/WebKit acceptance, Lighthouse and automated browser accessibility tests are not claimed. Local HTTP binding returned `EPERM`, and the supported in-app browser rejected local-file navigation. These checks require an owner-approved private Render preview.
- Current-tree secret scanning passed; full-history and all-ref scanning did not. The retired credential remains in inherited remote history pending the owner-authorised sanitisation runbook.
- Production administrator bootstrap, permanent password change, Resend delivery, Graph synchronisation, disk restart, live backup/restore and final-domain cookies remain deployment acceptance steps.
- SharePoint Executive Platform permissions remain unchanged pending explicit owner approval; broad inherited Visitors read and Members write access must be removed before confidential board material is introduced.

The branch is technically prepared for a new pull request, but production completion cannot be claimed until the external gates above are closed.
