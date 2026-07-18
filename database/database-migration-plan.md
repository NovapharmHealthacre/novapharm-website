# SQLite to Azure SQL Migration Plan

Status: schema and controlled migration tooling implemented; Azure execution pending  
Owner: Data migration lead  
Last reviewed: 14 July 2026

## Existing implementation

The legacy provider uses SQLite with 39 related tables, foreign keys, persistent sessions, contacts, account applications, customers, suppliers, products, orders, documents, consent evidence, security events, audit records and integration outbox events. `database/azure/001_initial.sql` provides the Azure SQL baseline, `002_notification_delivery_queue.sql` adds the transactional-email queue, and `003_backend_activation.sql` adds durable application upload grants, immutable status history, customer contacts and least-privilege reporting views. `src/data/database.mjs` exposes one async repository contract across both providers.

## Migration controls

`scripts/migrate-sqlite-to-azure-sql.mjs` requires:

- `ALLOW_AZURE_DATA_MIGRATION=staging` or `production`;
- `PRODUCTION_MIGRATION_APPROVED=true` for production;
- a verified source backup separate from the live source;
- an empty Azure target;
- a reviewed username allowlist for identities;
- explicit document-binary migration approval;
- checksum and record-count reconciliation.

Credentials, password hashes, sessions and rate-limit buckets are not migrated. Production identities are provisioned through Entra or an explicitly approved one-time bootstrap.

## Execution order

1. Freeze writes or establish a documented cut-off window.
2. Run the SQLite backup and integrity verifier.
3. Record schema version, source checksum and per-table counts.
4. Initialise an isolated Azure SQL staging database with `npm run migrate:azure-sql:schema`.
5. Create a least-privilege runtime user and a separate temporary migration principal.
6. Execute the data migration against staging.
7. Reconcile every imported table, skipped identity, foreign-key rewrite and document checksum.
8. Run contact, account, role, customer-isolation, audit and integration tests.
9. Remove migration rights and prove the runtime starts with `AZURE_SQL_RUN_MIGRATIONS=false`.
10. Repeat against production only after written owner approval.
11. Preserve the source database and verified backup until post-cutover acceptance expires.

## Transaction and retry model

Each import is transaction-bound. The Azure provider uses encrypted connections, managed-identity access tokens, bounded pooling and retry only for transient connection/token faults. SQL parameters are bound by the driver. Application migrations are versioned in `schema_migrations`; normal runtime start fails if a required migration is missing.

## Acceptance evidence

- source and backup integrity both `ok`;
- source/backup counts equal before migration;
- Azure target empty before import;
- imported counts equal approved source counts;
- no orphaned foreign keys;
- no local/test identity imported without approval;
- documents remain quarantined until malware scan passes;
- old sessions and credentials cannot authenticate;
- application health reports database `ready` after migration rights are revoked.

No Azure migration has been executed in this repository environment.
