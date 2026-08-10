# Post-PR-16 release-control state

## Authority and baseline

- Repository: `NovapharmHealthacre/novapharm-website`
- Preserved merged PR-16 baseline: `b3005a4df2a132e220e3ab124b1c5e4e244302c1`
- Fix-forward branch: `fix/post-pr16-release-control`
- Continuation pull request: #27 (Draft; human-owned merge boundary)

The merged PR-16 baseline is immutable historical evidence. This continuation does not reset or rewrite accepted work.

## Reconstructed live reality

At the PR-16 merge SHA, GitHub recorded two conflicting release-control signals:

1. `pages-live-publish` remained pending even though the Pages workflow had already completed with failure.
2. `backend-live-activation` failed because the public GitHub Pages origin returned `404` for the backend health endpoint and Microsoft identity was unavailable.

The Pages build failure was initially caused by an internal design-system workbench referencing pre-migration `apps/corporate/public/...` assets. Once public-release validation was correctly scoped to the staged Pages artifact, the stricter check exposed two further deployment-contract defects: `/feed.xml` and `/trust-centre/` were linked throughout the public estate but omitted by the Pages allowlist.

## Repair implemented in PR #27

- `scripts/check-links.mjs` accepts an explicit validation root while preserving strict default repository validation.
- the Pages workflow builds `PUBLIC_ONLY`, stages `_site`, and validates links inside the exact deployable artifact.
- `/feed.xml` and `/trust-centre/` are allowed and required in the public Pages artifact.
- a build/validation failure before deployment writes a terminal `pages-live-publish` failure status.
- backend-live verification no longer runs automatically for every public `main` push; it is an explicit SHA-bound verification for a deliberately deployed backend-live release.
- the design-system workbench generator points its corporate logo, supply-network hero and oncology media references at the governed root asset authority.

No validation gate was disabled, ignored, or converted into a false success.

## Release-state classification

| State | Current classification | Evidence requirement |
| --- | --- | --- |
| R0 — Repository merged | **Achieved** | PR-16 merged baseline exists on `main`. |
| R1 — Public release verified | **Not yet achieved for this fix-forward release** | PR #27 must be owner-approved and merged, the resulting `main` Pages workflow must terminate successfully, and the deployed Pages URL plus custom domain must serve the accepted public artifact. |
| R2 — Managed staging ready | **Not claimed** | Managed Azure staging, identity, canonical data, monitoring and safe integrations must exist and pass staging entry gates. |
| R3 — Managed staging accepted | **Not claimed** | Full staging acceptance matrix, security, accessibility, browser, restore and owner/business acceptance evidence. |
| R4 — Production cutover ready | **Not claimed** | Accepted staging plus cost/approval, DNS/TLS/WAF, migration, monitoring, rollback and cutover evidence. |
| R5 — Production live — monitoring | **Not claimed** | Controlled production transition completed and actively monitored. |
| R6 — Production accepted | **Not claimed** | Post-cutover acceptance, recovery evidence and remaining defects within the mandate's acceptance boundary. |

## Portal and backend truth

The repository contains the unified six-application architecture and the 54-module Portal contract, but the module catalog deliberately records synthetic validation data and `productionStatus: not_deployed_owner_controlled`. A route, component, repository query, synthetic dataset or passing local test is therefore not evidence that a module is production-operational.

Until a managed backend, canonical production data authority and accepted identity linkage exist, module production classifications must remain conservative. The backend-live verifier must not be used as a hard gate for `PUBLIC_ONLY` releases.

## Human-owned boundary

PR #27 remains a Draft and must not be merged automatically. After its checks are accepted, an explicit owner merge decision is required before `main` changes and the live Pages publication is retriggered.

Only after that merge and successful R1 verification should the programme advance into the larger managed-staging, identity, data, integration and 54-module operationalisation phases.
