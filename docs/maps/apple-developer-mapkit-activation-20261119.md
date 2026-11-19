# NovaPharm Apple Developer Maps activation and release evidence

**19 November 2026 — operational runbook.** The GitHub source changes do not authorize or prove that a production Apple token has been issued, a protected geography query has succeeded, or a signed native app exists.

## 1. Apple Maps token — action by an Apple Developer Account Holder/Admin

Sign in to the company's [Apple Developer account](https://developer.apple.com/account/resources/services/list), then navigate to **Certificates, Identifiers & Profiles → Services → Maps → Configure Tokens → +**. Create a token for **MapKit JS**, restricting it to the approved deployed origin(s) (normally `intelligence.novapharmhealthcare.com` and only if separately approved `portal.novapharmhealthcare.com`). Follow Apple's account UI for the exact web-domain syntax and token lifetime. Verify the actual host and token permissions before relying on them. [Apple Maps tokens guide](https://developer.apple.com/help/account/service-configurations/maps-tokens/).

- Use **the Maps token** as `NEXT_PUBLIC_APPLE_MAPS_TOKEN`; it is intentionally visible in browser JS and therefore must be *domain-restricted*. Never paste an Apple Developer private key, `.p8` signing key, App Store Connect API key, certificates or account password into a public environment variable, repository, issue or chat.
- The two existing Docker build candidates now accept `NEXT_PUBLIC_APPLE_MAPS_TOKEN` as an *optional build argument*. An absent token leaves the map opt-out and protected tables available.
- It must be configured **before the Next.js build** of the artifact actually deployed, not added only as a runtime container variable. The client map and the protected CSP proxy both reference `process.env.NEXT_PUBLIC_APPLE_MAPS_TOKEN` by static dot notation, so their release opt-in is built from the same value.
- In a private, approved build context, pass the origin-restricted public token as `--build-arg NEXT_PUBLIC_APPLE_MAPS_TOKEN=…` to the relevant Docker build, or set the same environment variable before any other Next.js build. Keep build logs and CI artifacts free of raw token values. Never place an actual token or private key in source.
- Updating/rotating the token requires a **new build**, a separately approved deployment, validation and rollback because Next.js inlines public variables into the frontend bundle.
- Keep this opt-in exclusive to the protected Geography page. An ordinary corporate page, anonymous route, customer session or unrelated workspace must never gain broad Apple CDN permissions simply because a token was set.

## 2. Release acceptance with owner-approved access

After a new artifact is built and deployed to the actual approved Intelligence host:

1. Record the *source commit*, immutable artifact/digest, public hostname, token scope, deploy identifier, approval, rollback target and timestamp without storing raw token values.
2. Sign in with the correct board/executive role. Exercise a real approved postcode with `enterprise/medicines/nearby`. Inspect response provenance, postcode centroid, source timestamp, pharmacy/practice rights and coordinate accuracy; do not confuse test fixtures or straight-line distances with verified address locations or routing.
3. In Chromium and WebKit plus iOS Safari and Android Chrome, check live Apple map tiles, clustering, map controls, Apple's attribution/legal notices, keyboard/touch/screen-reader access, content security policy, and loss-of-connectivity/expired-token denial. Confirm the accessible result table remains useful if Maps fails.
4. Confirm anonymous/customer/non-board sessions cannot access protected coordinates or maps and no device geolocation or patient data is collected.
5. Capture *sanitized* evidence. Never publish protected addresses, API responses, sessions or token values. Roll back the exact build artifact if tile loading, rights review or access control fails.

**Acceptance criterion:** every step has an actual reviewer and link to a recorded result. CI green, a reachable public corporate page or merged code by itself cannot certify live MapKit JS.

## 3. Native iOS — separate from the browser token

NovaPharm's `native/novapharm-intelligence-apple` currently contains a Swift package with a MapKit research primitive; `native/novapharm-intelligence-mobile` is an Expo research preview that opens Maps externally. Neither is a store-ready, signed app.

Before signing, the account owner must confirm an **explicit, company-owned bundle identifier**, Apple Developer team, supported iOS target, provisioning approach, approved authenticated mobile app architecture, tenant OIDC/PKCE+MFA, distribution entitlement and Apple privacy/data disclosures. Set the iOS App ID only after confirming that identifier in the developer account; do not invent team IDs, provisioning profiles or entitlement grants.

Then create the actual native app target/integration, run Apple HIG, Xcode device/VoiceOver and auth/tenant tests, configure Xcode automatic signing or an approved provisioning profile, build an archive and submit to App Store Connect/TestFlight. An Apple Developer membership **does not itself** create those targets, pass Apple review or publish the app. Official: [App Store Connect provisioning profiles](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile), [build uploads](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds).

Android requires its own approved application ID, Android-native map/privacy decision, Google Play signing, test track and review. An Apple Developer account cannot sign or publish Android packages.

## 4. IMDF and protected geography remain separately gated

A company Apple Developer membership does not provide surveyed indoor warehouse geometry, licensing, rights sign-off, national prescribing/dispensing datasets or production role-boundary access. The source-only preflight at `scripts/imdf/venue-preflight.mjs` must be followed by independently approved real venue GeoJSON, the official IMDF validator, owner review and on-site floor/entrance/accessibility acceptance. Do not turn sample fixture geometry into an operational map.

## 5. Rollback and revocation

If a public Maps token is misconfigured, rotate or revoke it via **Services → Maps → Configure Tokens**, rebuild the previous token-free or correctly restricted artifact, and verify the protected page falls back to evidence tables without broadening CSP or revealing protected records. A signed mobile binary requires its own separate staged release and rollback approval.
