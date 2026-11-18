# NovaPharm Intelligence — evidence-based enterprise readiness

**18 November 2026 | Repository-controlled, source-only assessment; not a production certificate.**

Run `node scripts/audit-intelligence-enterprise-readiness.mjs --write-artifact` to create a deterministic country-by-country metadata report in `artifacts/intelligence-enterprise-readiness.json`. The audit never calls upstream APIs, cloud accounts or device services. `--require-production-ready` deliberately fails closed: repository metadata cannot independently attest a production release.

The 101 discovery rows are **source candidates, not 101 countries**. A `Global` source is not a verified national jurisdiction. The audit reports each distinct country label, candidate keys, declared rights-review and integration states, contradictions and open evidence gates. Self-declared fields do not create a commercial licence, real ingestion, publication right or clinical assurance.

## Independent acceptance still required

- **Legal and data rights:** verify each publisher, permitted commercial purpose, reuse, caching/export, AI, attribution, jurisdiction, expiry and revocation, with named reviewers and receipts.
- **Model and regulated safety:** approved data lineage, reproducible evaluation, leakage-safe temporal holdouts, subgroup limitations, calibration, safety review, human oversight, versioning and rollback.
- **Security and infrastructure:** independently test MFA and tenant authorization, role isolation, retention, monitoring, audit logs, access revocation, backup/restore and incident response under the owner-approved budget.
- **iOS and Android:** signed builds and provenance, real devices, accessibility, application identifiers, secure token storage, OS privacy declarations, review of permissions and rollout/rollback.
- **Release authority:** explicit owner production sign-off. Current `productionSignoff: not_granted`, no paid new infrastructure or customer activation must not be silently overridden.

Source CI and metadata can demonstrate *code-level evidence*, but **cannot certify 100% enterprise readiness**. A separate approved production acceptance programme must independently substantiate all legal, security, clinical, commercial, operational and native-app claims.
