# Operational Reporting Views

**Status:** Implemented in SQLite and Azure SQL migration `003_backend_activation.sql`
**Reviewed:** 15 July 2026

The application database remains authoritative. Reporting consumers receive
read access to curated views, not base tables, credentials, session tokens,
message bodies, uploaded files or unrestricted audit records.

| View | Purpose | Sensitive fields deliberately excluded |
|---|---|---|
| `reporting_current_leads` | Lead reference, business contact and attribution workflow | Enquiry message, consent hashes, network fingerprint |
| `reporting_application_pipeline` | Application status and document-count progress | Application JSON, bank and trade-reference details |
| `reporting_notification_delivery` | Aggregate email queue health | Recipient, provider payload and message body |
| `reporting_daily_form_activity` | Daily contact/application volume | All form contents |
| `reporting_utm_attribution` | Aggregate approved campaign attribution | IP/network data and free text |
| `reporting_active_portal_users` | Active session activity by user and scope | Session ID, cookie and credential data |
| `reporting_security_events` | Aggregated event/outcome counts | Network fingerprint and event detail payload |
| `reporting_document_quarantine` | Controlled document security state | Storage path and document bytes |
| `reporting_account_activation` | Application-to-customer activation status | Identity and compliance payloads |

Azure migration `003_backend_activation.sql` creates
`novapharm_reporting_reader` and grants that role `SELECT` on these nine views
only. The migration principal assigns approved Microsoft Entra users or a Power
BI service identity to the role after owner approval. It must not grant
`db_datareader`, table-level access or application write privileges.

SQLite recreates reporting views after additive table migrations so an older
session schema can be upgraded without leaving invalid view dependencies.

## Acceptance

The local activation and migration tests query every view and prove expired or
revoked sessions are excluded. Azure SQL execution remains pending an eligible,
cost-protected subscription and a temporary migration identity.
