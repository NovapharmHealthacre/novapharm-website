# NovaPharm Healthcare corporate release truth

Last verified: 2026-08-28

## Release identity

| Field | Verified value |
| --- | --- |
| Repository | `NovapharmHealthacre/novapharm-website` |
| Current `origin/main` | `23310988e8fc484375aa10176aa1c1edbf5371a8` |
| Current implementation branch | `codex/corporate-product-discipline-rebuild` |
| Feature remote / PR | No `origin/codex/corporate-product-discipline-rebuild` ref and no pull request currently exist |
| Public canonical URL | `https://novapharmhealthcare.com/` |
| Public host | GitHub Pages, branch `main`, repository root |
| Custom domain state | Built, approved certificate, HTTPS enforced |
| Managed production state | Not activated; the exact-main dispatch job is intentionally skipped |
| Azure subscription | `NovaPharm_Website`; enabled |
| App Service provider | `Microsoft.Web`; registered |
| UK South quota | `P0v4` 30; aggregate `Total Regional VMs` 0, so provisioning is blocked |

## Exact-main evidence

The following GitHub Actions runs concluded successfully for
`23310988e8fc484375aa10176aa1c1edbf5371a8`:

- Build, deploy and verify GitHub Pages.
- Managed staging preflight.
- 8K master art-direction governance.
- Supply-chain validation.
- CodeQL.
- Azure infrastructure validation.
- Production-readiness validation.

The managed production candidate dispatch was skipped. This is a governed
fail-closed result and must not be presented as a managed production release.

PR 69 is the latest merged programme baseline and produced current `main`.
PR 16 was merged on 10 August 2026 and is historical, not an open Draft PR.
Ten open pull requests are Dependabot updates (#57-#66); none is the current
working increment. Open programme issues remain #54 and #55. The latest
scheduled CodeQL run for the exact main SHA also concluded successfully on
24 August 2026. Branch protection and repository rulesets remain absent.

## Public and managed authority

The GitHub Pages build is a `PUBLIC_ONLY` publication surface. It may publish
corporate content, product information, leadership information and safe
navigation. It is not authoritative for authentication, confidential uploads,
contact writes, account applications or protected portal data.

Those operations require the managed Next.js/API/Azure estate and exact
environment evidence. Until that evidence exists, public controls must either
lead to truthful information or remain explicitly unavailable. They must never
simulate a successful submission, account creation or portal session.

## Open programme dependencies

- Issue 54: governed 8K-master art direction and responsive image delivery.
- Issue 55: managed production activation for the secure portal and public
  submissions.
- Azure resources that incur cost remain outside this repository-only visual
  release unless separately approved and verified.
- DNS must not be changed until the managed origin, Front Door, WAF, TLS,
  rollback and smoke-test gates have passed.
- Two 20 August 2026 quota requests targeted `S1 = 4`, not the aggregate
  `Total Regional VMs` quota, and failed with `QuotaNotAvailableForResource`.
- `novapharm-stg-rg` exists in UK South, but no `Microsoft.Web/sites` resource
  was returned by the subscription inventory.
- A 28 August read-only quota query again returned `P0v4 VMs = 30` and
  `Total Regional VMs = 0`, with the aggregate entry marked
  `isQuotaApplicable: false`. App Service and Front Door profile inventories
  were both empty; no resource was provisioned and no cost-bearing action ran.

## Truth boundaries

- NovaPharm Healthcare is an active UK company.
- Regulated wholesale supply must not be described as commenced until the
  applicable permissions and production evidence exist.
- Product visibility is not evidence of stock, pricing, availability,
  authorisation or consumer sale.
- A public enquiry is not an approved business account.
- A public portal information page is not an operational secure portal.
