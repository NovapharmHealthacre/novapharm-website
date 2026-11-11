# NovaPharm Intelligence | Free Atlas private observer, 11 November 2026

**Status: database instantiated; private operator adapter only. NOT a live customer database connection, accepted medicine query, or enterprise release sign-off.**

## As-built resources, independently checked

- Atlas project `6af4010b0ca9668f51d9e058`, free-tier AWS Stockholm cluster `npi-bootstrap` (`6af404b1ced333839b51041f`) was IDLE.
- Separate `novapharm_intelligence_preview` database: eight planned collections and eight custom compound indexes, plus built-in `_id` indexes. The last inspection saw four source-registry **metadata-only** rows (ONS, NHSBSA, openFDA, ClinicalTrials.gov), zero source-rights approvals, zero accepted medicine evidence, zero ingestion records, zero tenants, zero entitlements, zero billing events, zero audits. Re-query; counts may change.
- `npi_preview_app`: previously provisioned `readWrite` on the preview database, reserved for future controlled ingestion. **New `npi_preview_observer`**: **read-only** on the same database and scoped to `npi-bootstrap`.
- The new observer URI resides in AWS Stockholm Systems Manager SecureString, Standard tier, `/novapharm/intelligence/preview/mongodb-observer-uri`. No password or URI is committed to the repository.
- Atlas IP allowlist remains **empty**. Live AWS Stockholm EC2 inventory: no NAT gateways, allocated Elastic IPs or running EC2 instances providing stable public egress. The private Lambda terminal has no accepted MongoDB runtime integration.

## Source-controlled private operator inspection

`src/data/atlas-private-preview-inspection.mjs` provides a server-only operator function with **injected** AWS SSM GetParameter and official MongoDB driver client. The function refuses unapproved target region, flags, host, credentials user, database or TLS-disabled URI; performs a real ping when invoked over an approved backend network; lists all required collections and verifies counts and exact index keys; and closes the client even on failure. It removes connection-secret details from exceptions and always reports customer access, source-rights acceptance and enterprise production as **false**. No public HTTP route imports it. No database mutation is performed.

`scripts/test-atlas-private-preview-inspection.mjs` verifies refusal before secret read, host swapping, database changes, TLS downgrade, successful mock ping/index inventory, index tampering, failure redaction and cleanup. Pull-request CI exercises mocks; this is **not proof of AWS-to-Atlas network connectivity**.

## Unmet production acceptance gates

1. Approve and implement stable outbound networking. MongoDB Atlas Free requires narrowed allowlisting for network traffic; the current isolated AWS private VPC has no internet egress, and a non-VPC Lambda's transient public egress IP is not a production security boundary. Do not add `0.0.0.0/0` or transient IP allowlists to force a passing test.
2. Evaluate actual recurring costs for fixed-egress NAT or a paid Atlas tier that supports private networking. The owner has deferred paid MongoDB upgrades and has not approved surprise recurring networking charges. Do not provision these automatically.
3. Once approved, scope IAM SSM read to this exact observer parameter (and KMS decrypt only if applicable), run a **real AWS runtime** ping/index probe using the official driver, and publish non-secret evidence.
4. Independently implement verified Cognito application sessions, tenant ownership/seat revocation, source-rights-licensed ingestion, user authorization, audit, backup/restore, monitoring and performance tests. The observer must never be treated as a customer query entitlement or clinical decision service.

**Preserve:** no automatic customers, charges, external emails, clinical data, or misleading production acceptance.
