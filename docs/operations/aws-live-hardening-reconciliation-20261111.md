# AWS production hardening reconciliation

**Date:** 2026-11-11. **Region:** eu-north-1. **Account:** 250675045172.

## Changes directly applied and independently re-read
- All **10 production** DynamoDB tables have point-in-time recovery and deletion protection. During the 11 November authenticated audit, six production tables were switched to deletion protection and one to PITR. This PR updates three CloudFormation-managed table definitions to preserve the live configuration.
- All 10 API Gateway HTTP stages have access-log destinations. Nine missing configurations were applied, and all ten re-read. This PR updates the **seven production stage CloudFormation definitions** to preserve metadata-only logs in existing CloudWatch Log Groups. No request or payment body is logged.
- Internal EventBridge rule `novapharm-cloudwatch-alarm-event-audit` sends CloudWatch alarm transitions to `/novapharm/operations/cloudwatch-alarm-events` (30-day retention). A labelled internal synthetic test event was successfully delivered and observed, with **no external email**.

## Known gaps; no production sign-off
- CloudWatch: **20/21** metric alarms have ActionsEnabled=false; the internal event log is not human escalation and production alert routing remains unaccepted.
- The Intelligence production ECS cluster has **0 services / 0 running tasks**; staging portal service is scaled 0/0. No forced always-on hosting or DNS cutover has been authorised by this source-only PR.
- Both production customer Cognito pools have **0 registered users**. Real customer authentication and subscription entitlement acceptance remain unproven.
- Intelligence candidate Lambda had 7 error metrics and 3 throttles in the sampled prior day, including logged timeouts in an earlier published version. A healthz Lambda invocation on current version 15 passed but is not end-to-end acceptance.
- The Nutraxin staging and contact synthetic staging API stages and the manually managed private terminal gateway still need controlled source logging reconciliation.
- Production commerce seller-ledger, shipment-events and ESCO inventory tables are not owned by the 38 inventoried CloudFormation stacks; their retention/recovery settings need reviewed IaC ownership without resource replacement.
- The existing API log groups and new internal alarm-event rule were created directly in AWS and **not imported into CloudFormation**. Plan idempotent adoption before further automated deployments; do not create duplicate named log groups or rules.
- CloudTrail is currently a region-scoped management-event trail. Multi-region/data-event audit and verified human paging, current vulnerability remediation, backup restore, exact-SHA CI and browser acceptance remain open.

## Source verification
`node --test scripts/aws/production-hardening-contract.test.mjs`

These templates reflect existing live settings. Do **not** equate this source PR, a CloudFormation template validation or a successful merge with a completed customer-facing release.
