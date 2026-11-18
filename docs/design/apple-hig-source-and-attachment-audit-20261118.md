# NovaPharm Apple HIG — source, attachment and platform acceptance audit
**Evidence checkpoint:** 18 November 2026. **Status:** partial source/attachment inspection; NOT 100% conformity, Mac executable testing, native app shipment, licensed-asset approval or public deployment.

## Source coverage is NOT implementation coverage
The actual owner-supplied `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv` contains **172 distinct HIG URLs**, **158 guidelines** and **14 categories** across six sections (Getting started 10, Foundations 19, Patterns 26, Components 73, Inputs 14, Technologies 30). This CSV was compared by URL, section and title against the 172-entry repository `apple-hig-172-topic-acceptance-register.json` and had **zero missing, extra or mismatched topics**. The supplied prose guide explicitly states it indexes direct pages rather than every article's inline references. No claim is made that every one of those pages has been completely read or implemented. Each topic's review, web, iOS, Android and release evidence remain independent gates.

**Source-confirmed official reference pages reviewed for this checkpoint:** [Getting started](https://developer.apple.com/design/human-interface-guidelines/getting-started.md), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md), [Color](https://developer.apple.com/design/human-interface-guidelines/color.md), [Maps](https://developer.apple.com/design/human-interface-guidelines/maps.md), [MapKit](https://developer.apple.com/documentation/mapkit), [MapKit JS](https://developer.apple.com/documentation/mapkitjs), [IMDF](https://register.apple.com/resources/imdf/). The MapKit and MapKit JS documentation routes were reachable but required JavaScript for full bodies in this audit environment; do not mark their detailed API contract as verified.

## Exact user-attachment evidence
The immutable machine-readable [32-file audit ledger](apple-hig-attachment-evidence-20261118.json) records each original filename, byte size, scope of inspection, intended use and remaining review. Evidence is deliberately narrower than the user's requested end state.

| Group | Inspected directly | Release decision |
| --- | --- | --- |
| User HIG index CSV | **172 records**, exact match to repo register; SHA-256 recorded | Documentation source, not functionality |
| HIG prose guide | All 270 extracted text lines read; source-map only | Reference only; each primary article needs separate design review |
| HIG XLSX | File and size identified; cells/formula metadata not revalidated | Reference source only |
| `IMDF.zip` | CRC passed; 10 entries, including five CSVs, two one-page PDFs and README; validation CSVs represent separate historical versions | **Spec and validation reference only**, not a venue map |
| `ComposingCustomLayoutsWithSwiftUI(1).zip` | CRC passed; 104 entries including SwiftUI project, README, Apple 2025 licence and embedded sample `.git` metadata | Design/reference learning; do not vendor `.git` or ship pet-voting sample |
| `AnimatingViewsAndTransitions.zip` | CRC passed; 181 entries including 39 Swift sources and Apple 2023 licence/README assets | Design/reference learning; preserve licence if any licensed source is actually reused |
| `apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip` | CRC passed; 151 entries (150 PNG, 1 SVG); no standalone licence inside ZIP | Visual reference; no blanket approval to redistribute Apple imagery on web/Android |
| SF Pro, SF Compact, SF Mono, SF Arabic, SF Hebrew, SF Armenian, SF Georgian, NY and SF Symbols DMGs (including duplicate suffixes) | Exact filenames and sizes recorded; **disk-image bytes not mounted/verified** | No binary web/Android font or symbol bundling; use OS-native typography/approved native SF Symbols where lawful |
| Icon Composer, iOS icon templates, Siri icon resources, Bezel, Core AI Debugger DMGs | Metadata only, no Mac install or application execution | Mac-only authoring/debugging references, not customer runtime components |
| Sign in with Apple resources | Metadata only | Never display a nonfunctional identity button; complete approved identity integration first |
| App Store / Mac App Store badge ZIPs | Metadata only, large archives not unpacked | Do not display unsupported store availability; check listing and branding terms first |

The inspected ZIPs contained no archive-integrity errors and no unsafe relative/absolute entry paths. SHA-256 digests in the ledger correspond only to **those source bytes actually materialized and hashed here**; uninspected DMGs and large badge ZIPs have null hashes, rather than invented fingerprints. Apple IP is not committed to this repository by this audit.

## Maps and IMDF — exact integration decision
Apple's Maps guidance expects meaningful interactive pan/zoom behaviour, readable overlays, selectable annotations, clear place cards, and unobscured map attribution and legal links. The owner-supplied `IMDF.zip` supplies a **validation/data-model reference**, not a NovaPharm office, hospital, warehouse or delivery-route GeoJSON dataset. It contains historical category/validation CSVs and two one-page data-model diagrams; the highest included validation file is `imdf-validations-1.0.3.csv`. Apple hosts the IMDF 1.0.0 specification (last listed as updated October 2021). These different version labels must not be conflated.

**Where mapping belongs:** authenticated dispatch tracking, warehouse receiving/site navigation, authorised pharmacy/clinic lookup, and genuinely geocoded deliveries. **Gates before showing a map:** verified physical location with rights/provenance, lawful map provider and API credentials, tenant-scoped authorised API, accessible map/list equivalent, explicit zero-location state, route/accuracy disclosure, privacy/location consent where applicable, legal attribution and iOS/Android/WebKit device acceptance. Do not fabricate pins, indoor floorplans, routes, live vehicle positions or customer addresses. MapKit and MapKit JS are Apple-specific; Android needs a compatible independently licensed map renderer, never an unverified port of Apple's native code. Avoid adding MapKit payloads to a website solely because the spec archive was supplied.

## Standing NovaPharm engineering DNA
1. **Apple-inspired, NovaPharm-owned identity**: restrained corporate red `#E3120B`, white/graphite hierarchy, semantic design tokens and lawful OS-native fonts.
2. **Apple HIG as reviewed guidance, not indiscriminate code copy**: native iOS controls and APIs only in native contexts; original accessible React Native and browser patterns for Android and web. No automatic 172/172 or Apple certification claims.
3. **Accessibility is a release gate**: readable 200% text and system font scaling, semantic headings/tabs, minimum comfortable touch targets, keyboard navigation, reduced motion, screen readers and contrast in light/dark/high-contrast mode. Test WCAG-compatible values and real devices.
4. **Source/identity and evidence before output**: pharmaceutical data rights, provenance, jurisdiction, tenant, safety, audit and consent; never show synthetic sources as licensed live medicine data.
5. **Release gates remain distinct**: exact-head CodeQL, production readiness, Chromium/WebKit browser, Expo iOS/Android bundle, actual signed device tests, independent public-deploy and authenticated-service verification.
6. **No silent AWS or Apple-binary distribution**: source-only HIG changes must not dispatch unrelated AWS publication; no Apple app badges without a shipped app; Mac DMG debugging binaries are not web/Android dependencies.

## Residual work — cannot truthfully close without external evidence
- Full article-by-article review and issue-level application map for **every** one of the 172 topics, including justified nonapplicability to the current three-platform product.
- Mac-native mounting/licence verification of supplied DMGs; simulator builds and Accessibility Inspector; genuine Android and iOS device acceptance across large type, TalkBack/VoiceOver, safe-area and contrast variants.
- Official license/asset provenance review for Apple UI kit, fonts, symbols, marketing badges and download terms; no redistribution until cleared.
- MapKit JS entitlement and independently approved location/venue data before maps; IMDF schema validation on a **real** venue dataset.
- Production authentication, customer tenancy, medicine-source entitlement, signed stores, public deployment and independent customer acceptance (AWS intentionally not connected here).

**Audit conclusion:** 32 attachment names are inventoried, 5 file formats/archives have byte-level/source inspection including the HIG CSV, and the 172-link index has exact-repository parity. No numerical "enterprise readiness percentage" can be justified by those facts alone. This report is a durable evidence baseline and is intentionally NOT an Apple endorsement, 100% completion certificate, regulatory clearance or live distribution receipt.

## 172-link metadata completeness — no invented Apple platform authority
For every one of the supplied 172 index entries, the machine-readable HIG register now preserves the original owner's `Type`, `Description` and `Platforms` fields as `indexType`, `indexDescription` and `indexSuggestedPlatforms`. These are **user-index metadata** (some explicitly list Android or Web), not declarations by Apple that native API features are available on those operating systems. The official page content, NovaPharm's web/iOS/Android applicability, implementation proof and signed release evidence remain independent from those suggested platform labels. CI checks all 172 source-field records, plus the split of 158 guidelines and 14 collection/category pages.
