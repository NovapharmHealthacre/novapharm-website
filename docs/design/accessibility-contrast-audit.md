# Accessibility and contrast audit

Review date: 22 August 2026
Target: WCAG 2.2 AA minimum

## Token contras

Ratios below use the WCAG relative-luminance formula against the primary white surface.

| Token | Value | White contrast | Use | Result |
| --- | --- | ---: | --- | --- |
| Principal ink | `#111111` | 18.88:1 | Headings and primary text | Pass AAA |
| Body text | `#3f454b` | 9.70:1 | Paragraphs and controls | Pass AAA |
| Supporting text | `#626970` | 5.56:1 | Metadata and captions | Pass AA normal text |
| Dark red | `#b30e09` | 7.04:1 | Text links and small red labels | Pass AAA |
| Brand red | `#e3120b` | 4.82:1 | Filled button background with white text and restrained accent | Pass AA normal text |
| Structural divider | `#aeb3b8` | 2.11:1 | Non-text boundary only | Not used for text |

## Component controls

- The reusable Notice treatment uses near-black headings, dark body text, a visible border and a labelled variant; colour is never the only signal.
- Focus-visible states remain keyboard perceptible across navigation, links, buttons, form controls and disclosures.
- The textual `Menu` control has a stable touch target and names its state without relying on an icon.
- Product, capability and navigation controls remain semantic links or buttons; decorative containers are not made clickable.
- Heading order, landmarks, list semantics, figure captions, form labels and status regions are validated from rendered HTML.
- Forced-colours rules restore explicit boundaries and selected-state indicators using system colours.
- Reduced-motion rules remove product-card translation and routine transitions.
- Print rules convert text to black on white and remove fixed/sticky navigation.

## Manual acceptance matrix

| Check | Candidate result | Evidence required for final acceptance |
| --- | --- | --- |
| Keyboard traversal | Repository controls implemented | Chromium and WebKit route review |
| Visible focus | CSS contract implemented | Screenshot and manual traversal |
| 200% zoom | Responsive CSS implemented | Browser review on forms, local navigation and product details |
| 400% zoom/reflow | Single-column breakpoints implemented | Browser review with no two-dimensional scrolling |
| Screen-reader structure | Semantic HTML validation passes | VoiceOver spot check on representative routes |
| Touch targets | Stable menu, actions and links implemented | 320/390px interaction review |
| Axe | Test harness available | Exact-candidate Chromium and WebKit results |
| Reduced motion | CSS contract implemented | Exact-candidate emulation result |
| Forced colours | CSS contract implemented | Browser/manual inspection |

Repository implementation is not represented as production accessibility acceptance until the final rendered run is recorded in `docs/release/final-acceptance.md`.
