# NovaPharm search experience — Apple HIG implementation contract

Reviewed: 15 November 2026. Source references:
- https://developer.apple.com/design/human-interface-guidelines/searching
- https://developer.apple.com/design/human-interface-guidelines/search-fields
- https://developer.apple.com/documentation/corespotlight/adding-your-app-s-content-to-spotlight-indexes

## Web implementation rules

1. **Location and scope.** Use a primary search entry for catalogues and medicine investigations, and local inline search for single tables, lists and modules. State whether search covers an entire authorised workspace, the current module, or a public catalogue. Do not imply an all-portal search spans data the signed-in role cannot access.
2. **Control.** Provide a programmatic name, relevant placeholder, a visually predictable clear action, and an appropriate search icon where one improves recognition. Retain native `type="search"` and native mobile keyboard affordances. Preserve 44 px minimum touch targets, high-contrast focus states, reduced motion, and keyboard access. Avoid copying copyrighted Apple artwork.
3. **Results.** Filter local approved catalogues immediately; debounce remote governed lookups and constrain query length and result count. Rank exact identities and product codes before partial titles. Show result count, empty/error states, and scope of data. Keep existing authoritative pagination and never invent medicine/stock/evidence rows.
4. **Filters.** Default to the widest permitted dataset, then offer explicit portfolio/category or authorised dataset filters. Never confuse changing a visual filter with changing user authorisation. Result lists remain operable by keyboard as normal links/buttons.
5. **Privacy.** Do not persist personal or clinical search history in localStorage, sessionStorage, browser databases or public URLs. Never render recent private terms by default. Requests to protected search endpoints must remain server-session-authorised; do not create an unauthenticated all-portal index.
6. **Staleness.** Discard superseded asynchronous responses before they can replace a newer query or reintroduce a previously selected medicine's governed evidence. Clear stale details and deep-link identity before a different medicine's results are accepted.
7. **Indexing.** Public SEO pages may use normal web crawl controls, canonical URLs and sitemaps. Protected portal records, pricing, identifiers and health-related query histories must never be placed into public search or static site indexes.
8. **Native Spotlight boundary.** Core Spotlight (`CSSearchableItem`, `CSSearchableItemAttributeSet` and `CSSearchableIndex`) is an Apple platform API for *native app* on-device indexes, not a JavaScript web API. If an iOS/macOS NovaPharm app is built, obtain role and data-owner approval, use appropriately protected named indexes, index only content available to the current signed-in user, update/delete entries on change, and purge indexes on account switch or sign-out. No Core Spotlight integration is claimed for the current web apps.

## Implementation in this change

- Shared `@novapharm/design-system` `SearchField`: explicit scope, labelled clear control, search icon, result count announcement, busy semantics and focus/contrast treatment.
- Protected `MedicinesIntelligence`: 400 ms progressive identity search after 2 characters, stale-request fencing, clear action, labelled results and existing authenticated paginated endpoint.
- Public marketplace generator/UI: contextual scope, relevance ranking, clear action, original client-side filtering, no personal search-history persistence.

## Follow-up acceptance — do not mark complete without proof

- Run design-system and portal tests, source regression and full public site build.
- Confirm generated marketplace HTML includes the new field after the publish build.
- Run Chromium and WebKit keyboard/touch/VoiceOver or equivalent accessibility acceptance at 320–1440 px; check Escape, Enter, Tab, clear, filtering and contrast.
- Validate real authenticated medicine search, rapid changes in query, pagination, role boundaries and sign-out on the production backend.
- Inventory remaining local search surfaces in WMS, customer orders, supplier/product documents, AI research, founder and technology content. Apply the shared contract only when data source and role scope are explicitly established.
- Verify live deployments for each independent hostname/app. A merged PR or passing static test is not sufficient evidence that all applications are live.
