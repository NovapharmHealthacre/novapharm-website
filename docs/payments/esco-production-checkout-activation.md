# ESCO Anand: protected Stripe checkout activation record
**Date:** 2026-11-09  

## 9 November 2026: owner-installed webhook signing secret

The owner saved the ESCO Stripe endpoint signing secret to AWS Secrets Manager at `novapharm/production/esco/webhook-signing-secret`. An AWS check confirmed the value has the correct `whsec_` format after harmless leading/trailing whitespace is removed. The credential itself was not displayed or recorded. The isolated Lambda now trims only whitespace and rejects malformed values; it does not modify the secret in AWS.

Payment state continues to fail closed: the separate ESCO Stripe webhook endpoint remains disabled until signed delivery acceptance; the protected SSM payment policy is still `enabled:false`, `webhook_verified:false`, `approved_skus:{}`. This step does not authorise a single customer card charge.

**Repository:** NovapharmHealthacre/novapharm-website  
**Public page:** /products/esco/bag/  
**AWS region:** eu-north-1

## Infrastructure implemented
- Production AWS CloudFormation stack: `novapharm-production-esco-checkout`.
- HTTP API: `https://vflz5z5jfc.execute-api.eu-north-1.amazonaws.com`.
- Lambda: `novapharm-production-esco-products-checkout` (Python 3.12).
- DynamoDB order table: `novapharm-production-esco-payment-ledger`, on-demand, encrypted, point-in-time recovery.
- Protected SecureString policy in AWS SSM: `/novapharm/production/esco/checkout-policy`.
- Public Products Bag discovers API through `assets/data/esco-checkout-config.json`, calls `GET /readiness` and enables card checkout only when every selected catalogue reference is present in the server's verified saleability allowlist.
- Stripe secret key is referenced via AWS Secrets Manager secret ID. No secret is in GitHub or the browser.
- `POST /checkout` uses server-issued Stripe Price IDs, independently fetches price/tax code, requires destination GB, enables Stripe Tax, and writes a server-owned order to the isolated ledger.
- `POST /stripe/webhook` handles signed completion / asynchronous success / failure / expiry; the success page alone never marks an order paid. `GET /status/{orderId}` reports a minimal order state.
- Nutraxin checkout/ledger are not changed.

## Live payment release state
`GET /readiness` returns `checkout_ready:false` and `approved_catalogue_ids:[]`.
The protected SSM policy is initialized with:
```json
{"enabled":false,"webhook_verified":false,"approved_skus":{}}
```
An attempted sample POST /checkout was rejected with HTTP 503 `esco_payment_not_released` without creating a Stripe session or charging a card.

**Payment collection is intentionally blocked** until ESCO's actual SKU-specific supplier invoices/costs, sale permissions, shipping, VAT, customer terms and identity/variant mapping are verified. Owner-reported 10,000 units per catalogue reference and indicative UK price guides are not actual allocatable stock or binding prices.

## Remaining external Stripe integration
Stripe subsequently listed the ESCO-specific live webhook `we_1UZtGD2U9Y3sX5I24ADpBhHY` at `https://vflz5z5jfc.execute-api.eu-north-1.amazonaws.com/stripe/webhook`. However, the connected operation was blocked before its **signing secret** could be stored in AWS. The endpoint was therefore **disabled in Stripe** to prevent repeated failed webhook deliveries. The original Nutraxin webhook remains enabled. An authorised account administrator must reveal the ESCO signing secret in the Stripe Dashboard, store it securely in AWS Secrets Manager, verify signed delivery end-to-end, and only then re-enable this endpoint. Required events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Store the webhook **signing secret** in AWS Secrets Manager as `novapharm/production/esco/webhook-signing-secret`; do not put the `whsec_` secret into GitHub, an email, source or browser.

Before updating the protected SSM policy `webhook_verified:true`, prove signed webhook delivery, duplicate-event handling, wrong-signature rejection, order reconciliation, and downstream order handling. The current live Lambda rejects unsigned events.

