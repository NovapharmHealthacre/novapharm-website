# Current Experience Gap Analysis

Reviewed: 13 July 2026  
Reference state: merged `main` at `189da77fdaff9ac5c79d39af60e93dbb06a48e58`, current post-merge workspace, live public domain and the March 2026 business plan

## Executive finding

The merged implementation established the correct enterprise foundation: structured company content, 33 public pages, six Insights articles, five leadership profiles, controlled claims language, secure role shells, a Node API, persistent data architecture, SharePoint integration boundaries, legal pages and deployment documentation. The experience did not yet express that substance at a world-class visual level.

## Material gaps found

| Area | Previous condition | Risk | Remediation in this branch |
| --- | --- | --- | --- |
| Homepage media | One generic pharmaceutical warehouse image reused across the site | Stock-like impression and weak differentiation | Original flagship supply-network hero plus purpose-built information design. |
| Insights | All six articles reused the same image | Duplicate visual identity and poor editorial scanning | Six distinct topic-specific covers. |
| Sourcing model | Static three-column block | Strategy read as another card grid | Sticky three-step narrative with a connected route visual and static fallback. |
| Technology | Maturity cards without a system view | Architecture was described but not understood at a glance | Layered platform diagram showing experiences, controls, data and documents. |
| Typography | System sans used for nearly every level | Weak strategic hierarchy | Editorial serif for display content; functional sans for operations and controls. |
| Colour | Automatic dark mode and a predominantly blue/navy treatment | Inconsistent brand context and a one-note enterprise look | Controlled light-first palette with selective dark evidence sections. |
| Layout | Frequent bordered grids and repeated cards | Generic template feel | Editorial splits, full-width bands, information tables and restrained framed items. |
| Motion | Navigation only | No visual explanation of sequence | Progressive disclosure, reveal and sourcing-route motion with accessibility fallbacks. |
| Portal presentation | Functional but visually separate from the public site | Siloed brand experience | Shared tokens, typography, official logo treatment and quieter enterprise layout. |
| Validation scope | Link, syntax and secret checks walked a nested personal portfolio project | False failures unrelated to the NovaPharm release | Explicitly exclude that nested project from NovaPharm repository validation. |

## Content and claims review

The candidate correctly labels NovaPharm as pre-operational for regulated wholesale supply and does not present WDA(H), PLPI, NHS supply, stock, Polar Speed/Marken scope, AI or blockchain capabilities as achieved. Product categories remain strategic, not a live public catalogue. Confidential financial forecasts and visa material are not used in public content.

## Leadership review

- Vishal Chakravarty, Prabhakar Vitthal Lahare and Dr Girish Shantilal Achliya use owner-supplied photographs.
- Dr Helly Kamlesh Panchal and Dr Nishita Trivedi retain neutral, clearly labelled portrait-pending treatments.
- Dr Nishita Trivedi remains a Quality & Regulatory Adviser and is explicitly not presented as a statutory director.
- Governance labels distinguish statutory records from executive responsibilities described in the company plan.

## Architecture decision

The work remains in the current generator and Node application. No second frontend framework, CMS, portal, database or document store is introduced. Public pages, authenticated shells, metadata, structured data and legal content continue to be generated from the existing structured sources.

## Acceptance criteria

The remediation is acceptable only when generated output validates, all internal references resolve, claims and secrets scans pass, backend integration tests pass, and rendered Chromium and WebKit checks show no material overflow, spacing, contrast, navigation, image or form defects at the required viewports.
