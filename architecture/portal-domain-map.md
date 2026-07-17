# Enterprise portal domain map

- Version: 1.0
- Reviewed: 2026-07-16
- Architecture rule: one canonical transactional model; no portal-specific shadow databases

## Bounded domains

| Domain | Authoritative records | Connected modules | Key invariant |
|---|---|---|---|
| Identity and access | users, auth_credentials, auth_user_scopes, auth_sessions, role_permissions | All portals | Server validates identity and scope; customer context is never taken from the browser. |
| Party master | organizations, customers, suppliers, contacts, addresses | Customer, employee, CRM, admin | One organisation identity links commercial, quality, regulatory and document records. |
| Product and catalogue | products, product_families, product_variants, composition, claims, media, certifications | Public portfolio, Product Master, ordering, sourcing | Catalogue presence never means approved claims, sale status, stock or regulatory approval. |
| Order to cash | price lists, orders, reservations, shipments, invoices, payments, statements, returns, credits | Customer, telesales, warehouse, finance, executive | Customer isolation and released-stock checks apply throughout. |
| Procure to pay | suppliers, product links, purchase orders, receipts, supplier invoices, matches | Sourcing, purchasing, inventory, finance | Receipt and invoice evidence must reconcile to an approved purchase order. |
| Quality and regulatory | complaints, actions, deviations, CAPA, recalls, regulatory cases and milestones | Quality, regulatory, Product Master, executive | Safety reports are excluded from general quality intake; unverified authorisation is never inferred. |
| Documents and integration | documents, versions, approvals, links, domain events, outbox, integration events | All portals, SharePoint, notifications | Private storage paths stay server-side; delivery is idempotent and auditable. |

## Vertical workflows

1. Product onboarding: source record -> evidence review -> classification -> claims/media control -> approved lifecycle transition.
2. Order to cash: account price -> order -> credit/stock checks -> reservation -> shipment -> invoice -> payment -> statement.
3. Procure to pay: qualified supplier -> PO -> receipt/quarantine -> release -> supplier invoice -> three-way match -> journal.
4. Lead to customer: enquiry -> qualification -> application -> review -> approval -> customer identity invitation.
5. Quality complaint: customer-scoped intake -> triage -> investigation -> action/CAPA -> controlled closure.
6. Document control: upload/quarantine -> scan state -> metadata -> approval -> effective version -> authorised link.

## Data ownership

SQLite is the local validation implementation. Azure SQL migration 004 is the parity target. SharePoint is a controlled document backbone and business-register projection, not the authentication, session, customer-isolation, finance or transaction database. Browser storage is not an authoritative store.
