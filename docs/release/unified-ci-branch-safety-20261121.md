# NovaPharm unified CI and branch safety (21 November 2026)

## Scope and truth standard

This policy covers all current `apps/`, `packages/`, `native/` and `integrations/` project directories, plus core website, Portal, Intelligence, WMS, medicines, commerce, Apple HIG, OpenAI provider, Google Search/Maps/merchant, and AI/agent/AGI/quantum research contracts. Adding/removing a top-level project requires explicit register reconciliation. The gate verifies **tracked sources and executable deterministic contracts**, not live API integration, regulatory certification, full app-store acceptance, HIG independent production approval, AGI capability, or production deployment.

The workflow `.github/workflows/novapharm-unified-ci-gate.yml` runs on **all pull requests**, main pushes and manual dispatch. It is read-only, uses exact PR-head provenance, has no production secrets, has no deployment job and never changes production activation. The policy lives in `config/ci/novapharm-unified-coverage.json`; the runner lives at `scripts/ci/verify-unified-ci-contract.mjs`.

The existing dedicated CodeQL, supply-chain, Production readiness, Playwright Chromium/WebKit, native Swift/iOS Simulator and Android/Gradle workflows remain separate. Passing a source contract is not a replacement for device, live-site, signed release, protected Cognito, tenant authorization, medicines rights or independent human approval.

## Required one-time GitHub administration (NOT completed by this PR)

The current GitHub connection cannot change repository rulesets or branch protection. The owner must open https://github.com/NovapharmHealthacre/novapharm-website/settings/rules and create/enforce rulesets on `main` and `gh-pages`.

**Main:** Require a pull request, block deletion and force pushes, require branch up-to-date before merge, restrict bypass permissions, and require exact GitHub check names from a real successful PR run:
- `Policy coverage and invariant verification`
- `Cross-estate regulated, AI, Google, Apple and native contracts`
- `verify` from `Production readiness`
- `Analyse JavaScript and TypeScript` from `CodeQL`
- `dependency-review` and `sbom` from `Supply chain`
- Relevant always-running browser/release checks, selecting names and GitHub App sources from the Checks tab after observing a real run.

Do not make all ~209 path-filtered workflows mandatory: many skip intentionally. Add CODEOWNER review once a **different eligible reviewer** exists; self-approval cannot meet an independent-review requirement. Never grant broad administrator bypass as a substitute for review.

**gh-pages:** Block deletion and force pushes; restrict publication to the reviewed release mechanism, preserving required deploy actor permissions; require an approved, reversible release and rollback reference. Do not blindly impose a PR requirement on `gh-pages` until checked against the actual Pages deploy mechanism: some historical workflows publish directly, and an incompatible rule could interrupt recovery.

## Release constraints

`config/intelligence/owner-production-constraints.json` currently denies production signoff, billable infrastructure, external email, live subscriptions, unapproved medicine admissions and public customer access. The unified gate fails closed on unapproved changes to these flags and requires a separately reviewed policy change when formal authorization eventually occurs. A passing CI run does not make a contact-only/public-only artifact safe; managed Contact service verification and forward-only publishing rules must still pass.

## Validation

Run `node --test scripts/test-unified-ci-policy.mjs`, then `node scripts/ci/verify-unified-ci-contract.mjs`, then `npm ci --ignore-scripts && node scripts/ci/verify-unified-ci-contract.mjs --run`. Inspect the **current PR head**, its actual GitHub check conclusions, and the deployment source SHA before merging or releasing. If a status is skipped, failed, queued or stale, do not count it as successful acceptance.
