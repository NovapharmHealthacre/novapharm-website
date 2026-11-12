# ESCO: 371 SKU evidence-to-payment reconciliation

Date of source review: 12 November 2026. **No new card-collection authorisations are granted by this document.**

## Sources inspected, not merely requested

1. The original Eastern Surgical Company September 2026 Outlook email and supplied product/quality attachments.
2. CE certificate **RSBV-2406-7563**, including all three product/model annexures. Certificate states issue 18 June 2024 and expiry 17 June 2027, subject to surveillance conditions; the certificate's issuer/assessment route is not itself verified as an accepted UKCA/CE conformity route for each device.
3. ISO 13485 certificate **IN260122006**, issued 22 January 2026, broad manufacturing scope by annexure. A quality-management certificate is not an MHRA product registration.
4. The authoritative **373 product source catalogue** at `assets/data/esco-catalogue.json`, including 73 supplier-model-coded and 300 model-missing records.
5. The owner-approved category-based **GBP base prices** produced by `scripts/esco-merchandising.mjs`; these exclude VAT, verified delivery and unresolved configuration differences.
6. The protected AWS policy was verified separately, with existing card-authorised catalogue IDs `ESCO-CAT-0003` and `ESCO-CAT-0048`. An actual production release must re-read the current SSM policy and private approval manifest.

## Concrete match results

- **371** references still need individual payment release.
- **300** of these do not identify a manufacturer model. All have NovaPharm internal IDs, but those are not manufacturer evidence.
- **33** of the remaining model-coded references have a matching printed model code in the supplied CE certificate annexures. This is **candidate documentary evidence**, not legal GB clearance.
- **Two** of the model matches have divergent descriptions:
  - `ESCO-CAT-0054` is shown as Sharps Containers in the website source; the CE annex lists `ESS 004` under Instrument Tray.
  - `ESCO-CAT-0034` is shown as Overbed Table in the source; the CE annex lists `EHF 158` under Mayo Table.
- CE model matching is conservatively **not** reported for broad `ESI`/`ESE` series without an exact specification or applicability record.

## Missing independent release facts

The available source set does not establish all of the following for each of the 371: exact saleable configuration, manufacturer supply rights for UK sale, legally relevant device classification, accepted conformity evidence, MHRA registration and UK Responsible Person where applicable, approved product-specific tax code, physically allocatable stock, verified UK shipment terms, final UK-delivered GBP amount, and item-level merchant approval.

The current SSM global switches are **not** authorisation for unverified products. Use the existing `apps/esco-checkout/merchant_release.py` only with evidence-complete private product records. It validates against the production Lambda's `eligible()` function, archives an immutable private S3 manifest and points SSM at its SHA256. Existing approved SKUs remain intact.

## Continuous verification workflow

`node scripts/esco-371-clearance-audit.mjs` produces:
- `docs/commerce/esco-371-clearance-audit.json`
- `docs/commerce/esco-371-clearance-audit.csv`

The existing **ESCO 373-SKU price and checkout readiness preparation** GitHub Action now runs the audit and packages both files with the merchant's complete 373-row staging register as a downloadable artefact. It performs **no live policy update and no Stripe charge**. The CSV flags exactly which source evidence is present and lists missing gates per SKU. New evidence must be independently reviewed and written into the *private* evidence-to-payment register; no generic certificate, internal SKU, planned stock count or browser price may silently flip a regulatory or payment-approved flag.

## Legal boundary

The MHRA states that medical devices must be registered before being placed on the Great Britain market. Where the manufacturer is outside the UK, an appointed UK Responsible Person normally handles registration. These duties differ between actual devices and general-purpose laboratory goods; classifications must be made individually.

Official guidance:
- https://www.gov.uk/guidance/register-medical-devices-to-place-on-the-market
- https://www.gov.uk/guidance/regulating-medical-devices-in-the-uk

## Customer experience

The production ESCO Bag, including mixed baskets, already supports immediate Stripe-hosted payment for individually approved products. The other catalogue items can submit durable order requests. Nothing in this reconciliation should prevent shopping or product discovery.

**Release completion remains conditional on exact SKU eligibility and successful tax, delivery, signed-webhook, idempotency and paid-order reconciliation tests.** No customer/supplier emails or live charges are authorised by this audit.
