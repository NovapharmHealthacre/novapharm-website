# Azure Free-Tier Eligibility Matrix

Status: deployment blocked - no accessible Azure subscription

Assessment date: 14 July 2026

Proposed environment: `free-validation` / `poc`

Proposed resource group: `novapharm-free-validation-rg`

Proposed region: UK South, subject to subscription-level SKU and free-offer confirmation

## Actual subscription evidence

The owner completed Microsoft device authentication for the NovaPharm identity. Azure CLI then reported no accessible subscription in the NovaPharm tenant. `az account list --all` returned an empty list. A separate external tenant required a new Conditional Access sign-in and did not expose a subscription to this session.

Consequently, the following facts cannot yet be verified:

- subscription offer or quota ID;
- whether a spending limit exists and is `On`;
- promotional-credit balance and expiry;
- whether UK South exposes Linux App Service F1 to the subscription;
- whether the Azure SQL portal applies the free offer;
- whether the 12-month Storage and Key Vault benefits remain available.

No resource was provisioned. A marketing page saying that a service has a free allowance is not accepted as proof that the allowance applies to this subscription.

## Eligibility matrix

| Azure service | Proposed SKU | Region | Current official free allowance | Applies to this subscription | Could a payment method be charged? | Hard usage limit | Automatically stops at limit | Residual charge risk | Approved deployment decision |
|---|---|---|---|---|---|---|---|---|---|
| Resource Manager/resource group | ARM resource group tagged `free-validation` | UK South proposed | Resource groups and Resource Manager control-plane use are free | No accessible subscription to verify | No direct resource-group charge; resources inside it can charge | Not applicable | Not applicable | None from the empty group itself | **Blocked** until an eligible protected subscription is selected |
| App Service | Linux Free F1, one worker | UK South proposed | Up to 10 web/API apps, 1 GB storage and 60 CPU minutes per day; free/Shared plans have no SLA | Unknown | F1 itself is free, but a wrong plan or attached service can charge | 60 CPU minutes/day and platform quotas | The app is stopped until quota reset | Cold stops, no Always On, no slots, no custom domain, no production SLA | **Preferred validation compute; blocked** until `az appservice list-locations --sku F1 --linux-workers-enabled` and portal pricing confirm F1 |
| Container Apps | Consumption, 0.25 vCPU/0.5 GiB where supported, min 0/max 1 | UK South proposed | 180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests per subscription/month | Unknown | Yes after the grant; environment/network/logging dependencies may also charge | No service-level billing hard stop | Scale-to-zero stops idle compute, not overage billing | Usage can exceed the grant; registry and Log Analytics can add cost | **Fallback only; not selected** while F1 remains viable |
| Azure SQL Database | General Purpose serverless free-offer database, `GP_S_Gen5_2` | UK South proposed | 100,000 vCore-seconds, 32 GB data and 32 GB backup per database/month; up to 10 eligible databases | Unknown; Azure for Students Starter is incompatible | Only if `BillOverUsage` is selected or other paid features are added | 100,000 vCore-seconds and 32 GB | Yes, with `freeLimitExhaustionBehavior=AutoPause` | Open tools can prevent normal idle auto-pause; native restore into a free database is unavailable | **Template approved; deployment blocked** until the portal shows “Free offer applied” and estimated monthly database cost zero |
| Blob Storage | StorageV2 Standard LRS, hot, private containers | UK South proposed | New-account 12-month benefit: 5 GB LRS hot block, 20,000 reads and 10,000 writes | Unknown; account age/offer unavailable | Yes after allowance or after the 12-month benefit expires | No service-level spending hard stop | No | Storage, operations and egress can charge | **Conditional only** with active credit and `spendingLimit=On`; seven-day synthetic-upload lifecycle required |
| Key Vault | Standard vault, no HSM | UK South proposed | New-account 12-month benefit: 10,000 Standard secret/RSA 2048 operations | Unknown | Yes after allowance or expiry | No service-level spending hard stop | No | Every authenticated operation is metered; private endpoints add cost | **Disabled by default**; use protected validation app settings unless current credit and spending-limit protection are verified |
| Microsoft Entra workforce | Entra ID Free app registration, groups and Security Defaults | Existing NovaPharm workforce tenant | Entra ID Free includes app registration/basic groups and Security Defaults MFA; Conditional Access requires P1/P2 | Tenant exists; licence and admin rights not yet inspected | Not for the selected Free features; premium features can require licences | Feature boundary, not a usage cap | Premium features remain unavailable without licensing | Conditional Access cannot be claimed; SMS is not approved | **Pending Microsoft admin session**; use only Free/already licensed features |
| Microsoft Entra External ID | Core offer, invitation/approval-based | External tenant to be selected | First 50,000 monthly active users are free; premium add-ons and SMS are not | Unknown; tenant/subscription linkage not inspected | Yes over 50,000 MAU or for paid add-ons/SMS | No tenant-level billing hard stop | No | Accidental premium add-ons or high MAU can charge | **Pending**; validation users only, no SMS or premium governance |
| Azure platform metrics and one SQL metric alert | One static `free_amount_remaining` metric time series | Same as SQL | Platform metrics are free; first 10 monitored metric time series/month and 1,000 email notifications/month are included | Unknown | Yes beyond free units | No cost hard stop | No | Additional alerts/notifications can charge | **Prepared as one static alert** at 10,000 remaining vCore-seconds; block additional alert rules |
| Application Insights / Log Analytics | None in free validation by default | Not selected | First 5 GB/month per billing account for Analytics Logs; included retention depends on data type | Unknown | Yes after ingestion/retention allowances | Daily cap stops ingestion, but is not a complete billing guarantee | Ingestion can stop at a configured cap | Cross-region data, export, alerts and retention can charge | **Not deployed** until allowance, sampling and protective caps are verified on the selected subscription |
| Azure Defender for Storage | None | Not selected | No approved zero-charge malware-scanning allowance for this validation | Not applicable | Yes, usage based | Monthly cap is not a zero-cost guarantee | No | Scanned GB charges | **Prohibited** for free validation; use simulated scan-state tests only |
| Private endpoints, NAT Gateway, Firewall, Front Door/WAF | None | Not selected | No zero-charge architecture approved for this phase | Not applicable | Yes | No | No | Hourly/data-processing charges | **Prohibited** for free validation and absent from the free-validation templates |
| App Service Standard S1 production baseline | S1 retained in `infra/main.bicep` | Future owner-approved production region | No free allowance | Not applicable | Yes, continuously | No | No | Recurring compute charge | **Preserved but not authorised or deployed** |

