# AWS / MongoDB Atlas production cost-estimate inputs (no spending authorised)

## Owner update: strict GBP 0 incremental spending cap (14 November 2026)

This worksheet now has an explicit constraint: **no additional monthly charge is authorised**. Existing AWS services and Atlas FREE clusters may be inspected or reused only when actual incremental usage charges remain independently proven to be **GBP 0**. The existing AWS budget alert is configured in USD and is not a hard cost-prevention permission. Pay-per-request usage, egress, logs and AWS free credits must not be assumed free indefinitely.

Do **not** submit an ECS desired-count increase, ALB/NAT provisioning, dedicated public API deployment, customer order billing, database upgrade or increased storage and backups based on this worksheet. If a complete, secure Portal cannot be hosted within existing no-incremental-cost capacity, preserve the working public registration and keep the Enterprise Portal in private engineering mode.


**Status: estimation worksheet only. All proposed paid changes unapproved as of 14 November 2026.** Do not treat an inventory resource as free, or a list price as an approved budget.

## Working requirements

| Service / cost driver | Existing evidence | Information required before quoting | Proposed spending state |
|---|---|---|---|
| API Gateway HTTP API | Existing Intelligence route and Cognito-facing services observed in eu-north-1 | Request count, peak RPS, region, caching / throttling needs, private vs public paths | Maintain existing accepted runtime only; new service OFF |
| Lambda / image runtime | Active Intelligence image Lambda, private acceptance aliases, ECR repository | Memory, CPU runtime, duration, invocations, peak concurrency, provisioned concurrency necessity | New deployment / capacity OFF |
| ECS / ALB | Production ECS cluster observed; zero running tasks and active services at prior audit | Whether actually necessary beyond Lambda; minimum tasks/AZs, vCPU/RAM, data transfer, ingress and certificates | OFF pending budget, security and architecture approval |
| ECR / container scanning | Existing registry; BASIC scanning verified for candidate digest | Storage GiB, image retention, scan coverage / enhanced scan decision | No new paid scanning tier authorised |
| Cognito | Production pool with MFA required and PKCE app client | Monthly active users, MFA method / SMS external cost, email delivery, identity-provider and domain contracts | No new customer activation |
| CloudWatch and CloudTrail | Existing audit trail and alarms observed | Log GB ingest, retention, alarm count, metric cardinality, trace volume, data-event coverage | No new paid detectors or log tiers authorised |
| S3/private evidence | Existing evidence storage foundation noted; actual authorised data not admitted | GB-month, object count, requests, encryption/KMS, lifecycle, backups, recovery and cross-region copies | No new ingestion or storage expansion |
| DynamoDB / portal backend | Existing staging Nutraxin customer BFF ledger; not unified production source | Orders, reads/writes, tenant keys, PITR, backup strategy, request growth | Reuse for unrelated live commerce not permitted |
| MongoDB Atlas | Production project cluster npi-bootstrap described as FREE/IDLE in prior check | Sustained storage, concurrency, HA, PITR, region, read/write needs and data rights | No paid Atlas tier authorised |
| WAF / monitoring / detection | Some AWS native controls reported, Security Hub/GuardDuty visibility blocked by SCP | Rule counts, request volumes, security tooling approvals, alert owner and on-call | No new paid activation |
| AWS outbound networking | Production Lambda not in VPC at last audit; isolated ECS egress is separate | NAT endpoint-hours/GB, interface endpoints, cross-AZ and internet egress, vendor endpoints | New VPC/NAT/endpoint spend OFF |
| OpenAI / other model inference | NOVA governed model controls exist but live endpoint rights unverified | Model class, tokens/month, residency/ZDR, approved data categories, maximum usage, cost alert | Live source/model egress not authorised |
| Third-party vendors | Owner confirms no Palantir, Palo Alto or Bloomberg accounts | None for initial vendor-neutral private pilot | All licences OFF |

## How to create the first estimate without provisioning

1. Read existing billing data **only through already-authorised no-incremental-cost views**, or request an account-owner export. Do not call metered billing APIs without permission.
2. Collect current 30/90-day service totals, each service's pricing unit, region, tax assumptions and any free tier/reservation credits. Keep financial account IDs and billing exports private, never in the public repository.
3. Prepare conservative low/base/high scenarios for Lambda-only private pilot. Show separate contingent ECS/ALB and high-availability Atlas upgrades, without assuming they must be deployed.
4. Include KMS, backups, S3, monitoring, WAF, NAT/VPC endpoints, domain/certificate, egress, requests, and model tokens. Distinguish existing spend from incremental spend.
5. Obtain written monthly cap and one-off ceiling, alert threshold / owner, renewal and overage rules. A budget alert alone does not prevent charges; use actual permission and spending controls.
6. Until cap and approval exist, keep production deployments, subscription billing, native vendor connectivity, domain cutover and unapproved medicine ingestion blocked.

## Approval record to complete later

- Approval authority / date: **not yet provided**
- AWS account, Atlas project and region: **verify in owner-controlled finance record**
- Current 30/90-day actual service cost: **not yet independently verified**
- Projected incremental monthly cost (low/base/high): **not yet quoted**
- Maximum allowed recurring cost: **not approved**
- One-time implementation / migration cap: **not approved**
- Finance, Security, Data Steward and Regulatory acceptance: **outstanding**
- Cutover and rollback budget: **outstanding**

This is a **quotation input template**, not a recommendation to purchase or an estimate of actual incurred charges.
