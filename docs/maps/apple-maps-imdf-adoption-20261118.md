# NovaPharm Maps, MapKit JS, native MapKit and IMDF adoption

**Date:** 18 November 2026  
**State:** guarded source implementation on the website and iOS/Android candidates. This is **not** a live production map, verified indoor venue, signed mobile app, full pharmacy-location dataset or independent device acceptance. AWS is not needed to commit or test this source work.

## Primary Apple guidance

1. [Apple Human Interface Guidelines — Maps](https://developer.apple.com/design/human-interface-guidelines/maps): interactive panning/zoom, legible marker selection, location search and filters, adequate control contrast, unobscured Apple map logo/legal notices, place cards matched to screen size, and zoom-dependent indoor detail and floor selection.
2. [MapKit](https://developer.apple.com/documentation/mapkit): SwiftUI/native Apple platforms. Source-backed annotations only, no unsolicited location tracking.
3. [MapKit JS](https://developer.apple.com/documentation/mapkitjs): interactive maps on web, supported iOS and Android browsers, with a developer token. The source candidate loads MapKit JS 6 from Apple's official CDN and supplies a domain-restricted public token through `NEXT_PUBLIC_APPLE_MAPS_TOKEN`; do not store a private signing key in that variable.
4. [Indoor Mapping Data Format](https://register.apple.com/resources/imdf/): venue/footprint/building/level/unit/amenity/opening/occupant geometry with relationship and validation rules. The uploaded `IMDF.zip` has `categories_20210728.csv`, `imdf-validations-1.0.0.beta.2.csv` through `imdf-validations-1.0.3.csv`, `IMDF_Data_Model_Full.pdf`, `IMDF_Data_Model_High_Level.pdf` and `README`. It contains **no building geometry**, warehouse layout, authorised pharmacy site coordinates, or surveyed floor features. Its validation-rules catalogue is not a venue ready to upload or display.

## Integration by surface

| Surface | Source change | Operational boundary |
| --- | --- | --- |
| Protected Intelligence web | `apps/portal/components/governed-healthcare-map.tsx` attached to the existing `Geography` `NearbyOrganisations` query | Requires verified board session and successful protected geography response. No map until a restricted token is configured. Only source-returned numeric coordinates are annotated. Existing tables remain available on failure. |
| Portal CSP | `packages/security/src/index.ts` plus `apps/portal/proxy.ts` | Allows MapKit CDN, images and narrowly scoped Wasm only for the authenticated Geography page **and** when the public token is configured; maintains no camera, microphone or geolocation permissions. Regression-test exact CSP and confirm CDN endpoints in a real browser before production. |
| Expo iOS candidate | `native/novapharm-intelligence-mobile/MapsResearchScreen.tsx` via **More → Maps and location** | User enters a non-sensitive decimal coordinate and optionally a label; opens an external map on user action. No network fetch, location permission, API connection, persistent history or protected dataset. |
| Expo Android candidate | Same React Native screen | External Apple Maps URL opens a browser/map handler if supported. This is not the native Android map SDK or an in-app live map. |
| Native Apple research package | `native/novapharm-intelligence-apple/NovaMapKitView.swift` registered in `Package.swift` | Basic SwiftUI MapKit rendering of explicitly supplied sites with coordinate validation. Not bridged into Expo, not tenant-authorised by itself, not signed or App Store released. |
| Independent native Android research | `NovaExternalMapLink.kt` and unit test | Permission-free validated external link only. Not an in-app Android Maps SDK or app-store production release. |
| Warehouse/distribution | IMDF building/level/unit evidence gate defined here; no fictitious floor map | Real warehouse owner permission, surveyed GeoJSON, indoor-level topology, safety routing, update ownership and validation are required before any indoor map may be created. |
| Public corporate website | No speculative map inserted onto content pages | Add a contact/office map only for a verified public business address, with compliant privacy/accessibility and a dedicated token. |

## HIG and privacy acceptance

- Keep map panning/zooming available; no full-cover promotional overlay. The map remains at least 200×100 px and gives Apple's visible logo/legal link space. On mobile, keep voice/touch/keyboard discovery and link alternatives; test RTL and reduced motion.
- Do not request the device's location for postcode lookup. Distinguish **postcode centroid**, **actual business entrance**, **warehouse floor**, **vehicle GPS**, and **patient location**. The current service computes straight-line radius, **not** route kilometres or travel ETA.
- Marker source identity, coordinate precision, date, country, consent and redistribution rights must be accepted by the existing governed backend. Records lacking coordinates stay in the accessible table; the map does not invent coordinates or geocode them on the client.
- Do not convert available third-party coordinates into patient locations, clinical recommendations, dispensing claims, stock status, targeted marketing or medical need. No local cache or snapshot of private locations.
- Apple’s current [Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/) restricts MapKit JS use on non-Apple hardware for fleet management, asset tracking and enterprise route optimisation. Therefore, **do not** reuse this web MapKit JS component for WMS fleet dispatch or enterprise vehicle tracking across non-Apple devices. Choose and licence a separate suitable fleet solution if required.
- Preserve security boundaries: site-specific CSP only; secure HTTPS, no global CDN allowlisting, no `unsafe-eval`, no unreviewed Maps token/credential. The CSP's `wasm-unsafe-eval` allowance is narrowly conditioned for MapKit rendering.
- Native iOS MapKit support and browser MapKit JS are different APIs; native Apple UI assets are not a distributable cross-platform icon/font library.

## IMDF ingestion — hard stop until a real venue is supplied

A valid IMDF implementation requires, in order: (1) a venue-owner approval and licensing record; (2) surveyed, versioned indoor geometry in the IMDF-required GeoJSON collections including compatible venue/building/level/unit feature relationships; (3) accessibility/escape-path and indoor coordinate reference review; (4) full specification validation against the selected version of the supplied rules and category definitions; (5) protected tenant/safety access; (6) real on-site visual, floor-picker, zoom-LOD, entrance/exit and emergency egress verification; and (7) controlled deployment and rollback. The uploaded IMDF specification files fulfil none of the surveyed-venue or live-data requirements.

Do **not** import the generic category CSV as a collection of locations. Do **not** imply the presence of a warehouse geofence, indoor routing, position beacons or emergency evacuation instructions.

## Required integration and release gates

- [ ] Configure an Apple Developer MapKit JS token with domain restrictions for the exact authorised host(s). Verify Apple logo/legal notice, JS 6 compatibility, mobile Safari/Chrome and map tile CSP in production-like testing.
- [ ] Confirm authorised non-sample geography records include reliable numeric latitude/longitude when precision and rights permit; test privacy and zero-result handling.
- [ ] Run `node --test scripts/test-governed-maps-contract.mjs` and the existing portal, security and Expo mobile CI workflows against the exact PR commit.
- [ ] Run real Chromium/WebKit map interactions, keyboard/VoiceOver/TalkBack contrast and accessibility checks on tablet and phone layouts, including failed-token and offline states.
- [ ] Validate native Swift package under Xcode and Android JUnit in the correct toolchain; integrate real native MapKit views and any approved Android provider into signed application builds before claiming in-app native map functionality.
- [ ] Supply authentic IMDF venue data and apply Apple’s validation framework before shipping any indoor site map. Obtain site/tenant roles, floor-level permissions and operational QA.
- [ ] Independently verify PR merge, deployed artefact, auth-boundary behaviour and store distribution. GitHub CI is not proof of production map enablement or App Store/Play Store release.

**No AWS access is required for the current source-only adoption.** Maps token provisioning, production deployment and native signing remain separate approvals.
