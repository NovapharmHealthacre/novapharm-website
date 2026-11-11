# NovaPharm Intelligence: runtime OS vulnerability remediation (11 November 2026)

## Verified security baseline

ECR repository `novapharm/intelligence/production` in `eu-north-1`. Two-stage base previously `node:24-bookworm-slim`. ECR scan of candidate digest `sha256:b991cd72a0a34e25ead7a40f3309d15b70727171e30d363c525d1b520ce26cc6`: **6 HIGH, 2 MEDIUM, 3 LOW, 0 CRITICAL**.

Experimental `node:24-alpine` build and isolated non-networked health probe succeeded but ECR scan of digest `sha256:3ab9a627239d9cb6398fbe1e61815b1d5febbf7ee8b22aaa8d0d3b529f489c08` reported **1 CRITICAL zlib CVE-2026-4738**. Alpine 3.24 default zlib observed `1.3.2-r1` even after `apk upgrade`; critical was not corrected. Not selected.

Experimental `node:24-trixie-slim` without package refresh had **4 HIGH, 10 MEDIUM, 3 LOW** (digest `sha256:5110a0393fb179713485025c0b34c07c1719fe16184282c3cd41a172c2d0bcd9`). Debian advisory DSA-6613-1 dated 7 November 2026 fixes zlib CVE-2026-27171, CVE-2026-76844 and CVE-2026-85091 in trixie security version `1:1.3.dfsg+really1.3.1-1+deb13u1`.

A controlled build substituting `node:24-trixie-slim` in both stages with `apt-get update && apt-get install --only-upgrade -y zlib1g && rm -rf /var/lib/apt/lists/*` passed an isolated read-only, no-network startup and strict `GET /healthz/` HTTP 200 probe. The published **security-probe-only** immutable image digest is `sha256:9990480eab78b583786638a9536bb87afcb3251789006c383139aef11b122d8f`. ECR scan completed with **0 CRITICAL, 2 HIGH, 9 MEDIUM, 3 LOW**. The two HIGH reports are glibc CVE-2026-5435 and CVE-2026-19499; Debian security tracker lists both as unresolved in Trixie and `<no-dsa>`/minor issue. These findings are **not waived** and require documented owner/security acceptance or a genuinely patched replacement base before final customer-facing release.

## Implementation

This PR replaces the two base image references with Trixie and vendor zlib security updates, retaining non-root execution, immutable source label, no-secrets build context, strict container liveness and the explicit `production-candidate-not-approved` release marker. Source regressions require the patch in both stages.

## Release gates

1. Complete exact-head Node security/source contract, Docker image build, isolated 200 liveness, WebKit/Chromium security tests, CodeQL, supply-chain and production-readiness checks.
2. Push the resulting source-labelled candidate to the dedicated Intelligence ECR repository via its restricted CodeBuild role, then confirm SHA, immutable digest, scan result and startup. **Never** silently promote a prebuilt experimental probe.
3. Independently review the remaining HIGH glibc CVEs and model reachable attack surface; request risk sign-off or fix. The S3 layer gateway and execution role exist, but private ECR API/DKR/Logs/Secrets endpoints are default BLOCKED and billed hourly if activated. No customer app or billing rollout is authorised by this PR.
4. Update any non-running ECS task definition only to an accepted post-merge digest; do not run production service, activate Stripe plans, expose patient/tenant sources or email customers.

Official advisory: https://lists.debian.org/debian-security-announce/2026/msg00532.html
Debian tracker CVEs: https://security-tracker.debian.org/tracker/CVE-2026-5435 and https://security-tracker.debian.org/tracker/CVE-2026-19499.
