# NovaPharm Pharmaceutical Distribution: Production Evidence and Operating Release Gates

**Evidence snapshot:** 11 November 2026 (UTC). **Owner:** NovaPharm Healthcare Ltd.
**Programme issue:** [#356](https://github.com/NovapharmHealthacre/novapharm-website/issues/356).
**Status:** Public commercial Distribution website published and release-verified. **Regulated pharmaceutical wholesale operations NOT authorised or accepted as live by this record.**

## 1. What is actually shipped

| Component | Evidence | Accepted scope |
| --- | --- | --- |
| Public Distribution / Market Access / Markets | Source-generated routes, canonical SEO, navigation and qualified B2B contact entry; prior PRs #333, #354, #374, #372 | Public editorial and enquiries only |
| Warehouse-first design | Owner-approved original 1600 x 580 warehouse image and source tests; PR #390 merged in commit `bc7cc22486142207810c631ff1d7411ddfa8f0ff` | Image displayed; facility operating rights and approvals NOT implied |
| Production publication | Protected AWS-contact-preserving [run 42970206389](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42970206389), completed successfully 11 November 2026; publisher checked live custom-domain Distribution HTML, source marker, media and navigation | Website deployment evidence, not GDP operating evidence |
| Temperature/cold-chain copy | Conditional service examples 2–8°C and controlled ambient; representative quality-control image labelled as such | Describes qualified possibilities, NOT validation of a named warehouse, route or sensor |
| Logistics provider names | UPS Healthcare and Marken used as attributed factual references; former Polar Speed brand described factually | No asserted provider endorsement, provider assets, third-party licence transfer or unrestricted contracted scope |
| AWS business contact | Production contact API, Lambda and DynamoDB inbox found in eu-north-1 on 11 November 2026 | Business enquiry intake only; not an order, medicine release, licence, inventory or invoice system |

**Source publication mismatch:** A public web search index may still show the earlier "Distribution starts with trust." page. The protected publisher's cache-busted live checks found `data-distribution-design="20261111-real-warehouse"` and the approved warehouse-first hero. Use independent origin/browser checks rather than search snippets for later release acceptance.

The latest reviewed AWS inventory contains separately named Nutraxin and ESCO checkout/payment resources, but no dedicated regulated-medicine batch, GDP release, supplier/buyer authorisation, cold-chain excursion or proof-of-delivery service in the inspected Lambda/DynamoDB/API Gateway name inventory. Absence from this inventory is **not** proof that no other offline or external operational system exists; it is a gap in verified end-to-end evidence.

## 2. Mandatory regulatory route determination, BEFORE trading

A qualified regulatory/quality adviser must determine the company's *actual role for each product and territory*: owning or supplying stock as a wholesale dealer; brokering without buying, selling or physically handling medicines; importing; marketing authorisation holding; parallel importing; assembling/repackaging; or distributing a non-medicine such as a food supplement or medical device. A UK company registration or SIC code is **not** a medicines licence.

- For regulated medicine wholesale supply, obtain and verify the appropriate MHRA WDA(H), authorised sites/activities, Responsible Person arrangements and applicable GDP/QMS controls. Official: https://www.gov.uk/guidance/apply-for-manufacturer-or-wholesaler-of-medicines-licences
- For regulated independent medicine brokering, evaluate MHRA broker registration and applicable GDP responsibilities; wholesale dealers who broker can require broker registration too. Official: https://www.gov.uk/guidance/medicines-register-as-a-broker
- For parallel imports, verify product-level PLPI, appropriate import/wholesale permissions, origin and product rights; assess manufacturer/assembly licensing and RPi requirements where relevant. Official: https://www.gov.uk/guidance/medicines-apply-for-a-parallel-import-licence
- Validate each current licence/registration *directly*, including exact legal entity, site, permitted categories, dates and restrictions. See the monthly MHRA [wholesale sites register](https://www.gov.uk/government/publications/human-and-veterinary-medicines-register-of-licensed-wholesale-distribution-sites) and [broker register](https://www.gov.uk/government/publications/register-of-brokers-authorised-to-deal-in-human-medicines).
- Do not transfer a third-party provider's WDA(H), GDP status, equipment validation or transport approval to NovaPharm in claims or release records. The site photograph by itself proves none of these.

**Current acceptance: BLOCKED / no approval evidence attached to this runbook.** A real MHRA grant, registration, confirmation of an applicable exemption or authorised counterparty model, and responsible professional sign-off are required as appropriate. Do not present an application as a grant.

## 3. Production distribution gate matrix (fail closed)

An entry becomes `verified` only when its referenced **real, dated document or system record** has been reviewed for the exact entity, product, site and market. Blank cells or owner claims alone cannot pass a gate.

| Gate | Required acceptance evidence | Responsible reviewer role | Current state |
| --- | --- | --- | --- |
| D01 Legal activity route | Signed scope matrix: UK role, activities, legal entity, import/export route, authority, country | Regulatory / Legal | Unverified |
| D02 Authorisations | Valid WDA(H), broker or other required authorisation(s) and restrictions, independently checked | Regulatory / Quality | Unverified |
| D03 People and QMS | Named RP/RPi where required; approved GDP manual, document control, training records, deviations/CAPA, change control, supplier audits | Quality / RP | Unverified |
| D04 Warehouse/site | Signed contract and quality/technical agreement; actual warehouse identity, approved site and activities, audit/site qualification | Quality / Logistics | Unverified |
| D05 Temperature control | Product-labelled conditions, warehouse mapping, calibrated sensors, alarm management, excursions, assessed qualified transport lanes | RP / Logistics | Unverified |
| D06 Supplier qualification | Company and licence check, manufacturer/wholesaler chain, provenance, commercial rights, quality agreement | Quality / Procurement | Unverified |
| D07 Customer qualification | Independent buyer licence/role check, permitted sale channel and country, customer record and periodic recheck | Quality / Commercial | Unverified |
| D08 Product-country register | Canonical SKU/pack, MA/PLPI/device or food-supplement pathway, language/packaging, country eligibility, holder and dates | Regulatory / Product | Unverified |
| D09 Inventory and batch | Verified stock ownership, source receipt, lot/batch, serial where required, expiry/FEFO, storage location, quarantine, approved ATP | Warehouse / Quality | Unverified |
| D10 Quality release | Documented physical and regulatory product release; RP-authorised disposition; block unapproved, expired or temperature-excursion stock | Quality / RP | Unverified |
| D11 Order-to-cash | Approved quotes, contracts, pricing/VAT, credit and authorised customer, invoice, payment/terms, complete audit trail | Finance / Commercial | Unverified |
| D12 Distribution execution | Pick/pack audit, authorised carrier and lane, temperature records, chain of custody, shipment tracking, proof of delivery | Operations / Logistics | Unverified |
| D13 Exceptions and recall | SOPs and rehearsals for complaints, defects, returns, counterfeit alerts, recalls, temperature excursions and adverse-event escalation | Quality / RP | Unverified |
| D14 System security | Role-based permissions, immutable audit history, retention/privacy, backups/restore, test and production segregation | Engineering / Quality | Unverified |
| D15 End-to-end acceptance | Independently witnessed synthetic regulated-order rehearsal through qualified entities, real test records, rejection paths and rollback | Owner / Quality / Finance | Unverified |

**Required technical invariant:** `regulated_medicine_order_release_allowed = false` until **all applicable** gates are signed, applicable source rights and authorisations are current, and product/customer/order-specific checks pass. A web contact submission must never be treated as a medicine order. No clinical, sales or other product availability may be inferred from a catalogue listing.

## 4. Minimum governed record model

Build or integrate these entities before customer-facing wholesale order acceptance:

1. **Legal actor:** company, country, address, role, licence/registration number and verifier/date/scope.
2. **Product authorisation:** canonical medicine identity, presentation, MA/PLPI/other status, holder, authorised country, evidence and effective/expiry date.
3. **Supplier and buyer qualification:** third-party identity, site(s), documentary evidence, valid-from/to, QA sign-off, revalidation.
4. **Batch/lot stock:** ownership, quantity, units, expiry, warehouse/site/bin, validated condition range, receipt, quarantine, release, and full movements.
5. **Purchase/sale decision:** quote, authorised B2B counterparty, geography, price/tax basis, contract, quality release and approval trail.
6. **Movement:** carrier, approved lane, dispatch/reception checks, temperature event series, excursions, deviations, chain of custody and signed proof of delivery.
7. **Quality event:** complaint, recall, returns, CAPA, adverse-event escalation routing and time-bound responsible owner.

Require explicit IDs, timestamps, scope and provenance; distinguish unknown from approved. Do not fill missing values with illustrative or synthetic records in a production ledger.

## 5. Operating SOP and agreement pack required

Draft, route for qualified approval, train and record controlled versions for: document control; training; outsourced activity and logistics qualification; supplier/buyer onboarding; product identity and rights; receiving/quarantine; storage and temperature mapping; equipment calibration and alarms; excursions; controlled dispatch; batch/expiry traceability; returns and rejected goods; complaints and suspected falsification; recalls and mock recall; deviations and CAPA; change control; self-inspection; security, business continuity and disaster recovery; and pharmacovigilance handoff where relevant.

Obtain a signed commercial service schedule and separately a GDP/quality agreement with each logistics provider used. Verify what the contract covers and whether the real facility in the photograph is an authorised, contracted, audited NovaPharm service location. Obtain express marketing permissions before presenting any supplier as an endorsed partner or using protected logos/photos.

## 6. Split commercial product programmes

- **Licensed medicines, generics, oncology and PLPI:** regulated wholesale/product gates D01–D15 apply as appropriate. No automatic card checkout or direct patient sales.
- **Nutraxin supplements:** maintain distinct SKU rights, approved labels/claims, accepted inventory/ATP, tax, account/checkout, refund and delivery evidence; an AWS checkout endpoint alone is not proof of end-to-end merchant acceptance.
- **ESCO medical equipment:** maintain 373 model-specific manufacturer identity, UK classification/market eligibility, approved price/cost, manufacturer rights, shipping and tax, fulfilment and payment eligibility; default-deny unapproved SKUs.
- **International routes:** separately verify destination-country product/actor/transport/import permissions; a UK permission is not global permission.

Do not join these different product classes into one unrestricted ordering state.

## 7. Go/no-go sign-off

Prior to any regulated shipment, the authorised Quality/RP reviewer must approve D01–D10, D12–D14 and all applicable D15 evidence; Finance/Commercial must approve D11; the accountable NovaPharm signatory must record final authorisation. Record actual signatories, document identifiers, dates and status in the controlled quality system. An empty or unsigned row remains blocked.

**Mandatory negative tests:** unknown licence; expired supplier/buyer authorisation; wrong country; wrong SKU rights; quarantined/expired lot; stock mismatch; missing RP release; 2–8°C excursion; invalid carrier lane; failed payment/credit; evidence revocation; recall hold; direct patient medicine request. All must fail closed without initiating a physical medicine transaction.

**Production acceptance requires evidence**, not an arbitrary completion percentage: valid current authority and QA review, controlled SOPs and agreements, real qualified suppliers/customers and inventory, a witnessed end-to-end acceptance run, monitoring and rollback, and documented release approval. The public Distribution page can remain live for qualified enquiries while the operational gate is closed.

## 8. Immediate next decisions and provenance

1. **Legal/quality:** decide wholesale versus broker versus other actual role for the UK operation; appoint qualified accountable professionals and request/verify authority documentation.
2. **Contract/logistics:** collect actual signed Polar Speed/Marken or other provider contract, quality agreement, site and temperature qualification; obtain real cold-room documentary media and marketing rights before publishing it.
3. **Product:** choose first regulated product and target territory, then populate product/party rights and end-to-end controls from genuine evidence before considering orders.
4. **Engineering:** select the system of record, create restricted auditable qualification/batch/order/temperature/quality entities, and connect a default-deny release decision; add test evidence and monitored controls. Keep Nutraxin/ESCO merchant systems separate.
5. **Public validation:** continue independent actual-domain, Safari/mobile, contact-prefill, analytics/consent and source-SHA checks; [#367](https://github.com/NovapharmHealthacre/novapharm-website/issues/367) tracks broader web acceptance.

**Do not** send external customers/suppliers emails, create live charges, present fabricated licence/temperature/inventory evidence, or switch regulated ordering on as part of website publication. Owner or professional review is required for legally consequential decisions.
