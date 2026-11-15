# Apple branding, App Store marketing and preview guidance — NovaPharm implementation

**Reviewed:** 15 November 2026. **Status:** source implementation prepared for pull-request CI; no claim of Apple endorsement, App Store distribution, real-device certification or live publication.

## Primary Apple references and applicability

1. [HIG Branding](https://developer.apple.com/design/human-interface-guidelines/branding): expressive **NovaPharm** voice and identity, familiar controls, content-first layouts and unobtrusive logos. Follow the spirit; don't copy Apple's brand, logo, page artwork or trademarks.
2. [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color): semantic colour roles, consistent interactive meaning, high contrast and adaptive appearances. Already implemented in `assets/css/novapharm-hig-colours.css`; dark mode remains opt-in until each screen is checked.
3. [App Store Marketing Resources & Identity](https://developer.apple.com/app-store/marketing/guidelines/): applies to promotion of **actual App Store apps**. Use exact Apple-issued badges only, with a verified direct store link, correct legal notices, 40px minimum onscreen badge height and one-quarter-badge-height clear space. No modified Apple logos or rendered iPhones. See complementary, open `docs/apple-app-store-badges.md` proposal in PR #710.
4. [App Previews](https://developer.apple.com/app-store/app-previews/): actual on-device app footage, a cohesive product story, legal rights, a maximum of 30 seconds per preview, up to three per locale/display target, clear disclosure of sign-in/paid features, legible captions and a deliberate poster frame. Apple's upload is performed in App Store Connect, not by merely adding a video to this website.

## Website brand specification

- **Identity:** retain unchanged, checksum-governed NovaPharm Healthcare, Distribution and PharmaScope artwork. Distinguish branded products through their own approved logos. Technology retains its separate approved mark. Do not redraw as an Apple logo or substitute a favicon for the horizontal wordmark.
- **Voice:** calm, specific, human, useful. Lead with what a user can do or learn, not repeated brand slogans. Plain English, regulated claims at the point of use, and honest commercial/authorisation status.
- **Visibility:** show the main brand in predictable header/home navigation and footer only when it adds useful context. Do not repeat large logos in cards, data tables, operational workspaces or splash screens.
- **Colour:** `#E3120B` is an identity accent; default canvas is white and supporting controls neutral. Use semantic link/focus, destructive, warning and success roles. Brand red must not be used as a generic error indicator; never encode state in colour alone.
- **Typography:** keep already approved web font roles and text resizing. No bundling of proprietary Apple fonts or trademarked symbol files.
- **Presentation:** governed horizontal artwork must preserve aspect ratio, original fill and enough surrounding space. Focused brand-home links need a visible focus outline, including forced colours and increased contrast. The shared brand CSS is deliberately low-risk and does not change logo assets or application behaviour.
- **Source of truth:** existing `docs/programme/brand-governance.md` and `creative-assets/brand` packs govern identity. A guideline-inspired website remains an independent NovaPharm product.

## Preview and native marketing release gates

`config/apple-marketing-release.json` is intentionally empty at initial implementation. Adding a listing to its `nativeAppListings` array requires independent proof of a released native application, canonical App Store URL and platform. A web portal, PWA or TestFlight build is **not** evidence of App Store availability. PR #710 controls whether an approved Apple badge can appear.

Each `appPreviews` / `webProductWalkthroughs` entry must contain an ID, authentic captured video, source SHA-256, corresponding real poster, WebVTT captions, real duration, asset rights, synthetic demo accounts only, legal/regulatory review, sign-in/paywall disclosure review and confirmation that only implemented features are shown. Native preview entries additionally require a verified linked app, locale, display target and at most 30 seconds. Web walkthroughs require manual playback controls and no autoplay.

**Never** show real patients, prices that could imply a misleading offer, unimplemented AI capabilities, false medical advice, credentials, customer records, invented inventory, or simulated successful fulfilment. Put any appropriate disclaimers in the recording itself. Capture genuine device/app UI at native resolution; prefer simple fades. Do not produce fake Apple product renders or alter Apple-branded device artwork. Prepare a truthful native preview before submitting through App Store Connect.

## Automated implementation and outstanding evidence

- Shared logo focus, non-distortion and high-contrast styles: `assets/css/novapharm-hig-colours.css` (already imported into the static site build and the major Next.js app layouts).
- Automated contract: `npm run design:branding:validate` checks owner-approved identity references, semantic colour identity, source marketing manifest, raw footage and release claims. It runs in the normal `npm run check` pipeline.
- Existing `npm run brand:validate` checks original logo checksum and dimensions and must remain green.
- Outstanding before enabling badges or videos: confirmed native App Store IDs, license/asset inspection, real video recordings and poster/captions, localisation, App Store Connect submission, exact-head successful CI, browser/assistive-tech acceptance, and deployed-domain verification. These are **not** marked done by introducing guardrails or documentation.

Do not merge if repository tests show regressions; do not claim production deployment without exact-source and live checks.
