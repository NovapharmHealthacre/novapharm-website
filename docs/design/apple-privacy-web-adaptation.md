# Apple privacy guidance → NovaPharm web adaptation

Date: 15 November 2026  
Scope: NovaPharm Corporate static public site, newer Next.js Corporate site, their privacy/cookie notices and shared browser preference record.  
Status: source implementation candidate, **not** an independent legal audit or proof of a live production release.

## Official guidance reviewed

| Source | Principle and NovaPharm application |
| --- | --- |
| [Apple Privacy](https://www.apple.com/in/privacy/) | Privacy and user control by design; avoid copying Apple's claims about on-device Apple Intelligence, Private Cloud Compute, Health, or Apple Pay without NovaPharm evidence. |
| [Apple HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy) | Ask only for necessary data, ask at the moment needed, explain why in plain language, protect data, provide choices and denial fallbacks. |
| [UIKit: Requesting access to protected resources](https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources) | Native iOS/macOS purpose strings and entitlements are **not** web APIs; implement browser-native permission requests, user-selected files and precise explanatory copy where needed. |
| [Security framework](https://developer.apple.com/documentation/security) | Secure transport, authentication, access controls and secure storage. Native Keychain/security APIs are not available to a website: use appropriately secured server-side sessions, least privilege, encryption and browser WebAuthn where implemented and approved. |
| [Core Location: Requesting authorization](https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services) | Only request location when someone uses a feature needing it, prefer temporary/foreground and handle denial. A website must use browser Geolocation (if actually needed), never claim to call Core Location. |
| [App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency) | ATT is required in specified native app-tracking scenarios. No ATT system prompt exists for websites; web consent for optional analytics must be affirmative, separately documented and revocable. Marketing must not be pre-authorised. |

## What this change does

1. Publishes plain-language privacy principles, a working Cookie settings entry point, rights contact route and honest browser/native permission boundaries in the static legal Privacy page.
2. Adds parallel accessible content and a privacy action area to Next.js Corporate Privacy. The existing legal policy layout is preserved; no Apple logo, proprietary UI or unsupported security certification is copied.
3. Gives the static and Next.js sites a consistent, versioned `np_cookie_consent` record (`2026-11-15-v1.3`), with a 180-day maximum validity. Old, missing or corrupt records are treated as no consent.
4. Defaults optional categories to off. The UI cannot approve a non-existent marketing tracker. Analytics may be selected, but only the static public-site runtime has a consent-gated GA4 integration; the Next.js controls do not imply a GA4 provider is actively loaded.
5. Preserves statutory notices and specific external-provider caveats. Consent withdrawal stops new site-initiated measurement and attempts cookie cleanup; it cannot recall data already processed by a recipient.
6. Reconciles the operational privacy data map and cookie register with the currently described AWS/Cognito/Atlas infrastructure and conditional public GA4 provider.
7. Includes source regression tests and a PR workflow to check version parity, storage lifecycle, denied routes, permitted action patterns, notice visibility and lack of unauthorised marketing activation.

## Boundary decisions

- **Not required on a corporate page:** camera, microphone, contacts, Bluetooth, local network, photo-library, precise location and ad-tracking permissions. No new API call or prompt is introduced by this PR.
- **If a later product feature needs one:** write a specific one-sentence purpose, start from a clear user gesture, let the browser ask, show a graceful denied/unavailable fallback, minimise storage, and review retention/third-party transfers. Do not request at app start or use a deceptive mock system alert.
- **Secure accounts:** passkeys/WebAuthn, MFA, access control, CSRF, revocation, session storage, CSP and TLS need separate security review and live E2E proof. This content update **does not certify** every backend or enterprise module.
- **Geolocation:** do not ask for background location on this informational site. Do not infer location from analytics IP processing is the same as device Geolocation.
- **Tracking:** consent for optional GA4 analytics is not equivalent to native ATT permission and does not enable ad_personalization, Google signals or arbitrary cross-company tracking.
- **Health/patient information:** this B2B website does not invite patient-identifiable data; a future controlled clinical/safety workflow requires its own legal, quality and privacy validation.
- **Legal obligations:** final UK GDPR/PECR notices, UK Data (Use and Access) Act applicability, DPA records, Google terms, transfers, processor agreements, rights fulfilment and retention require named owner sign-off and external legal review where appropriate.

## Cross-estate privacy coverage — 15 November 2026

| Surface | What is implemented in this PR | What still needs live acceptance |
| --- | --- | --- |
| Static corporate Privacy and Cookies | Long-form notice, privacy choices and consent contract | GitHub Pages publication plus real browser cookie/network inspection |
| Next.js Corporate Privacy | Privacy controls and shared consent format | Deployed browser acceptance |
| Technology Privacy | Minimal-data and browser-permission disclosures | Independent local legal review |
| Founder Privacy | Email rights and permissions clarification, without analytics | External-link and hosting review |
| Status | Visible Privacy notice link and sanitised service text | Live response monitoring |
| Portal login | Privacy and rights links, no marketing prerequisite | Real sessions, role isolation and MFA validation |
| Intelligence / Distribution modules | Existing protected access logic remains unchanged | Application-specific data-flow, processor, retention and permission verification |

Apple UIKit, Core Location, Keychain and App Tracking Transparency are native frameworks, not web-browser capabilities. This change adapts the underlying privacy principles without claiming proprietary Apple protections.

## Release acceptance checklist

- [ ] Static and Next.js Privacy/Cookies routes tested in desktop/mobile Safari/WebKit and Chromium; headings, links, dialogs, focus return, keyboard-only flow and content contrast inspected.
- [ ] Before consent / Reject: confirm no GA request, `_ga` cookies or unapproved marketing requests on eligible public routes.
- [ ] Accept Analytics: confirm only intended public pages load GA4 and send **no** query strings, emails, form fields, account, SKU, order, payment or patient identifiers.
- [ ] Withdraw: confirm new GA requests are blocked, cookies are removed where permitted by the browser, and legal/protected routes remain excluded.
- [ ] Confirm unchanged protected portal identity/session boundaries and legal routes using deployment/browser tests.
- [ ] Confirm the live public privacy link resolves to the new published version after a production deploy.
- [ ] Privacy Lead and legal owner review actual provider configuration, Google data retention, international transfer safeguards, rights handling and data map.
- [ ] Record exact production commit SHA and live-domain acceptance. **PR merged ≠ deployed ≠ independently verified.**

Reference controls: `assets/js/cookie-consent.js`, `assets/js/consent-analytics.js`, `apps/corporate/components/cookie-controls.tsx`, `legal/privacy/index.html`, `legal/cookies/index.html`, `compliance/privacy-data-map.md`, `compliance/cookie-register.md`.
