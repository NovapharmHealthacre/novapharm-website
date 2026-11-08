# Nutraxin controlled paid-order release

Architecture: private IAM-invoked production Checkout Lambda, approved B2B account through Cognito, protected production payment ledger, hosted Stripe Checkout and separately signed production webhook. No public payment API or direct staff-free override.

The customer portal verifies Cognito business approval and original request ownership before invoking the private worker. It never receives the live Stripe API key or signing secret; its IAM role can only invoke the named production checkout Lambda, not edit the production ledger.

A customer sees Pay securely only after staff have marked that exact authenticated request APPROVED_FOR_PAYMENT. The worker independently reads the corresponding production DynamoDB record at ORDER#<receipt_id> / SUMMARY, matching the Cognito subject. It requires: approvedForPayment, stockReserved, taxAndShippingVerified, customerAcceptedTerms, commerciallyApproved, UK/GBP, valid quoteVersion, sellerApprovalReference, deliveryQuoteReference, taxAssessmentReference, fulfilmentApprovalReference, expiry and exact reconciled totals. None of these approval flags or amounts comes from the browser.

For live payment the final amount must equal approved product net plus approved tax plus approved gross shipping, and separately equal sum of approved gross line items in integer GBP pence. Each approved Nutraxin SKU must have 1-10,000 units. If shipping is charged it is a separately identified approved delivery line. Stripe session creation uses the exact server-approved gross amounts and a stable idempotency key; the durable attempt and Stripe session mapping are saved before returning a hosted Checkout URL.

The customer's browser redirect is not proof of payment. The distinct signed webhook authenticates Stripe's raw-body HMAC and reconciles a matching session, exact gross amount, customer, order, currency and quote version before a conditional transactional update to the protected ledger and manual outbox. No automatic fulfilment is triggered.

Critical production gates: verified 19 SKU commercial cost / current dispatch quote and any pick/pack/storage expenses; appropriate HMRC and SKU tax classification despite Stripe Tax being active; real sellable stock or confirmed manufacturing lead time and buyer acceptance; eligible UK Nutraxin product sales; compliant legal/refund/delivery terms; confirmed approved business account; a completed signed Checkout session / payment / refund acceptance test. Existing unapproved requests in the staging portal MUST NOT be upgraded to approved without those checks.

Deploy private worker stack infra/aws/nutraxin-approved-checkout-production.json, then portal update infra/aws/nutraxin-customer-staging-stack.json. The private worker has no API Gateway route. All secrets are read at runtime from AWS Secrets Manager only and must never be printed.

Until a fully authorised order exists and actual payment settlement is verified, state 'live checkout infrastructure deployed, customer charging not yet proven/available'. Do not claim the 25% take-home margin, final stock availability or legal VAT treatment are guaranteed by the provisional register.