## Enforced deployment policy

The `Controlled Azure free validation` workflow fails before provisioning unless all of the following are true:

1. OIDC selects the expected subscription.
2. Azure Resource Manager reports subscription state `Enabled`.
3. Azure Resource Manager reports `subscriptionPolicies.spendingLimit` exactly `On`.
4. The owner has recorded a positive promotional-credit balance checked within the previous 48 hours.
5. The Azure SQL creation screen has shown **Free offer applied** and estimated monthly database cost zero.
6. Linux F1 and supported Node 24 are available in the selected region.
7. The target resource group is exactly `novapharm-free-validation-rg`.
8. Compiled Bicep passes the repository cost contract.

Budgets and alerts are warning controls, not billing hard stops. They do not replace the subscription spending limit.

## Official sources

- [Azure free services](https://azure.microsoft.com/en-us/pricing/free-services/)
- [App Service quotas](https://learn.microsoft.com/en-us/azure/app-service/web-sites-monitor)
- [Azure Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing)
- [Azure SQL Database free offer](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql)
- [Azure SQL free-offer FAQ](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer-faq?view=azuresql)
- [Azure SQL supported metrics](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics)
- [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/)
- [Azure spending limit](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit)
- [Microsoft Entra licensing](https://learn.microsoft.com/en-us/entra/fundamentals/licensing)
- [Microsoft Entra External ID pricing](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing)
