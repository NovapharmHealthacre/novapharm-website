# Private Atlas source-rights verification adapter — staging candidate

**Status: source-only, NOT production licensed, NOT a write or release.**
The `src/data/atlas-private-medicine-rights.mjs` module supports only the
server-side `verifyCurrentRights` port required by the G2 atomic private
medicine-evidence admission contract. It reads the existing production-name
MongoDB Atlas namespace `novapharm_intelligence_production.npi_source_rights`,
which had **zero active rights grants** at the last direct inspection.

## Schema and trust boundaries
- The caller must supply an already connected, least-privileged private DB
  handle with databaseName exactly `novapharm_intelligence_production`.
- G2 queries must provide a trusted internal workspace, exact publisher,
  version, resource, independently hashed resource digest and rights revision;
  no MongoDB operators are accepted in selectors.
- Exactly one matching active source grant with *all* required explicit
  NHSBSA/third-party terminology, private analysis and commercial reuse rights
  must be present. Missing/duplicate, revoked, expired, cross-workspace or
  partial grants produce `null`.
- A **different, independent signature authority** must verify a canonical
  allowlisted digest from the exact stored record. The storage record alone
  cannot self-approve rights. The provided `verifySignedGrant` interface must
  use trusted independently reviewed signature material, verify authority
  scope and any revocation/expiration in an immutable audit authority, and
  return a fresh verification. A boolean field or caller-controlled mock is
  not acceptable for production.
- Grant freshness is checked again after the independent signature service
  responds. Invalid or rolled-back server clocks refuse.
- The adapter grants **no customer access**, creates **no grants**, and
  changes **no live MongoDB records**. It is not a substitute for founder
  MFA, DynamoDB session authorization, G2 atomic commit, majority readback,
  quarantine, external legal approval, or genuine two-tenant tests.

## Mandatory unique-index admission fence
The implementation now queries the **actual** MongoDB `listIndexes` state
before any positive rights read. It requires a non-sparse, non-partial,
simple-collation **unique** index with the exact ordered keys:

```json
{"workspace_id":1,"source_id":1,"source_version":1,"resource_id":1,"resource_sha256":1,"rights_revision":1}
```

This constraint is **NOT present** on the live production-name collection
as inspected on 13 November 2026. The available Atlas connector create-index
operation cannot express `unique: true`; therefore no index was deceptively
created. Until a reviewed database operator applies and verifies the unique
index with an authorised migration, this read adapter returns **no grants**.

## Release sequence
1. Independent counsel/qualified rights reviewer signs the exact NHSBSA,
   BNF, SNOMED and dm+d commercial and AI reuse scope, with expiry/revocation.
2. Design and validate unique indexes and immutability/revision protection for
   authoritative signed rights receipts. Existing nonunique query indexes
   are insufficient.
3. Introduce private signer verifier, scoped Atlas service credentials in
   secret management, private networking and revocation notifications.
4. Integrate this reader with G2 behind a strictly private board/admin
   execution gateway. Require source validation, exact product identity,
   atomic multi-collection commit, durable readback and quarantine acceptance.
5. Verify full negative tests with actual authenticated internal accounts,
   then rehearse restore, revocation and release. Customer access stays OFF.

Synthetic tests are **not** legal authorization or production proof.
