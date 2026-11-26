# Apple HIG — proposed all-platform not-applicable dispositions

**Prepared:** 20 November 2026  
**Scope:** NovaPharm corporate web, Secure Portal, Intelligence, intended native iOS and Android.  
**Source:** [`apple-hig-172-topic-acceptance-register.json`](./apple-hig-172-topic-acceptance-register.json).  
**Status:** **28 candidates for independent disposition; 0 accepted N/A; 0/172 fully production verified.** This is a reviewer packet, **not an approval, HIG conformance certificate, production signoff, or change to the canonical register.**

## Approval boundary

- Review the official Apple HIG link and its latest applicable scope per topic, including whether web/iOS/Android adaptations genuinely exist.
- Review the three source-specific rationales below. A platform cannot be excluded solely because its build is incomplete; an intended feature remains applicable until explicitly descoped.
- If all platforms are truly out of scope, an **independent reviewer other than the PR author** should approve the exact PR head through a GitHub review event, then a separately authorized registry update should record the `notApplicableApproval` receipt with reviewed source SHA. Do not fabricate approvals from issue comments, a CI pass, or this packet.
- If a rationale is inadequate, keep the topic `not_verified`, revise platform scope and arrange actual platform evidence. Do not convert `not_verified` to `verified` merely to increase completion percentage.
- Current `CODEOWNERS` designates `@NovapharmHealthacre`, which also authored recent candidate PRs. Independent review therefore needs a distinct authorized GitHub reviewer; this packet cannot supply one.

## Candidate checklist

