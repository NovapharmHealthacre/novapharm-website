# Local Portal Backup and Restore Guide

Status: synthetic local validation
Last reviewed: 16 July 2026

## Create, Verify and Restore-Test a Backup

With the local portal initialised, run:

```bash
npm run portal:local:backup-test
```

This command:

1. checkpoints the SQLite write-ahead log;
2. creates a consistent SQLite backup using `VACUUM INTO`;
3. applies owner-only file permissions;
4. calculates a SHA-256 checksum;
5. runs SQLite integrity and required-table checks;
6. restores the backup to an isolated validation database;
7. reconciles record counts for identity, customers, products, orders, leads, applications, documents, audit and security records;
8. validates foreign keys;
9. removes the isolated restore while retaining the verified backup.

Backups are stored in:

`~/Library/Application Support/NovaPharm/local-portal/backups/`

They are not public and are not committed to Git.

## Recovery Procedure

For an owner-approved local recovery:

1. Stop the portal with `npm run portal:local:stop`.
2. Select the verified backup by its timestamp and checksum.
3. Preserve the current database as a pre-restore copy.
4. Restore with `scripts/restore-database.mjs`, specifying the backup and the local database path.
5. Start the portal with `npm run portal:local`.
6. Verify `/api/ready`, login, all four owner scopes, record counts and private document access.

The restore tool refuses to overwrite an existing target unless the explicit approved overwrite flag is set. It verifies the source and restored copy before replacing a database.

## Retention

This environment contains synthetic data only. Keep only the most recent backups needed for the current owner review and remove abandoned backups when validation is complete. Production retention requirements are separate and are not established by this local workflow.
