# NovaPharm Master Data Model

## Purpose

This model is the contract for every NovaPharm website, portal, dashboard, workflow, integration, document and report. No module owns a private copy of a customer, supplier, product, order, invoice, purchase order, employee or regulated record. Modules reference canonical records by immutable IDs and publish domain events when state changes.

## Architecture Rules

1. The launch implementation uses one persistent SQLite database as the operational system of record. Managed PostgreSQL is the target before multi-instance scaling.
2. SharePoint is the system of record for controlled documents and binary files.
3. Hashed local identities and database scopes are implemented for controlled launch access. Microsoft Entra ID and group mapping are the production identity target.
4. Financial postings and payment state are mastered by the approved finance platform after integration.
5. Warehouse stock movements are mastered by the approved WMS/Polar Speed feed after integration.
6. The NovaPharm integration layer owns cross-system IDs, idempotency, audit events and synchronization state.
7. Dashboards read governed views or APIs. They never invent operational values in browser code.
8. New governed aggregates should carry `id`, lifecycle state, creation/update evidence and source-system context. Existing schema coverage is recorded below rather than implied.
9. Business identifiers are unique but replaceable; internal UUIDs never change.
10. Deletion of regulated or financial records is prohibited. Records are closed, superseded or anonymised under retention policy.

## Canonical Identifier Pattern

| Entity | Internal key | Human identifier | Example |
|---|---|---|---|
| Customer | UUID | `customer_number` | `CUS-000001` |
| Supplier | UUID | `supplier_number` | `SUP-000001` |
| Product | UUID | `sku` | `NPH-000001` |
| Sales order | UUID | `order_number` | `SO-2026-000001` |
| Purchase order | UUID | `po_number` | `PO-2026-000001` |
| Invoice | UUID | `invoice_number` | `INV-2026-000001` |
| Document | UUID | `document_number` | `DOC-QMS-000001` |
| Quality event | UUID | `quality_number` | `QEV-2026-000001` |
| Regulatory record | UUID | `regulatory_number` | `REG-2026-000001` |
| Support ticket | UUID | `ticket_number` | `TKT-2026-000001` |

Identifiers are allocated transactionally. SharePoint paths use the human identifier; database links use the immutable UUID.

## Core Domains

The tables in `database/schema.sql` are the implemented physical model. The broader entities below form the target logical model for later finance, warehouse, quality and PostgreSQL expansion; they are not all represented as deployed tables today.

### Party And Identity

| Entity | Required fields | Relationships |
|---|---|---|
| `organizations` | legal name, trading name, company number, VAT number, country, status | parent of customer or supplier account |
| `persons` | name, job title, contact channels, consent status | contacts, directors, responsible persons, employees |
| `addresses` | type, address lines, postcode, country, validation state | reusable delivery, invoice and registered addresses |
| `customers` | customer number, type, lifecycle status, credit terms, credit limit, currency | organization, contacts, addresses, contracts, orders |
| `suppliers` | supplier number, type, qualification status, payment terms, GDP/GMP status | organization, products, contracts, purchase orders |
| `users` | Entra object ID, username, status, last sign-in | person, roles, customer or employee scope |
| `employees` | employee number, department, manager, employment status | person, user, training records |
| `roles` / `user_roles` | role code, scope, permissions | users and records |

### Product And Regulatory

| Entity | Required fields | Relationships |
|---|---|---|
| `products` | SKU, EAN, GTIN, name, strength, form, pack size, manufacturer, origin, lifecycle state | supplier products, prices, stock, batches, regulatory records |
| `product_prices` | price type, amount, currency, effective dates, customer/contract scope | product, customer, contract |
| `product_regulatory_records` | jurisdiction, licence type, licence number, MHRA state, marketing state, effective dates | product, documents, approvals |
| `batches` | batch number, manufacture date, expiry date, release state, quantity | product, supplier, stock transactions, documents |
| `stock_locations` | warehouse, zone, temperature class | stock balances and transactions |
| `stock_transactions` | movement type, quantity, batch, location, occurred at, external reference | order, receipt, return or adjustment |

### Commercial And Fulfilment

| Entity | Required fields | Relationships |
|---|---|---|
| `quotes` / `quote_lines` | quote number, customer, validity, pricing basis | converted to order |
| `orders` / `order_lines` | order number, customer, status, requested delivery, totals | products, allocations, deliveries, invoice |
| `deliveries` / `delivery_lines` | delivery number, carrier, tracking, status, POD | order and batches |
| `returns` / `return_lines` | return number, reason, disposition, status | customer, order, product, quality event |
| `invoices` / `invoice_lines` | invoice number, posting state, due date, totals, finance external ID | order, customer, payments, statements |
| `payments` | method, amount, received date, finance external ID | customer and invoices |
| `statements` | period, opening, charges, payments, closing | customer and documents |

### Purchasing And Supplier Operations

