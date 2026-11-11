# AWS managed public application candidate images

**Status:** source-level build recipe only. The four public Next.js applications are `corporate`, `founder`, `technology` and `status`. The generic Dockerfile supports exactly these allowlisted applications. The protected `portal` and `api` have different security, data and authorization requirements and are intentionally excluded.

- Build command: `docker build -f deployment/aws/Dockerfile.managed-public --build-arg APP=corporate --build-arg SOURCE_SHA=<reviewed-40-hex-sha> .`. Replace the app argument for the other three approved public apps. Each image contains only the app's scanned Next.js standalone output.
- A release build may use `deployment/aws/buildspec-managed-public-candidates.yml` **only** after a protected CodeBuild environment, image-scanning policy, exact commit, scoped ECR push role and budget approval have been recorded. The pre-existing staging ECR repos are immutable and scan on push. Do not reuse an already pushed `candidate-<sha>` tag.
- Before deployment, prove distinct app hostname/routing, HTTPS, edge access logs, least-privilege task execution, no exposed secrets, WAF/rate limits where applicable, route/browser acceptance, health checks, observability, rollback and an approved operating cost. Private identity or business data must not be copied into public images.
- The liveness probe only checks whether the application responds to `GET /`. It does not grant readiness, permissions, source rights, deployment authority or customer access.
- The original six-app migration tracked in issue #86 remains blocked until the API and portal have verified auth and data planes and the public runtime has accepted staging, cost, disaster recovery and cutover plans. Keep the live GitHub Pages publication untouched until an independently signed, reversible cutover.

**This PR must not deploy services, change DNS, upgrade services, alter AWS bills, or send customer emails.**
