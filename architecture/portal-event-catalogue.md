# Enterprise portal event catalogue

- Version: 1.0
- Reviewed: 2026-07-16

| Event family | Aggregate | Trigger | Current status | Persistence or next gate |
|---|---|---|---|---|
| product.review / product.approved / product.active / product.suspended / product.retired | product | Lifecycle transition | Implemented | domain_events + outbox_messages + audit_logs |
| workflow.advanced / workflow.completed | workflow | Approved workflow step command | Implemented | domain_events + outbox_messages + audit_logs |
| support_ticket.created | support_ticket | Customer support submission | Audit implemented | audit_logs; production event projection pending |
| return.requested | return | Customer return submission | Audit implemented | audit_logs; production event projection pending |
| complaint.opened | quality_complaint | Non-safety quality complaint | Audit implemented | audit_logs; production event projection pending |
| catalogue.imported | catalogue | Idempotent Nutraxin import | Import ledger implemented | catalogue_imports + catalogue_import_items |
| order.* | order | Order lifecycle | Workflow contract | Required before production automation |
| purchase_order.* / goods_receipt.* / invoice_match.* | purchasing | Procure-to-pay lifecycle | Workflow contract | Required before production automation |
| document.* | document | Scan, approval and version lifecycle | Integration foundation | Existing integration_events plus production Graph approval |
| notification.* | notification | Queued delivery and replay | Existing email queue foundation | External provider credential required |

## Event controls

- Event identifiers and idempotency keys are immutable.
- Aggregate version prevents silent lifecycle overwrite.
- A business transaction commits its state, audit record, domain event and outbox record atomically where the event is implemented.
- Outbox delivery may retry without duplicating the business transaction.
- External failure never changes an approved local record into an invented success.
- Payloads exclude credentials, private storage paths, patient information and unrestricted document contents.
