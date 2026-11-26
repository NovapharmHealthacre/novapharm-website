# NovaPharm customer experience: evidence and acceptance
Date: 2026-11-24. UK storefront benchmark. Public text review, not exhaustive URL crawl or authenticated browser acceptance.

## Benchmark inventory
| Page family | Evidence | Transferable pattern |
|---|---|---|
| Apple store and directory | https://www.apple.com/uk/store ; https://www.apple.com/uk/sitemap/ | Discover by product or task; shopping help and order status visible |
| Comparison | https://www.apple.com/uk/mac/compare/ | Consistent attribute comparison, optional specialist help |
| Business | https://www.apple.com/uk-business/store | Business-oriented discovery |
| Bag | https://www.apple.com/uk/shop/bag | Dedicated bag; empty state inspected, not payment |
| Saved selection | https://www.apple.com/uk/shop/help/shopping_experience | Saved bags, edits and estimates; live saved-account page unavailable |
| Account | https://www.apple.com/uk/shop/help/your_account | Guest vs account and recovery; authenticated account not tested |
| Payment | https://www.apple.com/uk/shop/help/payments | Payment methods and invoices |
| Delivery | https://www.apple.com/uk/shop/help/shipping_delivery | Delivery estimates and tracking |
| Order changes | https://www.apple.com/uk/shop/help/viewing_changing_orders | Eligible changes and self-service |
| Returns | https://www.apple.com/uk/shop/help/returns_refund | Clear return pathways |
| Aftercare | https://www.apple.com/uk/shop/personal-setup | Help after purchase |
| Accessibility | https://www.apple.com/uk/accessibility/ | Inclusive design intent |
| Aesop home | https://www.aesop.co.uk/ | Category, ingredient and need-led navigation |
| Catalogue | https://www.aesop.co.uk/shop-all/ | Editorial product discovery |
| Product detail | https://www.aesop.co.uk/hand-and-body/hand-washes-and-balms/resurrection-aromatique-hand-wash/BT13.html | Detailed product attributes |
| Guided discovery | https://www.aesop.co.uk/skin-finder ; https://www.aesop.co.uk/body-care-finder | Optional product finders, not medical diagnosis |
| Repeat purchase | https://www.aesop.co.uk/hand-and-body/category/refill-and-replenish/ | Easy replenishment discovery |
| Consultation | https://www.aesop.co.uk/services-pages/video-consultations.html | Human specialist option |
| Online services | https://www.aesop.com/online-services.html?geo=false | Thoughtful order extras |
| Independent research | https://baymard.com/research-articles/current-state-of-checkout-ux ; https://baymard.com/research-articles/accounts-and-self-service-ux-research-2026 ; https://baymard.com/research-articles/current-state-accounts-selfservice | Reduce required fields, prioritise order tracking, clarify returns |
| B2B | https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/the-surprising-economics-of-b2b-growth-the-new-survival-threshold-and-what-it-takes-to-thrive | Self-service plus seamless human channels |

Unavailable or not tested: Aesop UK login, sitemap, fragrance/gift finder, shipping/returns URLs, Apple saved-items and authenticated order list, populated carts and live checkout; do not infer their behaviour from unavailable screens. Individual product URLs and all country sites are not exhausted. NovaPharm live public homepage retrieved; portal, account and tracking URLs could not be fetched in this review. Repository evidence is not deployment evidence.

## Customer promise
Every page answers: where am I, what can I do, what is known, what happens next, and how can I get help? Show verified facts and explicit unknowns; no invented delivery estimates, stock, prices, regulatory clearance or status. Personal retail and qualified trade accounts remain independently authorised.

## Acceptance inventory — all 18 customer modules
| Module | Customer outcome | Gate |
|---|---|---|
| dashboard | Common tasks one action away | Navigation and responsive browser |
| account | Review and safely update details | Server validation, tenant isolation |
| products | Find suitable SKU, understand availability | Verified catalogue, no clinical advice |
| price-lists | Understand actual price, VAT, quantity breaks | Current authorised commercial evidence |
| stock-availability | Know what can be supplied and when | Source freshness, unknown stock explicit |
| orders | View and understand each authorised order | Account isolation; true order states |
| order-tracking | Next action and state timestamp | Verified events, no fabricated progress |
| delivery-tracking | Carrier and shipment events | Carrier evidence; no estimated dates unless verified |
| returns | Know eligibility and request help | Actual terms, no unapproved refund |
| invoices | Retrieve genuine billing records | Tenant checks and finance release |
| statements | Understand outstanding balance | Authoritative ledger |
| quality-complaints | Report product issues safely | Validated quality escalation |
| documents | Find current approved records | Access rights and version |
| regulatory-documents | See applicable evidence | Source rights, not implied approval |
| downloads | Retrieve eligible files | File rights, malware/security checks |
| support | Explain issue once and see next steps | Staff routing and verified case record |
| analytics | Understand authorised account activity | Source integrity, privacy |
| settings | Manage preferences and account security | Consent and role controls |

## Differentiation backlog (hypotheses, not claims of industry first)
P0: explain next step for each known state, clear stale guidance, persistent task navigation, guest access, visible support. Implemented source candidate PR #1170; CI and deployment pending.
P1: order-specific support handoff without sensitive URLs, authenticated order detail, explicit unknowns and event timestamps, resume basket safely, accessible errors and recovery. Never silently re-charge; revalidate prices, stock and terms before new payment.
P2: compare published SKU attributes, saved lists and verified repeat-order basket, preference-controlled notifications, quote comparison, PO and document reconciliation. No automatic supplement or medicine recommendation, no forced subscription.
P3: proactive exception alerts backed by actual events, case ownership and continuity, supplier/QA traceability for qualified buyers. No service promises until staffed and tested.

## Measurement and release
Establish baselines before targets: task completion, time to find order, login recovery success, checkout completion, payment duplicate rate, support contacts per order, delivery-exception resolution and customer effort rating. Segment retail vs business and mobile vs desktop. Collect minimal data, no credentials, order references, health information or payment data in analytics. Explicit user interviews and usability tests validate unmet needs; benchmark findings alone do not prove what NovaPharm customers want.

Run exact-head checks, generated public-site parity/link validation, Chromium and WebKit at 320/375/768/1440 widths, keyboard and screen reader, slow/offline states, cross-tenant negatives, test-mode checkout, real verified sign-in and recovery, genuine order/dispatch evidence. Require release authorisation and production read-only smoke test; no production test purchases, payment mutations or regulatory-gate bypass.
