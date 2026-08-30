# Medicines Intelligence Visual Acceptance

Status date: 2026-08-28

## Decision

The owner-supplied 1536 x 1024 image is retained as the information-architecture baseline. The implemented protected workspace preserves its four defining regions:

1. text-first NovaPharm navigation on the left;
2. global governed medicine search and workspace controls at the top;
3. the medicine identity, metrics, analysis and opportunity workspace in the centre; and
4. active filters, contact evidence and methodology context on the right.

The implementation remains part of the existing `executive.nhs-data` governed Portal module. No parallel dashboard or additional Portal module was created. The catalogue remains 54 governed modules, of which 48 are release-visible and 6 are dependency-blocked in the current catalogue state.

## Evidence

- Owner reference: `audit/evidence/medicines-intelligence/reference/owner-approved-information-architecture.png`
- Capture manifest: `audit/evidence/medicines-intelligence/manifest.json`
- Full acceptance report: `audit/evidence/medicines-intelligence/browser-acceptance-report.json`
- Chromium populated desktop: `audit/evidence/medicines-intelligence/final/chromium-desktop-1600-populated.png`
- WebKit populated desktop: `audit/evidence/medicines-intelligence/final/webkit-desktop-1600-populated.png`
- Chromium populated mobile: `audit/evidence/medicines-intelligence/final/chromium-mobile-390-populated.png`
- WebKit populated mobile: `audit/evidence/medicines-intelligence/final/webkit-mobile-390-populated.png`
- Compact-width empty state: `audit/evidence/medicines-intelligence/final/chromium-mobile-320-empty.png`
- Tablet empty state: `audit/evidence/medicines-intelligence/final/chromium-tablet-1024-empty.png`
- Large-desktop empty state: `audit/evidence/medicines-intelligence/final/chromium-desktop-1920-empty.png`

The exact standalone candidate produced 1,360 browser screenshots and 230 Axe runs across Chromium and WebKit, thirteen configured viewports from 320 to 1920 pixels, all 54 governed modules and 48 visible modules. No serious or critical Axe finding survived. The runtime was synthetic, isolated, noindex and removed after the run.

## Architecture Comparison

| Approved reference area | Implemented treatment | Result |
| --- | --- | --- |
| Left navigation | Dark NovaPharm rail, official reverse logo, text-only grouped routes, selected-state bar | Match with reduced icon dependency |
| Top search | Canonical medicine search remains the primary entry control | Match |
| Medicine identity | Unboxed medicine name, current identity codes and governed BNF hierarchy | Premium upgrade |
| Four metrics | Accepted values when present; designed unavailable states otherwise | Match with stronger truth boundary |
| Trend, forecast, geography | Same three-part analytical sequence; absent map and forecast are explicitly gated | Match without fabricated evidence |
| Lower breakdowns | Geography, presentation and practice tables use fine separators and numeric alignment | Match |
| Opportunity | Governed pharmacy contact and opportunity boundaries remain visible without fake ranks | Match without unsupported inference |
| Right rail | Shared filter state, evidence counts, methodology and restrained analyst boundary | Match |
| Tablet | Navigation and contextual filters become deliberate drawers | Responsive upgrade |
| Mobile | Identity, metrics, analysis, breakdowns and methodology become one authored sequence | Responsive upgrade |

## Human Findings And Corrections

| Page/state | Viewport | Observation | Severity | Impact | Implemented correction | Before evidence | After evidence | Residual compromise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Selected medicine | 1600 | Medicine identity was framed as a large dashboard card and pushed analysis too far down | High | Contradicted the owner rule that the medicine is the subject and must not be boxed | Removed the outer card, reduced display scale, compacted the workspace heading and exposed the governed hierarchy | Owner reference plus pre-correction human review; the transient pre-correction capture was not promoted | Both 1600 populated captures | None material |
| Mobile filters | 390 WebKit | Native dataset and measure selects rendered at 18px high | High | Failed the 44px touch-target requirement | Added an explicit 44px select height at the module boundary | Browser failure recorded by the acceptance runner | WebKit 390 populated capture and passing target assertion | None |
| Populated mobile capture | 390 Chromium | A full-page sticky capture changed viewport state before the top-of-page image | Medium | Produced misleading dossier evidence even though live layout geometry was valid | Added two-frame viewport settling and captured the viewport before full-page evidence | Rejected transient screenshot | Chromium 390 populated capture | Full-page images remain diagnostic, not the primary visual artefact |
| Compact search | 320 | Long placeholder text truncates inside the available native input width | Low | No functional or semantic loss; accessible label and Search command remain complete | Retained the truthful full placeholder and accessible label rather than shrinking text or removing a primary command | Owner reference comparison | Both 320 empty-state captures | Expected native input clipping at the smallest width |
| Context rail close control | 320-1024 | The visually hidden/off-canvas rail Close button retained a 40px minimum height | High | Failed the governed 44px touch-target boundary even when the rail was translated off-canvas | Raised the mobile/tablet rail control to 44px and retained the assertion across both engines | Initial exact-tree browser failure | Final 1,360-screenshot report | None |
| Accepted analytical state | 390 and 1600 | The source-level empty label remained visible after an accepted governed analytics response loaded | High | Created a contradictory data-truth message despite correct analytical values | Made the context label query-aware and added a regression assertion that rejects the stale empty label | Rejected pre-correction captures | Four populated final captures | None |

## Truth And Data State

The sample values in the owner image were not copied. The populated screenshots use a named repository validation fixture and do not assert a production medicine fact. Separately, the local private cloud contains one complete, reconciled June 2026 English prescribing period. The interface still shows source-not-ingested, forecast-unavailable or map-not-activated states wherever the selected source or required history is not authoritative and accepted.

The current local pharmacy validation database contains 12,936 canonical pharmacy rows, 7,211 verified public non-NHS business-email observations, 5,725 actioned blanks in the enrichment queue and zero marketing-eligible contacts. The local EPD source contains 18,374,449 accepted June rows with exact mart reconciliation and no rejected row. The 5,725 blank emails were not guessed or pattern-filled. DoHS enrichment remains blocked until an authorised `NHS_DOHS_API_KEY` is available and a bounded read-only assessment has been reviewed.

## Acceptance Boundary

This is repository, local standalone UI and local private-cloud data acceptance only. It does not prove Azure deployment, production identity, production EPD/PCA ingestion, sufficient multi-period history, a production forecast, production pharmacy opportunity scoring or permission to contact a pharmacy. Those states remain separately gated.
