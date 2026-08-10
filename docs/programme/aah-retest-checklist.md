# AAH-Class Network Retest Checklist

Status: repository procedure complete; external network retest pending production candidate
Review date: 1 August 2026

This checklist applies to AAH and equivalent managed pharmaceutical/corporate networks. It records evidence; it does not presume the gateway vendor or ask for a whitelist before NovaPharm defects are ruled out.

## Pre-retest

- [ ] Public DNS, certificate, redirect and security-header checks pass from an unrestricted network.
- [ ] Root and required subdomains resolve to the approved origin only.
- [ ] No private route, source map, storage container or administrator interface is public.
- [ ] No threat-intelligence or certificate-transparency anomaly remains unexplained.
- [ ] Public-only pages do not expose dead login, upload or server form interfaces.
- [ ] Test approval, time window and non-confidential test account are recorded.

## Incident evidence template

| Field | Evidence |
|---|---|
| Blocked URL, including path but no secret/query data | |
| Date/time with timezone | |
| Screenshot, redacted of user or confidential data | |
| User location/network | |
| Gateway/vendor | |
| Block category | |
| Threat classification | |
| Policy ID | |
| Request/correlation ID | |
| DNS result from affected network | |
| Certificate result and chain | |
| Redirect chain | |
| HTTP status and response headers | |
| Affected assets/subresources | |
| NovaPharm root cause or inconsistency found | |
| Resolution submission/reference | |
| Retest date/result | |

## Retest routes

- [ ] Corporate homepage, navigation and official logo.
- [ ] Services, Regulatory, Products, Partners, Technology and Insights.
- [ ] Contact page and privacy/legal links.
- [ ] NIT homepage and founder homepage.
- [ ] Managed portal sign-in initiation only; no credentials captured in evidence.
- [ ] Sitemap, robots and representative image assets.
- [ ] No raw error, loop, dead action or deceptive secure interface.

## Decision

`Pass` requires successful loading and interaction without bypassing a legitimate corporate policy. `Blocked by gateway policy` requires complete evidence and an appropriate gateway review request only after NovaPharm deployment inconsistencies are corrected. `NovaPharm defect` blocks release and returns to DNS/edge/application remediation.
