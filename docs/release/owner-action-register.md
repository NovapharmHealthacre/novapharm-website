# Owner and external action register

Review date: 28 August 2026

Repository-controlled work is not moved into this register. Every item below requires an owner decision, account/tenant authority, external provider, regulated approver or real environment. No password, API key or private document should be pasted into chat.

| Order | External owner/action | Exact location or authority | Required value/decision | Secret? | Safe to share in chat? | Verification | Repository next step |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Resolve App Service aggregate quota | Azure Portal > Quotas > App Service > UK South, or Azure Support | `Total Regional VMs` limit of at least 4 for the approved production topology | No | Screenshot without subscription/tenant identifiers is acceptable | `az quota list` reports aggregate limit >= 4 | Run reviewed cost gate and staging what-if only |
| 2 | Approve cost envelope | Owner and finance | Accepted monthly ceiling and services/SKUs from the Bicep what-if | No | Yes | Dated approval linked to exact what-if | Permit staging provision workflow |
| 3 | Approve Entra identities and policies | Entra admin | App registrations, groups/roles, MFA and Conditional Access decisions | Client secrets are secret | Decisions/IDs may be shared; secrets may not | Real sign-in and blocked-access matrix | Configure protected environment/Key Vault references |
| 4 | Supply Key Vault values through approved channel | Azure/Key Vault administrator | Session/gateway secrets and provider keys named in deployment documentation | Yes | No | App Service references show resolved; no secret appears in GitHub/logs | Execute staging readiness tests |
| 5 | Approve SQL and storage authority | Azure/DB administrators | Entra SQL admin group, managed identity grants and private Blob policy | Controlled configuration | Do not share credentials | Migration reconciliation, private access and backup/restore | Enable candidate data plane |
| 6 | Approve managed email | Owner, Microsoft 365 and chosen provider | Authorised sender/recipient, provider choice, domain validation and monitored mailbox | Provider key is secret | Public mailbox/domain records may be shared; key may not | Controlled enquiry persists and reaches authorised mailbox once | Mark Contact environment accepted |
| 7 | Approve malware scanning | Security owner | Defender for Storage or approved equivalent | No credential in chat | Decision only | Harmless detection, quarantine and release exercise | Enable controlled onboarding documents |
| 8 | Commission independent penetration test | Owner/security | Qualified scope covering edge, identity, API, Portal, data and uploads | Report may be confidential | Do not paste full confidential report | Remediation and signed retest | Permit production approval gate |
| 9 | Approve legal/privacy/retention content | UK legal/privacy adviser and owner | Final public terms, enquiry retention, onboarding retention and cookie decisions | No | Approved wording may be shared | Dated legal approval against exact release | Freeze approved content manifest |
| 10 | Approve pharmaceutical publication boundaries | Qualified regulatory/quality owner | Current company, partner, product, logistics, CRO, oncology and licence wording | Evidence may be controlled | Approved public wording only | Claims Registry/evidence sign-off | Permit production content freeze |
| 11 | Approve Nutraxin commerce inputs, only when pricing work resumes | Owner, legal, regulatory, finance and operations | Product sale scope, price, stock authority, tax, delivery, returns and payment provider | Merchant credentials are secret | Decisions/public prices may be shared; credentials may not | Approved end-to-end transaction/refund tests | Open a separate commerce release |
| 12 | Approve DNS cutover after staging acceptance | DNS owner | Exact Front Door validation/routing records and rollback window | Some tokens may be controlled | Share non-secret record values only | TLS, health, redirects, email records and smoke tests pass | Execute controlled DNS SOP |

The public GitHub Pages release does not require paid Azure resources and can remain the safe review surface while these managed-runtime actions are unresolved.
