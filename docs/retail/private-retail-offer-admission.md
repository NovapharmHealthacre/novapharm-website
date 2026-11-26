# Connective Pharma: private retail offer activation

This importer is the **payment-offer** release gate, not permission to publish a supplier photograph. All eligible SKUs remain in scope regardless of commercial margin. Evidence must be factual; owner-wide rollout approval does not prove individual tax treatment, stock quantities, pack labels, seller dispatch or commercial image rights.

## Required order

1. Promote exact-pack authorised photography and complete, reviewed UK product information via \`scripts/compile-connective-approved-catalogue.mjs\` to \`src/content/approved-consumer-catalogue.json\`. Publish and verify these exact images; do not place supplier trade workbooks in Git.
2. In a private directory **outside** the repository, create an input JSON with \`{"records":[...]}\`. Each item must have:
   - \`gtin\`, \`sku\` (\`NP-CP-<GTIN>\`), \`name\`, \`brand\`, \`pack\`, \`category\`, \`productClass\`, \`image\`, \`imageSha256\` matching the approved public catalogue and local image.
   - \`netMinor\`, \`vatBasisPoints\` (0/500/2000), \`grossMinor\` calculated using per-unit VAT rounding, \`availableQuantity\` (1–10,000), and \`expiresAt\` (future Unix seconds, no more than 31 days ahead).
   - \`evidence\` with keys \`retailAuthority\`, \`retailPrice\`, \`vat\`, \`stock\`, \`fulfilment\`, \`sellerDelivery\`, \`ordering\`. Every key contains \`confirmed:true\`, a real \`reference\`, \`reviewedBy\` and \`observedAt\` UTC timestamp of the format \`YYYY-MM-DDTHH:MM:SSZ\`. Stock must have been checked within 48 hours, and the offer must expire no later than 48 hours after that stock observation; other evidence must be within 30 days. Refresh or remove expired offers before accepting orders. A quote is not a live availability report.
3. Run dry-run:
   \`\`\`
   node scripts/prepare-connective-retail-offers.mjs --root . \
     --catalogue src/content/approved-consumer-catalogue.json \
     --input /private/novapharm/offers.json
   \`\`\`
4. After independent review of each evidence record and checkout acceptance, commit a batch **of at most 25 products** atomically using an authorised CloudShell/account:
   \`\`\`
   node scripts/prepare-connective-retail-offers.mjs --root . \
     --catalogue src/content/approved-consumer-catalogue.json \
     --input /private/novapharm/offers.json --commit \
     --table novapharm-production-nutraxin-payment-ledger \
     --expected-account <YOUR_12_DIGIT_AWS_ACCOUNT_ID>
   \`\`\`
   This uses \`sts get-caller-identity\` and DynamoDB \`TransactWriteItems\` with conditional create-only writes. An existing offer cannot be overwritten by this path.
5. Confirm \`RETAIL#APPROVED\` records were admitted by the production offer verifier. Perform guest/account mixed basket, VAT reconciliation, safe stock failure, stripe sandbox/production-controlled acceptance, webhook, order status, refunds and transactional email checks. Finally enable \`MULTIBRAND_ENABLED\` in a reviewed release change; do **not** change \`SHOP_ENABLED\`.
6. Verify public product URLs, canonical metadata, sitemap, Google Search Console and Merchant Center before listing these SKUs for advertising.

## Safeguards

- The importer projects only customer-safe \`offerJson\` fields. It never writes supplier quotes, margin thresholds, source references or wholesale costs into the public API response.
- Stock is bounded and expires; no unverified assumption of unlimited stock. Product class cannot be a medicine.
- For the initial seven Vitabiotics records, proposed prices exist privately; no SKU has documented full evidence. The \`src/content/approved-consumer-catalogue.json\` file is not yet present on main. Dry-run fails closed until the public catalogue and evidence exist.
- The importer writes only \`RETAIL#APPROVED\` items; it neither opens Stripe sessions nor changes Lambda flags.
- Immediate feature rollback: restore \`MULTIBRAND_ENABLED=false\` while keeping original order and payment records intact.

## Supplier-backed ordering without a dated stock snapshot

The owner has selected supplier-assisted fulfilment. Set `supplyModel: "supplier_backed"` on a private offer only where the owner has expressly attested the supplier-backed arrangement and a maximum order-acceptance capacity. `availableQuantity` is an order-cap ceiling, **not** a claim of physically held or reserved stock. `evidence.stock` still requires `confirmed: true`, a named reviewer and a real reference, but no warehouse stock observation timestamp. The normal 48-hour rule remains mandatory for `stock_verified` offers.

The supplier-backed model projects `stockVerified:false`, `orderingCapacityOnly:true`, `supplierBackedOrdering:true`, and `supplyModel:"supplier_backed"`. The AWS offer verifier accepts this distinct model only when the remaining requirements are met. Public product controls disclose that availability is confirmed after purchase and refunds are issued if the seller cannot fulfil.

This change does **not** waive accurate retail pricing and VAT, complete mandatory online product information, product eligibility, permission to use manufacturer images, documented seller delivery support or the expiry of a consumer offer. It does not activate `MULTIBRAND_ENABLED`, insert a ledger record, enable medicine sales or change the existing Nutraxin checkout.


## Exact-GTIN private Trade price import

The original supplier workbooks and derived price schedule remain outside the repository. The private price draft has schema `novapharm-private-connective-price-draft-v1`, currency `GBP`, and records keyed by GTIN/SKU, with `pricingStatus` and `proposedNetMinor` (integer pence or null). The draft is not a public offer. For Trade-column matches the selected net selling price is copied exactly; for unit-price-only and missing-quote rows an independently reviewed selling price is required, never a guessed markup or silent use of acquisition cost.

The same authoritative offer admission command accepts an optional private draft:

```bash
node scripts/prepare-connective-retail-offers.mjs --root . \
  --catalogue src/content/approved-consumer-catalogue.json \
  --input /private/novapharm/offers.json \
  --price-draft /private/novapharm/checkout-price-draft.json
```

The join rejects duplicates, unmatched identities, conflicting reviewed prices and invalid VAT arithmetic. Gross pence is calculated only from the record's confirmed VAT evidence, including valid zero-rated exceptions. Price evidence, approved listing/label and image, delivery, eligibility and supply commitment still must pass the existing admission checks. No private workbook prices, source paths, or supplier costs are inserted into public HTML or static offer schema. The existing live retail offer endpoint remains the single authority for customer price and purchasing controls. No separate shopping bag is created.