| Entity | Required fields | Relationships |
|---|---|---|
| `purchase_orders` / `purchase_order_lines` | PO number, supplier, approval state, currency, totals | supplier products, goods receipts, invoices |
| `goods_receipts` / `goods_receipt_lines` | receipt number, received at, inspection state | PO, batch, stock transaction |
| `supplier_invoices` | supplier invoice number, amount, match status | PO and goods receipts |
| `supplier_qualifications` | qualification type, outcome, validity, approver | supplier, audit, document |

### Quality, Regulatory And Compliance

| Entity | Required fields | Relationships |
|---|---|---|
| `quality_records` | type, severity, status, owner, due date | product, batch, customer, supplier, CAPA |
| `complaints` | source, category, product, batch, seriousness, status | quality record, customer, regulatory report |
| `adverse_events` | report date, seriousness, reporter type, product, batch, submission deadline | complaint, regulatory report, recall |
| `recalls` | class, reason, scope, initiated at, completion state | batches, customers, deliveries, notifications |
| `capas` | root cause, corrective action, preventive action, effectiveness check | quality record or audit |
| `regulatory_records` | authority, type, reference, status, dates | product, supplier or company |
| `training_records` | course, version, assigned date, completion, result | employee, SOP/document |
| `approvals` | workflow type, stage, outcome, actor, timestamp | any governed entity through typed reference |

### Documents And Integration

| Entity | Required fields | Relationships |
|---|---|---|
| `documents` | document number, title, class, lifecycle state, owner domain, retention class | one current SharePoint file plus versions |
| `document_versions` | version, checksum, effective date, superseded date, SharePoint item ID | document, uploader, approval |
| `document_links` | document ID, entity type, entity ID, relationship | any canonical record |
| `sharepoint_links` | document/entity ID, site ID, drive ID, item ID, web URL, sync state | document and folder |
| `integration_events` | event type, aggregate, payload, idempotency key, state | durable outbox for every connector |
| `audit_logs` | actor, action, entity, before/after hashes, correlation ID, timestamp | immutable operational trail |
| `notifications` | channel, recipient, template, state, bounded attempt count, next/last attempt, safe provider error code and provider message ID | lead, account application, approval, task or support ticket; stable entity/template identity prevents duplicate transactional sends |
| `support_tickets` | requester, category, priority, SLA, status | customer, order, product, documents |

## Record Lifecycle

All governed aggregates use explicit state machines. Invalid transitions are rejected by the domain service and recorded in the audit log.

- Customer: `application -> due_diligence -> approval -> active -> suspended -> closed`
- Supplier: `prospect -> qualification -> approved -> conditional -> suspended -> closed`
- Product: `draft -> regulatory_review -> approved -> active -> quarantined -> discontinued`
- Order: `draft -> submitted -> credit_hold -> confirmed -> allocated -> dispatched -> delivered -> invoiced -> closed`
- Purchase order: `draft -> submitted -> approved -> dispatched -> part_received -> received -> matched -> closed`
- Document: `draft -> in_review -> approved -> effective -> superseded -> archived`

## Data Classification

| Class | Examples | Minimum control |
|---|---|---|
| Public | website content, published product information | integrity, approval, versioning |
| Internal | operational dashboards, supplier planning | authenticated access |
| Confidential | pricing, contracts, investor files, employee records | scoped RBAC, encryption, audit |
| Regulated | quality, PV, MHRA, training, batch records | controlled version, approval, retention, immutable audit |
| Restricted | bank details, special-category personal data, credentials | least privilege, masking, dedicated secrets store |

## Analytics Contract

Dashboards consume versioned metric definitions from governed views. Every metric records its owner, source tables, grain, filters, timezone, currency, refresh SLA and quality status. Projected values must carry `scenario` and `is_projection=true`; they cannot be rendered as actuals.

## Implemented Physical Core

The current schema includes organizations, customers, suppliers, products, batches, prices, orders/lines, invoices/lines, purchase orders/lines, users, employees, documents/links, SharePoint links, approvals, regulatory records, quality records, stock and warehouse transactions, CRM activities, leads/details, support tickets, notifications, account applications, training records, integration events, audit logs, authentication records and counters.

SharePoint supplies file-version history. The local `documents.version` field tracks the canonical version pointer; a dedicated `document_versions` table belongs to the PostgreSQL migration when richer local version lineage is required.

## Anti-Silo Acceptance Criteria

- A document cannot exist without a canonical `documents` row and at least one `document_links` relationship.
- A SharePoint item cannot be considered synchronized until its `sharepoint_links` row stores IDs, checksum and last verified time.
- A customer, supplier or product folder is created from the same committed domain event that creates the record.
- APIs return canonical IDs and relationship links, not module-local IDs.
- Cross-domain writes use domain services and a transaction/outbox boundary.
- Duplicate business identifiers are blocked by unique constraints and resolved through governed merge workflows.
