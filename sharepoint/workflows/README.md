# SharePoint Workflows

## Automatic Workflows

1. Record committed in the operational database.
2. Outbox event requests an entity folder and metadata.
3. Sync worker ensures the folder idempotently.
4. Files are uploaded with checksum and canonical metadata.
5. SharePoint IDs are linked back to the record.
6. Audit log records success or retry state.

## Controlled Document Lifecycle

`draft -> in_review -> approved -> effective -> superseded -> archived`

Approval actors are resolved from Entra groups. The application stores the approval decision and correlation ID; SharePoint stores the controlled file/version. Failed notifications do not roll back an approved business transition, but they remain retryable events.

## Trigger Coverage

Customer, supplier, product, order, purchase order, invoice, statement, contract, quality agreement, MHRA record, SOP, training record and employee-file events all use the same outbox and document service.
