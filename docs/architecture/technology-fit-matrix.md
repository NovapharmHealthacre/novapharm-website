# Technology Fit Matrix

Status: architecture decision complete for the post-PR53 candidate
Decision date: 11 August 2026

## Decision rule

Technology is admitted only when it improves a verified NovaPharm capability at the correct boundary. A named technology is not a requirement to add empty files, parallel systems of record, unmeasured native code or an unsupported production surface. Where mandate language conflicts, truth, security, accessibility, performance and maintainability take priority, followed by the later technology-specific instructions that explicitly require a fit assessment.

Status vocabulary:

- `CURRENTLY_USED`: present in the tracked implementation.
- `RETAIN`: present and justified for the release.
- `ADD_LATER`: credible future boundary, blocked on a real product requirement or platform programme.
- `NATIVE_ONLY`: appropriate only inside an approved Apple-native client.
- `OPTIONAL`: evaluate when a defined workload exists.
- `NOT_JUSTIFIED`: no measured capability warrants its cost or risk now.
- `NOT_APPLICABLE`: does not belong in the current application architecture.

## Web and runtime

| Technology | Decision | Current role and evidence | Security and maintenance boundary |
|---|---|---|---|
| HTML5 | `CURRENTLY_USED` / `RETAIN` | Server-rendered semantic documents, landmarks, forms, tables, articles, metadata and progressive public output. | Native semantics remain the default; ARIA is added only where HTML cannot express the interaction. |
| CSS / CSS3 | `CURRENTLY_USED` / `RETAIN` | Shared tokens, Grid/Flexbox, responsive composition, safe-area handling, bounded motion and reduced-motion variants. | No layout-critical animation loop or generic UI theme is introduced. |
| JavaScript | `CURRENTLY_USED` / `RETAIN` | Static-generator tooling and narrow progressive browser behaviours. | Public informational content does not depend on client JavaScript for first meaning. |
| TypeScript | `CURRENTLY_USED` / `RETAIN` | All six applications and shared domain contracts. | Server validation and authorisation remain authoritative; types do not replace runtime checks. |
| React | `CURRENTLY_USED` / `RETAIN` | Next.js component architecture for Corporate, Founder, Technology, Portal and Status. | React is not wrapped around generated static paragraphs merely for uniformity. Client boundaries stay narrow. |
| Next.js | `CURRENTLY_USED` / `RETAIN` | App Router, static/server rendering, metadata and standalone managed-runtime candidates. | Current patched 16.2.12 line is retained; no speculative framework migration is mixed into visual work. |
| Node.js | `CURRENTLY_USED` / `RETAIN` | Supported 24.x build/runtime, API, generators, asset tooling and validation. | Lockfile, engine policy, shutdown, limits, secrets and server authority remain governed. |
| SVG | `CURRENTLY_USED` / `RETAIN` | Canonical logo, icons and truthful vector information graphics. | SVG is sanitised, script-free and does not recreate Apple assets. |
| XML | `CURRENTLY_USED` / `RETAIN` | Sitemaps, RSS and structured interchange outputs. | Generated XML is schema/syntax validated and cannot expose protected routes. |
| WebKit compatibility | `CURRENTLY_USED` / `RETAIN` | Playwright WebKit is a first-class browser acceptance target alongside Chromium. | Real Safari hardware remains external verification; Playwright WebKit is not mislabelled as that evidence. |
| WebAssembly | `NOT_JUSTIFIED` | No current route exposes a computational hot path for which Wasm beats the existing JavaScript/Node implementation after transfer, startup and fallback costs. | Adoption requires a documented baseline, repeatable benchmark, accessible fallback, fuzzing/security review and maintenance owner. No benchmark means no Wasm. |

## Apple-native platform

