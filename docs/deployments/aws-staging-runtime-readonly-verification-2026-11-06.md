# AWS staging runtime read-only verification | 2026-11-06

This is an authenticated AWS API inventory, **not** production acceptance. Region: `eu-north-1`. AWS account: `250675045172`. No mutations or customer data were used.

## Verified state

| Component | AWS API | Observation |
| --- | --- | --- |
| Audit stack | CloudFormation DescribeStacks | `novapharm-audit-staging` is `CREATE_COMPLETE` |
| CloudTrail | DescribeTrails, GetTrailStatus | `novapharm-staging-audit` exists, `IsLogging=true`, `LogFileValidationEnabled=true`; latest delivery reported `2026-11-06T17:28:29.633Z` |
| CloudTrail coverage | GetEventSelectors | Read/write management events included; no data-event resources configured; single-region trail |
| ECS | ListServices on `novapharm-staging` | **Zero ECS services** |
| RDS | DescribeDBInstances | **Zero DB instances** in region |
| Cognito | DescribeUserPool | `eu-north-1_dZRAEzkYa`, MFA configuration `ON`; this does not demonstrate Entra federation or an actual MFA login |
| SES | GetAccount | `ProductionAccessEnabled=false`; `SendingEnabled=true` does not imply production sending authority |
| API Gateway | GetApis | `novapharm-contact-synthetic-staging` exists; does not establish production contact delivery |

## Acceptance boundaries

1. Issue #90's historical statement that no CloudTrail exists is superseded by the observed staging trail. **Do not close #90:** verify actual delivered log object and digest, retention, access-denied testing, cost/alert review, operational ownership, and any required multi-region/data-event coverage.
2. No ECS services or RDS instance were observed. Thus six-app managed runtime, database migration and secure portal cannot be called deployed or accepted.
3. Entra P1 → Cognito sign-in, authorization-negative tests, SES production authority, real B2B receipt/delivery, and public browser acceptance remain blocked.
4. Do not modify public DNS, enable production submissions or sign-in, upgrade the AWS plan, or transfer customer/clinical data based on this inventory.

**Provenance:** direct authenticated AWS Core `call_boto3` reads (CloudFormation, CloudTrail, ECS, RDS, Cognito, SES v2, API Gateway), 6 November 2026. The inventory does not constitute independent validation of an exact application release SHA or public URL.
