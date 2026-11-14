# Independent Source-Rights Signature Verifier — Private Candidate

**Status:** source-only, no licence authority, keys, external permissions, customer release, AWS deployment or real rights grant created. 14 November 2026.

The Ed25519 verifier in `src/core/intelligence-private-rights-signature.mjs` is the concrete private callback adapter for the existing Atlas rights-reader `verifySignedGrant` port. It cannot issue a grant or certify a person; its ability to return a proof relies on a *separately configured* trusted public-key allowlist, independent signed attestation read and a fresh revocation-registry read.

## Contract
- Exact signed claim scope: workspace, source ID/version, rights revision, purpose and SHA-256 digest of the rights record. Canonical signed bytes use a domain-separated, fixed-field serialization; never trust display names, user-provided booleans or generic JWT claims.
- Signature: pinned, externally owned Ed25519 public key only; rejects unsigned data, altered digest/scope, wrong algorithm/key ID and malformed signature bytes. No private signing keys or network connections in the repository.
- The signed claim names distinct verifier and approver IDs, but strings **do not independently prove their legal identity**. The configured authority and independent reviewer identity/permissions must be verified out of band.
- Revocation: independently read current source-grant revocation and exact revision, reject stale/future receipts, expired/future grants, slow checks, invalid clock and clock rollback. Loss of the revocation authority fails closed.
- Receipt only: `verifiedSignature=true` is returned after cryptographic checks and a current independent revocation check; the actual Atlas record must also pass exact source, use-scope, temporal and unique-index validation. This verification does not grant customer access or AI processing.

## Production prerequisites
1. Obtain independent legal assessment and permission for each actual NHSBSA field and BNF/SNOMED/dm+d reuse context, including commercial publication and model/AI processing. Existing Drive register remains **REVIEW REQUIRED**.
2. Appoint verified independent reviewer and approver, sign exact source-specific grant, configure audited private signer custody and publisher attribution. This code never self-issues approval.
3. Pin and rotate independently certified Ed25519 public keys from a secure identity and key-management policy, with key compromise/rotation/revocation response.
4. Connect private read-only grant and revocation services with least-privilege and signed/protected storage. The two callbacks must not be fulfilled from user request or the same untrusted source-rights row.
5. Install verified unique Atlas indexes, run real transaction and two genuine tenant negative/positive acceptance, and record operator/human release decision. Only then consider any medicine evidence admission.

The tests use **ephemeral synthetic Ed25519 key pairs generated in the Node test process**. No production keys or credentials are present or exported.
