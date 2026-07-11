# NovaPharm SharePoint Integration

Microsoft Graph is the server-side boundary between the canonical operational database and the controlled document backbone.

## Implemented

- Application credential configuration and token caching.
- Site and drive discovery.
- Idempotent entity-folder creation and small-file upload.
- Document metadata updates and canonical `sharepoint_links` records.
- Transactional integration-event outbox with blocked and retry states.
- Recursive download of the board-only Executive Platform into `SECURE_CONTENT_ROOT`.

## Confirmed Destination

- Host: supplied privately through `SHAREPOINT_HOSTNAME`
- Site: supplied privately through `SHAREPOINT_SITE_PATH`
- Library: `Documents`
- Drive ID: `b!uEWPsekhUUSx7JVCwS8wfvjggLC-ZqBFl1Khkpc0DVKhy0Cv-Vh1SYg9j7mGijwl`
- Ecosystem root: `NovaPharm Digital Ecosystem`
- Controlled website source: `16 Website and Portal/Executive Platform`

The Executive Platform source contains 18 modules, one hub, two PDFs and one local chart runtime. These files are excluded from Git and hydrated through `scripts/sync-secure-content.mjs`.

## Required Runtime Secrets

`MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `SHAREPOINT_HOSTNAME`, `SHAREPOINT_SITE_PATH` and, when needed, `SHAREPOINT_DRIVE_ID`.

No credentials are stored in the repository or browser JavaScript.
