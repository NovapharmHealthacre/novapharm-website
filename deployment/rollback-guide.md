# Unified Azure Rollback Guide

Status: repository rollback contract implemented; managed-staging rehearsal and production acceptance pending

This guide is subordinate to the current release state, `deployment/deployment-runbook.md`, the Section 70 SOP register and owner-controlled production gates. It does not authorize provisioning, slot promotion, DNS change, database restore or production cutover by itself.

## 1. Choose the rollback boundary first

Never treat “rollback” as one estate-wide action. Identify the smallest failed boundary and record its exact environment, application, SHA/package digest, App Service app/slot, database migration version and current traffic state.

- **R1 public fallback:** GitHub Pages remains the safe public rollback. It does not provide authenticated Portal/API capability and must never be described as such.
- **Managed staging:** redeploy only the affected staging application from the last accepted immutable SHA/package after schema/configuration compatibility is verified.
- **Production candidate before promotion:** do not swap the failed candidate slot into production. Preserve its evidence and replace/redeploy only that candidate slot.
- **Production after owner-approved slot promotion:** use SOP-11. A reverse App Service slot action is permitted only when the previous package/slot, configuration and database compatibility are verified and the traffic change has explicit owner approval.
- **Front Door/WAF/custom-domain/DNS failure:** use SOP-10 and/or SOP-40. Do not use an application rollback to make an unreviewed edge or DNS change.

## 2. Application rollback

1. Freeze further deployments to the affected application.
2. Record the current and prior accepted SHAs/package digests and authoritative App Service app/slot identities.
3. Determine whether the defect is application/configuration-only or coupled to a data migration.
4. If data compatibility is unknown, **STOP** and use SOP-12 before changing application traffic.
5. Verify the last accepted immutable package digest and environment-specific Key Vault/configuration references.
6. For staging/candidate, redeploy only the affected app/slot. For an already promoted production slot, follow SOP-11 and change one application boundary at a time with explicit owner approval.
7. Verify health, authn/authz, customer isolation, forms/uploads, private storage, integrations and monitoring before closing the rollback.
8. Reconcile queues/outbox/integration events and state produced during the failed release. A successful code rollback does not undo or prove data state.

## 3. Azure SQL recovery

Application rollback and database recovery are deliberately separate.

- Do not overwrite the active Azure SQL database during a test or incident investigation.
- Use the verified restore point and restore into a **new isolated database** first, following SOP-08 and `deployment/backup-and-restore-runbook.md`.
- Bind only an approved test/recovery identity until record, relationship, audit-event and customer-isolation reconciliation succeeds.
- Record the migration version, restore point, latest recoverable timestamp and measured recovery time. Do not publish invented RPO/RTO.
- A destructive or backward migration requires the reviewed SOP-12 recovery path; never infer that redeploying old code makes a newer schema safe.
- Preserve the failed database/restore evidence until incident closure permits cleanup.

## 4. Blob and document recovery

The canonical managed document store is private Azure Blob storage; SharePoint/Graph is a separately gated integration, not the default recovery authority for all documents.

1. Use Blob versioning/soft-delete/container-retention capabilities on a non-confidential recovery object first.
2. Verify checksum, container identity and authorization state after recovery.
3. Restored uploads remain subject to quarantine/malware-release state; recovery must not move an object directly into a trusted/clean state.
4. Keep public access and storage shared-key access disabled.
5. Where a future approved SharePoint integration is involved, use its own governed integration/recovery procedure and `Sites.Selected` authority; do not substitute SharePoint for Blob recovery silently.

## 5. Key Vault and identity recovery

- Key Vault soft delete and purge protection are the managed secret-recovery controls; evidence must never contain secret values.
- Confirm the Portal and API reference their correct environment-specific vaults and identities before restoring traffic.
- Do not copy production credentials into staging or candidate environments to accelerate recovery.
- Identity/Entra recovery must preserve role/MFA/customer-isolation boundaries; if those controls cannot be proved, keep the protected application closed.

## 6. Public fallback and traffic recovery

- Preserve the verified GitHub Pages public fallback until managed cutover is accepted and its retirement is explicitly approved.
- Candidate-to-production slot swaps, Front Door/custom-domain changes and DNS changes are owner-controlled and separate from package deployment.
- Move or restore one approved hostname/application boundary at a time and verify it before the next.
- Preserve unrelated MX, SPF, DKIM, DMARC, Microsoft 365 and verification records during any DNS recovery.

## 7. Legacy SQLite boundary

SQLite backup/restore tooling is retained only as legacy/local migration evidence and for explicitly authorized isolated migration validation. It is **not** the canonical managed-production rollback mechanism for the six-application Azure estate. Do not use `/var/lib/novapharm`, WAL/SHM replacement or a single-node persistent-disk procedure as an Azure production recovery instruction.

## 8. Required evidence

Record, without secrets:

- environment and affected application/boundary;
- incident/change ID and owner approval where required;
- current/prior accepted SHAs and package digests;
- App Service app/slot before and after;
- migration version and compatibility decision;
- Azure SQL/Blob restore identifiers where recovery occurred;
- health, authn/authz, customer-isolation, private-storage, integration and monitoring results;
- queue/outbox/state reconciliation;
- traffic/DNS state where separately changed;
- operator, approver and start/end timestamps;
- rollback and recovery disposition under the Section 70 evidence contract.

Repository guidance is **not** managed-staging rehearsal or production acceptance evidence.