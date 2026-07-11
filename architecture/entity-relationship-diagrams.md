# Entity Relationship Diagrams

These diagrams describe the target logical domain. `database/schema.sql` is the implemented launch model; entities such as deliveries, returns, CAPA, recalls and dedicated document-version rows remain target-state extensions and must not be interpreted as deployed functionality.

## Operational Core

```mermaid
erDiagram
  ORGANIZATIONS ||--o| CUSTOMERS : "has account"
  ORGANIZATIONS ||--o| SUPPLIERS : "has account"
  ORGANIZATIONS ||--o{ PERSONS : "has contacts"
  CUSTOMERS ||--o{ ORDERS : places
  CUSTOMERS ||--o{ INVOICES : receives
  CUSTOMERS ||--o{ SUPPORT_TICKETS : raises
  ORDERS ||--|{ ORDER_LINES : contains
  PRODUCTS ||--o{ ORDER_LINES : ordered
  ORDERS ||--o{ DELIVERIES : fulfilled_by
  DELIVERIES ||--|{ DELIVERY_LINES : contains
  BATCHES ||--o{ DELIVERY_LINES : supplies
  ORDERS ||--o{ INVOICES : billed_by
  INVOICES ||--|{ INVOICE_LINES : contains
  PRODUCTS ||--o{ INVOICE_LINES : billed
  SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
  PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_LINES : contains
  PRODUCTS ||--o{ PURCHASE_ORDER_LINES : purchased
  PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : received_as
  GOODS_RECEIPTS ||--|{ GOODS_RECEIPT_LINES : contains
  PRODUCTS ||--o{ BATCHES : has
  BATCHES ||--o{ STOCK_TRANSACTIONS : moves
```

## Product, Quality And Regulatory

```mermaid
erDiagram
  PRODUCTS ||--o{ PRODUCT_PRICES : priced_by
  PRODUCTS ||--o{ PRODUCT_REGULATORY_RECORDS : governed_by
  PRODUCTS ||--o{ BATCHES : manufactured_as
  SUPPLIERS ||--o{ SUPPLIER_PRODUCTS : offers
  PRODUCTS ||--o{ SUPPLIER_PRODUCTS : sourced_from
  SUPPLIERS ||--o{ SUPPLIER_QUALIFICATIONS : qualified_by
  PRODUCTS ||--o{ QUALITY_RECORDS : concerns
  BATCHES ||--o{ QUALITY_RECORDS : concerns
  CUSTOMERS ||--o{ COMPLAINTS : reports
  COMPLAINTS ||--|| QUALITY_RECORDS : creates
  QUALITY_RECORDS ||--o{ CAPAS : resolved_by
  QUALITY_RECORDS ||--o{ RECALLS : may_trigger
  RECALLS }o--o{ BATCHES : includes
  PRODUCTS ||--o{ ADVERSE_EVENTS : concerns
  ADVERSE_EVENTS ||--o{ REGULATORY_RECORDS : reported_as
```

## Identity, Documents And Audit

```mermaid
erDiagram
  PERSONS ||--o| USERS : authenticates_as
  PERSONS ||--o| EMPLOYEES : employed_as
  USERS ||--o{ USER_ROLES : receives
  ROLES ||--o{ USER_ROLES : grants
  EMPLOYEES ||--o{ TRAINING_RECORDS : completes
  DOCUMENTS ||--|{ DOCUMENT_VERSIONS : versions
  DOCUMENTS ||--o{ DOCUMENT_LINKS : relates
  DOCUMENTS ||--o{ SHAREPOINT_LINKS : synchronized_as
  DOCUMENTS ||--o{ APPROVALS : approved_by
  USERS ||--o{ APPROVALS : decides
  USERS ||--o{ AUDIT_LOGS : acts
  INTEGRATION_EVENTS ||--o{ AUDIT_LOGS : correlates
```

## Polymorphic Link Controls

`document_links`, upload operations and SharePoint mappings currently use application-maintained entity allowlists. The PostgreSQL migration should add an entity registry and database enforcement for polymorphic references. Free-form entity types must remain forbidden.

## Required Unique Constraints

- `customers.customer_number`
- `suppliers.supplier_number`
- `products.sku`
- `products.gtin` when present
- `batches(product_id, batch_number)`
- `orders.order_number`
- `purchase_orders.po_number`
- `invoices.invoice_number`
- `documents.document_number`
- `users.entra_object_id`
- `sharepoint_links(site_id, drive_id, item_id)`
- `integration_events(destination_system, idempotency_key)`

## Required Referential Behaviours

- Master records referenced by financial, regulated or warehouse transactions use `RESTRICT` on delete.
- Line records cascade only from unposted drafts; posted aggregates are immutable and corrected with reversal records.
- User removal nulls the active login but preserves actor snapshots in the audit trail.
- Document versions are append-only.
