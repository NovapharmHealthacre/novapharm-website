# NovaPharm Intelligence — Apple StoreKit 2 read-only product catalogue candidate

**Status:** Isolated Swift Package source candidate only (20 November 2026). **Not linked** into the Expo iOS app, not a signed IPA/TestFlight build, not a customer-facing paywall, not connected to App Store Connect, and not approved to charge or grant entitlements. All production/subscription flags in the main repository remain blocked.

## Purpose

This package introduces one narrow technical building block toward Apple's official In-App Purchase experience: StoreKit 2's `Product.products(for:)` API can return Apple-localized product metadata, for display only, but only after a caller provides a separately reviewed candidate catalogue and explicitly requests a non-production preview. Before any StoreKit call, `preflight` rejects unknown/duplicate/oversized product IDs, absent review, absent explicit request and any attempted production use. `AppStore.canMakePayments` is checked before the read-only request. It contains no `product.purchase()`, external links, payment processing, `Transaction.currentEntitlements` unlocks, refund completion, cross-tenant authorization or live web/Android payment integration.

The example product identifiers in the XCTest file are **synthetic test strings**, not Apple App Store Connect products, NovaPharm plan identifiers, prices or SKUs. A `NovaStoreKitCatalogPermit` created by the app itself is **not** a trusted security or App Store approval credential; a future signed host must obtain independently verified configuration from a trusted release manifest. Static test passing does not prove Apple products exist.

## Official Apple references (checked 20 November 2026)

- https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase.md — customer-visible full billing price, avoid purchase UI if `canMakePayments` is false, never mimic the Apple purchase confirmation sheet; make subscription durations, trial renewal terms, restore, management and refund help clear.
- https://developer.apple.com/documentation/storekit/in-app-purchase.md — configure Xcode StoreKit test products, then App Store Connect, use `Product.products(for:)`, `Transaction.updates`, verified current entitlements, StoreKit's system purchase confirmation and server events where appropriate.
- https://developer.apple.com/app-store/subscriptions/ — configure product groups and correctly localized subscription details; deliver continuous value.
- https://developer.apple.com/app-store/review/guidelines/ — consumer digital IAP is separate from organization-only contracted enterprise services and physical goods consumed outside the app.

## Isolated tests

On a macOS host with a supported Xcode/Swift SDK:

```bash
swift test --package-path native/novapharm-intelligence-storekit
```

Tests cover the nine local denial/contract cases without requiring Apple Developer keys, sandbox products, network purchases or credentials. The CI job compiles the StoreKit-linked source on macOS; it is not app signing, device acceptance, StoreKit sandbox purchase proof or a deployment.

## Required next implementation stages

1. Confirm the actual native app bundle identifier, provisioning, Apple Developer/App Store Connect account, product and subscription-group configuration; no invented IDs.
2. Implement a user-visible Apple-compliant iOS paywall using verified `Product` pricing and localized billing period/renewal/trial terms, truthful service value, terms/privacy, restore, and sign-in.
3. Implement genuine purchase handling, verified transaction/entitlement reconciliation, durable tenant/account mapping, App Store Server API/Notifications, cancellation/refund/revocation and error recovery **under a separately approved release**.
4. Run StoreKit Xcode configuration tests, sandbox purchases/restore/refunds/Ask to Buy, accessibility (VoiceOver, Dynamic Type, localizations), signed iOS device tests and review notes.
5. Do not repurpose Apple StoreKit for Nutraxin/ESCO physical goods. Keep Android Play Billing and web Stripe in their own independently approved workflows. Alternate payments in BR/EU/JP remain disabled pending current territorial eligibility and entitlements.
6. Obtain qualified independent Security/Commerce/Quality approval and production owner signoff before wiring into any customer app. Existing `config/intelligence/owner-production-constraints.json` prohibits customer subscriptions and billing.

No new cloud resources, Apple artwork, Apple font assets, protected data, medical records, product or service activation are included.