## SKU-by-SKU allowlist contract
Every individually approved SKU must have a protected entry keyed by `ESCO-CAT-0001` etc with:
- `name`, `currency:"gbp"`, `unit_price_pence` as integer ex VAT and `tax_behavior:"exclusive"`. Two server-controlled price modes are supported: `pricing_mode:"precreated"` with a real active Stripe `stripe_price_id:"price_..."`, or `pricing_mode:"approved_inline"` with `stripe_tax_code:"txcd_..."`, `price_includes_gb_delivery:true` and product-specific verified GBP price. Inline mode generates the Price and Product securely within Stripe Checkout; no browser amount or product name is accepted as authority. The tax code must be selected from Stripe's canonical tax code list and approved for the exact product.
- `actual_variable_cost_pence` including sourcing, inward freight, applicable duties, allocated storage/fulfilment, payment costs and returns risk, no more than 75% of ex-VAT unit revenue.
- `available_to_promise_units` as warehouse verified actual allocatable inventory for that resolved physical variant, between 1 and 10,000.
- **True** values for: `commercial_approved`, `supplier_cost_verified`, `uk_product_classification_verified`, `uk_product_safety_verified`, `tax_classification_verified`, `delivery_verified`, `stock_allocatable_verified`, `manufacturer_supply_authorised`, `variants_resolved`.
- `regulatory_type:"general_goods"` only for independently reviewed non-medical goods. For `regulatory_type:"medical_device"`, additionally require `mhra_registration_verified:true`, `conformity_documents_verified:true`, `uk_responsible_person_verified:true` on the exact variant.
- In `precreated` mode, the approved Stripe Price must be active, in GBP, with exclusive tax and exactly the protected integer unit amount; linked Product must be active with the exact approved tax code. In `approved_inline` mode, the backend builds the Checkout line item only from the protected SKU policy, including validated `stripe_tax_code`, price, quantity and name. **Neither mode trusts browser guide prices.**

Any unknown, unverified, incompatible, over-quantity or negative-margin item fails closed. Mixed baskets containing one unapproved line fail closed. Do not set a blanket catalogue-level approval.

## Acceptance required before active UK payments
1. Select **one real**, legally UK-saleable SKU and obtain its authentic source/cost, distribution rights and supplier regulatory/quality records. An unrelated ISO/CE certificate is not sufficient.
2. Prove actual landed unit economics and target >=25% margin, currency and applicable product VAT classification. Stripe GB Tax registration exists, but each product tax code must be reviewed.
3. Configure its exact Stripe Product/Price and approve the matching protected SSM allowlist record.
4. Test matching Stripe Checkout Session, GB address/tax, signed webhook event -> order ledger PAID only after paid status, duplicate-event idempotency, failure/expiry handling, customer receipt, fulfilment and refund/cancellation process. Use controlled sandbox tests first and do not create an unapproved live customer charge.
5. Set `enabled:true` and `webhook_verified:true` only after these acceptance gates are evidenced. Confirm the public Bag button enables for that approved SKU and remains disabled for the other 372 catalogue references.

## Evidence
- Source policy/handler: `apps/esco-checkout/index.py`.
- Security unit tests: `apps/esco-checkout/test_checkout.py`.
- AWS template: `infra/aws/esco-products-checkout-production.json`.
- Frontend release: `assets/js/esco-bag.js`, `scripts/apply-esco-catalogue.mjs` and `assets/data/esco-checkout-config.json`.
- Production safety and live-domain smoke: `.github/workflows/esco-checkout-contract.yml` and `.github/workflows/publish-aws-contact-production.yml`.
- Regulatory: https://www.gov.uk/guidance/register-medical-devices-to-place-on-the-market and https://www.gov.uk/guidance/regulating-medical-devices-in-the-uk.

## 9 November 2026: approved inline pricing option

The Stripe account is live with `card_payments=active`, `charges_enabled=true`, `payouts_enabled=true` and an active GB Tax registration. At audit time it has **zero pre-created Stripe Products and zero Prices**, so `precreated` ESCO checkout could not start even after a SKU approval. This change introduces **server-authoritative inline price_data** to remove that onboarding dependency while keeping all per-SKU evidence requirements. The original provider-priced path remains available.

**Do not turn on payment collection based on this code change.** The SSM policy still has no verified saleable SKUs, and no live Stripe-paid order has been accepted and reconciled. Actual SKU unit landed economics, regulation, VAT/tax code, UK shipping included in price, available-to-promise inventory, payment dispute/returns and fulfillment process must be confirmed before granting `commercial_approved:true`. Stripe account activation does not establish medical-device sale eligibility.
