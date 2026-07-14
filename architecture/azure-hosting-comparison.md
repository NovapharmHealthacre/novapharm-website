# Azure Hosting Comparison

Assessment date: 14 July 2026  
Decision: Azure App Service for Linux

## Comparison

| Criterion | App Service for Linux | Container Apps Consumption | Container Apps Dedicated | Other managed options |
|---|---|---|---|---|
| Continuous availability | Natural fit with Always On; instance count is explicit | Minimum replicas must be at least one to avoid scale-to-zero cold start | Explicit always-on workload profile | Static Web Apps cannot host the current persistent Node portal alone; AKS is excessive |
| Scale to zero | No | Yes when minimum replicas is zero | Workload-profile scaling, normally not a cost fit here | Functions are unsuitable for the current server/session shape without redesign |
| Cold starts | Avoided with paid tier/Always On | Expected after zero replicas | Avoided with running capacity | Varies |
| Session handling | App Service Auth plus SQL-backed application state | Requires external state and careful revision routing | Same | Same |
| Custom domains/certificates | First-class managed certificates and hostname binding | Supported | Supported | Supported in some services |
| Deployment safety | Mature staging slots and swaps | Revisions and traffic splitting | Revisions and traffic splitting | Varies |
| Private networking | VNet integration/private endpoint features on appropriate tiers | Workload-profile networking supports private endpoints/UDR | Strongest Container Apps network control | AKS strongest but unjustified |
| Managed identity | Native, including slot-specific identities | Native | Native | Native on most Azure compute |
| Entra/Easy Auth | Native App Service Authentication | Built-in Container Apps auth exists, but adds container/revision operations | Same | Static Web Apps auth model is less aligned with this portal |
| Key Vault | Native references through managed identity | SDK/secret references | SDK/secret references | Varies |
| SQL/Blob connectivity | Straightforward VNet + managed identity | Straightforward but container image/revision lifecycle required | Straightforward | Varies |
| Logging/health | App Service logs, health check, App Insights | Log Analytics, probes and revision metrics | Same | Varies |
| Backup/rollback | Deployment slots plus artifact rollback; data backed separately | Revision rollback; data backed separately | Same | Varies |
| Cost behaviour | Dedicated plan billed continuously | Per-second compute, memory and requests; can be cheap only if zero/low utilisation is acceptable | Dedicated profile billed per running instance | Static frontend plus Functions may be cheaper but requires architectural split |
| Complexity | Lowest for the present conventional Node app | Medium: image registry, revisions, ingress, probes and scaling | Higher | AKS highest; split hosting adds operational surfaces |

## Selected production profile

- Linux App Service plan, Standard S1 minimum for staging-slot support; Premium v3 should be selected if private-network, performance, zone or scale requirements justify it.
- Node 24 LTS runtime.
- Always On enabled.
- HTTPS only and minimum TLS 1.2.
- Health path `/api/health`.
- Staging slot with slot-specific settings and identity.
- Production capacity of two instances where owner-approved budget permits. One instance is allowed only as an explicitly accepted availability risk.
- No App Service F1/Shared production use.

The final SKU and instance count are deployment parameters because Azure retail rates, agreements and regional availability change. The owner must review the generated Azure Pricing Calculator estimate before deployment.

## Container Apps reconsideration triggers

Reassess Container Apps when NovaPharm has separately deployable stateless integration workers, bursty event processing, independent scaling, revision traffic-splitting needs or a maintained container operations capability. A scale-to-zero production portal is not selected because authentication and first-request latency are part of the user experience.

## Sources

- [Azure App Service hosting plans](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans)
- [Plan and manage App Service costs](https://learn.microsoft.com/en-gb/azure/app-service/overview-manage-costs)
- [Azure Container Apps workload profiles](https://learn.microsoft.com/en-us/azure/container-apps/workload-profiles-overview)
- [Azure Container Apps scaling](https://learn.microsoft.com/en-us/azure/container-apps/scale-app)
- [Azure Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)

