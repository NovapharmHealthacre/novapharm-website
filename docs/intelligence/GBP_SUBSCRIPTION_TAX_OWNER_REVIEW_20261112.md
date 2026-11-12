# NovaPharm Intelligence | GBP subscription and VAT owner review

## Owner approval and real Stripe state, 12 November 2026

**The owner approved the GBP plan amounts and requested launch.** Five GBP recurring Stripe Prices were CREATED IN THE LIVE ACCOUNT and independently re-read. All five were subsequently activated (`active=true`) at the owner's request and independently re-read. **Catalogue activation is not Checkout activation or a customer-access grant.** Customer identity and billing release acceptance is still pending. No payment, customer, subscription or entitlement was created.

| Plan | GBP | Interval | Stripe Price ID | Current state |
| --- | ---: | --- | --- | --- |
| Starter | £199 | month | `price_1Uati52U9Y3sX5I2RJuYixR9` | ACTIVE (Checkout gated) |
| Starter | £2,030 | year | `price_1UatiF2U9Y3sX5I2mv1a22VN` | ACTIVE (Checkout gated) |
| Professional | £699 | month | `price_1UatiH2U9Y3sX5I2Pyqz3SpW` | ACTIVE (Checkout gated) |
| Professional | £7,130 | year | `price_1UatiJ2U9Y3sX5I2CfJFkUnC` | ACTIVE (Checkout gated) |
| Enterprise (contract only) | £2,799 | month | `price_1UatiL2U9Y3sX5I2gktsrNl5` | ACTIVE (Checkout gated) |

The Stripe items are currency GBP and tax_behavior=exclusive. All pre-existing INR Stripe prices remain preserved; no charges or automatic price migrations. GBP price approval does not waive the separate compliance review of product tax code, contracts, notices or cross-border VAT.

### Activation remains NO-GO
The production Cognito pool has one enabled, email-verified user but no independently confirmed completed TOTP login. The DynamoDB tenant access and webhook event ledgers contain zero records. AWS customer access is explicitly OFF. The application server catalogue, Checkout response-currency guard and source/legal/security acceptance must be independently merged, deployed and proven before prices and payments are activated.

# NovaPharm Intelligence | GBP subscription and VAT owner review
**12 November 2026 | GBP amounts owner-approved | Stripe prices created inactive | No live billing activation**

## Owner instruction
Use GBP for the intended NovaPharm Intelligence subscription launch. The owner approved the five amounts on 12 November 2026. Do not activate billing or grant customer rights without independent production acceptance and security sign-off.

## Proposed price schedule (GBP excluding VAT where applicable)
| Tier | Monthly | Annual prepayment | Product limits |
| --- | ---: | ---: | --- |
| Starter | £199 | £2,030 | Up to 25 governed medicine searches per month, only with accepted sources |
| Professional | £699 | £7,130 | Up to 250 governed searches per month and separately accepted premium sources |
| Enterprise | Indicative from £2,799/month | Individually contracted | Signed per-tenant seats, quota, licences and service scope |

Starter/Professional annual savings are approximately 15% versus monthly for 12 months. The amounts are commercial hypotheses, not cost-validated binding offers. Confirm the company's margin target after cloud, AI, data licensing, support and transaction fees before final signoff.

## Read-only live account verification (12 November 2026)
Stripe account NovaPharm Healthcare Ltd, `acct_1UZUNv2U9Y3sX5I2`, currently has three active NovaPharm Intelligence products, five active INR-only recurring prices, zero live subscriptions. Stripe Tax reports active settings and one active GB tax registration. Each Intelligence product uses tax code `txcd_10103001`; accountant must verify the service classification. Existing prices are tax-exclusive. **Five GBP prices were created inactive after owner approval.** The pre-existing INR Stripe records were not modified.

## Tax treatment / finance review
- GBP billing currency does not establish where a buyer is located or which VAT rate applies.
- HMRC standard UK VAT is 20% where due: https://www.gov.uk/vat-rates . Do not charge blanket VAT to every purchaser.
- HMRC B2B place-of-supply generally follows where the business customer belongs; verify exceptions, customer business evidence and cross-border VAT/reverse-charge rules: https://www.gov.uk/guidance/vat-place-of-supply-of-services-notice-741a .
- First **proposed** sale country is GB only. Do not infer extra-country tax registrations.
- Future **approved** server-only Checkout must set `automatic_tax[enabled]=true` and `tax_id_collection[enabled]=true`. Confirm new GBP price `tax_behavior=exclusive`, Stripe product classification, buyer location, tax IDs and final invoice.
- Never override the actual Stripe-computed tax with browser estimates. Confirm VAT invoice requirements, renewal, cancellation, refund and credits.

## Approval-gated transition plan
1. Owner approved the exact GBP amounts and proposed UK-first sale scope; finance still must verify margin, product tax code, UK VAT treatment, final legal terms and data/source rights.
2. Completed: five GBP prices were created and subsequently activated and independently verified against their original SaaS products, recurring intervals and exclusive tax; old INR prices remain for audit and rollback.
3. Reconcile immutable GBP Stripe Price IDs and merchant/product mapping. Replace the currently INR-only server price registry, persisted intents and Checkout currency assertion. Explicitly reject INR Checkout in the new GBP release.
4. Independently prove signed Cognito MFA, two-tenant isolation, source rights, idempotent signed webhook, invoice and billing portal lifecycle, renewal/refund, backups/restore, security and rollback.
5. Final owner and independent production acceptance before activation or publication of purchase functionality.

## Guardrails
This review PR updates **candidate** marketing source and tests, not the live website. Customer and billing feature flags remain OFF. Five active GBP Price objects were created after owner approval; server Checkout and customer access remain disabled, but no customer, invoice or subscription was created; no live payment, email, DNS, access grant or deployment was initiated. Nutraxin and ESCO payments are out of scope.
