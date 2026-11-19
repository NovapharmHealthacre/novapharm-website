# NovaPharm Apple search estate — scope and acceptance
Reviewed 15 November 2026. Follow-up to PR #724 and issue #727.

## Official guidance
- https://developer.apple.com/design/human-interface-guidelines/searching
- https://developer.apple.com/design/human-interface-guidelines/search-fields
- https://developer.apple.com/documentation/corespotlight/adding-your-app-s-content-to-spotlight-indexes

Apple recommends clear prominence, scope, relevant results, continuous filtering where feasible, clear actions, selective suggestions, privacy controls, and careful search placement. A website must adapt these practices to HTML, WAI-ARIA, browser and network constraints rather than claim native SwiftUI/Spotlight APIs.

## Cross-estate search surface register

| Surface | Search type | Access / source | Interaction | Verified authority |
|---|---|---|---|---|
| Public Nutraxin + ESCO marketplace | Public catalogue | Public controlled product JSON | Immediate filtering, search scope, clear, relevance-ranked names/SKUs | PR #724; no checkout or warehouse-availability bypass |
| Medicines Intelligence Terminal | Authenticated current-identity lookup | Governed medicine search gateway | Debounced live lookup, pagination, stale-response fencing, clear and Escape | PR #724; source observations remain evidence-limited |
| Generic customer/employee/admin portal header | Authenticated cross-module | `enterprise/search` protected gateway | Debounced bounded query, accessible result announcements, area scope, clear and Escape | This change; server must enforce individual record permissions |
| WMS recorded exception worklist | Local authorised sample | Current employee snapshot | Immediate local filter, priority scope, accessible clear and result count | This change; recorded review only, not live partner stock |
| US FDA drug-label discovery | Public-source research in authenticated UI | Existing FDA gateway, read-only | Explicit Search (avoid repeated external requests), clear, query generation fence | This change; not marketing authorisation |
| ClinicalTrials.gov discovery | Public-source research in authenticated UI | Existing clinical registry gateway | Explicit Search, clear, query generation fence | This change; not evidence of efficacy |
| UK official tender discovery | Public-source research in authenticated UI | Bounded existing UK notices API | Explicit Search, clear, query generation fence | This change; no eligibility conclusion |
| ESCO standalone catalogue | Public catalogue | Existing static ESCO list | Immediate filtering and combined category + availability controls, reset filters | Existing; follow separate browser acceptance |
| Corporate / Founder / Technology / Status | Editorial or status pages | Public approved site content | Contextual navigation and public web indexing; avoid fake global search | No fabricated search index introduced |
| Other future private pages / customer orders | Role-specific sources not yet verified | Governed future modules | Do not imply universal search before record-access and index rights are proven | Remains blocked by production evidence |

## Acceptance conditions
1. Source test and TypeScript validation of all affected modules.
2. Chromium and WebKit responsive acceptance (including smallest supported viewport).
3. Search result announcements, Enter, Escape, clear, focus visibility, forced colors, reduced motion, and no horizontal overflow.
4. Authorised role-boundary and pagination checks; no private records in SEO, public bundles, query logs or retained client search history.
5. No stale source records, analytics or historical medicine identity when query changes during a network request.
6. Confirm production publication separately for public GitHub Pages and protected portal images/backends. Merged source does not equal deployed authenticated code.
7. Never claim native Spotlight is deployed on the web. Native app indexing requires separate platform code, named protected indexes and account-level deletion on sign-out.

## Explicit product constraint
Scope labels describe the data set the server permits; they never authorise access. Do not surface cross-role suggestions, sensitive notes or implicit search history. Results and labels must not imply available stock, verified medicine suitability, live market share or clinical approval.
