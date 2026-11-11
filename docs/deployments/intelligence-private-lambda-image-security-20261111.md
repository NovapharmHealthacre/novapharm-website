# NovaPharm Intelligence | private Lambda image vulnerability remediation, 11 November 2026

Status: **source-level private runtime candidate only**; no customer release, medicine/data licence, identity promotion or Stripe billing activation.

AWS eu-north-1 IAM-only HTTP API `q2e6ztf8ic` routes `GET /` and `ANY /{proxy+}` through IAM authorization to Lambda alias `private-acceptance`; the bounded `GET /healthz` route is intentionally non-authenticated and must expose liveness only. Last observed alias version 2, image digest `sha256:278dc6adcc9b733e509822433146fffedb4dcc155509b83f20b21b312bf6eb4d`, ECR scan COMPLETE **0 CRITICAL, 6 HIGH, 2 MEDIUM, 3 LOW**. This is not a customer-live application.

The separate Fargate image source hardening PR #383 merged with a reproducible `node:24-trixie-slim` base and security-upgraded `zlib1g` in both Docker stages. For the closely related serverless Dockerfile, apply the same vendor upgrade and retain pinned Lambda Web Adapter 1.1.0, non-root, no credentials in build context, immutable SHA label, health-only readiness and `private-no-customer-acceptance` release marker. The comparable Fargate image scan was **0 CRITICAL, 2 HIGH, 9 MEDIUM, 3 LOW**. An exact-source Lambda image still requires its *own* ECR image scan and explicit immutable digest verification.

Do not move the private `private-acceptance` alias until the source branch passes CodeQL, supply chain, production-readiness, serverless Docker build and private IAM-only smoke tests, and the new image has been tested against the default-off API endpoint. A safe deployment must publish an immutable Lambda version and retain the previous alias version for immediate rollback; never create a public Lambda function URL or allow anonymous routes beyond health. The two Debian Trixie glibc HIGH CVEs still require an approved security disposition before customer-facing production.

Billing stays inactive. Do not email customers, suppliers or prospects. Link deployment evidence and residual blockers to issue #176.
