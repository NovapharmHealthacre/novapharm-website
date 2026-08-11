# Post-PR53 Current Truth

Status: implementation baseline recorded; managed production remains unverified
Observed: 11 August 2026
Repository: `NovapharmHealthacre/novapharm-website`

This ledger records the repository and GitHub state inspected before the post-PR53 refinement began. It supersedes stale branch, pull-request and SHA references in earlier audit narratives. Earlier files remain useful historical evidence, but they must not be read as the current release state.

## Required audit ledger

| Field | Current evidence |
|---|---|
| `CURRENT_MAIN_SHA` | `f5a8d814016f2a82e89e8d44f0036892bbdeb9be` |
| `CURRENT_RELEASE_STATE` | GitHub Pages `PUBLIC_ONLY` release built successfully from current main and is served at `https://novapharmhealthcare.com/`. Managed Portal/API/Azure production is not evidenced or claimed. |
| `OPEN_PRS` | None at observation time. |
| `OPEN_ISSUES` | #54, governed 8K-master art direction and responsive delivery; #55, managed production activation for Portal and public submissions. |
| `LATEST_WORKFLOW_STATUS` | Exact-main Pages, Production readiness, Supply chain, CodeQL, public Chromium/WebKit acceptance and 8K governance runs succeeded. The managed-production candidate dispatcher skipped by design because its external gate was not satisfied. |
| `APPLICATIONS_FOUND` | Six: Corporate, Founder, Innovation Technology, Portal, API and Status. |
| `PACKAGES_FOUND` | Eleven: accessibility, auth, claims, config, content, design-system, forms, platform-mode, portal-contracts, security and SEO. |
| `PUBLIC_ROUTES` | Forty routes in the retained unified visual-acceptance inventory, including public legal/error states and the truthful Portal information entry. Corporate, Founder and Technology also maintain their own canonical route inventories. |
| `PROTECTED_ROUTES` | Fifty visible protected acceptance routes, derived from 18 customer modules, 13 employee modules, 11 release-visible Executive modules, five administrator modules and governed account/workspace states. Seven additional Executive modules remain hidden until dependencies exist. |
| `PORTAL_MODULE_COUNT` | Exactly 54, enforced by typed catalogue and tests: 47 release-visible informational modules and seven hidden-for-safety modules. |
| `GOVERNED_SECTION_COUNT` | Exactly 122, Sections 0 through 121 inclusive, enforced in `absolute-mandate-register.json`. |
| `IMAGE_COUNT` | 540 tracked image/vector/PDF assets. This is a physical-file count and includes governed derivatives and authorised duplication across delivery surfaces; it is not a count of unique photographs. |
| `LOGO_ASSETS_FOUND` | Canonical repository SVG and PNG under `assets/brand/`. No authoritative EPS or PDF logo master is present in the current tracked tree. |
| `FONT_STACKS_FOUND` | Native system sans for the concise Apple-pharma layers; established sans/serif/mono property stacks elsewhere. No proprietary Apple font is bundled. |
| `CURRENT_FRAMEWORKS` | Next.js 16.2.12, React/React DOM 19.2.8, TypeScript 7.0.2, Node 24.x, Playwright 1.61.1, Axe 4.12.1 and Sharp 0.35.3. |
| `CURRENT_LANGUAGES` | GitHub reports JavaScript, HTML, TypeScript, CSS, Bicep, T-SQL and Dockerfile. No tracked Swift, Objective-C, C, C++, Metal, Wasm, Python, Perl or Ruby application source exists. |
| `CURRENT_DEPLOYMENT_TOPOLOGY` | Public GitHub Pages release on the corporate domain; six-application Azure/Front Door/WAF architecture is repository-authored but not live-verified. GitHub Pages intentionally cannot authenticate, accept confidential uploads or act as the secure Portal/API authority. |
| `KNOWN_BLOCKERS` | No authenticated Azure CLI context; no live Entra, SQL, Blob, Key Vault, email, malware scanning, SharePoint or WAF evidence; main branch has no GitHub branch protection; no real-Safari hardware acceptance; no production field Core Web Vitals; no legal/regulatory final approval; no AAH retest. |

## GitHub evidence

- PR 56 merged at the current main SHA after PR 53 (`83fca4a16bbec19179d978aa036f63730e372430`).
- GitHub Pages reports `built`, the custom domain is configured, HTTPS is enforced and the certificate is approved.
- The repository is public and has no GitHub release object at observation time.
- The `main` protection endpoint returned `Branch not protected`; ruleset/required-review activation remains an owner-controlled account setting.
- No NovaPharm application, local preview or Playwright test server was active before edits. The running Codex MCP process is not an application release process.

## Evidence boundary

Repository checks, GitHub Actions and the public Pages deployment prove only their named boundaries. They do not prove Azure resources, authenticated Portal workflows, confidential data isolation in production, third-party delivery, regulated authorisation, legal approval or production performance. Any later code change invalidates exact-SHA evidence for the affected candidate and requires a new run.
