# DNS change record

Observed: 22 August 2026
Change status: no DNS change made

## Current public records

| Name | Type | Observed value | Observed TTL | Purpose | Treatment |
| --- | --- | --- | ---: | --- | --- |
| `novapharmhealthcare.com` | A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` | 39 seconds at query time | GitHub Pages apex | Preserve until an approved healthy replacement exists |
| `www.novapharmhealthcare.com` | CNAME | `novapharmhealthacre.github.io` | 4502 seconds | GitHub Pages `www` alias | Preserve |
| `novapharmhealthcare.com` | MX | `0 novapharmhealthcare-com.mail.protection.outlook.com` | 4502 seconds | Microsoft 365 mail | Preserve; never modify during website cutover |
| `novapharmhealthcare.com` | TXT | `v=spf1 include:spf.protection.outlook.com -all` | 4502 seconds | SPF | Preserve; do not create a second SPF record |
| `novapharmhealthcare.com` | TXT | Google site verification token | 4502 seconds | Search verification | Preserve |
| `novapharmhealthcare.com` | TXT | Microsoft tenant verification value | 4502 seconds | Microsoft service verification | Preserve |
| `novapharmhealthcare.com` | NS | `ns1` through `ns4.bdm.microsoftonline.com` | 4502 seconds | Authoritative nameservers | Preserve; provider control plane not independently identified from DNS alone |
| `portal`, `api`, `status` | A/CNAME | No answer observed | N/A | Intended managed application hosts | Do not create before healthy Front Door routes and TLS validation exist |

The resolver also returned DNS64-style IPv6 answers under `64:ff9b::/96`; these are not treated as an independently verified authoritative AAAA change.

## Proposed managed-cutover record

No value is approved yet. Before any future change, record the exact Front Door endpoint, custom-domain validation token, current and rollback values, dependency health, TTL plan, email-impact review, owner approval and post-change tests. Apex, `www`, MX, SPF, DKIM, DMARC and unrelated subdomains must be captured together even if only one record changes.

## Rollback

The current GitHub Pages values above are the observed rollback baseline. They are not to be replaced until the managed origin, Front Door Premium/WAF, certificate, health probe, canonical redirects and public smoke tests pass.
