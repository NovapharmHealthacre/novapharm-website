# NovaPharm Intelligence private service interface endpoints

The existing `novapharm-intelligence-ecr-s3-gateway` stack provides the **S3 image layer endpoint only**. This additional template prepares private `ecr.api`, `ecr.dkr`, `logs`, and `secretsmanager` interface endpoints for the separate eu-north-1 production-candidate VPC.

**Default BLOCKED.** These endpoints have recurring hourly charges **per AZ and endpoint**, plus data processing. `ActivationApproval=APPROVED` AND `OperatingCostAcceptance=APPROVED` are both required before creating any endpoint, even during a dry-run change set. Obtain an actual regional pricing estimate, budget/alarm acceptance and two-AZ operations approval before deploying paid resources. The user has asked for an enterprise-grade app, not unexpected idle costs.

The private subnet IDs from the existing stack are `subnet-01ab9197e8e6537ed` (10.80.10.0/24, AZ a) and `subnet-03165bd4b19d3a5af` (10.80.11.0/24, AZ b); dedicated VPC `vpc-0caa0618d5a29052a`. Verify IDs and both AZs immediately before any activation. The endpoint SG admits TLS 443 only from the two private Fargate subnet CIDRs and uses restricted egress. Each endpoint has private DNS. It creates NO NAT, Internet gateway, public listener, application task, ECS service, user, access policy grants, OpenAI key or Stripe charge.

**Still needed after activation:** authoritative ECS execution/task roles and image digest, actual customer Cognito/private API/session wiring, stable CloudWatch monitoring, route to Cognito JWKS/MongoDB Atlas/approved external official medicine APIs/OpenAI endpoints, source-rights confirmation, customer entitlements, backup/restore, protected end-to-end tests and authenticated production readiness. Do not infer those from endpoint existence.
