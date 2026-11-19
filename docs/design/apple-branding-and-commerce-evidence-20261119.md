# Apple branding, In-App Purchase and regional commerce — source audit

**Reviewed:** 19 November 2026. **Scope:** NovaPharm Healthcare public site, Intelligence web/mobile research, enterprise portal, Nutraxin/ESCO physical-goods checkout. **Status:** documentation and automated source-release HOLD only. No native Apple StoreKit checkout, customer billing, new infrastructure, Apple App Store publication or Apple endorsement is claimed.

## Uploaded archive: direct inspection

The owner-supplied `apple-in-app-purchase-brand.zip` was inspected locally, not copied into this public repository. SHA-256 `f20c8dcbf6baedb10d288f26552e4fe6b3c2277296569c1e64be792cad78df1d`; 125,813,389 compressed bytes; **888 files** in **48 localizations**, consisting of 270 SVG, 270 EPS and 348 PNG. There are 192 Apple In-App Purchase badge variants and 696 lockup assets. ZIP CRC, PNG image metadata and SVG parsing passed. EPS binary-preview headers were recognized. These checks do not verify permission to use the trademark, Apple signing, source provenance, locale suitability or a functioning purchase flow.

**Do not confuse the IAP mark/lockup in this upload with an App Store download badge.** The existing App Store download artwork policy and unpublished badge component remain governed by `docs/apple-app-store-badges.md`. Do not commit or publish the uploaded archive by default.

## Official Apple source-to-product applicability (all 12 provided references)

