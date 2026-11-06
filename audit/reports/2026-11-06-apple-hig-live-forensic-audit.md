# NovaPharm Healthcare | Apple-grade website forensic assessment

**Assessment date:** 6 November 2026 (UTC). **Decision:** Public pages are working; production contact, API and secure portal are **not accepted**. This is an evidence-backed technical/design audit, not a regulatory certification or claim of equivalence to Apple's website.

## Inspected sources and methods

- Live public domain: `https://novapharmhealthcare.com`.
- 23 representative public routes from a GitHub-hosted read-only HTTPS crawler, with per-page JSON/Markdown evidence. [Corrected HTTPS evidence](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42240933719).
- Chromium and WebKit, desktop 1440×900 and mobile 390×844, across Home, Products, Contact, Trust Centre and Privacy (20 browser/viewport/page combinations). Real screenshot artifacts, browser JS errors, layout overflow, broken images and axe-core WCAG 2.0/2.1 A/AA scans. [Browser evidence and screenshots](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42242268484).
- Source review of `main`, corporate Next app components, existing corporate CSS and previously recorded design evidence. **The live Next corporate page does not match all checked-in `main` static-page source, so deployment SHA/source parity must be established before claiming a CSS change is live.**
- Comparator: Apple's [Human Interface Guidelines](https://developer.apple.com/design/), [Design Resources](https://developer.apple.com/design/resources/), [developer site](https://developer.apple.com/) and [public website](https://www.apple.com/). The goal is to apply layout, hierarchy, interaction and craft principles with **original NovaPharm branding, copy and assets**, not use restricted Apple fonts, icons or copyrighted artwork.

## Verified live findings

| Verification | Evidence | Acceptance |
| --- | --- | --- |
| Public website page availability | 23 of 23 sampled routes returned HTTP 200 | **Passing in sampled network audit** |
| Desktop/mobile layout | 20 of 20 sampled browser/route combinations returned 200, with no document-level horizontal overflow | **Passing in sampled browsers** |
| Current visible images | No broken images in the browser viewport; 0 missing HTML `img` alt attributes in 23-page scan | **Passing in checked scope** |
| Keyboard skip links | Live Next links to `#main-content`, matching actual main landmark; earlier automated false positives corrected | **Passing in checked scope** |
| Contact accessibility | Serious axe `color-contrast` finding, 8 `.topic > .num` nodes, repeats in Chromium and WebKit, desktop and mobile | **Fails WCAG AA automated contrast criterion** |
| Contact form | `/contact/` returns 200, but no active managed HTML submission form in public document | **Not activated** |
| Managed portal | `https://portal.novapharmhealthcare.com/portal/` returns HTTP 503 | **Not activated** |
| Managed API | `https://api.novapharmhealthcare.com/api/health` returns HTTP 404 | **Not activated** |
| AWS synthetic test API | `/health` returns 200 with `live:false`; anonymous POST rejected | **Staging only** |
| Privacy data-processor statement | Live `/legal/privacy/` mentions Microsoft Azure as a possible provider; AWS is now the staging/target platform | **Legal review and accurate status publication required** |

### Specific accessibility defect, reproducible

The eight numbered business-enquiry cards on the **live** `/contact/` page expose this selector:

`.topic:nth-child(1..8) > .num` (e.g. `<span class="num">01</span>`).

axe-core computed **foreground `#70747a` on `#f5f5f7`**, font **12px normal weight**, contrast ratio **4.31:1**. Normal text needs at least **4.5:1** for WCAG AA. This is not an aesthetic preference and was reproduced in four independent engine/viewport configurations (eight nodes in each).

**Proposed scoped fix:** use a verified darker text colour (e.g. `#5f6268` on the stated background) while retaining adequate contrast on hover/focus/card-state backgrounds; run axe again at all four combinations. The actual live build SHA and owner of the `.topic > .num` component must be located first. Current checked-in `apps/corporate/components/contact-experience.tsx` uses a distinct `.np-contact-topic` component and no numbered `.num`, so a patch to that component alone would not be proof that the deployed defect was fixed.

### Apple-informed design judgement

The **current live** homepage demonstrates premium negative space, legible typographic hierarchy, a clear primary CTA, an editorial image and restrained corporate red. This is materially stronger than a generic corporate template. It is not yet appropriate to claim Apple-level execution without matching performance, gesture/focus interaction, accessibility, image provenance and production functionality.

