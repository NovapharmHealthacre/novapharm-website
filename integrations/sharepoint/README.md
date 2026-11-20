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

## Fail-closed outbox boundary (source-only; pending deployment review)

The legacy Microsoft Graph small-file PUT helper remains in the repository but is **not an approved document synchronization method**. The event processor now explicitly rejects `upload_document` events with `sharepoint_upload_conflict_gate` before folder creation, object download, upload or metadata PATCH. This is a deliberate safe stop: existing content must not be implicitly replaced, especially after an ambiguous partial-success retry.

`blocked` events are **not automatically picked up again** by the outbox poller. Permission denials, version conflicts, malformed events and uncleared documents are terminal until a separately authorised operator reconciles the record and explicitly requeues it. Transient service failures can still back off and retry for the supported `ensure_entity_folder` operation. The `scripts/test-sharepoint-sync-error-policy.mjs` test is offline and does not call Graph, load credentials, touch a database or start AWS services.

**Not a permission certification or activation:** Board-only effective site access, tenant identity consent, conflict-safe create/revise with eTag validation, malware and retention controls, provider concurrency tests, and owner release approval remain open in GitHub Issue #898. The Graph helper’s existence is not evidence that uploads are available.


The worker also validates and rejects disallowed operations **before any Microsoft Graph
authentication or site/drive discovery**. An upload-only batch is blocked and
audited without issuing Graph calls. The separate, supported folder-creation
operation remains eligible for site/drive discovery after preflight. This is
enforced by offline preflight and source-order checks, not a live production test.