| Source row | HIG topic and official link | Section | Priority | Independent decision |
|---:|---|---|---|---|
| 6 | [Designing for tvOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos) | Getting started | Later | Pending |
| 7 | [Designing for visionOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos) | Getting started | Later | Pending |
| 8 | [Designing for watchOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos) | Getting started | Later | Pending |
| 9 | [Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) | Getting started | Later | Pending |
| 19 | [Immersive experiences](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences) | Foundations | Later | Pending |
| 27 | [Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout) | Foundations | Later | Pending |
| 39 | [Live-viewing apps](https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps) | Patterns | Later | Pending |
| 55 | [Workouts](https://developer.apple.com/design/human-interface-guidelines/workouts) | Patterns | Later | Pending |
| 69 | [Lockups](https://developer.apple.com/design/human-interface-guidelines/lockups) | Components | Medium | Pending |
| 77 | [Dock menus](https://developer.apple.com/design/human-interface-guidelines/dock-menus) | Components | Later | Pending |
| 81 | [Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments) | Components | Later | Pending |
| 104 | [Digit entry views](https://developer.apple.com/design/human-interface-guidelines/digit-entry-views) | Components | High | Pending |
| 114 | [Activity rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings) | Components | Later | Pending |
| 120 | [Complications](https://developer.apple.com/design/human-interface-guidelines/complications) | Components | Later | Pending |
| 126 | [Top Shelf](https://developer.apple.com/design/human-interface-guidelines/top-shelf) | Components | Later | Pending |
| 127 | [Watch faces](https://developer.apple.com/design/human-interface-guidelines/watch-faces) | Components | Later | Pending |
| 132 | [Camera Control](https://developer.apple.com/design/human-interface-guidelines/camera-control) | Inputs | Later | Pending |
| 133 | [Digital Crown](https://developer.apple.com/design/human-interface-guidelines/digital-crown) | Inputs | Later | Pending |
| 134 | [Eyes](https://developer.apple.com/design/human-interface-guidelines/eyes) | Inputs | Later | Pending |
| 136 | [Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) | Inputs | Later | Pending |
| 138 | [Gyroscope and accelerometer](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer) | Inputs | Later | Pending |
| 142 | [Remotes](https://developer.apple.com/design/human-interface-guidelines/remotes) | Inputs | Later | Pending |
| 151 | [CarPlay](https://developer.apple.com/design/human-interface-guidelines/carplay) | Technologies | Later | Pending |
| 152 | [Game Center](https://developer.apple.com/design/human-interface-guidelines/game-center) | Technologies | Later | Pending |
| 155 | [HomeKit](https://developer.apple.com/design/human-interface-guidelines/homekit) | Technologies | Later | Pending |
| 158 | [iMessage apps and stickers](https://developer.apple.com/design/human-interface-guidelines/imessage-apps-and-stickers) | Technologies | Later | Pending |
| 160 | [Mac Catalyst](https://developer.apple.com/design/human-interface-guidelines/mac-catalyst) | Technologies | Medium | Pending |
| 167 | [ShazamKit](https://developer.apple.com/design/human-interface-guidelines/shazamkit) | Technologies | Later | Pending |

## Source-specific disposition rationales

### 1. Designing for tvOS — row 6

Official HIG: https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos

- **Web:** The web estate is not a native television application; responsive desktop layouts do not count as an Apple TV remote-focus experience.
- **Native iOS:** NovaPharm has no authorized tvOS target, remote-first focus system, TV interface or signed television app; iPhone design is a separate article.
- **Android:** Apple tvOS layout and its TV remote system do not run on Android; an Android TV design would require an independent scoped product.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 2. Designing for visionOS — row 7

Official HIG: https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos

- **Web:** There is no NovaPharm spatial browser app or approved immersive service; ordinary web visual hierarchy is governed by other HIG sources.
- **Native iOS:** Vision Pro spatial interfaces are not an installed iPhone/iPad app API, and no visionOS signed application is within NovaPharm scope.
- **Android:** Apple visionOS eye and hand systems are not Android UI frameworks; a future XR product would be a separate implementation.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 3. Designing for watchOS — row 8

Official HIG: https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos

- **Web:** The public website is not a watchOS app; responsive mobile browser work cannot claim watch faces, complications or Digital Crown actions.
- **Native iOS:** NovaPharm has no Apple Watch app, signed watch target or approved wrist health integration; the iOS phone product is separate.
- **Android:** watchOS-specific system widgets and crown gestures do not exist natively on Android; Wear OS would require separate release scope.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 4. Designing for games — row 9

Official HIG: https://developer.apple.com/design/human-interface-guidelines/designing-for-games

- **Web:** NovaPharm is a regulated pharmaceutical and business intelligence site, not a game; basic accessibility requirements are already tracked independently.
- **Native iOS:** The iOS candidate is a research/business tool and does not include game loops, player progression or game-center experiences.
- **Android:** The Android application is not a game, so Apple game design patterns are not a new implementation requirement or shipped feature.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 5. Immersive experiences — row 19

Official HIG: https://developer.apple.com/design/human-interface-guidelines/immersive-experiences

- **Web:** NovaPharm web pages are conventional 2D routes, not visionOS Shared Space or Full Space content and must not claim immersive deployment.
- **Native iOS:** No approved iOS or Vision Pro immersive application or spatial data experience exists in this release scope.
- **Android:** Apple ImmersiveSpace features are not Android APIs; any independent XR build needs a new product, safety and device review.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 6. Spatial layout — row 27

Official HIG: https://developer.apple.com/design/human-interface-guidelines/spatial-layout

- **Web:** There is no spatial computing route in the NovaPharm browser estate; responsive 2D alignment is covered by Layout separately.
- **Native iOS:** A standard iPhone or iPad app has no Vision Pro spatial layout implementation under the current source or signing plan.
- **Android:** Android mobile screens do not expose Apple's visionOS spatial compositor; XR layout must be separately scoped and tested.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 7. Live-viewing apps — row 39

Official HIG: https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps

- **Web:** NovaPharm does not offer a live broadcast or synchronized streaming product; publication of static informational media is a different pattern.
- **Native iOS:** The current iOS candidate contains no live television or event streaming player requiring Apple's live-viewing app behavior.
- **Android:** No Android live-streaming service is in the product scope; video accessibility is tracked under Playing video, not live broadcast.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 8. Workouts — row 55

Official HIG: https://developer.apple.com/design/human-interface-guidelines/workouts

- **Web:** The website is a pharmaceutical business platform, not a fitness workout recorder; the presence of health information does not create a workout app.
- **Native iOS:** The proposed iOS product has no authorized workout session tracker or HealthKit exercise integration in its accepted release scope.
- **Android:** Android fitness-session data and wearables are not authorized NovaPharm features and cannot be assumed from Apple's workout guidance.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 9. Lockups — row 69

Official HIG: https://developer.apple.com/design/human-interface-guidelines/lockups

- **Web:** TVUIKit lockups and Apple TV focus behaviours do not run in a NovaPharm browser; ordinary web cards must instead follow web layout and keyboard guidelines.
- **Native iOS:** TVUIKit TVLockupView is an Apple TV control, not native iPhone/iPad application UI; no tvOS NovaPharm app is in scope.
- **Android:** Apple TVUIKit lockups are not an Android app widget; Android cards and TV controls are separate platform-specific designs.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 10. Dock menus — row 77

Official HIG: https://developer.apple.com/design/human-interface-guidelines/dock-menus

- **Web:** A browser page cannot control the macOS Dock icon menu; PWA shortcuts or desktop site menus must be evaluated as different features.
- **Native iOS:** macOS Dock menus are not native iOS or iPadOS UI, and the NovaPharm iPhone candidate has no macOS app bundle.
- **Android:** An Apple macOS Dock menu is not Android system chrome, and an Android launcher shortcut is a distinct native feature.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 11. Ornaments — row 81

Official HIG: https://developer.apple.com/design/human-interface-guidelines/ornaments

- **Web:** NovaPharm web content has no visionOS spatial window ornament layer; visual toolbars and browser overlays follow separate guidelines.
- **Native iOS:** The iOS phone/tablet client cannot claim a visionOS spatial ornament and no signed headset app is within approved scope.
- **Android:** Ornaments are a visionOS window API, not Android-native chrome; similar overlays would require independent platform review.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 12. Digit entry views — row 104

Official HIG: https://developer.apple.com/design/human-interface-guidelines/digit-entry-views

- **Web:** No tvOS product and no TVUIKit integration are in NovaPharm's web scope. Secure browser OTP/MFA fields are a different control and are covered by Text fields and account/security guidance.
- **Native iOS:** Apple explicitly does not support the TVDigitEntryViewController digit-entry view on iOS/iPadOS. The iPhone's actual secure OTP UI must be designed independently and never inferred from tvOS review.
- **Android:** Android does not use Apple's tvOS-only full-screen digit-entry view; Android secure PIN/OTP input is a distinct authenticated design and remains unverified.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 13. Activity rings — row 114

Official HIG: https://developer.apple.com/design/human-interface-guidelines/activity-rings

- **Web:** The pharmaceutical website has no Fitness activity goal rings or health dashboard rights; general KPI progress charts are separate.
- **Native iOS:** The NovaPharm iOS candidate is not Apple Fitness and has no user-authorized activity rings or HealthKit workout measures.
- **Android:** Activity rings in Apple's Fitness/wrist ecosystem are not an Android system API and no health activity tracker is authorized.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 14. Complications — row 120

Official HIG: https://developer.apple.com/design/human-interface-guidelines/complications

- **Web:** A website cannot install a watch-face complication, and a responsive KPI card is not a watchOS WidgetKit integration.
- **Native iOS:** No NovaPharm watchOS app, signed complication extension or customer permission scope has been approved on the iOS product.
- **Android:** Apple Watch complications do not exist in Android; Wear OS complications would require a separately scoped app and permissions.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 15. Top Shelf — row 126

Official HIG: https://developer.apple.com/design/human-interface-guidelines/top-shelf

- **Web:** The corporate website cannot publish Apple's tvOS Top Shelf provider or claim Apple TV home-screen placement.
- **Native iOS:** NovaPharm has no tvOS media app or Top Shelf extension; iOS Home Screen widgets and quick actions are separate features.
- **Android:** Apple TV's Top Shelf is not an Android system experience and does not apply to the NovaPharm Android candidate.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 16. Watch faces — row 127

Official HIG: https://developer.apple.com/design/human-interface-guidelines/watch-faces

- **Web:** Public web pages do not install watch faces; clocks or dashboard widgets would be independent browser controls.
- **Native iOS:** There is no approved watchOS companion, watch-face data source or complication release in NovaPharm's native iOS scope.
- **Android:** watchOS face behavior is not available through Android APIs; a Wear OS watch face would be a separate signed product.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 17. Camera Control — row 132

Official HIG: https://developer.apple.com/design/human-interface-guidelines/camera-control

- **Web:** A browser NovaPharm page does not own Apple's hardware Camera Control; existing image upload is a different, permission-bound workflow.
- **Native iOS:** The current NovaPharm iOS research app is not a camera/capture app and has no eligible Camera Control integration or permission.
- **Android:** The Apple iPhone camera hardware Control is not an Android SDK capability; Android camera-button APIs are separate.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 18. Digital Crown — row 133

Official HIG: https://developer.apple.com/design/human-interface-guidelines/digital-crown

- **Web:** A website has no Apple Digital Crown hardware event or watch-native UI; ordinary mouse scroll and keyboard navigation are separate behaviors.
- **Native iOS:** The shipped-target iPhone/iPadOS candidate does not have an Apple Watch/visionOS Digital Crown; no watch app is authorized.
- **Android:** Apple's Digital Crown is not an Android phone input, and Wear OS crown input would need independent scope and tests.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 19. Eyes — row 134

Official HIG: https://developer.apple.com/design/human-interface-guidelines/eyes

- **Web:** A 2D website cannot claim visionOS eye-tracking target or private gaze data; web keyboard/focus acceptance is a distinct requirement.
- **Native iOS:** No signed Apple visionOS application or gaze-targeted NovaPharm interaction is approved; iOS VoiceOver focus is different.
- **Android:** Apple's visionOS gaze integration is not a native Android API and no XR application is in current scope.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 20. Game controls — row 136

Official HIG: https://developer.apple.com/design/human-interface-guidelines/game-controls

- **Web:** The NovaPharm business website is not a game and has no controller-dependent tasks; keyboard accessibility is governed by other HIG sources.
- **Native iOS:** The iOS research/business application has no game controller support or gameplay mechanics requiring this Apple games guideline.
- **Android:** Android game controllers are not required by a non-game NovaPharm Android app and do not imply Apple GameController support.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 21. Gyroscope and accelerometer — row 138

Official HIG: https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer

- **Web:** There is no authorized web motion-sensor data collection; responsive layout and orientation are distinct from DeviceMotion telemetry.
- **Native iOS:** The current NovaPharm iOS source candidate is not a signed production app and has no approved Core Motion ingestion or motion-driven task; any future sensor collection requires an explicit use case, consent, privacy review and device-level verification.
- **Android:** No Android sensor data collection or movement-driven app feature is authorized, so gyroscope and accelerometer access is out of current product scope.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 22. Remotes — row 142

Official HIG: https://developer.apple.com/design/human-interface-guidelines/remotes

- **Web:** The website has no Apple TV focus/remote navigation runtime; browser keyboard, pointer and touch support are separate accessibility obligations.
- **Native iOS:** NovaPharm has no tvOS application or connected Siri Remote interface, so this native remote-control guideline is out of iOS/iPadOS scope.
- **Android:** A tvOS Siri Remote cannot be treated as an Android phone app input; Android TV remote design is a different product.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 23. CarPlay — row 151

Official HIG: https://developer.apple.com/design/human-interface-guidelines/carplay

- **Web:** NovaPharm's web estate is not a vehicle interface and has no authorization for an in-car dashboard or driving interaction.
- **Native iOS:** The iOS research app is not an approved CarPlay category app; no in-car entitlement, vehicle testing or distraction-safe workflow exists.
- **Android:** CarPlay is an Apple vehicle system not an Android phone capability, while Android Auto requires separately authorized product scope.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 24. Game Center — row 152

Official HIG: https://developer.apple.com/design/human-interface-guidelines/game-center

- **Web:** Business intelligence, medicines research and pharmacy procurement are not Game Center games; public web accounts are separate.
- **Native iOS:** The native iOS candidate has no GameKit entitlement, leaderboard or gaming product and cannot grant user account rights from gaming identity.
- **Android:** Game Center/GameKit does not run as a native Android gaming service, and NovaPharm has no Android gaming release.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 25. HomeKit — row 155

Official HIG: https://developer.apple.com/design/human-interface-guidelines/homekit

- **Web:** The NovaPharm site has no consumer smart-home or accessory pairing functionality; logistics status is unrelated to HomeKit.
- **Native iOS:** The iOS app has no HomeKit entitlement, approved smart-home device or homeowner consent path in its actual product scope.
- **Android:** Apple HomeKit frameworks are not Android APIs and no connected home automation feature is authorized for Android.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 26. iMessage apps and stickers — row 158

Official HIG: https://developer.apple.com/design/human-interface-guidelines/imessage-apps-and-stickers

- **Web:** A public NovaPharm web page and secure message centre are not Apple Messages sticker packs or Messages conversation extensions.
- **Native iOS:** No iMessage extension, stickers product, app-group entitlement or signed Messages release is in the current iPhone/iPad application scope.
- **Android:** Apple Messages app extensions and iMessage sticker UI are not native Android modules; any Android sharing is a different API.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 27. Mac Catalyst — row 160

Official HIG: https://developer.apple.com/design/human-interface-guidelines/mac-catalyst

- **Web:** The public and protected websites are web deployments, not a Mac Catalyst Mac app; browser window responsiveness is separately reviewed.
- **Native iOS:** No NovaPharm Mac Catalyst target, native macOS distribution or approved Mac-app product scope exists; an iPad candidate alone does not constitute a Mac Catalyst release.
- **Android:** Mac Catalyst is an Apple development technology, not an Android platform feature.
- **Review result:** Pending independent approval or an amended platform applicability decision.

### 28. ShazamKit — row 167

Official HIG: https://developer.apple.com/design/human-interface-guidelines/shazamkit

- **Web:** NovaPharm public pages have no music or audio-fingerprint identification workflow and must not request microphone access for it.
- **Native iOS:** The iOS candidate has no justified ShazamKit audio matching, microphone permission or music-library transfer feature in its product scope.
- **Android:** Native Apple ShazamKit is not an Android API; NovaPharm has no Android audio recognition product or data permissions.
- **Review result:** Pending independent approval or an amended platform applicability decision.

## Evidence required before a canonical state change

Record an authentic, independently authored `APPROVED` GitHub pull-request review URL with matching exact head SHA, a reviewer/owner decision, and source-specific rationale. The existing `scripts/test-hig-independent-review-authenticity.mjs` checks that acceptance receipts refer to real review events and rejects self-authored or stale-head approvals. This document creates no such review event.

**Unrelated gates remain:** 345 applicable platform decisions across the other topics require web/browser, native, protected-workspace, device-assistive-technology and deployed-source evidence, approved production release receipts, and owner security/rights signoff before any production verification count is increased.
