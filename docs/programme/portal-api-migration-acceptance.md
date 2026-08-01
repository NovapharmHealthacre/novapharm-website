# Portal and API Migration Acceptance

Status: repository candidate accepted; managed identity, Azure data services and production deployment pending

Candidate branch: `codex/unified-digital-estate-foundation`

Acceptance date: 1 August 2026

Source baseline: `NovapharmHealthacre/novapharm-website` at `05a517f1ab7058c96d9b95b17612c5168730338d`

## Outcome

The secure portal and API have been separated from the public corporate application. `apps/portal` is a TypeScript, React and Next.js application on a dedicated private-origin contract. `apps/api` starts the existing governed Node domain runtime in API-only mode. Public pages cannot be served by the API process, and the portal browser never receives a database credential, integration credential or trusted identity header.

This acceptance used a production standalone portal build, a real API process, an isolated SQLite database and generated synthetic users and records. No production customer data, supplier data, board document, email recipient, SharePoint content or credential was used. Nothing was deployed and no production DNS, GitHub Pages, Entra, Azure or SharePoint setting changed.

## Implemented trust boundaries

- `NOVAPHARM_SERVER_MODE=api-only` restricts the API service to `/api/**`, emits non-indexing headers and returns a JSON 404 for public-page or asset requests.
- `PORTAL_ORIGIN`, `PUBLIC_API_ORIGIN` and public origins are separate exact-origin contracts. Credentialed CORS is granted only to configured trusted origins.
- `apps/portal/app/gateway/[...path]/route.ts` is a same-origin backend-for-frontend gateway with a fixed API origin and explicit route allowlist.
- Cookies, CSRF headers and controlled `Set-Cookie` values are relayed server-side. API details and raw backend errors are not shown in browser messages.
- Microsoft EasyAuth identity headers are forwarded only when the portal is running inside a verified App Service environment.
- Local HTTP validation is permitted only for loopback hosts when `PORTAL_VALIDATION_MODE=true`; production requires HTTPS.
- Portal routes are `noindex`, `noarchive`, non-cacheable and protected by server-side session and scope checks.
- The API-only service publishes a disallow-all `robots.txt`; crawler rules are supplementary and never substitute for authentication.

## Portal application

One typed catalogue in `packages/portal-contracts` defines all 54 governed modules:

| Area | Modules | Access boundary |
|---|---:|---|
| Customer | 18 | Active account linkage and customer scope |
| Employee | 13 | Employee scope |
| Board and Executive Platform | 18 | Board scope; read-only by default in the candidate |
| Administrator | 5 | Administrator scope |

The application includes:

- customer, employee, board and administrator sign-in choices;
- a Microsoft Entra entry path and a controlled local bootstrap path;
- forced password-replacement UI and server workflow;
- responsive role-specific navigation and workspace switching;
- authorised search;
- customer-isolated account, order, invoice, statement, document and support views;
- employee product, customer, supplier, purchasing, quality, regulatory and operational views;
- board Command Centre, CEO dashboard and Executive Platform views;
- administrator users, content, analytics and owner-review views;
- controlled support-ticket, return, complaint, workflow and product-lifecycle actions;
- explicit external-gate and planned states where the underlying service is not active.

Raw-table editing and frontend-only permission decisions are intentionally absent. Every data read and state transition remains an API authorisation decision.

## Reproducible validation environment

`scripts/run-portal-browser-acceptance.mjs` now performs the complete local acceptance lifecycle:

1. builds the production standalone portal;
2. creates an owner-only synthetic credential in the operating-system temporary directory;
3. prepares and seeds an isolated validation database;
4. starts the API and portal on loopback only;
5. executes Chromium and WebKit acceptance;
6. stops both processes; and
7. removes the temporary identity and database runtime even when a test fails.

The generated password is never printed, committed or included in an artifact. Screenshot and summary artifacts contain synthetic business records only and are excluded from Git.

## Actual automated results

| Gate | Result |
|---|---|
| Node runtime | Passed on Node `24.14.0` |
| API configuration and live-boundary tests | Passed: 4 of 4 |
| Portal route and security unit tests | Passed: 6 of 6 |
| Portal catalogue validation | Passed: 54 modules and four role areas |
| Official brand validation | Passed: portal SVG and PNG match repository masters |
| Portal production build | Passed |
| Standalone artifact scan | Passed: 1,223 files |
| Legacy backend integration suite | Passed after API-only extraction |
| Production-security suite | Passed |
| Preview-security suite | Passed |
| Chromium rendered matrix | Passed: 54 modules plus login, password-change and error states at seven viewports |
| WebKit rendered matrix | Passed: same route and viewport matrix |
| Screenshot evidence | 798 genuine screenshots |
| Automated accessibility | 228 Axe runs; zero serious or critical findings |
| Authentication interactions | Passed: unauthenticated rejection, invalid login, four role sessions and logout |
| Portal interactions | Passed: mobile navigation, authorised search, controlled write and password-mismatch handling |
| Temporary runtime cleanup | Passed: API, portal, database and synthetic credential removed |

## Performance evidence

Lighthouse ran against the production standalone portal and real synthetic API. SEO scoring is deliberately excluded because private portal routes must remain non-indexable.

| Surface | Form factor | Performance | Accessibility | Best practices | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|
| Sign-in | Desktop | 100 | 100 | 100 | 0.5 s | 0 | 0 ms |
| Customer dashboard | Desktop | 100 | 100 | 96 | 0.6 s | 0 | 0 ms |
| Sign-in | Mobile | 98 | 100 | 100 | 2.3 s | 0 | 0 ms |
| Customer dashboard | Mobile | 96 | 100 | 96 | 2.7 s | 0 | 0 ms |

These are local laboratory results, not production field data. The mobile dashboard LCP is 0.2 seconds above the 2.5-second target and remains a staging optimisation and real-user monitoring item.

## Manual visual review

Representative login, customer, employee, board, administrator and password-change captures were inspected at desktop, tablet and mobile sizes in Chromium and WebKit. The review corrected dense mobile tables so each record becomes a labelled, readable block below 620 pixels. It also shortened the mobile search prompt. The final evidence shows no material text clipping, hidden data columns, horizontal page overflow, broken brand asset, blank main region or raw technical browser error.

Evidence is stored locally in ignored `artifacts/portal-browser` and `artifacts/portal-lighthouse` directories. The committed report records results without committing synthetic sessions or generated screenshots.

## Remaining production gates

1. Deploy separate portal and API applications to an owner-approved Azure staging environment.
2. Configure Entra workforce and External ID registrations, redirect URIs, app roles, groups and MFA policy.
3. Replace validation SQLite with Azure SQL and complete schema migration, record reconciliation and isolated restore.
4. Activate private Blob quarantine and an approved malware scanner before accepting documents.
5. Configure Key Vault or approved protected staging settings and verify managed identity access.
6. Configure the approved transactional email provider and test real delivery, failure queueing and replay.
7. Inventory and, only with approval, correct SharePoint permissions before board documents are connected.
8. Complete staging IDOR, penetration, load, monitoring, backup, restore and rollback acceptance.
9. Obtain explicit deployment, merge and DNS approval before production cutover.

The portal and API are repository-ready and locally accepted. They are not live, do not contain production data and must not be described as production-complete.
