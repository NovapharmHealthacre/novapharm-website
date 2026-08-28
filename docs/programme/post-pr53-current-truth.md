# Post-PR53 Current Truth

Status: exact working-tree repository acceptance passed; immutable candidate and managed production remain unverified
Observed: 28 August 2026
Repository: `NovapharmHealthacre/novapharm-website`

This ledger records the current repository, GitHub and read-only Azure state after the post-PR53/PR69 continuation. It supersedes stale branch, pull-request and SHA references in earlier audit narratives. Earlier files remain useful historical evidence, but they must not be read as the current release state.

## Required audit ledger

| Field | Current evidence |
|---|---|
| `CURRENT_MAIN_SHA` | `23310988e8fc484375aa10176aa1c1edbf5371a8` |
| `CURRENT_RELEASE_STATE` | GitHub Pages `PUBLIC_ONLY` release built successfully from current main and is served at `https://novapharmhealthcare.com/`. The current uncommitted working-tree candidate is not live. Managed Portal/API/Azure production is not evidenced or claimed. |
| `OPEN_PRS` | Ten Dependabot updates, #57 through #66. No current programme feature PR exists. |
| `OPEN_ISSUES` | #54, governed 8K-master art direction and responsive delivery; #55, managed production activation for Portal and public submissions. |
| `LATEST_WORKFLOW_STATUS` | Exact-main Pages, Production readiness, Supply chain, CodeQL, public Chromium/WebKit acceptance and 8K governance runs succeeded. The managed-production candidate dispatcher skipped by design because its external gate was not satisfied. |
| `APPLICATIONS_FOUND` | Six: Corporate, Founder, Innovation Technology, Portal, API and Status. |
| `PACKAGES_FOUND` | Twelve: accessibility, auth, claims, config, content, design-system, forms, medicines-intelligence, platform-mode, portal-contracts, security and SEO. |
| `PUBLIC_ROUTES` | Corporate exact-final acceptance covers 40 canonical routes plus a governed 404; the generated `PUBLIC_ONLY` estate contains 57 indexable canonical routes and 58 enhanced public pages. Founder and Technology retain their own canonical inventories. |
| `PROTECTED_ROUTES` | The Portal catalogue has 48 release-visible governed modules and six hidden-for-safety modules across customer, employee, executive and administrator roles. The exact local Portal matrix uses isolated synthetic identities and data only. |
| `PORTAL_MODULE_COUNT` | Exactly 54, enforced by typed catalogue and tests: 48 release-visible informational modules and six hidden-for-safety modules. |
| `GOVERNED_SECTION_COUNT` | Exactly 122, Sections 0 through 121 inclusive, enforced in `absolute-mandate-register.json`. |
| `IMAGE_COUNT` | 801 governed raster/vector/PDF assets in the 28 August inventory, including non-public masters, governed derivatives, visual evidence and authorised delivery duplication; 52 exact duplicate groups and 183 perceptual-review candidate groups remain explicitly classified rather than silently deleted. |
| `LOGO_ASSETS_FOUND` | The owner-approved 93-file NovaPharm identity pack and 127-file PharmaScope pack are preserved and checksum-verified. Twenty-four deployed brand files are byte-identical to their governed sources. |
| `FONT_STACKS_FOUND` | Native system sans for the concise Apple-pharma layers; established sans/serif/mono property stacks elsewhere. No proprietary Apple font is bundled. |
| `CURRENT_FRAMEWORKS` | Next.js 16.2.12, React/React DOM 19.2.8, TypeScript 7.0.2, Node 24.x, Playwright 1.61.1, Axe 4.12.1 and Sharp 0.35.3. |
| `CURRENT_LANGUAGES` | Current main reports JavaScript, HTML, TypeScript, CSS, Bicep, T-SQL and Dockerfile. The working tree adds substantive Python pharmacy-workbook tooling plus TypeScript/SQL medicines-intelligence implementation. Optional native Apple, Wasm and low-level technologies remain governed by the technology-fit matrix and are not represented by dummy application files. |
| `CURRENT_DEPLOYMENT_TOPOLOGY` | Public GitHub Pages release on the corporate domain; six-application Azure/Front Door/WAF architecture is repository-authored but not live-verified. GitHub Pages intentionally cannot authenticate, accept confidential uploads or act as the secure Portal/API authority. |
| `KNOWN_BLOCKERS` | UK South aggregate App Service `Total Regional VMs` remains 0; no live App Service, Front Door/WAF, Entra, SQL, Blob, Key Vault, email, malware scanning or SharePoint evidence; main has no branch protection/ruleset; no immutable candidate SHA/PR; no real-Safari hardware acceptance; no production field Core Web Vitals; no legal/regulatory final approval; no AAH retest. |

## GitHub evidence

- PR 69 merged at current main after PR 53 and the later corrective releases. PR 16 is historical and merged, not an open Draft PR.
- GitHub Pages reports `built`, the custom domain is configured, HTTPS is enforced and the certificate is approved.
- Exact-main Pages, Production readiness, Supply chain, CodeQL, public Chromium/WebKit, Azure validation, managed-staging preflight and 8K governance workflows succeeded. The managed-production dispatcher skipped by design.
- The `main` protection endpoint returned `Branch not protected`; ruleset/required-review activation remains an owner-controlled account setting.
- No remote ref or PR exists for `codex/corporate-product-discipline-rebuild`.
- No NovaPharm application, local preview or test worker remained active after acceptance. The running Codex MCP processes are not application release processes.

## Working-tree acceptance

- Governed Node `24.19.0` / npm `11.17.0` complete root `npm run check`: pass.
- Requirements: 5,900 records; 25 Complete, 5,032 Complete at repository level only, 68 Owner-controlled blocker, 329 External verification pending, 0 Incomplete, 445 Not applicable with rationale and 1 Rejected for documented conflict/safety; 190 evidence paths; zero stale, ambiguous or undocumented states.
- Corporate: 820 Chromium/WebKit screenshots, 164 Axe runs, two high-density checks, two scriptless checks and zero serious/critical findings.
- Portal: 1,360 Chromium/WebKit screenshots, 230 Axe runs, 54 governed modules, 48 visible modules, six dependency-blocked modules and zero serious/critical findings.
- Print: 12 tagged PDFs, 39 rendered pages and human review after final CSS.
- Lighthouse: Corporate homepage and Products score 100 desktop and 96 mobile; Accessibility, Best Practices and SEO are 100, CLS 0 and TBT 0; mobile LCP is 2.8 seconds in the local throttled lab.
- Azure read-only recheck: subscription enabled, `Microsoft.Web` registered, P0v4 family limit 30, aggregate regional limit 0, no App Service and no Front Door profile. No resource was provisioned.

## Evidence boundary

Repository checks, GitHub Actions and the public Pages deployment prove only their named boundaries. They do not prove Azure resources, authenticated Portal workflows, confidential data isolation in production, third-party delivery, regulated authorisation, legal approval or production performance. Any later code change invalidates exact-SHA evidence for the affected candidate and requires a new run.
