# G1/G2 Private Medicine Admission — Integrated Review Candidate
Date: 14 November 2026

**Unmerged, source-only, no production data admission.** This candidate combines PRs #574, #581, #583, #587 and #590 at one reviewed commit base, without independently merging the original PRs. Exact-head CI tests all related layers plus the G1-to-G2 source identity handoff.

## Combined trust boundary
1. G1 separately requires an independently authenticated official NHSBSA snapshot, row and total reconciliation, source rights, exact BNF/SNOMED publisher code, and temporal mapping proof. Validation does not write data.
2. G1 preserves `source_code` and `code_system` as strings (including leading zeroes), along with mapping revision and medicine identity; G2 requires these fields and delegates an exact temporal identity check to a distinct trusted authority inside its atomic transaction.
3. Private Atlas rights reads require an exact unique source-rights index, valid scoped grant and fresh independent cryptographic attestation. No third-party rights are presumed.
4. G2 transaction uses majority+journal writes, independent majority readback and audited quarantine with a second independently verified readback.
5. G2 indexes require an operator-reviewed, plan-first migration with an independent approval and backup review; this PR does not perform that migration.
6. ECR retention is scoped to explicitly ephemeral build images; no live traffic or image-alias changes occur in this branch.

## Remaining hard blockers
The NHSBSA source archive is checksum-verified, but the connected source-rights register remains **REVIEW REQUIRED** for BNF/SNOMED CT/dm+d commercial and AI use. No legal permission is manufactured. The actual production Atlas database lacks accepted source grants, temporal medicine identities, evidence and majority transaction acceptance. Unique indexes have not been applied, real founder MFA and two independent tenant acceptance have not been demonstrated, and the 17 gated workspaces are not released. Independently reviewed exact-head CI, production adapters, least-privilege credentials, real data reconciliation and a tested rollback are still required.

Never enable customer access, paid subscriptions, model egress, external emails or unapproved medicine data to force a passing module dashboard. Passing synthetic tests is not clinical or commercial data acceptance.
