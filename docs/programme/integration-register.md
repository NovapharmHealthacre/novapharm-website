# Integration Register

Status: contracts implemented; production connections externally gated
Review date: 1 August 2026

| Integration | Purpose | Authority | Repository state | Production state / gate | Failure behaviour |
|---|---|---|---|---|---|
| Azure SQL | Identity linkage, sessions, applications, customers, transactions, consent, audit and access mappings | Azure SQL | Provider, schema and migration tests implemented | Not provisioned; Azure approval and migration reconciliation required | Transactions roll back; no SharePoint/OneDrive fallback |
| Azure Blob Storage | Quarantine and private application documents | Blob plus SQL authorisation metadata | Private-container, MIME, scan-state and access contracts implemented | Not provisioned; storage/scanner approval required | Remains quarantined or unavailable |
| Microsoft Entra ID | Workforce identity | Entra tenant | Server-side claim/role mapping and tests implemented | App registration, groups, MFA/CA and consent pending | Deny authentication/authorisation |
| Entra External ID | Approved customers/partners | External tenant plus SQL customer linkage | Approval/invitation contracts implemented | Tenant/user-flow setup pending | No privileged self-registration |
| Microsoft Graph | SharePoint lists/libraries and approved notifications | Microsoft 365 | Server-side client, retry/throttle/audit contracts implemented | Least-privilege consent and identifiers pending | Queue/retry; never expose credentials or silently overwrite |
| SharePoint | Controlled board, quality, regulatory, contract and policy documents | SharePoint for binary/version; SQL for access and sync state | Architecture, metadata and permission plan implemented | Inventory and owner-approved least privilege pending | Fail closed; retain idempotent sync event |
| Polar Speed | Intended third-party logistics/warehouse events | Qualified external system for physical event; SQL for application projection | Client and sync engine exist | Endpoint, contract scope, quality agreement and technical onboarding pending | Retry/dead-letter; never infer stock, dispatch or certificate state |
| Transactional email | Contact/application notices and acknowledgements | SQL notification queue | Provider abstraction, queue, retry and local capture tests implemented | Provider key/domain/recipient approval pending | Persist retryable/blocked state; professional user message |
| CRM | Lead, opportunity, stage, ownership and next-action records | Azure SQL application model | SQLite/Azure SQL parity schema, synthetic scenario seed, server-authorised read model and CRM assertions implemented | No Salesforce or other external CRM tenant connected; production migration and business acceptance pending | Canonical SQL records remain available; no external success is inferred |
| Front Door/WAF | Edge TLS, routing, origin protection and inspection | Azure configuration | Premium/WAF IaC and compile validation implemented | Azure/DNS/live test pending | Origins remain inaccessible or previous public estate remains live |
| Application Insights/Log Analytics | Sanitised health/security/operational telemetry | Azure monitoring | Filters, IaC diagnostics and alerts implemented | Deployment, sampling, caps and alert tests pending | Application continues; sensitive payloads remain excluded |
| Search Console | Google ownership/indexing diagnostics | Google | Site eligibility and owner guide prepared | Domain verification and submission pending | No effect on site operation |
| Bing/IndexNow | Bing ownership and update notification | Bing/IndexNow | Dry-run and status handling implemented | Verification/key and production submission pending | Retry only materially changed canonical URLs |

## Synchronisation contract

Every outbound business change writes an outbox event in the same database transaction. Workers use immutable SQL identifiers and idempotency keys, store external IDs, respect `429`/retry delays, record attempts and surface dead letters. Conflicts do not silently overwrite authoritative fields. Each field has one named authority.

Credentials and tokens are server-side only, resolved through managed identity/Key Vault in production. No integration is described as active from the existence of an adapter.
