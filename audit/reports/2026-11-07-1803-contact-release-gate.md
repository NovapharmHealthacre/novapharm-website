# Four-repository production gate — 2026-11-07 18:03 IST

## Inventory (fresh GitHub searches)
- novapharm-website: 2 open PRs (#121, #118), 9 open issues.
- vishal-portfolio: 0 open PRs, 1 open issue (#43, qualified editorial approval).
- novapharm-innovation-technology: 1 open PR (#3 temporary collection; never merge without source artifact), 0 open issues.
- ak-online-services: 0 open PRs, 0 open issues.
- Corporate main at inspection: `3cbc8525ee7f5f77b8000d4395fedad04d5bf605` (GitHub compare endpoint).

## Exact-head evidence and review
- Prior PR #119 head `260f46f1b04abd2e3d2fed5bccaaa4fe51fa9ebb`: eight GitHub PR-triggered workflows completed successfully, including production readiness run [42368398525](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42368398525), unified browser run [42368398387](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42368398387), supply chain, CodeQL, SEO, public browser, visual, and design. These are historical exact-head results, **not** current-main or live proof.
- Open PR #121 branch `codex/contact-real-intake-sns-20261107` diverges from current main: 16 ahead, 45 behind. Open PR #118 branch `fix/technology-purpose-heading-contrast-20261107` diverges: 8 ahead, 45 behind. **No exact-head CI conclusion is asserted for either branch here.** Both require fresh head SHA and full checks after reconciliation.

## Contact production workflow review: release blocker
Inspected `.github/workflows/publish-aws-contact-production.yml` from PR #121 branch. It requires manual dispatch with expected main SHA, an eu-north-1 HTTPS API origin, health/403 tests, a synthetic 201 receipt, then modifies the staged Pages artifact and publishes it. It checks `notificationAccepted == true`, but this establishes only upstream notification acceptance, **not verified delivery to the intended mailbox**. Do not infer end-to-end SES/SNS delivery from this field. Before any dispatch or activation, require independent receipt persistence evidence, recipient delivery confirmation without leaking customer PII, owner-reviewed data retention/privacy/legal terms, budget/cost approval, environment protection, and a tested rollback. The workflow's post-deploy check verifies page markers, but does **not** establish exact source-to-live SHA by a published release marker. Add immutable artifact provenance and independent live SHA parity before calling deployment verified. Avoid publishing or collecting customer data until all gates are met.

## Status / next action
No merges, DNS changes, cloud provisioning, live intake activation, or patient-data movement authorized by this report. Reconcile #118/#121 individually with main; capture their exact-head CI and browser results. Verify static Pages deployment independently; preserve public mailto-only fallback and portal non-credential page until approved end-to-end managed acceptance. This is review evidence, not production acceptance.
