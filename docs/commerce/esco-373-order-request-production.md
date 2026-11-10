# ESCO ordering: all 373 requests, no fictitious card approvals

**Merchant instruction, 10 November 2026:** customers must be able to initiate procurement of every ESCO catalogue reference from one shopping Bag. There are 373 catalogue references, 73 with exact catalogue model codes; the other 300 lack manufacturer-level model identity. Only products individually authorised by the protected server may collect card payment.

## Customer flow

1. Customers browse all 373 product references across 12 ranges. Each card has **Add to Bag** and an owner-authorised GBP base price, **excluding UK delivery and VAT**. This is not a final payable total or inventory promise.
2. If all selected items are server-approved for fixed-price card checkout, the existing Stripe-hosted payment path is primary and unchanged.
3. Otherwise the Bag displays a short order-request form for **all 373** references: name, contact email, optional organisation, optional UK postcode and explicit acknowledgement that no payment or order acceptance is occurring yet.
4. The browser sends **only** catalogue IDs, quantities, customer contact fields and consent to the AWS \`POST /order-requests\` API. It cannot submit a price, tax code, card number, acceptance flag or inventory claim.
5. AWS validates each SKU is in \`ESCO-CAT-0001\` through \`ESCO-CAT-0373\`, up to 12 unique lines and 1–10,000 units per line (the existing paid checkout retains its stricter 1,000-unit limit). It writes an idempotent, timestamped \`RECEIVED_AWAITING_CONFIRMATION\` request to the encrypted ESCO DynamoDB ledger and returns a unique \`ESCO-REQ-UUID\` receipt.
6. A seller notification is attempted via SES to the configured NovaPharm inbox. SES in the account may still be sandboxed; failure to send the notification does **not** invalidate a stored request. The receipt must be retained by the customer, and staff can reconcile the ledger.
7. A customer can check the non-PII status with \`GET /order-request-status/{orderId}\`. It does not include buyer contact details.
8. Only after exact variant, supply, regulatory clearance, delivery and UK VAT are confirmed should a commercial operator accept the order and issue a binding fixed-price payment instruction. An order request is not a payment, stock reservation or accepted purchase.

## Security and operations

- Existing two approved card-checkout records continue to use the private SSM/S3 price authority and Stripe Checkout. No dynamic browser amount is trusted.
- Orders are stored in the existing isolated **SSE-enabled DynamoDB** table, under a separate \`REQUEST#ESCO-REQ-...\` partition key, never the payment ledger's \`ORDER#ESCO-...\` partition. Request records carry a 90-day expiry attribute; DynamoDB TTL deletion can be delayed by AWS.
- Public API accepts the storefront origin only, validates all fields and excludes honeypot submissions. API Gateway stage has burst and rate limits. This is a B2B order request, not an anonymous financial authorisation.
- Do not infer a physical stock allocation from the owner-declared planning amount of 10,000 units per reference. Do not issue automatic Stripe invoices for an unapproved device or product.
- Seller email confirmation is best-effort because SES production access is not enabled in the currently observed AWS account. The **DynamoDB record** is authoritative.
- For real buyer communications, ensure the configured staff email is delivered and assign an operations owner to the ledger before marketing the order request broadly.
- No new charge, refund or Stripe product price is created by submitting an order request.

## Verify

Run \`python -m unittest discover -s apps/esco-checkout -p 'test_*.py' -v\` and \`node --test scripts/test-esco-catalogue.mjs\`. Check that no buyer-entered amount or tax code is accepted, all 373 indices are valid, duplicates are idempotent, and only server-approved products can reach \`POST /checkout\`. Deployment via the protected CloudFormation \`infra/aws/esco-products-checkout-production.json\` includes new API routes, SES send permission constrained to NovaPharm's verified identity and 90-day request TTL.

**Definition of 'ready to order':** all 373 are able to submit an order request; only exact pre-authorised products can complete immediate paid checkout. Do not call an unverified item 'in stock', 'approved for immediate payment' or 'dispatch-ready'.
