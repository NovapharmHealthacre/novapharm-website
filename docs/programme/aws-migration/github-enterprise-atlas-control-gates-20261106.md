# NovaPharm | GitHub Enterprise, AWS, Atlas integration control gates

**Verified:** 6 November 2026, connected repository metadata, AWS API inventory, MongoDB Atlas API. **Status:** integration design and source gates only; no production transfer/deployment.

## Current ownership and identity truth

- The repository `NovapharmHealthacre/novapharm-website` is currently owned by a GitHub account with `owner.type=User`, not an organization. The authenticated connected GitHub account reports **zero** organization memberships. These facts do **not** disprove the owner's separate Enterprise subscription; they mean the current repository cannot yet be represented as governed by the separate enterprise account `novapharm-healthcare-ltd`.
- GitHub Enterprise subscription, organization membership, SAML/SCIM identity, enterprise policy enforcement and repository eligibility must be verified **in the enterprise console** before asserting coverage or transferring the repository. Connector branch-protection GET returned `403 Resource not accessible by integration`; existing branch protection must be checked by a real administrator, not presumed absent.
- **No repository ownership transfer, secret migration, DNS change, GitHub runner IAM expansion or branch-rule changes were made.**

## Reviewable integration sequence

1. Verify the enterprise subscription and owned organization(s), billing, administrators, recovery accounts and compliance/policy constraints. Obtain an actual admin-visible mapping of `Enterprise → Organization → Repository`. Do not assume the enterprise slug is a repository namespace.
2. Confirm the current production publisher, Pages custom domain, deployed source SHA, webhooks, GitHub environments, required reviewers, deployment protection, CI history, Actions secrets/variables, custom GitHub Apps, Dependabot, CodeQL and artifact retention **before** any transfer.
3. Prepare a documented migration and rollback plan; changing `owner/repository` changes GitHub OIDC token subject and potentially secret/permission boundaries. Do **not** transfer until AWS IAM trust policy and DNS/publisher bindings are reviewed together.
4. Existing manual `aws-staging-foundation.yml` is additionally bound to `github.repository == 'NovapharmHealthacre/novapharm-website'`, protected `main`, reviewed `aws-staging` environment, expected exact SHA, verified account and short-lived AWS OIDC. This is an intentional **fail-closed** check. If the repo moves, it must fail until the approved new repository identity and AWS IAM trust are deployed together. Never use broad `repo:*` OIDC subjects or long-lived AWS keys as a migration shortcut.
5. The AWS account has an explicit service-control-policy denial recorded earlier for `iam:ListOpenIDConnectProviders`. Approval and independent inspection of the actual AWS IAM OIDC provider, trust condition `aud=sts.amazonaws.com`, actual observed and approved OIDC `sub` claim (including immutable repository/owner IDs for eligible GitHub repositories), plus restricted actions and negative authorization tests, remain mandatory. Do not assume that the legacy `repo:<owner>/<repo>:environment:aws-staging` text is the entire `sub` for this repository. GitHub's `id-token: write` alone does **not** establish this integration.
6. AWS `eu-north-1` currently has `novapharm-staging-foundation`, `novapharm-contact-staging`, and `novapharm-audit-staging` stacks in `CREATE_COMPLETE` state. CloudTrail logging is active. **Zero ECS services, ALBs, RDS instances and CloudFront distributions** were returned by staging-region inventory. No managed six-app production workload has been demonstrated.
7. Atlas cluster `novapharm-staging` is **FREE**, AWS `EU_NORTH_1`, MongoDB 8.0.37, `IDLE`. Atlas network access list has **zero entries**; scoped DB user `novapharm_aws_staging` has `readWrite` only on `novapharm_staging`. These are verified safe staging boundaries, not failed configuration to relax blindly.
8. Atlas Free clusters do **not** support AWS PrivateLink/private-endpoint connectivity (MongoDB Atlas documentation). Atlas Lambda/ECS connectivity requires an explicitly approved network architecture, such as tightly scoped fixed egress where feasible and costed. Do not add `0.0.0.0/0`, use a public static password, route protected records through the browser, or provision a chargeable NAT/PrivateLink solution without applicable tier verification and cost sign-off. Integration with AWS Secrets Manager, TLS, driver version, retry/idempotency, TTL schema and backup must be proven with synthetic records before real data.
9. Microsoft Entra P1 remains workforce MFA authority. Cognito staging has **zero external identity providers and zero app clients**. Do not enable a local-password fallback or grant portal access without tenant-bound OIDC JWT checks, audience/issuer validation, MFA sign-in and denial tests.
10. SES is **not** production-authorized; the `novapharmhealthcare.com` sending identity is **unverified** and DKIM `PENDING`. Keep public submissions email-only until owner-approved sender DNS, real controlled delivery and durable receipts are proven.

## PR reconciliation gates, not a bulk merge

| PRs | Reconciliation required |
| --- | --- |
| #88 and #89, #60, #61, #78 | Dependency/lockfile candidates overlap or conflict. Choose one audited exact-SHA dependency baseline, verify latest CI, and avoid duplicate lockfile merges. |
| #85, #87, #91 | #85 is managed AWS foundation; #87 is a separate public-only edge candidate; #91 is synthetic contact / Entra / Atlas source. Resolve network, identity, cost, and runtime boundaries in a single architecture without automatic DNS switch. |
| #74, #75, #77, #80, #82 | Historic corporate baseline and portal links are not automatically equivalent to the live deployment. Verify current source parity and safe contact/portal behavior before applying changes. |
| #79 and #92 | 8K image inventory and live-design forensic findings require asset licence, responsive rendering, accessibility and actual deployed SHA checks. |
| #76 | Identity graph changes require provenance and exact source/publisher parity. |

## Current external documentation checks

- [GitHub's AWS OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws) calls for actual IAM trust conditions on audience/subject and notes that newer repositories may use immutable ID-based `sub` claims. Inspect the actual token shape and approved GitHub organization policy without logging credentials or complete tokens.
- [GitHub repository transfer guidance](https://docs.github.com/en/enterprise-cloud@latest/repositories/creating-and-managing-repositories/transferring-a-repository) warns that Pages sites do not automatically redirect on transfer and that repository organization access prerequisites apply.
- [MongoDB Atlas private endpoint limitations](https://www.mongodb.com/docs/atlas/security-private-endpoint/) exclude Free and Flex clusters from private endpoints. Do not advertise the current Free tier as a PrivateLink-ready runtime.

## Required proof before any merge or production cutover

**Merge eligibility:** reviewed dependency provenance; non-draft status; green required checks on final exact SHA; branch protection, repository admin and deployment workflows checked; no conflicts; relevant security/privacy reviewers. A PR's `mergeable=true` flag is not acceptance evidence.

**Production acceptance:** account-bound AWS workloads and TLS; Cognito/Entra sign-in and denied access; RDS/Atlas decisions and restore; approved outbound email and live controlled receipts; all browser/accessibility/security gates; GitHub Enterprise ownership and OIDC trust if migrating; rollback rehearsed; explicit owner/legal/regulatory/financial approval. Keep #55, #84, #86, #90, #93 open as appropriate until measured evidence satisfies their scope.

No secrets, live business or patient records, automatic environment transfers, unapproved spend, or production service changes are authorized by this document.
