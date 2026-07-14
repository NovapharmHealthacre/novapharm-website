# Azure Backup and Restore Runbook

Status: local SQLite backup/restore tested; Azure SQL/Blob restore pending deployment

## Recovery objectives

RPO and RTO require owner approval after transaction volume and operational impact are measured. Do not publish invented objectives.

## Azure SQL

Production Bicep enables short-term retention and Azure point-in-time restore capability. Before cutover:

1. record the database, region, redundancy and retention settings;
2. create a known test record set;
3. initiate point-in-time restore to a new isolated database;
4. grant a test app identity only;
5. start the candidate application against the restored database;
6. reconcile records, relationships, audit events and customer isolation;
7. record elapsed recovery time and latest recoverable timestamp;
8. remove the isolated restoration after evidence approval.

## Blob Storage

Versioning, Blob soft delete and container delete retention are enabled. Test by restoring a deleted non-confidential test object and confirming its checksum. Quarantine and clean containers remain private. A restored object does not bypass malware or authorisation state.

## Key Vault and application release

Key Vault soft delete and purge protection are enabled. Recovery evidence must not reveal secret values. Retain immutable application packages/commit SHAs and candidate slot history. A code rollback does not roll back data automatically.

## Legacy SQLite

Before Azure migration, run `npm run backup:database`, `npm run verify:backup -- <path>` and an isolated `npm run restore:database -- <backup> <isolated-target>`. Keep the final verified source until the Azure acceptance window closes.

