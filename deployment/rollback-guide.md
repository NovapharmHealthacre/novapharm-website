# Production Rollback Guide

## Application Rollback

1. Identify the last Git commit whose CI workflow completed successfully.
2. Redeploy that immutable commit from the hosting provider; do not rewrite `main` history.
3. Keep the persistent disk mounted at `/var/lib/novapharm` so the database and controlled-content cache remain intact.
4. Confirm `/api/health`, the homepage, contact form CSRF and portal login before restoring normal traffic.

## Database Recovery

- Stop the application before replacing the SQLite database.
- Restore `novapharm.sqlite` together with matching `-wal` and `-shm` files when they exist, or use a backup produced through SQLite's backup API.
- Retain the failed database for investigation; never overwrite the only copy.
- Run `PRAGMA integrity_check` and the production smoke tests before reopening writes.

## Secure Content Recovery

The Executive Platform source of truth is the controlled SharePoint folder. Delete only the runtime cache under `SECURE_CONTENT_ROOT/executive-platform`, then run `node scripts/sync-secure-content.mjs` to hydrate an approved version. Use SharePoint version history when a specific file revision must be restored.

## DNS Rollback

Keep the previous hosting target recorded before DNS cutover. If the Node service cannot be restored within the agreed incident window, return the apex and `www` records to the prior verified target and publish a controlled service notice. Do not direct portal paths to a static host that cannot authenticate users.
