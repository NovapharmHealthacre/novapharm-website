# First accepted medicine: private Atlas exact-code identity lookup

Issue references: #176, #497, #517, #454. The protected first medicine target is Apixaban, but this module contains **no fabricated Apixaban records**.

This candidate `src/data/atlas-private-medicine-identity-lookup.mjs` is one secure component for the first six Intelligence workspaces (Search, Overview, Identity, Evidence, Observed Market, Geography). It is not yet attached to a public/private gateway route and **does not establish production operational readiness**.

## Operating contract

- Native MongoDB driver must be injected by a trusted, least-privilege private server. The module does not open an Atlas connection or fetch credentials.
- Exact BNF presentation or SNOMED code, England jurisdiction, canonical UTC valid-time, `novapharm-internal-staging` scope and a current verified board session are required. No fuzzy name equivalence or unverified code joins.
- The `npi_medicine_identity` schema for future accepted records must include a dated identity, exact source code, source version, publisher resource SHA-256, independent revision and rights revision, source provenance and explicit `status=accepted`, `is_synthetic=false`. This is a **new proposed acceptance contract**, not evidence that those production records currently exist.
- The query is projection-bounded, time-limited and returns at most two current exact matches. A conflicting mapping returns an ambiguity state without selecting a winner. A third row aborts.
- A current independent private rights verification must confirm the exact source, version, revision and permitted private purpose. Expired/revoked rights or stale verification fail closed.
- Both the initial and final private session checks must pass on the same authority revision. A durable audit event must be committed before an identity response is returned.
- No customer release, clinical, supplier, market-demand, commercial or licensing claim is returned. The private query remains a research candidate.

## Before production wiring

1. Complete identity/MFA pilot with separately authorised internal board membership.
2. Define and accept the real Atlas identity schema and immutable source/temporal mappings, including the independent BNF/SNOMED terms review. The current production collection is empty.
3. Establish the trusted driver, session verifier, current source rights verifier, durable audit writer and revocation tests through the existing private API boundary. Do not pass user-supplied boolean flags as trusted attestations.
4. Test real authenticated positive and negative requests against the same dated Apixaban source before exposing even a private live route; production rollback and SLOs are separate.
5. Only after accepted evidence and scope permits, join the selected identity to Evidence, Observed Market and Geography; do not infer data from catalogue presence.

Run the isolated source tests with:

```sh
node --test scripts/test-atlas-private-medicine-identity-lookup.mjs
```

The tests use synthetic *in-memory fixtures* only. No production Atlas writes or secret values occur. The dedicated GitHub workflow proves the repository contract, not live production.