| Technology | Decision | Legitimate future boundary | Why it is not added now |
|---|---|---|---|
| Swift | `ADD_LATER` / `NATIVE_ONLY` | A separately approved iOS/iPadOS/macOS Secure Portal client using the same authoritative API. | There is no tracked native target, product brief, Apple team, signing identity, entitlement plan or managed staging authority. |
| SwiftUI | `ADD_LATER` / `NATIVE_ONLY` | Primary adaptive UI for an approved native client. | The browser Portal must not be duplicated just to satisfy a technology list. |
| Foundation | `ADD_LATER` / `NATIVE_ONLY` | Networking, Codable contracts, dates, files, localisation and structured concurrency for the native client. | It follows an approved Swift target; it is not a web dependency. |
| UIKit | `OPTIONAL` / `NATIVE_ONLY` | Narrow document capture or controller integration when SwiftUI is materially insufficient. | No validated capture workflow currently requires it. |
| AppKit | `OPTIONAL` / `NATIVE_ONLY` | Narrow macOS window, menu or document bridge. | No approved macOS-specific workflow currently requires it. |
| RealityKit | `NOT_JUSTIFIED` | Optional scientific spatial visualisation only after a validated training or education use case. | No product requirement or governed 3D scientific dataset exists. |
| ARKit | `NOT_JUSTIFIED` | Optional device tracking for an approved RealityKit experience. | Core pharmaceutical/Portal work must not depend on novelty AR. |
| Core ML | `NOT_JUSTIFIED` | Low-risk, non-diagnostic document/image quality classification with model governance. | No approved model, provenance, accuracy evidence, privacy assessment or operational owner exists. |
| MapKit | `NOT_JUSTIFIED` | Verified office or service geography in a native client. | A map would currently risk implying unsupported facilities or coverage. |
| CloudKit | `NOT_JUSTIFIED` | At most non-sensitive device preferences isolated from Azure authority. | Azure/API must remain the single business-data authority; no second system of record is permitted. |
| WidgetKit | `NOT_JUSTIFIED` | Sanitised, non-confidential service state after native security review. | There is no native app or safe approved widget dataset. |
| StoreKit | `NOT_APPLICABLE` | Compile boundary only if a genuine Apple-platform commercial product is approved. | NovaPharm has no authorised consumer in-app purchase or subscription requirement. |
| Objective-C | `NOT_JUSTIFIED` | Minimal interop only for an actual legacy library. | No legacy native library or runtime boundary exists. |

## Low-level, graphics and engineering tooling

| Technology | Decision | Admission test |
|---|---|---|
| C | `NOT_JUSTIFIED` | Add only for a measured portable kernel or unavoidable native library, with a narrow ABI, sanitizers, bounds tests and fuzzing. |
| C++ | `NOT_JUSTIFIED` | Add only for a measured shared native/Wasm computation, with RAII, lifetime and undefined-behaviour review. |
| Metal | `NOT_JUSTIFIED` | Add only for a validated graphics/compute workload after CPU/GPU/energy benchmarks and fallback design. |
| Metal Shading Language (MSL) | `NOT_JUSTIFIED` | Follows an approved Metal workload; never used for ordinary interface animation. |
| Python | `OPTIONAL` | Current image and evidence tooling is reproducible in Node/Sharp. Add Python only when a concrete scientific/image-analysis workflow materially improves on it and includes tests and ownership. |
| Perl | `NOT_JUSTIFIED` | No legacy report/build workflow requires Perl; adding a token script would reduce maintainability. |
| Ruby | `NOT_JUSTIFIED` | No CocoaPods/Fastlane/native release boundary or existing Ruby tool requires it. |
| LLVM | `NATIVE_ONLY` | Use as the Swift/C/C++ compiler toolchain and for optimisation diagnostics after a native or low-level target is approved. |
| LLVM IR | `NOT_APPLICABLE` as application source | Generate temporarily for compiler/optimisation analysis only. Do not hand-author product logic or commit bulky generated IR. |

## Native admission gate

A native programme can move from `ADD_LATER` only after all of the following exist: approved user journeys; API/OIDC contracts; no client-side business authority; Apple Developer team and signing plan; entitlement/privacy review; Keychain and token policy; device/browser coexistence plan; accessibility and localisation criteria; macOS CI budget; threat model; support owner; staging environment; and release/rollback acceptance. Until then, web and managed-runtime work remains the production priority.
