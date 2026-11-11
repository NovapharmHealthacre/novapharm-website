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


## Additional reconciliation: API log-delivery permissions

The API stage destination alone is not enough. The authenticated AWS audit found that the original CloudWatch Logs resource policy permitted only the private Intelligence gateway, with the other nine access-log groups holding no recorded bytes.

**Applied directly in AWS:** `PutResourcePolicy` created `NovapharmHttpApiScopedLogDelivery`, a 3,353-byte resource policy granting only `logs:CreateLogStream` and `logs:PutLogEvents` to `apigateway.amazonaws.com`. Each of the nine statements limits the resource to one known log group and the principal source to that API's exact `execute-api` ARN. The existing private Intelligence gateway resource policy was left intact.

**Reproducible source:** `infra/aws/policies/novapharm-http-api-scoped-log-delivery.json` contains the exact live policy input for an audited `aws logs put-resource-policy --region eu-north-1 --cli-input-json file://infra/aws/policies/novapharm-http-api-scoped-log-delivery.json` operation. This command must be run only by an authorised release role after current account/API/log ARN verification. Do not treat adding this file as automatic CloudFormation ownership or run it blindly after endpoint replacement.

The two staging Stage templates were also updated to preserve their already-deployed API access-log destinations: `infra/aws/nutraxin-customer-staging-stack.json` and `infra/aws/contact-synthetic-staging.yaml`. The production template changes and staging API logs now cover **9 source-owned HTTP APIs**. The private Intelligence terminal gateway remains separately managed and already had its own delivery policy.

**Proof still required:** A network-level GET to a harmless public `/health` endpoint followed by a matching CloudWatch Logs record. Direct Lambda handler invocation does not exercise API Gateway. The initial external HTTP probe environment could not reach AWS API endpoints, and the AWS connector temporarily refused further sessions at its session limit; no request-delivery proof was claimed. The fact that an API stage lists an access log destination or has write permissions is NOT sufficient.

GitHub CI remains mandatory; local source-level/parity checks are not substitutes for required CodeQL, supply chain, production readiness or browser acceptance.
