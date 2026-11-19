# ESCO 373-product backend master (10 November 2026)

The merchant confirms that **Eastern Surgical Company (ESCO)** manufactures the 373 catalogue references, authorises **NP-ESCO-0001 through NP-ESCO-0373** as unique *NovaPharm internal* product codes, confirms each existing website GBP *base price*, and declares 10,000 planning units per reference.

Source-controlled generator: `node scripts/esco-product-master.mjs`. Verify with `node --test scripts/test-esco-product-master.mjs`. The generator uses exactly the website's `guideFor()` price calculation, so each approved base amount matches the customer storefront; it does not create a separate arbitrary pricing table.

The 373 records were created privately in AWS `eu-north-1` under the existing encrypted, versioned ESCO S3 bucket, key `catalogue/product-master/2026-11-10-v1.json`, with a pointer in SSM `/novapharm/production/esco/product-master`. This record is **not** the charge-authority manifest `approval_manifest` in `/novapharm/production/esco/checkout-policy`.

Record fields: catalogue ID, internal SKU, manufacturer, known manufacturer model (73 present, 300 unrecorded), name/category/subcategory, source catalogue, approved website GBP base price excluding VAT and delivery, owner-declared stock, and explicit release status.

**Card charging remains gated by individually verified saleable configuration, tax code, delivery commitment and product classification.** The two existing paid-checkout SKU records remain intact. Do not transfer master records into `approved_skus` by merely changing `payment_approved_in_this_record`; that boolean intentionally remains false. The production checkout backend must continue to enforce the separate protected payment policy.

No customer/supplier communication, Stripe product creation, test charge or email notification is part of this workflow.
