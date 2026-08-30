# Portal Module Maturity Register

Status: repository classification complete; production deployment pending
Review date: 1 August 2026
Scope: all 54 governed modules

## Decision

No module is described as fully operational in production. Forty-seven repository-backed modules are released as **informational only** and read-only because Azure, Entra and canonical production data are not deployed. Seven modules are **hidden until their dependency exists**. No module is silently removed. Synthetic local acceptance demonstrates contracts and access boundaries; it is not evidence of a live ERP, WMS, CRM, finance, NHS, pharmacovigilance or Microsoft 365 integration.

The canonical machine-readable record is [module-catalog.json](../../packages/portal-contracts/src/module-catalog.json). Each record names its actual repository or external source boundary, business owner, maturity, read/write state, dependency, authorised roles, test files, navigation state and production status.

## Enforcement

- Hidden modules do not resolve through portal routing and are rejected by the server module service.
- Informational modules suppress mutation controls in the current release.
- Every customer query retains database-enforced `customer_id` isolation.
- An `admin` navigation link never replaces record-level authorisation.
- SharePoint is not used for sessions, authentication, customer isolation or transactional authority.

## Register

| Module | Business owner | Release classification | Read | Write | Authorised roles | Production |
|---|---|---|---|---|---|---|
| `customer.dashboard` | Portal Product Owner | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.account` | Customer Operations | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.orders` | Commercial Operations | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.invoices` | Finance | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.statements` | Finance | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.products` | Product and Regulatory | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.price-lists` | Commercial and Finance | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.stock-availability` | Supply Chain Operations | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.order-tracking` | Supply Chain Operations | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.delivery-tracking` | Supply Chain Operations | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.returns` | Customer Operations and Quality | Informational only | repository_tested_read_model | controlled_repository_write_implemented_but_not_released | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.quality-complaints` | Quality | Informational only | repository_tested_read_model | controlled_repository_write_implemented_but_not_released | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.documents` | Document Control | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.support` | Customer Operations | Informational only | repository_tested_read_model | controlled_repository_write_implemented_but_not_released | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.regulatory-documents` | Regulatory and Quality | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.downloads` | Document Control | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.analytics` | Portal Product Owner | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `customer.settings` | Portal Product Owner | Informational only | repository_tested_read_model | none_read_only | `customer`, `admin` | not_deployed_owner_controlled |
| `employee.dashboard` | Portal Product Owner | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.customers` | Customer Operations | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.suppliers` | Supplier Quality and Procurement | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.products` | Product and Regulatory | Informational only | repository_tested_read_model | controlled_repository_write_implemented_but_not_released | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.orders` | Commercial Operations | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.warehouse` | Supply Chain Operations | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.purchasing` | Procurement | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.finance` | Finance | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.quality` | Quality | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.regulatory` | Regulatory | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.crm` | Commercial Operations | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.reports` | Business Intelligence | Informational only | repository_tested_read_model | none_read_only | `employee`, `admin` | not_deployed_owner_controlled |
| `employee.administration` | Platform Administration | Informational only | repository_tested_read_model | controlled_repository_write_implemented_but_not_released | `employee`, `admin` | not_deployed_owner_controlled |
| `executive.command-centre` | Board and Chief Executive Officer | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.ceo-dashboard` | Chief Executive Officer | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.sales-intelligence` | Commercial Operations | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.customer-analytics` | Commercial Operations | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.product-master` | Product and Regulatory | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.nhs-data` | Commercial and Regulatory | Hidden until its dependency exists | none_while_hidden | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.plpi` | Regulatory | Hidden until its dependency exists | none_while_hidden | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.pharmacovigilance` | Qualified Safety Owner | Hidden until its dependency exists | none_while_hidden | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.sourcing` | Procurement and Supplier Quality | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.tenders` | Commercial Operations | Hidden until its dependency exists | none_while_hidden | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.warehouse` | Supply Chain Operations | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.service-levels` | Supply Chain Operations | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.finance` | Finance | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.capital` | Board and Finance | Hidden until its dependency exists | none_while_hidden | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.microsoft-365` | Microsoft 365 Platform Owner | Hidden until its dependency exists | none_while_hidden | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.documents` | Document Control | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.ai-technology` | AI Governance Committee | Hidden until its dependency exists | none_while_hidden | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `executive.traceability` | Quality and Supply Chain Operations | Informational only | repository_tested_read_model | none_read_only | `board`, `admin` | not_deployed_owner_controlled |
| `admin.dashboard` | Portal Product Owner | Informational only | repository_tested_read_model | none_read_only | `admin` | not_deployed_owner_controlled |
| `admin.local-review` | Platform Administration | Informational only | repository_tested_read_model | none_read_only | `admin` | not_deployed_owner_controlled |
| `admin.users` | Identity and Access Management | Informational only | repository_tested_read_model | none_read_only | `admin` | not_deployed_owner_controlled |
| `admin.content` | Content Governance | Informational only | repository_tested_read_model | none_read_only | `admin` | not_deployed_owner_controlled |
| `admin.analytics` | Portal Product Owner | Informational only | repository_tested_read_model | none_read_only | `admin` | not_deployed_owner_controlled |

## Production activation gate

A module can move to **Fully operational and tested** only after its named source is connected, real data ownership is approved, migrations reconcile, security and role tests pass in Azure staging, business acceptance is signed, backup/restore is proven, and live monitoring is active. The catalogue change must be reviewed like code and cannot be made from the browser.