| Official source | Apple rule to apply | NovaPharm current source status and release dependency |
| --- | --- | --- |
| [HIG Branding](https://developer.apple.com/design/human-interface-guidelines/branding) | Maintain distinct company voice; reserved accent, unobtrusive logo and familiar interaction. | Owner logo governance and HIG styles exist. Full route/device acceptance remains open. |
| [App Store marketing](https://developer.apple.com/app-store/marketing/guidelines/) | Only official unchanged badges with actual app listing and Apple trademark disclosures; no implied Apple partnership. | PR #710 merged; actual native listing/approved served badge not verified. |
| [HIG Apple In-App Purchase](https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase/) | Native digital premium services; total purchase price, integrated paywall, system purchase confirmation, trial, restore and support. Different from Apple Pay for physical goods. | No accepted native StoreKit screen or real digital purchase. |
| [Apple In-App Purchase](https://developer.apple.com/in-app-purchase/) | Product/transaction lifecycle, secure purchase verification and refund/cancellation reconciliation. | No live native products or server integration proved. |
| [Subscriptions](https://developer.apple.com/app-store/subscriptions/) | App Store Connect products and groups, terms/renewal, manage/restore, Server API/Notifications. | Web Stripe prelaunch contract exists; Apple subscriptions are not integrated. |
| [App Review](https://developer.apple.com/app-store/review/guidelines/) | 3.1.1 default consumer digital feature unlock, 3.1.3(c) eligible enterprise-only access, 3.1.3(e) physical goods. | Segment Intelligence consumer digital, enterprise contracts, Nutraxin/ESCO physical goods. Do not extend web Stripe assumptions to native consumer app. |
| [StoreKit](https://developer.apple.com/documentation/storekit/in-app-purchase) | Product loading, Apple sheet, verified transactions, purchase restoration, entitlement checks. | Native prototype has no accepted StoreKit or signed transaction tests. |
| [Brazil payment options](https://developer.apple.com/support/payment-options-on-the-app-store-in-brazil/) | Current storefront/OS, account terms, entitlement and relevant external purchase APIs required for alternative digital payments. | Unverified; disabled. |
| [EU payment options](https://developer.apple.com/support/payment-options-on-the-app-store-in-the-eu/) | Territory-specific terms, StoreKit external purchase entitlement/API, disclosures and customer safeguards. | Unverified; disabled. |
| [Japan payment options](https://developer.apple.com/support/payment-options-on-the-app-store-in-japan/) | Territory-specific terms, OS eligibility, entitlement and external purchase APIs. | Unverified; disabled. |
| [App Previews](https://developer.apple.com/app-store/app-previews/) | Actual native screen recordings, up to three 30-second previews per localization/device target, cleared rights and accurate paid/login disclosures. | Empty manifest; native footage and listing unverified. |
| [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color) | Semantic meaning, colour not sole state, light/dark/high-contrast legibility and judicious NovaPharm brand accent. | #E3120B and semantic token tests exist; full visual acceptance pending. |

These links are current-source references, not perpetual regulatory/legal approval. Re-check region-specific Apple business terms before any release.

## Explicit product/payment decisions

- **Intelligence web subscriptions:** Stripe-related code is a protected, non-binding prelaunch design; owner production constraints currently prohibit customer billing/subscriptions. An Apple Pay button is not native App Store IAP.
- **Native consumer Intelligence digital features:** plan for StoreKit in an approved native app, not a Stripe-powered digital unlock by default. Need approved App Store app ID and products, native StoreKit tests, verified transactions/ownership, receipt/server verification strategy, restore, refund/cancel/revoke, and truthful localized pricing/disclosures.
- **Organization-only contracted enterprise access:** review Apple rule 3.1.3(c) eligibility for an app sold only to organizations, on the actual distribution and UI model. Consumer individual sales cannot be assumed exempt.
- **Nutraxin/ESCO physical goods and services consumed outside the app:** use eligible card/Apple Pay/Stripe payment flows, not StoreKit IAP. Keep merchant and settlement ledgers distinct and comply with separate pharma product approvals.
- **Brazil, EU and Japan alternative digital payment options:** no entitlement is present in the source evidence. Remain disabled pending signed Apple agreements, current OS/storefront eligibility, mandated system notices, parental-controls rules where applicable, reporting and negative device tests.

## Implemented source tripwire — not a live payment implementation

`config/apple-commerce-release.json` records the verified inspection fingerprint and explicit unapproved statuses; `scripts/test-apple-commerce-release.mjs` checks its disabled native/marketing/region fields against the existing empty marketing manifest and the unchanged owner hold. The independent `.github/workflows/apple-commerce-release.yml` validates relevant PR changes without new services or credentials. Any future enabled sale requires a new versioned policy, independently reviewed real-world evidence and release-appropriate tests; **do not merely flip flags or relax tests to claim integration**.

## Verified November 2026 regional-policy details (not implemented permissions)

- **European Union:** Apple's Developer Program Licence Agreement update of **18 August 2026** describes changes effective **1 October 2026**; the current EU guide describes alongside-IAP alternative payment possibilities, new child-safety obligations and a 12-month choice-of-payment-method commitment. Contract, storefront, disclosure and entitlement requirements must be independently reviewed, not inferred from an IP address or browser locale.
- **Brazil:** the published Apple guide describes alternatives beginning on **iOS 26.5 and later**, subject to StoreKit External Purchases or Offers Entitlement and reporting/business terms.
- **Japan:** the published Apple guide describes alternatives beginning on **iOS 26.2 and later**, subject to StoreKit External Purchases or Offers Entitlement and reporting/business terms.
- **United States:** the App Review guidance also describes storefront-specific external call-to-action exceptions. The absence of a user prompt or entitlement is not itself approval for NovaPharm to activate a new commerce route.
- The same screen may have different Apple requirements by storefront, platform, app category and contracted distribution. Do **not** use a single global alternative-payment toggle.

## Cross-platform review-only classification implementation

`src/core/apple-commerce-classification.mjs` returns an immutable, **never enabled** review outcome for web, iOS and Android. It distinguishes consumer digital, organization-only enterprise and physical-goods paths and does not supply any payment URL, product ID, transaction, entitlement or customer grant. Its 15 source-only tests in `scripts/test-apple-commerce-classification.mjs` exercise product/surface cases and BR/EU/JP alternative-payment denial. The separate Apple commerce CI workflow executes these cases on relevant file changes.

**This is an architecture acceptance rule, not a native checkout or a claimed Play Store policy certification.** No production flag may be inferred from the review classification.

## Production and acceptance blockers

1. Establish Apple Developer account, accepted legal/trademark and market terms, native app identifiers and genuinely signed builds.
2. Implement and independently test StoreKit purchases, App Store Connect products/groups, restore/refunds, verified entitlements, subscription lifecycle and secure server notification handling.
3. Independently review applicable territory-specific alternative payment terms, entitlement and storefront/OS/parental requirements before showing choices.
4. Produce genuine rights-cleared, privacy-safe on-device previews. Do not advertise a research Expo screen or website/PWA as an App Store-distributed native app.
5. Verify accessible, localized paywall and marketing UI across Apple devices, Dynamic Type, VoiceOver, light/dark/increased contrast, keyboard, currencies and price terms.
6. Obtain quality/security/merchant approval and separate signed deployment/App Review/production receipt. Keep all chargeable deployment, new licensing and public customer activation blocked while `config/intelligence/owner-production-constraints.json` says not granted.

No Apple artwork, account secrets, customer billing code, patient data, medicine rights, DNS or AWS deployment is introduced by this audit.
