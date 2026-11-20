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
- Drive ID: supplied privately through `SHAREPOINT_DRIVE_ID`
- Ecosystem root: `NovaPharm Digital Ecosystem`
- Controlled website source: `16 Website and Portal/Executive Platform`

The Executive Platform source contains 18 modules, one hub, two PDFs and one local chart runtime. These files are excluded from Git and hydrated through `scripts/sync-secure-content.mjs`.

## Required Runtime Secrets

`MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `SHAREPOINT_HOSTNAME`, `SHAREPOINT_SITE_PATH` and, when needed, `SHAREPOINT_DRIVE_ID`.

No credentials are stored in the repository or browser JavaScript.

## File path safety (source-only verification, pending review)

The existing Graph client validates each folder/file path segment before any request,
rejecting dot traversal, separator injection, percent-encoded ambiguity, control
characters, reserved delimiter characters and invalid trailing dots/spaces.
Ordinary spaces and Unicode file names are percent-encoded per segment.
`scripts/test-sharepoint-graph-paths.mjs` uses an offline Graph request stub;
it does not authenticate, read documents, change permissions or upload files.

This code-level safeguard does **not** prove site-specific Entra consent,
Board-only effective permissions, tenant-scoped rights, conflict-safe file
versioning, malware screening or successful live synchronization. Those gates
must be verified separately before enabling the existing outbox worker.

### Safe Graph folder pagination

`ensureFolder` checks matching folders across bounded Microsoft Graph `@odata.nextLink`
pages before attempting folder creation. Continuations must remain on the
identical Graph origin, drive and parent-child endpoint. Invalid, repeated and
excessive continuations fail closed; five offline tests exercise synthetic
201-item pages, malicious links and limits without live Graph requests.
Folder-creation races and effective group permissions remain separate
provider-side release gates tracked in issue #898.

### Complete metadata enumeration for secure-content reads

`listFolderChildren` now collects bounded Graph continuation pages before
returning metadata to the protected-content synchronization caller. Repeated,
foreign, malformed or excessive pages fail closed rather than silently
publishing an incomplete local file manifest. Offline tests cover 201-item
folders, hostile cursors, repeated links and page limits. This does not
prove live provider compatibility or atomicity across nested folders.
