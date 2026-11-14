# G2 private MongoDB atomic admission storage candidate

**Status:** source and synthetic security-contract tests only. **Not deployed**, **not source-authorised** and **not customer-accessible**. This does not create rights, credentials, indexes, patient records, subscriptions, source admissions or AI inference.

The `createAtlasG2AtomicStore` factory in `src/data/atlas-medicine-g2-atomic-store.mjs` accepts a **trusted, private** existing MongoDB client and the exact production-name database, plus four independently trusted runtime callbacks: live board/admin authority, source/terminology rights, exact temporal canonical medicine identity, and independently verified publisher source/partition reconciliation. The source verifier must match publisher-signed source digest, exact reporting month, partition rows digest and independently controlled totals; a raw source QA self-assertion is not a licence or a control total. The identity verifier must independently check each source row's product/strength/form/brand mapping and valid reporting month, not trust caller-provided proof flags. It provides the three ports required by `admitPrivateOfficialMedicineEvidence`: `commitAtomic`, `readBackCommit` and `quarantineCommitted`.

## Implementation contracts
- One transaction writes every G1-verified private candidate row, its immutable source manifest and an append-only audit event, with **snapshot read concern**, **majority+journal write concern** and no partial write on callback denial or failed acknowledgment.
- A separate majority-read verification checks the exact transaction's admitted row count, source manifest and audit receipt. It returns no acceptance on mismatch or unavailable database reads.
- If later authority/rights/clock or durable readback fails, a second transaction changes all rows and the manifest to `quarantined_never_publish` and appends a quarantine audit. It **then independently reads back** the majority-committed quarantined row count, manifest and audit event before returning any attestation. Failed writes or failed durable proof refuse success, even if quarantine may have committed.
- The adapter revalidates full row allowlists, totals, row hashes, units and workspace before writes. G1 must preserve original `code_system` and `source_code` as strings (including leading zeroes), alongside `medicine_identity` and `identity_revision`; G2 forwards all four to an independently trusted exact temporal identity resolver. The source code is *not* inferred from the canonical name. Coordinate source change in PR #574 with this storage adapter before deployment. A selected new transaction has no customer-publish authority.
- An explicit **unique index** on every evidence row key, source-manifest key and audit-event key must exist before any G2 write. The live production-name collections currently have only nonunique indexes; therefore a real write MUST refuse.

## Required index specifications
```json
{
  "npi_medicine_evidence": {
    "unique": true,
    "key": {"workspace_id":1,"source_id":1,"source_version":1,"resource_id":1,"row_id":1}
  },
  "npi_evidence_manifests": {
    "unique": true,
    "key": {"workspace_id":1,"manifest_sha256":1}
  },
  "npi_audit_events": {
    "unique": true,
    "key": {"workspace_id":1,"event_id":1}
  }
}
```

These are **operator migration requirements**, not an instruction to create nonunique substitutes. Our connected Atlas index creation tool does not expose a `unique: true` option, so no production indexes were changed.

## Release blockers
1. Independent, legally valid NHSBSA and BNF/SNOMED/dm+d terminology reuse approval, exact release/period/source identity and independently verified row totals.
2. Audited database schema migration, owner-bound production Atlas secret, private networking, index uniqueness/validator verification, audit immutability and least-privilege roles.
3. Real Cognito board/admin subject and distinct independent reviewer, live rights verifier, as well as **actual** MongoDB transaction and concurrent-revocation/rollback tests.
4. Independent majority readback, cross-tenant denial, restore rehearsal, resource/cost checks, and exact-SHA operational release approval.
5. Customer access, AI inference and data export remain OFF until independent end-to-end certification.

## Audit truth boundary
Test doubles exercise transactional contracts. They are not an Atlas integration test or legal rights approval; the actual production collection counts remain zero. The `novapharm_intelligence_production` name does **not** mean a launch-ready database.

**Remaining crash-consistency review:** independently prove retry/idempotency after a MongoDB `UnknownTransactionCommitResult`, coordinator process crash, delayed clock/source revocation and backup restoration before any live admission. A synthetic mock transaction cannot certify those behaviors.
