# ESCO Anand — public catalogue and commercial release boundaries

**Date:** 20 November 2026  
**Scope:** 373 catalogue references across 12 categories; supplier models and saleable variants require individual confirmation.  
**Status:** Quote-first; **not authorised for automatic card charging**.

## Inventory statement

The catalogue includes an owner-declared planning quantity, not independently verified warehouse inventory. It must not be used as available-to-promise, evidence of UK stock, a product-level “in stock” label, or shipment authority. Product variants, allocated stock, warehousing location and dispatch arrangements require confirmation.

## Pricing source and confidential commercial assessment

Customer-facing website prices are category-level GBP estimates, displayed excluding VAT and delivery. They are not supplier quotations, guaranteed gross profit, approved landed costs, or payment authority.

Supplier purchase prices, freight, storage, payment processing, margin targets and cost sensitivity models **must be evaluated and retained only in access-controlled commercial systems**. Do not place those calculations or supplier terms in this public repository, its GitHub Actions artifacts or the public website. The ESCO merchant-review matrix may retain blank costing columns until individually verified private financial inputs are available. An empty cost field must never be interpreted as zero cost or confirmed margin.

The correct UK VAT treatment, buyer eligibility, insurance, import duties, exchange-rate risk and service/returns obligations must be established before commercial acceptance.

## UK legal and image gating

Supplier conformity paperwork is not blanket UK clearance for all catalogue references. Before charging, establish the **specific** product's intended use, medical-device classification where applicable, conformity requirements, MHRA registration as required, GB importer/UK Responsible Person information where appropriate, labelling, supply permission and imagery rights. Model-associated supplier photographs still require rights and exact-variant verification; clearly labelled original concept previews are distinct from exact supplier photos.

- [MHRA: Register medical devices to place on the market](https://www.gov.uk/guidance/register-medical-devices-to-place-on-the-market)
- [MHRA: Regulating medical devices in the UK](https://www.gov.uk/guidance/regulating-medical-devices-in-the-uk)

## Payment release contract — server enforced

For every order line, require an identified saleable SKU, approved UK regulatory classification, verified private commercial costs, approved exact selling price and tax treatment, current allocatable warehouse stock and shipment method. The server must ignore browser guide prices and owner-declared planning quantities when creating Stripe Checkout Sessions. Unknown or unapproved references, unsupported delivery destinations, missing tax determination and insufficient verified stock must fail closed.

The Nutraxin checkout is independent. ESCO requires its own server-side eligibility allowlist, order ledger and reconciliation. Signed payment webhooks, idempotency, paid-order confirmation, payment-status-driven fulfilment, refunds and fraud/exception handling require controlled acceptance before ESCO card payment activation.

## Release implementation

- Public catalogue generator: `scripts/esco-merchandising.mjs`.
- Public catalogue presentation: `scripts/apply-esco-catalogue.mjs`.
- Regression tests: `scripts/test-esco-catalogue.mjs` and `scripts/test-esco-merchant-release-matrix.mjs`.
- Public guide: `assets/data/esco-uk-guide-prices.json`, containing only approved display fields.
- Payment remains quotation-first with checkout authorization established **only by protected backend policy**.

**Confidentiality note:** This replaces sensitive assumptions in the current documentation but does not remove their historical Git commit copies. Any decision to rewrite public Git history or migrate retained business records to a private repository or approved document store requires a separate owner-reviewed procedure.
