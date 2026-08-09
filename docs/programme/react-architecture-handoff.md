# React Architecture Handoff

Status: repository candidate accepted; managed staging and production evidence pending

Reviewed: 9 August 2026

## Current platform decision

The unified estate already uses TypeScript, React and the Next.js App Router. This continuation does not perform another framework migration. It keeps semantic, server-rendered HTML as the first visual state and limits browser components to interactions that need state, browser APIs or event handling.

| Public property | Classification | Current architecture | Client boundary | Deliberate non-change |
|---|---|---|---|---|
| NovaPharm Healthcare | E - React framework | Next.js App Router, server-rendered and statically generated routes, standalone Node output | Cookie controls, mobile navigation and contact workflow | Editorial content stays in Server Components; no SPA conversion or animation framework |
| Novapharm Innovation Technology | E - React framework | Next.js App Router, server-rendered routes, standalone Node output | Mobile navigation, capability explorer, project brief, reveal behaviour and the bounded network canvas | Static propositions remain server-rendered; no additional data-visualisation dependency |
| Vishal Chakravarty founder platform | E - React framework | Next.js App Router, server-rendered editorial routes, standalone Node output | Site chrome and the evidence dialogue | Long-form content remains server-rendered; no client-only publication shell or page-transition library |

Portal is also a Next.js application because authenticated dashboards, forms, tables, navigation and session state justify a stateful product UI. API responsibilities remain in the separate Node service; browser code never becomes the authority for identity, roles, customer isolation or secrets.

## Versions and server-feature boundary

- React: `19.2.8`.
- React DOM: `19.2.8`.
- Next.js: `16.2.12`, retained on the security-patched 16.2 Active LTS line.
- Bundler: Next.js Turbopack through the existing Next 16 build.
- React Server Components: used through the App Router default.
- Custom Server Functions or Server Actions: none; the repository contains no `use server` directive.
- React Compiler: not enabled. The measured application does not justify adding compiler complexity to this release.
- Create React App: not used.

React `19.2.8` is the current stable registry release at review time. The official React advisory identifies `19.2.4` as the patched 19.2 RSC floor, so the installed release is beyond that floor. The official Next.js July 2026 security release identifies `16.2.11` as the Active LTS security floor; the candidate uses `16.2.12`. The production and full dependency audits report zero known vulnerabilities after pinning transitive `nanoid` to `3.3.18`.

Next.js `16.3.0` became the latest stable registry release during this review. It is not introduced into the release candidate because this programme already has exact-head build, browser and security evidence on the patched 16.2 Active LTS line. A minor-framework migration immediately before owner review would add change risk without solving a known product defect. It should be assessed in a separate dependency change with its own build, browser, performance and security evidence.

## Hydration and progressive enhancement correction

NIT and Founder keep a complete scriptless navigation through the `no-js` document state. The previous `next/script` wrapper did not execute the JavaScript-state change during HTML parsing under a constrained mobile start. Hydration then collapsed the scriptless navigation and moved the first viewport.

Both root layouts now emit the same minimal, nonce-bearing state switch as a parser-executed inline script in `head`. It changes only `no-js` to `js`; it contains no data, secret, network operation or business logic. Browser acceptance fails unless this script is present before `body` with a CSP nonce.

A controlled 390-pixel Chromium trace with 150 ms network latency and 4x CPU slowdown measured:

| Property | Before | After |
|---|---:|---:|
| NIT homepage CLS | 0.3391 | 0 |
| Founder homepage CLS | 0.2042 | 0 |

These are local diagnostic traces, not production field Core Web Vitals. Standard production-standalone Lighthouse also records CLS `0` for all measured public, portal and status profiles.

## Performance and dependency judgement

No React package, animation library or UI kit was added in this continuation. The change removes a `next/script` component import from two root layouts and replaces it with a fixed inline state switch. It therefore does not create a new route bundle or hydration boundary. Existing client components remain narrow and route-specific; no custom Server Function payload or downloadable privileged logic is introduced.

The current production-standalone measurements are recorded in `docs/programme/final-performance-acceptance.md`. Public desktop performance is 100; public mobile performance is 97; accessibility, Best Practices and SEO are 100 for all six public profiles. Mobile LCP remains 2.6 to 2.7 seconds in local lab runs and is explicitly pending managed-staging and field validation rather than reported as a pass against the 2.5-second target.

## Official sources reviewed

- [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2)
- [React Server Components security update](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components)
- [Next.js July 2026 security release](https://nextjs.org/blog/july-2026-security-release)
- [Next.js App Router server and client components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Apple design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [WebKit scroll-driven animation guidance](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/)

## Remaining release boundary

Production acceptance still requires the exact pushed SHA, green GitHub checks, managed staging, real Safari review on representative hardware, edge/runtime measurements, independent security testing, live identity and integration evidence, production smoke tests and field Core Web Vitals. No repository result substitutes for those gates.
