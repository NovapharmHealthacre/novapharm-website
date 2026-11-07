# NovaPharm public website | Unified visual system
**Approved direction:** Apple-inspired clarity and restraint, with original NovaPharm identity.  
**Established:** 7 November 2026  
**Applies to:** \`apps/corporate\` public Next.js application and its published corporate pages.  
**Does not apply automatically to:** separate secure portal, NOVA Intelligence application, or founder site.

## Reference principles
- Apple Human Interface Guidelines: clarity, hierarchy, familiarity, adaptability, craft, accessibility and purposeful colour.
- Apple.com: simple global navigation, calm page rhythm, generous whitespace, original visual storytelling, minimal copy above the fold, text-forward controls.
- NovaPharm: authorised official logo, original and appropriately governed medicine imagery, accurate current regulatory operating status. No Apple trademarks, proprietary Apple typography or unlicensed imagery.

## Implemented foundation
| Contract | Source of truth | Design |
|---|---|---|
| Ink | \`--nph-ink\` | \`#111113\` |
| Canvas | \`--nph-canvas\` | \`#FFFFFF\` |
| Soft surface | \`--nph-silver\` | \`#F5F5F7\` |
| Information/body | \`--nph-body\` / \`--nph-muted\` | \`#424248\` / \`#595961\` |
| Hairlines | \`--nph-line\` | \`#D9D9DF\` |
| Action links and focus | \`--nph-link\` | \`#0066CC\` |
| NovaPharm accent | \`--nph-accent\` | \`#B51C1A\`, restrained |
| Deep editorial chapters | \`--nph-deep\` | \`#0A101A\` |
| Type | \`--nph-system\` | Licensed platform/system sans-serif fallback |
| Card curvature | \`--nph-radius\` | 22px |
| Content width | \`--nph-max\` | 1240px |
| Site header | \`--header\` | 64px |

## Page-system rules
1. **Global:** one sticky 64px header; real official logo, typographic navigation, focus-visible interaction, reduced-motion support, one silver/footer hierarchy.
2. **Hero:** oversized sans-serif heading, subdued lead copy, a primary/secondary action pair where useful; evidence-governed photography, no fabricated facilities, stock or approvals.
3. **Interior narrative:** clear eyebrow, generous sectional whitespace, legible prose and alignment rather than decorative components.
4. **Card families:** 22px-radius low-noise surfaces with thin boundaries for services, leadership, programme stages, legal, articles and products.
5. **Product pages:** authentic approved Nutraxin pack assets and proper catalogue attribution; never infer supply/registration/price from a visual redesign.
6. **Editorial pages:** magazine-like article scale while retaining sources, disclaimers and original imagery.
7. **Legal/privacy:** navigable long-form hierarchy with readable labels, small text kept at a legible contrast level and a clear route back to the site.
8. **Forms:** approved Contact form treatment and non-deceptive email-draft-only public mode; a polished form does not imply an operational backend.
9. **Consent:** compact, still-accessible cookie choices; preserve accept/reject/manage controls and opt-in defaults.
10. **Distinct approved designs:** homepage, Contact and Oncology can use their own editorial art direction without forking typography, navigation and shared interaction semantics.

## Route coverage and audit
- **59 unique routes** enumerated directly from Next.js corporate page definitions, five leadership profiles, six article detail pages, and 19 Nutraxin product detail pages.
- **118 Chromium route/viewport inspections:** all routes at 390 × 844 and 1440 × 900; latest initial inspection returned **zero automated findings** for HTTP, single H1, common header/footer/brand, style token resolution, horizontal overflow, console/request failures and visible regulated-status notices.
- The audit produces: \`artifacts/corporate-design-system/sitewide-audit.json\`, \`summary.md\` and 22 representative desktop/mobile full-page screenshots.
- This audit **does not replace** existing Chromium/WebKit route/viewport/Axe suites, legal review, manual visual sign-off or live deployment verification.
- The initial screenshot review identified oversized first-visit cookie consent and narrow-screen Oncology navigation. A subsequent patch reduced the consent footprint and refined the subnavigation and requires the final exact-head acceptance run.

## Change governance
- All new corporate UI uses the shared tokens; legacy arbitrary shades are progressively retired as page families are edited.
- Art-direction changes must retain responsive behaviour at 320, 375, 390, 768, 1024 and 1440px; focus/keyboard accessibility, reduced-motion and contrast.
- Representative imagery must be attributable and descriptive; never use realistic photographs to claim an owned facility, granted licence or active supply channel that has not been verified.
- Shared source lives in \`apps/corporate/app/design-system.css\`, imported **after** homepage and Oncology editorial styles; reusable React components live in \`apps/corporate/components\`.
- Enforce exact-head test, branch review, deployed-domain smoke verification and reversible publication. A merged PR is not proof the public GitHub Pages branch has been updated.

## Current release boundary
This work intentionally does not redesign the separate authenticated portal or NOVA Intelligence workspace. Their responsive shell, security and roles require separate UI-specific acceptance, even though the corporate brand standards should eventually be shared.
