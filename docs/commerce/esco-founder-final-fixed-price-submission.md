# ESCO 371: founder's final fixed-price payment release selection

## Recorded commercial instructions

On **12 November 2026**, NovaPharm's owner submitted a single final commercial release checklist for the 371 ESCO references not currently authorised to collect card payments.

**Selected customer payment route:** Immediate Stripe-hosted Checkout **only after an individually approved fixed-price offer** is present. Although the owner separately confirmed willingness to allow a future confirmed-quotation payment path, that path was **not selected** and must not be activated in this implementation.

The owner affirmatively declared the ability to substantiate supply rights, actual product variants/configurations, applicable GB legal status, and fulfilment arrangements. Those are **attestations of ability to provide evidence**, not statements that the actual records have been supplied, authenticated or verified.

The owner expressly did **not** confirm UK freight/delivery terms or SKU-level VAT/tax treatment. These remain outstanding. The owner **accepted actual landed-cost/margin risk**, which may satisfy the existing *merchant risk decision* rather than falsely substituting an actual cost invoice. No new customer emails were authorised.

Previously recorded merchant base GBP prices and the 10,000-unit owner inventory attestations remain unchanged. The exact UK-delivered customer charge, product-specific Stripe tax code, per-variant eligible status and reconciled allocatable stock still require independent product release data.

## Private attestation evidence

Private, AES256 encrypted source record (no public access):

`s3://novapharm-esco-approved-skus-250675045172-eu-north-1/reviews/esco-371-founder-fixed-price-submission-2026-11-12.json`

The private record is a **review** object, not a `policies/` payment approval manifest. The latest recorded SSM checkout-policy baseline was version 4 with two existing payment-approved references: `ESCO-CAT-0003` and `ESCO-CAT-0048`. Re-read live SSM before any subsequent promotion.

## Import into the governed release preparation

The utility `apps/esco-checkout/fixed_price_owner_submission.py` converts the existing 373-row nonpayment merchant evidence draft into a **separate nonpayment** copy with the 371 cost-risk choices recorded.

To prepare a private review using the exact attestation and merchant draft already downloaded to a restricted workspace:

```bash
python apps/esco-checkout/fixed_price_owner_submission.py \
  --submission /private/esco-371-founder-fixed-price-submission-2026-11-12.json \
  --draft /private/esco-2026-release-evidence-draft.json \
  --output /private/esco-2026-fixed-price-owner-commercial-review.json
```

The `/private/` paths are examples, not claims that files already exist there. Use an isolated operator environment. Never put a completed private evidence record or a Stripe secret into the public source repository.

The importer preserves the two existing products in the draft, records commercial cost-risk acceptance for exactly 371 and leaves `release_authorised=false`, missing UK delivery price, unknown Stripe VAT codes, missing product-specific evidence and unconfirmed supplier configurations untouched. Unit tests reject changed decisions, incomplete catalogue coverage, unsupported VAT or shipping fields, and any hidden release approval.

Only after individually substantiated manufacturer/GB product evidence, firm GB-delivered GBP offer, applicable Stripe tax code and fulfilment allocations have been reviewed may `merchant_release.py --apply --approve-live --expected-policy-version CURRENT` promote supported SKUs into a hash-pinned *private* `policies/` manifest. Existing two payments cannot be overwritten. `GET /readiness` and signed Stripe webhook/order ledger must then pass end-to-end verification.

**No direct payment capture for unverified rows, external email, or quote-payment pathway is authorised by the one-time submission.**
