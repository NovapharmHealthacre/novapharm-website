# SharePoint Document Backbone

SharePoint Online is the controlled-document system of record for NovaPharm. Structured business state remains in the operational database; every file is represented by canonical document metadata and one or more entity links before synchronization.

The executable integration lives in `src/integrations/sharepoint/`. It uses Microsoft Graph application authentication, a transactional outbox and idempotent folder/file operations. Missing credentials leave events visible as blocked; they do not lose or fabricate synchronization results.

See the subfolders for library design, metadata, workflows and permission mapping.
