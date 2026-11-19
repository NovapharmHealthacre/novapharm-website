# MongoDB Atlas | direct production-readiness audit
**Date:** 11 November 2026  
**Scope:** NovaPharm Intelligence, Atlas commerce, AWS eu-north-1  
**Result:** NOT production-accepted. This is a read-only audit, not an activation.

## Directly observed connected Atlas inventory
| Project | Cluster | State | Tier | Version | Collections |
| --- | --- | --- | --- | --- | --- |
| NovaPharm Intelligence Production `6af4010b0ca9668f51d9e058` | `npi-bootstrap` | IDLE, available | FREE | 8.0.37 | 7 production Intelligence, 8 preview Intelligence, 42 commerce |
| Project 0 `6aede4d2bedcc3f04ecc6eb5` | `novapharm-staging` | IDLE, available | FREE | 8.0.37 | 12 staging |

Both clusters run in Atlas AWS `EU_NORTH_1`. Both project access lists contain **zero entries**; both have **zero OPEN Atlas alerts**. The connector can inspect the databases, but that is not evidence an AWS application can connect. Scoped Atlas users: `npi_preview_app` (preview readWrite), `npi_preview_observer` (preview read), `npi_prod_evidence_reader` (production read), `novapharm_aws_staging` (staging readWrite). Their listed roles are cluster-scoped.

### Intelligence records: counts and meaning
- `novapharm_intelligence_production`: source registry **4**; identity **0**; medicine evidence **0**; evidence manifests **0**; source rights **0**; ingestion runs **0**; audits **0**.
- All four production registry rows explicitly have **pending** rights review, for NHSBSA English prescribing, ONS population, openFDA drug, and ClinicalTrials.gov. No source is approved for customer publication.
- `novapharm_intelligence_preview`: registry **4**, ingestion runs **4**, rights records **4**; medicine evidence **0**, customer ownership **0**, entitlements **0**, billing events **0**, audits **0**. Preview ingestion run statuses are only `transport_only` or `transport_and_schema_only`. Preview rights records are `pending_review`, **not grants**.
- `novapharm_staging`: staging source registry **4**, ingestion run **1**, synthetic contact receipt **1**, evidence **0**, source rights grants **0**, authority sessions **0**, audit **0**, entitlements **0**, customer ownership **0**, billing events **0**.
- Production identity/evidence/rights collections have indexes. Schema existence is not accepted dataset coverage.

### Commerce records: Atlas-specific, not a claim about separate live DynamoDB flows
- `novapharm_commerce` has **392** products: ESCO **373**, Nutraxin **19**.
- Product `saleStatus`: **373** `quote_only` and **19** `on_hold`.
- All **392** products have `stockVerified=false`. All **392** seller offers have `customerCheckoutApproved=false`.
- All **392** inventory positions have `verificationStatus=unverified`, although owner-attestation fields report an accepted owner-declared physical count. Owner attestation is not an independent warehouse reconciliation.
- Atlas commerce orders **0**, order lines **0**, payment reconciliations **0**, reservations **0**, shipments **0** at inspection. This **does not prove** AWS DynamoDB or Stripe have no transactions.

## AWS application connectivity: independently observed
- AWS account `250675045172`, region `eu-north-1`.
- AWS SSM SecureString `/novapharm/intelligence/preview/mongodb-observer-uri` exists; only metadata was inspected, never its secret value.
- Staging MongoDB Secrets Manager secret exists. Rotations are not enabled for the listed secrets; verify rotation policy before customer launch.
- **0 NAT gateways, 0 allocated Elastic IP addresses**. The existing S3 gateway endpoint does not provide Atlas egress.
- Intelligence production ECS cluster reports **0 services, 0 running tasks**.
- The 16 Lambda function configurations inspected are **not VPC-attached** and do **not expose MongoDB/Atlas connection settings** in their environment key names. This alone does not prove that no application ever uses a secret indirectly, but no working AWS-to-Atlas connection was demonstrated.
- Do **not** use `0.0.0.0/0` or transient Lambda IPs to force connectivity. Fixed egress or an approved tier/private-network alternative requires cost/security assessment.

## Release gates still required
1. **Network:** cost-authorized stable egress, minimal CIDR allowlist, scoped secret IAM, real application-runtime Atlas TLS ping/query and denial tests.
2. **Medicine data:** dataset-by-dataset rights/attribution acceptance, canonical identity, real source-linked evidence, reconciled observations, ingestion, provenance and audited exports. Never seed fictional accepted medical data.
3. **Customer isolation:** OIDC/MFA, customer/seat ownership, token revocation, cross-tenant negative authorization and audit acceptance.
4. **Commerce:** product/label/price approvals, physical stock reconciliation, checkout approval for intended offers, authorized paid order, signed Stripe webhook, fulfillment and refund reconciliation; distinguish Atlas from existing DynamoDB ledgers.
5. **Resilience:** backup/restore test, measured RPO/RTO, alert notification receipt, cost monitoring, exact-SHA release and rollback rehearsal.
6. **Hosting:** a running, properly restricted Intelligence service and protected HTTPS origin; the public product/technology page is not itself this acceptance.
7. **Approval:** documented formal operational and regulated data signoff, including customer-data privacy, source licences, subscription terms and production identity.

## Implementation in the accompanying PR
`src/data/atlas-release-truth.mjs` is a pure **fail-closed** evidence assessment. It verifies the target projects/collections and the above evidence categories. Its self-reported inputs may only indicate `readyForFormalReleaseReview`; **`productionAccepted` always remains false** until independent approval. No connector credentials, customer grants, Atlas writes, public endpoints, payments, or external communications are introduced. Tests assert that cluster availability and record counts cannot be mistaken for customer production acceptance.

**Change-control rule:** Do not switch the storefront/terminal data store or activate public authentication, subscriptions or paid AWS/Atlas networking from this audit alone.
