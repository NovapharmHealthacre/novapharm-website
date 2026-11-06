# NovaPharm contact and secure portal | AWS production activation evidence

Date: 6 November 2026. Workload Region: `eu-north-1`. The existing Microsoft Entra ID P1 MFA setup must be reused for workforce sign-in and must NOT be replaced by a weaker password-only AWS portal.

## Verified live public state

Read-only browser-network probe executed from GitHub Actions on 6 November 2026 at 12:52 UTC: https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42220910949

| Endpoint | HTTP | Operational acceptance |
| --- | --- | --- |
| `https://novapharmhealthcare.com/contact/` | 200 | No managed form: email-only public fallback |
| `https://novapharmhealthcare.com/portal/` | 200 | Static link to separate portal host; not proof of an authenticated service |
| `https://portal.novapharmhealthcare.com/portal/` | 503 | Managed portal unavailable |
| `https://api.novapharmhealthcare.com/api/health` | 404 | Managed API health not operational at expected path |
| `https://y2sa7gga5i.execute-api.eu-north-1.amazonaws.com/health` | 200 | AWS synthetic-only staging health, intentionally NOT live |

The public site, managed portal and staging API must not be conflated.

## AWS resources actually created and tested

- Active **Free** plan and USD 100 in remaining credits at initial deployment preflight. No Paid Plan upgrade requested.
- Existing `novapharm-staging-foundation`: six ECR repositories, ECS cluster, log groups and private S3 document/quarantine buckets. No ECS application services deployed.
- Created `novapharm-contact-staging` on 6 November 2026: `CREATE_COMPLETE`; new HTTP API, Lambda `novapharm-staging-contact-test`, encrypted on-demand DynamoDB `novapharm-staging-contact-test` and seven-day logs.
- Source: `infra/aws/contact-synthetic/index.js`; CloudFormation: `infra/aws/contact-synthetic-staging.yaml`; safety tests: `scripts/aws/contact-staging.test.mjs`; CI: `.github/workflows/aws-contact-staging-check.yml`.
- An authenticated **synthetic-only** POST returned HTTP 201 and receipt `1c53b06f-0b5e-4365-ba4f-c029b19e2a88`. A separate DynamoDB `GetItem` confirmed the exact ID and `SYNTHETIC_STAGING_ONLY` classification. Anonymous POST returned HTTP 403. Data has a 24-hour TTL. No genuine person, partner, clinical or customer data was used.
- Synthetic Lambda and public HTTPS staging contract checks **passed** at GitHub Actions run `42220662139`. Both the staging health endpoint and unauthenticated-denial endpoint were verified from a GitHub runner.
- **The staging API must remain synthetic-only.** It is not a production notification system and does not accept real contact submissions.

## Email activation

An Amazon SES Easy DKIM domain identity for `novapharmhealthcare.com` was created in `eu-north-1`. Current AWS status: **PENDING verification**. Authoritative DNS is Microsoft-hosted (SES reports `ns1.bdm.microsoftonline.com`).

Publish these three **CNAME** records in the actual existing domain DNS zone; do not change MX, SPF, nameservers, Microsoft 365 records or the website's existing A/AAAA/CNAME records:

| Host | DNS target |
| --- | --- |
| `ku2zzpttmuzzewpnnaapwlsm6k7phhlc._domainkey.novapharmhealthcare.com` | `ku2zzpttmuzzewpnnaapwlsm6k7phhlc.dkim.amazonses.com` |
| `5p4zrzg4hch467lzbvhkilgfjabvvnzy._domainkey.novapharmhealthcare.com` | `5p4zrzg4hch467lzbvhkilgfjabvvnzy.dkim.amazonses.com` |
| `3twgfsxto7aqk6w5bpdre355qgz3hwpq._domainkey.novapharmhealthcare.com` | `3twgfsxto7aqk6w5bpdre355qgz3hwpq.dkim.amazonses.com` |

A transactional email production-access request was submitted through `sesv2 PutAccountDetails` in `eu-north-1` for B2B contact acknowledgement and internal routing only. AWS recorded **DENIED** with case ID `179396962000658` (specific reasons not provided by the API). **SES production sending remains unavailable** pending AWS review/support resolution and domain verification.

## Cost safety

Created AWS Budgets `NovaPharm-Free-Trial-Guard-10USD`: USD 10 monthly budget with 80% actual-spend notification, excluding credits from budget cost calculations. The recipient `vishal@novapharmhealthcare.com` must confirm AWS Budgets' subscriber verification email before receiving alerts. A budget is **not a hard spending cap**. Continue checking the AWS Free plan's remaining credit and expiry date.

## Remaining production gates

1. Keep **Microsoft Entra ID P1 MFA** as the workforce identity authority. Confirm the actual application/tenant registration, authorized OIDC issuer and audience, redirect URIs, JWKS signature verification, Conditional Access enforcement, group/app-role mappings and deny-path tests. The Azure App Service `x-ms-client-principal` header is intentionally not trusted on AWS.
2. Deploy the real API and database, secure managed portal web service, independent HTTPS origins and approved DNS/certificates with rollback. There are presently no AWS ECS application services and no production RDS database.
3. Complete Amazon SES domain verification and AWS sending-access review, or approve and configure a supported Microsoft 365 Graph sending provider with protected credentials and audited delivery.
4. Implement/verify durable real B2B enquiries with validation, privacy consent, CSRF/abuse protection, notification outbox, receipts, bounce/complaint processing and test inbox reconciliation. Synthetic staging alone is insufficient.
5. Run actual Entra-MFA owner sign-in against the AWS portal, server-side role/tenant denial tests, logout, expiry, audit and private-document controls. Do not grant customer access by default.
6. Reconcile production dependency security Issue #84, accept only reviewed exact SHAs, complete browsers/mobile/accessibility, backup/restore, operational response and approved cutover.

**Production status: NOT ACTIVATED.** Do not repoint the corporate domain or publish an anonymous contact form until these conditions pass. Existing GitHub Pages fallback and Microsoft mail service remain untouched.
