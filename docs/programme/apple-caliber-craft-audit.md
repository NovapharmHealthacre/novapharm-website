# Apple-Caliber Craft Audit

Status: repository candidate accepted; managed staging and production review pending

Review date: 8 August 2026

Review baseline: local Draft PR 16 candidate descending from `5407336ac2914a47f9cb0a00682cfb8deb73c798`

## Purpose and evidence boundary

This review tests whether the NovaPharm estate demonstrates the hierarchy, simplicity, craft, accessibility and platform discipline associated with leading digital products. "Apple-caliber" is a quality benchmark, not permission to copy Apple's layouts, text, assets, animation, trade dress or product presentation.

The review used current official Apple and WebKit guidance, the live public NovaPharm site for continuity checks, local production builds of the actual candidate applications, retained Chromium and Playwright WebKit evidence, and a separate interactive in-app browser review. It does not prove Azure, Front Door, WAF, Entra, SharePoint, production data, production network performance or live-domain acceptance.

## Official benchmark

| Principle | Official source reviewed | NovaPharm implementation decision |
|---|---|---|
| Hierarchy, harmony and consistency | [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) | Keep one governed token system and shared interaction contracts while preserving distinct property composition. |
| Purpose, simplicity, craft, responsibility and flexibility | [Principles of great design, WWDC26](https://developer.apple.com/videos/play/wwdc2026/250/) | Remove nonessential decoration, retain truthful content, maintain precise details and make layouts adapt without losing meaning. |
| Visual hierarchy, scanability and adaptive layout | [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout) | Put the most important proposition first, align related content, constrain reading width and test every supported size. |
| Legible, scalable typography | [Apple typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography) | Preserve readable body sizes, deliberate display scale, strong contrast and predictable line lengths. |
| Accessible interaction | [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Keep complete keyboard paths, visible focus, semantic controls, adequate targets and equivalent reduced-motion states. |
| Motion should never be required to understand content | [Apple reduced-motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria) | Disable nonessential transforms and animated backgrounds under `prefers-reduced-motion` without hiding information. |
| WebKit motion and rendering behaviour | [WebKit scroll-driven animation guide](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/) and [Safari 26.4 features](https://webkit.org/blog/17862/webkit-features-for-safari-26-4/) | Prefer bounded CSS motion, avoid large parallax or scroll hijacking, and validate the actual result in WebKit. |
| Editorial and business presentation | [Apple](https://www.apple.com/), [Apple at Work](https://www.apple.com/business/) and [Apple Newsroom](https://www.apple.com/newsroom/) | Use concise propositions, content-specific imagery, generous but purposeful space and strong editorial sequencing. No Apple asset or composition was copied. |

The complete primary-source policy remains in `docs/programme/official-source-register.md`.

## Canonical creative decision

`Regulated Continuum` remains the approved cross-estate concept. It gives NovaPharm a recognisable visual language based on the controlled movement of product, evidence, decision and responsibility. The system uses editorial grids, measured red rules, photographic sequences and restrained motion rather than a repeated decorative motif.

| Property | Required impression | Accepted expression |
|---|---|---|
| Corporate | Institutional authority, pharmaceutical precision and governance | Warm editorial surfaces, representative pharmaceutical imagery, controlled red, evidence-led roadmaps and explicit operating-status language |
| NIT | Scientific systems, technical intelligence and controlled innovation | Dark technical field, precise type, restrained data-line motion and disciplined process imagery |
| Founder | Editorial permanence, judgement and independent-journal quality | Quiet long-form composition, authoritative portraiture, source-led publication architecture and limited ornament |
| Portal | Security, operational control and enterprise trust | Dense navigation, stable information hierarchy, explicit read-only and synthetic states, clear tables and minimal decoration |
| Status | Calm service communication | Sanitised state summary, direct language, strong status hierarchy and no confidential operational detail |

The properties are related through tokens, accessibility and governance. They are not recoloured copies of one template.

## Human visual review

The retained route and viewport matrix is recorded in `docs/programme/final-human-visual-dossier.md`. The additional interactive review covered desktop and 414-pixel mobile presentations for Corporate, NIT and Founder, including navigation, cookie controls, reduced-motion controls, Products order, image loading, console output and horizontal overflow. Portal and Status were reviewed from retained real-render evidence for operational and exceptional states.

| Surface | Keep | Refinement decision | Result |
|---|---|---|---|
| Corporate homepage | Strong institutional hero, governed caution, product photography and balanced section rhythm | Preserve rather than replace with an unsupported facility video | Accepted at repository level |
| Corporate Products | Food Supplement Portfolio Review first, precise catalogue boundary and strong product imagery | Stack the two contextual links below 430 pixels, provide 44-pixel targets and cap the 700-pixel Nutraxin source at 350 CSS pixels | Corrected and verified in Chromium and WebKit at 2x density |
| Corporate leadership | Consistent, owner-approved Vishal, Prabhakar and Dr Girish portraits plus controlled no-image states | Do not invent portraits for Dr Helly or Dr Nishita | Accepted with owner media actions retained |
| NIT | Distinct technical identity, purposeful network movement and clear technical hierarchy | Keep motion bounded and preserve immediate reduced-motion rendering | Accepted at repository level |
| Founder | Editorial typography, clear publications and strong canonical portrait | Preserve quiet reading rhythm and avoid promotional card treatment | Accepted at repository level |
| Portal | Clear module maturity, synthetic-data labels and secure operational tone | Keep unavailable write workflows absent and dependency-bound states explicit | Accepted at repository level |
| Status | Clear normal, maintenance and incident states | Keep minimal and sanitised | Accepted at repository level |

## Visual red-team

The rendered candidate was challenged against the prohibited failure modes in the continuation brief.

- It does not resemble a purchased healthcare theme or a standard SaaS landing page.
- Repeated cards are limited to genuine collections; major sections are not stacked as cards inside cards.
- No Apple code, image, font, icon or marketing copy is used.
- No executive portrait is AI-generated.
- Representative pharmaceutical media is not described as a NovaPharm-owned facility, workforce, warehouse or approved product operation.
- The public estate does not visually imply that regulated wholesale activity has started.
- The portal does not present hidden, read-only or dependency-blocked modules as operational workflows.
- Motion carries no essential meaning, does not hijack scrolling and has a reduced-motion equivalent.
- No critical or unresolved high visual finding remains.
- One reasonable medium finding was identified on the Products mobile contextual links and corrected in the candidate.

## Media and motion decision

The governed media estate currently contains:

- 18 records in `creative-assets/asset-register.json`;
- 8 commercially licensed and brand-reviewed product images in `creative-assets/image-asset-register.json`;
- 27 generated module-media records with provenance in `creative-assets/module-media-asset-register.json`;
- 32 consolidated provenance records in `docs/media-provenance-register.json`.

The approved authoritative portraits for Vishal Chakravarty, Prabhakar Vitthal Lahare and Dr Girish Achliya are registered and hashed. Approved photographs for Dr Helly Panchal and Dr Nishita Trivedi, plus a stable owner-approved Nutraxin source and product imagery, remain owner-controlled media actions in the asset register.

No homepage background video is introduced. There is no verified NovaPharm facility footage, and representative stock video would create ownership and performance risk without improving the factual proposition. The accepted hero uses responsive imagery and bounded CSS/canvas motion with a static reduced-motion state. A future video requires provenance, an ownership-safe caption, poster, transcript where meaningful, explicit pause behaviour and a measured performance budget.

## Browser and viewport evidence

- The complete full-estate matrix covers Chromium and Playwright WebKit at 1280x800, 1366x768, 1440x900, 1920x1080, 1024x1366, 768x1024, 390x844, 430x932, 375x667 and 320x568.
- A separate WebKit 320x568 rerun completed 89 pages, 89 Axe scans and 16 screenshots with zero reported issues after one earlier full-run harness timeout.
- The earlier timeout was not reproducible in isolation and produced no page-level defect. It is recorded as a test-harness interruption, not silently counted as a product pass.
- An interactive 414-pixel review confirmed mobile navigation, cookie rejection, reduced-motion control, Products order, image loading, no horizontal overflow and no console warning or error on the reviewed public surfaces.
- Corporate acceptance completed 780 screenshots, 156 Axe runs, two high-density product-media runs and two scriptless-navigation runs across Chromium and WebKit.
- NIT acceptance completed 260 screenshots, 52 Axe runs and two scriptless-navigation runs across Chromium and WebKit.
- Founder acceptance completed 420 screenshots, 84 Axe runs and two scriptless-navigation runs across Chromium and WebKit.
- The Products correction was tested with both contextual links at a computed 44-pixel minimum height and with the 700-pixel owner-supplied source rendering no wider than 350 CSS pixels at 2x density.
- All three public properties retain one H1, substantive main content, complete primary navigation and no horizontal overflow when JavaScript is disabled at the 390-pixel, 2x-density checkpoint.
- NIT and Founder now switch from their complete scriptless navigation state before body parsing through a nonce-bearing inline bootstrap. Constrained 390-pixel traces reduced the corresponding local diagnostic CLS from `0.3391` and `0.2042` to `0`; browser tests reject a deferred or non-nonce bootstrap.

## React architecture decision

Corporate, NIT and Founder remain Next.js App Router applications, classified as E - React framework. This is the established unified-estate architecture, not a new visual-only migration. Server Components provide the first HTML; client boundaries are limited to controls, forms, evidence dialogue and NIT interactions that genuinely need browser state.

The candidate uses React and React DOM `19.2.8` and Next.js `16.2.12`. RSC is present through the App Router default, but no custom Server Function or Server Action exists and React Compiler is not enabled. No additional React dependency, generic UI kit or animation package was introduced. The detailed security, bundle and deliberate non-change rationale is in `docs/programme/react-architecture-handoff.md`.

## Performance and accessibility boundary

Repository Lighthouse evidence remains strong: three-run medians give every desktop public surface 100 for performance; mobile public scores are 95-97, with measured lab LCP between 2.61 and 2.91 seconds. Portal mobile performance ranges from 96 to 98 and Status scores 99. Accessibility scores are 100 in those runs, and the full Axe matrix reported no serious or critical findings.

These are lab results, not field Core Web Vitals. The public mobile LCP target of 2.5 seconds is therefore a staging and field-data follow-up rather than a completed production claim. No richer media is accepted if it worsens that boundary.

The legacy public-page post-processing traversal is now bounded to generated route roots. It no longer scans Next build trees, source packages, vendored assets or screenshot artifacts; repeated output is hash-identical and the measured local orchestration step fell from a multi-minute recursive walk to 0.31 seconds without changing generated content. The vendored Chart.js source-map directive was removed and no source map is shipped.

## Decision

The Draft PR 16 candidate is accepted at repository level for visual craft, property distinction, responsive hierarchy, truthful media use, reduced-motion behaviour, interaction clarity and disciplined React boundaries. The design is recognisably NovaPharm and benefits from the benchmark without imitating Apple.

Production visual acceptance remains pending the exact release deployment through the intended edge architecture, real Safari review on representative Apple hardware, managed identity and data states, staging Lighthouse, production smoke tests and post-launch field observation.
