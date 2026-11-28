# NovaPharm Finance — mandatory data protection standard

Owner requirement: AES-256 for stored Finance data. This PR is a source-level foundation, not evidence that production stores are encrypted. Apply across all 36 approved workspaces, including derived datasets and exports. No live infrastructure, paid services or keys created.

## Cryptographic design
- Application record encryption: AES-256-GCM, fresh per-record 32-byte data key, 96-bit random nonce, 128-bit tag. Use platform crypto; do not invent primitives.
- Envelope encryption: production key-provider boundary requests AWS KMS GenerateDataKey AES_256 and stores wrapped data key only. Immutable key ARN allowlist; separate environments and scope-bound context. KMS adapter accepts injected SDK calls; SDK, key policy and runtime integration not provisioned by this PR.
- Context: application/version plus opaque tenant, entity, record type and ID. Must be derived from authorized server-side records, not trusted from browser. Never include PII, account numbers or secrets in KMS context; KMS logs context.
- Fail closed on invalid or tampered records. No plaintext fallback. No plaintext keys in logs, source, database or browser. Best-effort wiping of owned buffers is not a guarantee of full process-memory erasure.
- Re-encryption helper: persist atomically, verify decryptability, retain old keys until all snapshots and recovery obligations are satisfied. Key rotation orchestration and audit are pending.
- Passwords use salted adaptive hashing rather than reversible encryption; authentication tokens and transport use appropriate standard protocols. HTTPS TLS 1.2 minimum, prefer TLS 1.3 and AES-256-GCM where negotiated; don't claim AES-256 for every third-party TLS connection. No plaintext HTTP transport for sensitive records.

## Production acceptance checklist
Inventory database tables, object storage, backups, queues, caches, log destinations, temporary files and export paths; verify encryption configuration on each. Storage encryption with AES-256 (KMS-backed where supported), application-layer encryption for sensitive records and field classification; no unauthorized plaintext copies. Require access isolation, least-privilege IAM, MFA, audit events without sensitive payloads, restore tests and key deletion protections. Use encrypted transport to external providers; validate their security separately. External payments should use tokenized payment methods, not store raw card data. No claim of PCI, ISO or other certification without independent assessment.

Existing data migration requires authorized inventory, backup, reversible migration, exact record reconciliation and restore/decryption tests. No production writes until verified. Public reference data may be handled differently in memory but stored Finance data must meet the owner standard. Search indexes and aggregates must be classified and protected; encryption alone does not enforce permissions or prevent access by authorized compromised clients.

## Verification
Run node --test scripts/test-finance-aes256.mjs. Test provider is synthetic only; no actual KMS requests. Verify exact-head CI, KMS policies and real staging roundtrip, unauthorized tenant/key denial, configuration coverage, restore and rotation evidence before marking a module production-encrypted. Existing AWS resources should be reused where appropriate; any incremental KMS requests or keys can incur costs.

References: https://csrc.nist.gov/pubs/sp/800/38/d/final ; https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html ; https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html .
