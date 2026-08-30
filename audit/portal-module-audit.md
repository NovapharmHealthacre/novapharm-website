# Enterprise portal module audit

- Version: 1.0
- Reviewed: 2026-07-16
- Before-state evidence: owner-supplied 15-page portal screenshot document, checksum recorded in the owner handoff
- Routed contracts reviewed: 54

| Area | Routed modules | Implemented foundation | External or planned boundaries |
|---|---:|---:|---:|
| customer | 18 | 18 | 0 |
| employee | 13 | 13 | 0 |
| executive | 18 | 11 | 7 |
| admin | 5 | 5 | 0 |

## Findings resolved

- Generic placeholder pages were replaced by authenticated module workspaces backed by the canonical database.
- Customer views now enforce customer isolation for account, order, invoice, statement, product, price, stock, tracking, return, complaint, document, support and analytics records.
- Employee modules now expose connected product, supplier, order, purchasing, inventory, finance, quality, regulatory, CRM, reporting and workflow records.
- Board and executive modules are read-only and label every synthetic or externally blocked source honestly.
- Administrator views expose migration, import, workflow, domain-event and outbox state without unrestricted raw-table editing.
- A single authorised search service respects customer and employee boundaries.

## Honest boundaries retained

NHS data, live pharmacovigilance, Microsoft 365 tenant access, capital plans, AI models and tenders remain no-data or external-integration states. PLPI remains an internal project-governance view and does not assert a granted licence. Warehouse views use a synthetic third-party location and do not imply NovaPharm ownership. All financial values are synthetic local-validation records.
