# Managed production evidence

Observed: 28 August 2026
Decision: managed deployment blocked; no paid resource provisioned by this change

## Verified subscription truth

| Item | Current evidence | Status |
| --- | --- | --- |
| Subscription | `NovaPharm_Website`; enabled and current CLI default | Verified |
| Resource provider | `Microsoft.Web` | Registered |
| Region | UK South | Selected and available in App Service location results |
| P0v4 quota | 30 instances | Available at SKU quota layer |
| Total Regional VMs | 0 instances | Blocking aggregate quota |
| Requested target | 4 aggregate instances | Not granted |
| Previous quota requests | Two requests for `S1 = 4` on 20 August 2026 | Both failed with `QuotaNotAvailableForResource`; they did not change Total Regional VMs |
| Resource group | `novapharm-stg-rg`, UK South | Exists |
| App Service sites | None returned for the subscription | No managed web application deployed |
| Front Door profiles | None returned for the subscription | No managed edge deployed |

The 28 August verification was read-only. It re-queried the enabled subscription, `Microsoft.Web` registration, the complete UK South App Service quota list, the staging resource group and App Service/Front Door inventories. The aggregate `Total Regional VMs` entry still reports limit `0` and `isQuotaApplicable: false`; the P0v4 family entry still reports `30`. No deployment, what-if, quota request, DNS change or billable resource operation was performed.

## Repository-controlled architecture

- Six-application packaging and separate corporate, technology, founder, Portal, API and status boundaries.
- Azure Front Door Premium and WAF modules with origin restrictions and candidate origins.
- App Service plans, managed identities, Key Vault references, Azure SQL, private Blob, monitoring, alerts, health checks and candidate-slot design.
- Staging and production Bicep parameter files.
- OIDC-based deployment workflow, what-if gate, immutable package checksums and rollback documentation.
- Production contact, onboarding and Portal capabilities remain unavailable on the static public host.

## Evidence not presen

No resource IDs, Front Door profile, WAF policy, App Services, managed TLS, Key Vault, production SQL, Blob, Entra application, live email provider, malware scanner, live alert, backup, restore, staging browser acceptance, penetration test or production smoke test exists for this candidate. Repository validation must not be relabelled as any of those states.

## Next safe gate

The next infrastructure action is an owner/Azure Support resolution of the UK South `Total Regional VMs` aggregate quota, followed by an owner-reviewed cost estimate and Bicep what-if. No provision/deploy/DNS action should occur before both are accepted.
