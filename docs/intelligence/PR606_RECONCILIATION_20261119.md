# PR #606 — source-only G2 reconciliation (19 November 2026)

## Resolution
PR #606 was opened against `cbca2c71392586d85bd38d8825dd6110a10262fa` with G2 private atomic admission, source-rights verification, schema migration proposals and 22-route anonymous-denial checks. Its original head `0c6ad9673072804f5568275d8697b73341dee794` subsequently conflicted with work integrated into `main`.

This reconciliation intentionally **retains the current `main` tree** for all pre-existing paths rather than restoring older and potentially incompatible copies from #606. The PR head remains in the merge ancestry for provenance.

## Current source implementations preserved
- Private atomic G2 admission: `src/data/atlas-medicine-g2-atomic-store.mjs` (updated through #635 and later schema alignment).
- Source rights: `src/data/atlas-private-medicine-rights.mjs` and `src/core/intelligence-private-rights-signature.mjs` (including later rights/index alignment #699).
- G2 index safety: `src/data/atlas-g2-unique-index-migration.mjs` and `docs/intelligence/ATLAS_G2_UNIQUE_INDEX_MIGRATION.md` (updated by #668, #692, #696).
- Private 22-workspace anonymous access denial: `.github/workflows/intelligence-private-production-gate.yml` (updated by #639).
- Existing security and regression tests remain on `main`.

Older proposed workflow and dated-document names from #606 that are absent from `main` are not reintroduced: newer equivalent paths and stronger guards are authoritative. In particular, the G1/G2 transaction and Atlas index tests live in the current canonical workflows, not in the duplicate legacy workflow proposals.

## Verification and boundaries
The original PR's GitHub Actions run had two failing jobs: a dependent unified browser gate, and a secure portal job reporting mobile Lighthouse performance 89 below its 95 threshold. These are **historical failures**, not proof that the current branch passes. The reconciled head requires fresh applicable CI validation. No required check, independent review or release signoff should be bypassed.

This reconciliation is a **repository-source merge only**. It does not create licensed source-use authority, real medicine evidence, Atlas production indexes or writes, customer entitlements, external egress, authenticated tenant acceptance, an AWS deployment, or production readiness. Those require separately verified authorizations, operator procedures, human review, real-data tests and deployment evidence.

## Source review references
PRs #635, #639, #668, #692, #696 and #699 are merged follow-on implementations relevant to this reconciliation. The PR #606 discussion contains the original isolated synthetic-test evidence. Do not interpret synthetic checks or anonymous HTTP denials as proof of live feature acceptance.
