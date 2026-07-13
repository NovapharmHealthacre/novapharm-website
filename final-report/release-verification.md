# Release Verification

## Remote state

- Repository: `NovapharmHealthacre/novapharm-website`
- Pull Request 2: closed and merged
- Current verified `main`: `189da77fdaff9ac5c79d39af60e93dbb06a48e58`
- Post-launch branch: `codex/post-launch-production-completion`
- Pull Request 3: open as a draft at `https://github.com/NovapharmHealthacre/novapharm-website/pull/3`
- Pull Request 3 status at review: mergeable, based directly on the verified `main` merge commit
- GitHub workflow: `Production readiness` run 17 completed successfully
- Production DNS, GitHub Pages and SharePoint permissions: unchanged by this branch

## Local Node 24 gate

Execution on 13 July 2026 used Node `v24.14.0`:

- `npm ci --ignore-scripts`: passed.
- `npm run check`: passed.
- 33 public pages, six long-form Insights articles and 40 data-free protected shells: passed.
- 1,890 local links and asset references: passed.
- 48 JavaScript/MJS/TypeScript files and eight modular stylesheets: passed syntax checks.
- 228 local source files: passed secret and artefact scan; ignored private/runtime paths are absent from the release tree.
- Integration, production security, preview security, session restart, legacy database migration, cookie consent and backup/restore suites: passed.
- `npm audit --omit=dev --audit-level=high`: local execution was blocked by sandbox DNS; the same networked audit completed successfully in GitHub Actions.

## Evidence boundaries

- Real rendered Chromium/WebKit acceptance, Lighthouse and automated browser accessibility tests are not claimed. Local HTTP binding returned `EPERM`, and the supported in-app browser rejected local-file navigation. These checks require an owner-approved private Render preview.
- Current-tree secret scanning passed; full-history and all-ref scanning did not. The retired credential remains in inherited remote history pending the owner-authorised sanitisation runbook.
- Production administrator bootstrap, permanent password change, Resend delivery, Graph synchronisation, disk restart, live backup/restore and final-domain cookies remain deployment acceptance steps.
- SharePoint Executive Platform permissions remain unchanged pending explicit owner approval; broad inherited Visitors read and Members write access must be removed before confidential board material is introduced.

The draft pull request is ready for owner review, but production completion cannot be claimed until the external gates above are closed.
