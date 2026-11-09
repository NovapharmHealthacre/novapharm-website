# ESCO Anand — 10,000-unit owner inventory declaration and 25% margin model

**Date:** 9 November 2026  
**Scope:** 373 catalogue *references* across 12 categories; 73 have supplier model codes.  
**Status:** Quote-first; **not authorised for automatic card charging**.

## Inventory statement

The owner reports **10,000 units for each catalogue reference**. This yields **3,730,000 units of declared planning inventory** if and only if each reference maps to exactly one saleable variant. These units have **not** been reconciled against physical warehouse bins, serials/batches, allocatable variants, purchase orders or release/expiry/lead-time records. Do not transform `ownerDeclaredStockUnits` into `availableToPromise`, public "in stock" labels, automatic dispatch claims or backend checkout eligibility.

There are 373 catalogue references, some representing configurable variants. Physical stock per variant, UK stock location and shipment eligibility remain unverified.

## Pricing source and assumptions

Existing prices in `scripts/esco-merchandising.mjs` are **non-binding UK category benchmark guides**. Not all 373 catalogue families have an exact publicly comparable model; these estimates are **not** supplier purchase cost data and do **not** prove a margin.

**Target margin**: 25% gross margin on price excluding VAT, **not** 25% markup on purchase cost.

For each guide price `P` (GBP ex VAT):

- Maximum *total* variable cost to retain 25% gross margin = `0.75 × P`.
- Illustrative card-fee allocation = `2.5% × P + £0.20`. This is a scenario assumption, **not** a verified Stripe tariff.
- Illustrative 3-month stockholding reserve = `1% × P`. **Not** actual rent/storage.
- Illustrative outbound delivery allocation is category dependent (below). **Not** a Polar Speed or courier quotation.
- Maximum supplier purchase + inbound freight/import allowance = `max(0, 0.75P - card-fee allocation - storage reserve - delivery allocation)`.
- If the uncapped supplier/inbound allowance is negative, the planning assumptions are inconsistent with the 25% target at that guide price. Flag the item, do not claim it earns that margin.
- Prices must additionally be checked against invoice costs, import duties, FX risk, handling, customs, returns, settlement costs, and any other real variable expenses before acceptance.
- The VAT amount and legal tax rate are **not inferred** from the product family. UK VAT and buyer exemptions must be established for the actual product and sale. VAT is excluded from the headline guide and from gross margin numerator/denominator.

| Catalogue category | Illustrative outbound delivery allocation |
|---|---:|
| Hospital Furniture | £55 |
| Ward Equipment | £8 |
| Hospital Trolleys | £28 |
| SS Hollowware | £5 |
| Hospital Sundries | £3 |
| Hospital Linen & OT Textiles | £5 |
| Sterilization & Refrigeration Equipment | £160 |
| Laboratory Equipment | £25 |
| Laboratory Glassware & Consumables | £4 |
| Laboratory Plasticware | £4 |
| Surgical Instruments | £7 |
| OT & Surgical Lights | £140 |

These coarse reserves are scenario inputs only. Real product mass, volume, insurance, location, service level and number of shipments could materially change the delivered cost. They must not be silently used as checkout shipping costs.

**Illustrative £100 guide:** variable-cost ceiling £75; assumed card allocation £2.70 and three-month holding reserve £1.00; if category delivery reserve £8, maximum purchase + inbound budget is **£63.30**. This is **not** evidence the item can be bought from ESCO for that amount.

**Pricing sensitivity:** If verified all-in variable cost exceeds the ceiling, increase the sale price or decline the sale; if the buyer has a competitive UK price cap, quote only where the economics pass.

## UK legal and image gating

Supplier ISO 13485/CE paperwork is not blanket UK clearance for 373 references. Before charging, establish the *specific* product's intended medical use, classification, CE/UKCA conformity requirements, MHRA registration (where the product is a medical device), GB importer/UK Responsible Person information as appropriate, labelling, supply permission and imagery rights. Some non-medical laboratory goods may follow other UK product laws. The manufacturer photo map has 61 model-matched photographs with exact variant/right-to-use flags **not yet confirmed**; 312 other cards use original labelled concept graphics.

- [MHRA: Register medical devices to place on the market](https://www.gov.uk/guidance/register-medical-devices-to-place-on-the-market)
- [MHRA: Regulating medical devices in the UK](https://www.gov.uk/guidance/regulating-medical-devices-in-the-uk)

## Payment release contract (must be enforced by server)

For **each** line selected, use a verified, unique saleable SKU, approved GB regulatory classification, signed commercial cost, authorised exact selling price and tax treatment, current **allocatable** warehouse stock and shipment method. The server must ignore public estimated prices and owner declarations in creating Stripe Checkout Sessions. Checkout must fail closed for unknown or unapproved references, capped quantities, unsupported delivery region, unverified tax and insufficient allocatable stock.

Use the existing Nutraxin production Stripe architecture only after a separate ESCO server-side allowlist and isolated order ledger/reconciliation are implemented. Preserve existing Nutraxin checkout. Signed webhooks (including async paid/failure), idempotency, payment-status-driven fulfilment, paid-order confirmation, refunds and fraud/exception handling must pass controlled acceptance tests before public payment buttons are activated.

## Release implementation

- Source generator: `scripts/esco-merchandising.mjs`.
- Public-facing disclosure: `scripts/apply-esco-catalogue.mjs`; products and Bag pages built from source.
- Tests: `scripts/test-esco-catalogue.mjs`.
- Generated planning data: `assets/data/esco-uk-guide-prices.json`.
- Existing checkout gates remain `checkoutEnabled:false`, `paymentCollectionEnabled:false`, `requestQuoteOnly:true` and per-reference `checkoutEligible:false`.

The owner-authorised stock declaration is recorded, but none of the 373 items has been independently qualified by this change for immediate payment or shipment.
