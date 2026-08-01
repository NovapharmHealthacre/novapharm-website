# Estate Status Service Migration Acceptance

Status: repository candidate accepted; managed deployment and live service origins pending

Candidate branch: `codex/unified-digital-estate-foundation`

Acceptance date: 1 August 2026

## Outcome

`apps/status` provides the missing public status boundary for the unified NovaPharm digital estate. It is a TypeScript, React and Next.js application that reports only sanitised availability for the corporate, technology, founder, secure portal and API services. It does not expose infrastructure identifiers, internal errors, customer records, portal activity or health-response payloads.

No Azure resource, production hostname, DNS record or deployment was created. Unconfigured target origins are shown honestly as activation pending. The status service must not be described as live until a managed deployment and its configured service checks pass independently.

## Implemented boundary

- Public and private target origins are supplied through server-only environment settings and must be path-free origins.
- Production targets require HTTPS; local validation permits HTTP only on a loopback host.
- Public properties may expose a direct service link after successful configuration. Portal and API origins are never rendered as browser links.
- The portal check requires a `noindex` response header. The API check requires the expected sanitised live-health contract.
- Timeouts, invalid configuration, unexpected responses and network failures are reduced to professional availability states without raw errors.
- The status application itself is `noindex`, `noarchive` and non-cacheable, and its robots policy disallows crawling.
- `/api/health`, `/api/health/live` and `/api/health/ready` return a deliberately small service contract.
- Official SVG and PNG logo files are copied byte-identically from the approved repository masters.

## Actual automated results

| Gate | Result |
|---|---|
| Biome source check | Passed: 16 files, no findings |
| TypeScript and generated route types | Passed |
| Status contract and brand validation | Passed |
| Unit tests | Passed: 3 of 3 |
| Production build | Passed: page, 404, robots and three health routes |
| Standalone artifact scan | Passed: 1,244 files |
| Chromium rendered matrix | Passed: seven required viewports |
| WebKit rendered matrix | Passed: seven required viewports |
| Screenshot evidence | 14 genuine screenshots |
| Automated accessibility | 4 Axe WCAG 2.2 AA runs; zero serious or critical findings |
| Boundary labels | Passed: current page, three unconfigured public origins and two private boundaries |
| Horizontal overflow and broken media | Passed: zero findings at every rendered viewport |
| Runtime cleanup | Passed: no status or Next.js process remained after each suite |

## Performance evidence

Lighthouse ran against the local production standalone artifact. SEO was intentionally excluded because this operational surface is non-indexable.

| Form factor | Performance | Accessibility | Best practices | LCP | CLS | TBT | Transfer |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desktop | 100 | 100 | 100 | 0.5 s | 0 | 0 ms | 166 KiB |
| Mobile | 99 | 100 | 100 | 2.1 s | 0 | 0 ms | 166 KiB |

These are local laboratory measurements, not production field data or a guarantee of live performance.

## Manual visual review

Representative Chromium desktop and WebKit mobile captures were inspected after the automated suite. The review corrected an initial red-on-navy contrast failure and clarified the distinction between public origins that are not configured and portal/API private boundaries. The accepted layout has no material text clipping, horizontal overflow, broken brand asset, ambiguous private link or mobile table collision.

Generated screenshots and Lighthouse summaries are retained in ignored `artifacts/status-browser` and `artifacts/status-lighthouse` directories. Only this sanitised acceptance record is committed.

## Remaining managed-environment gates

1. Deploy the status application to an owner-approved managed staging environment.
2. Configure exact corporate, technology, founder, portal and API origins with HTTPS.
3. Verify live, readiness, timeout and degraded-service behaviour against the deployed applications.
4. Configure monitoring and alert routing without exposing confidential telemetry.
5. Approve and configure the final status hostname, certificate and DNS only after staging acceptance.
6. Repeat rendered, accessibility, performance, security-header and health-contract checks against the managed deployment.

The status service is repository-ready. It is not deployed and the NovaPharm estate remains production-incomplete.
