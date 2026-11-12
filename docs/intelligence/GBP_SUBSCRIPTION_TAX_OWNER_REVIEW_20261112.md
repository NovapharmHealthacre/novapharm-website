# NovaPharm Intelligence | GBP subscription and VAT owner review
**12 November 2026 | Proposal only | No live billing activation**

## Owner instruction
Use GBP for the intended NovaPharm Intelligence subscription launch. Do not activate billing, grant customer rights or accept these proposed price points without a separate final owner sign-off.

## Proposed price schedule (GBP excluding VAT where applicable)
| Tier | Monthly | Annual prepayment | Product limits |
| --- | ---: | ---: | --- |
| Starter | £199 | £2,030 | Up to 25 governed medicine searches per month, only with accepted sources |
| Professional | £699 | £7,130 | Up to 250 governed searches per month and separately accepted premium sources |
| Enterprise | Indicative from £2,799/month | Individually contracted | Signed per-tenant seats, quota, licences and service scope |

Starter/Professional annual savings are approximately 15% versus monthly for 12 months. The amounts are commercial hypotheses, not cost-validated binding offers. Confirm the company's margin target after cloud, AI, data licensing, support and transaction fees before final signoff.

## Read-only live account verification (12 November 2026)
Stripe account NovaPharm Healthcare Ltd, `acct_1UZUNv2U9Y3sX5I2`, currently has three active NovaPharm Intelligence products, five active INR-only recurring prices, zero live subscriptions. Stripe Tax reports active settings and one active GB tax registration. Each Intelligence product uses tax code `txcd_10103001`; accountant must verify the service classification. Existing prices are tax-exclusive. **No GBP prices are created in this proposal.** The pre-existing INR Stripe records are not modified.

## Tax treatment / finance review
- GBP billing currency does not establish where a buyer is located or which VAT rate applies.
- HMRC standard UK VAT is 20% where due: https://www.gov.uk/vat-rates . Do not charge blanket VAT to every purchaser.
- HMRC B2B place-of-supply generally follows where the business customer belongs; verify exceptions, customer business evidence and cross-border VAT/reverse-charge rules: https://www.gov.uk/guidance/vat-place-of-supply-of-services-notice-741a .
- First **proposed** sale country is GB only. Do not infer extra-country tax registrations.
- Future **approved** server-only Checkout must set `automatic_tax[enabled]=true` and `tax_id_collection[enabled]=true`. Confirm new GBP price `tax_behavior=exclusive`, Stripe product classification, buyer location, tax IDs and final invoice.
- Never override the actual Stripe-computed tax with browser estimates. Confirm VAT invoice requirements, renewal, cancellation, refund and credits.

## Approval-gated transition plan
1. Owner approves exact GBP amounts, limits, commercial terms, and selling countries; finance verifies margin, product tax code, and UK VAT registration/terms.
2. Only following separate authorisation, create five **inactive** GBP prices (Starter and Professional monthly/annual; contract-only Enterprise monthly) with correct recurring intervals and exclusive tax. Maintain old INR prices for controlled rollback.
3. Reconcile immutable GBP Stripe Price IDs and merchant/product mapping. Replace the currently INR-only server price registry, persisted intents and Checkout currency assertion. Explicitly reject INR Checkout in the new GBP release.
4. Independently prove signed Cognito MFA, two-tenant isolation, source rights, idempotent signed webhook, invoice and billing portal lifecycle, renewal/refund, backups/restore, security and rollback.
5. Final owner and independent production acceptance before activation or publication of purchase functionality.

## Guardrails
This review PR updates **candidate** marketing source and tests, not the live website. Customer and billing feature flags remain OFF. No Stripe price, customer, invoice or subscription was created/changed; no live payment, email, DNS, access grant or deployment was initiated. Nutraxin and ESCO payments are out of scope.
