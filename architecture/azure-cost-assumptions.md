# Azure Cost Assumptions

Status: planning model only; not a quote or approval to incur charges  
Currency/region assumption: GBP, UK South preferred, UK West recovery consideration  
Prepared: 14 July 2026

## Principles

Azure prices vary by agreement, region, reservation, currency and consumption. This repository intentionally does not hardcode a monthly total. Before deployment, the owner must create and approve an Azure Pricing Calculator estimate from the selected parameter file.

The owner has separately authorised only a zero-out-of-pocket `free-validation` environment under an active spending limit or protected promotional credit. On 14 July 2026 the authenticated NovaPharm tenant exposed no accessible Azure subscription, so no resource was created. The evidence and service-by-service decision are in `azure-free-tier-eligibility-matrix.md`.

Free validation does not alter this paid-production cost model. It uses the split `infra/free-validation-*.bicep` templates and must pass every cost gate in `deployment/free-validation-runbook.md`.

## Required production meters

| Service | Initial assumption | Main cost driver | Cost-control decision |
|---|---|---|---|
| App Service | Linux Standard S1 or approved Premium v3, one plan; staging slot shares plan compute | SKU and instance count billed continuously | Begin with measured capacity; use two production instances only after budget approval or where availability requires it |
| Azure SQL Database | General Purpose serverless or provisioned small database; production auto-pause disabled | vCore/DTU, storage, backup and zone settings | Set maximum capacity; staging may auto-pause; production must not introduce unacceptable wake latency |
| Storage | GPv2 LRS/ZRS, private Blob containers | Stored GB, operations, egress, redundancy | Lifecycle policy only after retention approval; no public access |
| Defender for Storage | On-upload malware scanning for quarantine uploads | GB scanned; scanning is charged from day one | Configure monthly scan cap and upload limits; owner approval required |
| Key Vault | Standard | Operations, certificates and recoverability | Use managed identity and minimise secret reads; soft delete/purge protection |
| Application Insights/Log Analytics | Workspace-based | Ingested/retained telemetry | Sampling, data caps, short operational retention until governance approves longer retention |
| Private endpoints/DNS | SQL, Storage and Key Vault where approved | Endpoint hours and DNS zones | Use only for production/staging resources that need them; document residual public-access controls during migration |
| Entra External ID | Current active-user/authentication model | Monthly active users and premium features | Validate tenant pricing and MFA/Conditional Access licensing before invitation |
| Resend/email | Existing provider outside Azure | Messages/domain plan | Keep transactional only; set quotas and alerts |
| Backups/exports | Azure SQL automated backups plus optional long-term/export storage | Retention and storage | Define RPO/RTO and legal retention before long-term retention |
| Optional Front Door | Not in baseline | Requests, rules, WAF and egress | Add only after performance/security measurement demonstrates value |

## Environment isolation

- Development uses local SQLite/emulators or a separate low-cost Azure development resource group.
- Staging uses a separate database, Blob containers, identities, Key Vault secrets, email sandbox and SharePoint test location. It may use the production App Service plan's staging slot but never production data or credentials.
- Production uses dedicated data, storage, identities and secret values.

## Owner approval checklist

1. Select subscription and billing scope.
2. Confirm UK South or another approved region based on data residency, service availability and recovery needs.
3. Generate calculator estimates for S1 x1 and x2, the selected SQL tier, storage, Defender scanning, monitoring, private endpoints and expected External ID users.
4. Set subscription/resource-group budget alerts at 50%, 80%, 100% and forecasted-overrun thresholds.
5. Approve the selected estimate before any Bicep deployment.

## Official pricing references

- [App Service pricing](https://azure.microsoft.com/en-gb/pricing/details/app-service/)
- [Azure SQL Database pricing](https://azure.microsoft.com/en-gb/pricing/details/azure-sql-database/single/)
- [Azure Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [Microsoft Defender for Cloud pricing](https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/)
