# Private Stripe billing observer | GBP migration

12 November 2026. Owner-approved live GBP Stripe Price IDs replaced obsolete INR IDs and currency checks in the observer. All five current Stripe GBP prices were independently verified against products, amounts, billing intervals and exclusive tax behaviour.

**Scope: safe verification only.** The observer continues to require `NPI_BILLING_RECONCILIATION_MODE=observe_only` and `NPI_CUSTOMER_ACCESS_ENABLED=false`. It cannot grant any customer entitlement, send emails, create a subscription, charge money or perform a ledger mutation.

CI checks the five exact GBP IDs against the server catalogue; rejects old INR invoices, mismatching price currency and old INR prices; and retains foreign-account, fake-payment, missing-owner, replay and synthetic-event denial. This is not a live payment reconciliation worker or production deployment.

After approval, deploy an immutable exact-SHA observer candidate, then separately implement and validate Stripe-paid-invoice-to-entitlement transactional writing with revocation, tenant and MFA checks, source licence acceptance, secure Checkout, portal, invoices, tax and restore. Neither this PR nor a passing suite authorizes enabling customer flags.
