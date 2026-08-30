# Nutraxin commerce readiness

Review date: 22 August 2026
Decision: commerce controls remain disabled

## Repository-complete public product experience

- Canonical Nutraxin overview at `/products/nutraxin/`.
- Nineteen canonical product-detail routes generated from the governed register.
- Approved catalogue-derived pack imagery with intrinsic dimensions and responsive delivery.
- Verified product name, pack, category/range, dosage form and source-transcribed composition.
- Product structured data without `Offer`, price, stock or availability.
- Qualified B2B enquiry route.
- Automated rejection of fake pricing, stock, Bag, checkout and Buy controls.

## Commerce gates not yet satisfied

| Gate | Required authority/evidence | Current status |
| --- | --- | --- |
| Product sale approval | Owner, legal and regulatory approval for the specific UK sales model | Not supplied |
| Price authority | Approved price source, currency, effective date and customer/consumer scope | Deliberately withheld; owner asked to hold price-dependent work |
| Inventory authority | Live governed stock source and release/availability semantics | Not connected |
| Tax and VAT | Approved tax treatment and invoice requirements | Not approved |
| Delivery | Territories, service levels, charges, cut-offs, restricted goods and fulfilment authority | Not approved |
| Payment | Approved merchant and processor, credentials, PCI boundary and webhook design | No provider authorised |
| Terms and returns | Approved consumer/B2B terms, cancellation, return, refund and complaint process | Not approved |
| Order authority | Idempotent order creation, payment reconciliation, email, fulfilment and audit trail | Not production-evidenced |
| Security and privacy | Fraud controls, PII scope, retention, customer service access and penetration test | Not production-evidenced |
| Production acceptance | Successful approved transaction, failure, retry, refund and notification tests | Not run |

## Release behaviour

The site must continue to show product facts and a qualified enquiry action only. No hidden or disabled Buy control is shipped. Commerce will be introduced only as a separately approved, end-to-end release; partial checkout or simulated success is prohibited.
