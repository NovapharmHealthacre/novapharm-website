# ESCO: make all 373 catalogue references genuinely orderable

**Merchant intent (10 November 2026):** fixed customer selling prices, Add to Bag and secure card checkout for every actual saleable variant. Do not display a guide estimate as a firm chargeable price or claim immediate availability on the basis of planning inventory.

## What exists today

- 373 catalogue references across 12 ranges. 73 include supplier model codes. The other 300 describe product families or generic items and need an actual supplier saleable model/pack/size.
- NovaPharm has authorised 373 category-based base GBP amounts *excluding delivery and VAT* for commercial planning. These are **not** landed supplier invoices or UK-delivered sale-price commitments.
- Existing AWS Lambda supports Stripe-hosted Checkout using privately approved inline prices with automatic tax, signed webhooks and an isolated DynamoDB order ledger. No public price creates payment authority.
- As checked on 10 November 2026, the private SSM policy lists two merchant-authorised exact-model entries: ESCO-CAT-0003 and ESCO-CAT-0048. This list must be re-read before any release.
- Owner's 10,000-unit declaration per reference does not establish verified warehouse-allocatable units or a separate variant. Published guide prices cannot supply missing data.

## Prepared: a complete 373-reference offer and approval register

The workflow **ESCO 373-SKU price and checkout readiness preparation** runs the commands below, validates the full list and uploads **esco-373-sale-offer-readiness-draft** as a GitHub Actions artifact. It **does not create products in Stripe, issue charges, send purchase orders or change the protected live SSM policy**.

\`\`\`bash
node scripts/esco-merchant-release-matrix.mjs
python apps/esco-checkout/merchant_release.py --bootstrap
python apps/esco-checkout/merchant_release.py --check
python -m unittest discover -s apps/esco-checkout -p 'test_*.py' -v
\`\`\`

The generated files are **internal working material**:

- \`docs/commerce/esco-2026-merchant-release-matrix.csv\`: owner-approved per-reference base price, model when known, and illustrative expense sensitivities.
- \`docs/commerce/esco-2026-release-evidence-draft.json\`: exact 373 NovaPharm internal SKUs, suggested *non-binding* ex-VAT delivered prices, and empty verification fields. \`release_authorised:false\` and \`final_uk_delivered_selling_price_pence:null\` for all unverified records.

The suggested delivered figure adds an **illustrative** category delivery reserve to the merchant-authorised base amount. It is a proposal, not a final price or a buyer charge. The actual delivered selling price is a distinct, explicitly approved field.

## How each SKU becomes a fixed-price Stripe purchase

For each product, confirm a supplier saleable variant (use \`NP-ESCO-XXXX\` only as NovaPharm's *internal* reference), evidence for manufacturer supply rights and the precise specification, appropriate GB classification/conformity/MHRA/UKRP information (where applicable), selected Stripe tax code with VAT evidence, a genuine GB delivery quote/contract, and allocatable stock for that variant. Record the document/reference identifiers alongside final **GBP delivered ex-VAT selling price** and owner price sign-off.

The private activation tool checks these items and invokes the **same \`eligible()\` rules** as the production Lambda. If any required evidence is absent, that SKU remains unapproved and cannot be charged. It also checks the 25% gross-margin target when actual variable costs are documented. The owner may explicitly accept unverified variable-cost risk under the pre-existing controlled backend mode, but that still **does not waive supplier identity, UK product safety, VAT or stock requirements**.

Only after data is reconciled and signed off can a restricted operator promote approved records using a current policy version:

\`\`\`bash
python apps/esco-checkout/merchant_release.py \
  --input PRIVATE_REVIEWED_EVIDENCE_JSON --apply \
  --expected-policy-version ACTUAL_SSM_VERSION --approve-live
\`\`\`

This creates a private, encrypted, versioned **S3 manifest** at \`policies/<sha256>.json\` and updates **only the SHA256 pointer** in the existing SSM \`/novapharm/production/esco/checkout-policy\` record. Full approval records cannot fit reliably in one 4/8 KB SSM parameter. The existing approved SKUs remain untouched, all new SKU records are validated, and changed SSM versions or collisions abort. The Lambda retrieves the exact hash-pinned manifest using a read-only, prefix-limited role. Use the private S3 bucket deployed from the \`ApprovalBucket\` resource of \`infra/aws/esco-products-checkout-production.json\`.

Pass \`--bucket novapharm-esco-approved-skus-<AWS_ACCOUNT_ID>-eu-north-1\` (or set \`ESCO_APPROVAL_BUCKET\`) when applying. Apply with a least-privilege AWS identity and no concurrent writers. Since SSM Parameter Store has no compare-and-swap write primitive, use a serialized change-control window and review the target policy immediately before execution. Do not put private regulatory/commercial evidence or the live approval manifest in the public website repository.

**Production acceptance per release batch:** verify \`GET /readiness\`, availability/price from the server, normal and rejected checkout, automatic UK tax, signed webhook, idempotency, DynamoDB paid-state reconciliation, quantity bounds, and fulfilment allocation. The original protected payment architecture is retained.

## Why 'Ready to order' is not yet shown for all 373

A readiness label is a customer-facing promise, not a CSS change. A product without a resolved orderable variant, final delivered price, accurate VAT treatment and current allocatable supply cannot be advertised as ready for card checkout. Exact UK medical-device duties differ by product and route-to-market: [MHRA guidance](https://www.gov.uk/guidance/register-medical-devices-to-place-on-the-market) must be applied at product level, rather than copied across all 373.

**Once all 373 approved policy records exist, the current frontend already consumes the protected \`/readiness\` list and displays genuine 'Ready to order' prices; mixed baskets only charge when each line is approved.** Further UX improvements should preserve that server-only authority.