| Dimension | Observed strength | Improvement priority |
| --- | --- | --- |
| Brand system | Consistent NovaPharm identity, black/white/red and system sans-serif; no need to borrow Apple's proprietary SF fonts | Preserve original branding; reduce one-off component typography and spacing variants |
| Homepage | Clear medicine-supply proposition and strong editorial image-led focal area | Validate hero/caption readability and LCP on production/mobile connection |
| Navigation | Current live desktop is restrained; mobile menu presents a distinct compact affordance | Test keyboard escape/focus trapping, announced state, mobile sticky behavior and nav depth |
| Product pages | Content and factual regulatory disclaimers are explicit | Shorten first-screen hierarchy, reduce excess vertical scanning, improve concise comparison and disclosure patterns |
| Contact | Elegant route-cards and visible email fallback preserve trust | Fix numbered-card contrast; activate real secure submission only with durable receipt and verified email delivery |
| Portal | Separate authentication boundary and protected-mode source guard exist | No live portal; remove/deny legacy password pathways on AWS, then add verified tenant-bound Entra P1 role-based session handling |
| Media | Next.js fill layout and useful responsive image assets; no broken visible images in sampled routes | Measure real layout shift and image timing; do not equate absent `width` attrs on Next fill with an error |
| Trust and legal | Regulatory disclaimers and separate safety reporting links | Reconcile real processors, state, security controls and data transfer map before publication |

## Current production blockers (not cosmetic)

1. **Microsoft Entra → Cognito:** Cognito staging broker has **zero IdPs and app clients**. Owner's Entra P1 MFA licence/policy exists but no registered single-tenant OIDC application/client + protected secret or successfully enforced owner sign-in in the AWS portal has been evidenced. Related candidate in PR #91 was CloudFormation-validated but not deployed.
2. **Application hosting:** authenticated AWS inspection shows **zero ECS services**, no deployed portal/API app and health HTTP 503/404. No signed source-to-production release/rollback evidence.
3. **Database and secrets:** MongoDB Atlas Free cluster in AWS Stockholm is running; Atlas allowlist has **zero entries**. Atlas test data readback through a privileged connector does not establish direct AWS-to-Atlas app connectivity. Scoped credential is in AWS Secrets Manager; no real-data migration approved.
4. **Email and public enquiries:** SES production sending **DENIED** (case `179396962000658`), DKIM pending. Approved corporate mailbox is `vishal@novapharmhealthcare.com`. SNS alert subscription still unconfirmed and not a substitute for transactional email. The public form remains disabled.
5. **Security CI and deployment authority:** Main remains behind the security-remediation PR #89. PR #89 passes production-readiness and many checks but its unified browser run had a cancelled corporate job, so final gate did not pass. AWS project OIDC IAM inspection returned explicit SCP denial; don't bypass it with long-lived keys. Main remains unprotected in latest inspection.
6. **Release and legal gates:** enforce input validation, CSRF, abuse controls, deduplication, upload quarantine, rate limits, role isolation, backups/restore, audit evidence, exact-SHA browser acceptance, review of data privacy and explicit production cutover.

## Next sign-off order

1. Identify the real Microsoft Entra tenant and approved application registration; set the AWS Cognito reply URI `https://novapharm-staging-250675045172.auth.eu-north-1.amazoncognito.com/oauth2/idpresponse` in the single-tenant Microsoft web app. Keep all secrets in AWS Secrets Manager, never in GitHub/ChatGPT.
2. Resolve AWS IAM OIDC SCP deny through permitted account controls. Build/deploy the managed portal and API, establish approved domain TLS/DNS and protect the callback endpoint. Prove JWKS signature, issuer, audience, PKCE, role/tenant denial, logout, expiry and **actual user MFA**; do not grant admin simply because an email address is known.
3. Establish permitted Atlas networking/cost plan and real deployment persistence/backup tests, or approved existing database service; reconcile data retention.
4. Approve SES sending or Microsoft Graph with actual application grant and consent, then test real B2B contact → durable receipt → notification → inbox confirmation, including bounce/retry failure states.
5. Merge only fully passing, security-reviewed PRs on exact SHA, validate rollback, and preserve public-site fallback until verified cutover. Resolve contrast with source/deployment parity and re-run dual-engine accessibility.
6. Run production Lighthouse/Core Web Vitals, manual WCAG and editorial visual polish. **Nothing in this forensic audit authorizes customer-data intake, real sign-in, or closing Issue #55.**

## Audit limitations

Read-only crawler ≠ full availability SLA; sampled five browser routes ≠ all 65+ routed pages; automated axe ≠ complete WCAG manual audit; response HTTP 200 ≠ app authenticated success; visual screenshots ≠ page-load-performance measurements. No individual users, medical/patient data, private documents, passwords or operational payments were used.
