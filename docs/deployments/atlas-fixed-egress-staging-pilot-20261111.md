# NovaPharm Atlas Free-tier fixed-egress pilot

Status: **cost-gated staging source candidate**. This is not an approved production database connection, and nothing in this PR provisions network resources or grants Atlas access.

## Design and isolation

- `infra/aws/atlas-staging-fixed-egress-pilot.json` defines a **new, standalone staging VPC** (`10.91.0.0/16`) in AWS `eu-north-1`, with one public subnet, one private subnet and no public-IP assignment on either subnet.
- When explicitly activated, one public NAT Gateway obtains one static Elastic IPv4 address; a private, outbound-only staging probe can route through it. The Atlas project's IP access list is a **separate** management action: only the observed NAT egress address as `/32` may be considered. Never use `0.0.0.0/0` in the Atlas project list.
- A no-ingress security group permits outbound TCP 27017 for MongoDB Atlas TLS and TCP 443 for AWS/HTTPS bootstrap. It creates **no ECS service, Lambda function, MongoDB user, IAM role, payment, DNS, customer account or medical record**.
- The existing Intelligence private production VPC `vpc-0caa0618d5a29052a`, its NAT-less routes, and existing public site/commerce services are not modified.

## Operating cost and release gate

AWS bills for NAT Gateway time and traffic, public IPv4 use and related data transfer. This design is a **single-AZ staging probe, not high-availability production architecture**. A production decision must independently address 2-AZ egress, failover, regional pricing, alerts and measured cost.

All network resources have the same CloudFormation condition, which is false by default. A controlled change request must set:
1. `PilotActivation=APPROVED`.
2. `MonthlyOperatingCostApproval=APPROVED` after a recorded real cost estimate and budget alert review.
3. `SecurityReview=APPROVED`.
4. A nonempty `CostApprovalReference` identifying the approval, in the Stockholm region.

**Do not deploy this template with all four conditions enabled without an approved cost ceiling.** This code deliberately does not interpret broad implementation instructions as authority to incur unspecified recurring charges.

## Required activation/acceptance (not yet done)

1. Validate CloudFormation template; independently assess instance and NAT + public IPv4 charges in `eu-north-1`.
2. Deploy only against the separate pilot VPC, check exact CloudFormation outputs, tag ownership and bounded billing alarms.
3. Observe the new EIP and add only its `/32` to the correct Atlas project's IP allowlist after the Atlas network review. Ensure database user has read-only permission on the **preview** namespace.
4. Deploy a dedicated approved private probe with official pinned MongoDB driver and scoped SSM parameter `/novapharm/intelligence/preview/mongodb-observer-uri`. Verify TLS, SRV/DNS resolution, real `ping`, exact indexes, denial cases, and redacted application logs. The existing source-only `src/data/atlas-private-preview-inspection.mjs` is the inspection contract, **not** this deployed runtime.
5. Re-test network denial from unauthorized source and remove any temporary testing access.
6. Build independent production HA/backup restoration, medicine source-rights ingestion, data-quality tests, identity/tenant isolation, audit and immutable rollback. None follows automatically from a working staging ping.

## Alternative

MongoDB Atlas private endpoints require **M10+ dedicated clusters**, not the current FREE clusters. If production policy requires private networking rather than public Atlas + strictly allowed EIP, design an approved M10+ Atlas/PrivateLink plan with separate AWS interface-endpoint costs. Do not upgrade either cluster automatically.

## Independent verification

`node --check scripts/test-atlas-fixed-egress-pilot.mjs`

`node --test scripts/test-atlas-fixed-egress-pilot.mjs`

CloudFormation `ValidateTemplate` and an actual non-creating change set review are additional requirements. Passing contract tests is **not** an AWS deployment or production go-live.
