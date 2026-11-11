# NovaPharm Intelligence: atomic paid-invoice reconciliation

**Status: code candidate only; not a launched customer subscription processor.**

The signed Intelligence Stripe Billing webhook presently persists live event IDs and types in a DynamoDB quarantine table. It does not issue entitlements. The pure `assessIntelligencePaidInvoice()` contract is also not a payment processor. This new module supplies a **server-only** DynamoDB transaction preparation and private injected commit boundary. Nothing in this release creates public routes, Stripe customers, charges, subscriptions, accounts, emails, or access grants.

## Authority chain

1. The separately deployed live webhook verifies Stripe signatures, live mode and event type before quarantining events. Synthetic/mocked events must never issue real entitlements.
2. A future private reconciliation worker must retrieve the event from quarantine and independently fetch the Stripe **live** subscription and latest paid invoice with an approved restricted key. It must hydrate approved tenant ownership, member/seat, accepted contract, source-rights, risk and rollback records from authoritative stores, not browser metadata or Stripe metadata.
3. `assessIntelligencePaidInvoice()` rejects unpaid, stale, cross-tenant, wrong-price, refunded/disputed, unlicensed or non-current subscriptions.
4. `prepareIntelligenceBillingAtomicCommit()` additionally enforces every launch and governance approval flag, accepted feature quota, approved member/seat and independent event authenticity. It assembles one transactional AWS DynamoDB operation across the customer-access and signed-event quarantine tables.
5. Transactional **condition checks** fence owner approval, contract, seat revision, global source-rights governance, refund/dispute/payment-failure risk, and existing pending/active billing revision. The same atomic transaction consumes a previously unprocessed, non-synthetic `invoice.paid` quarantine event, advances the matching billing period and writes a redacted audit record.
6. The private `commitIntelligenceBillingAtomicLedger()` performs no database work without an injected trusted `transactWrite` adapter. Any conditional transaction failure is denied. Successful persistence still returns `grantsCustomerAccess: false`: downstream live session, seat, quota, source-specific rights and every customer API must be separately authorised at request time.

## Required before production activation

- Independently accept real organisation ownership, Cognito MFA, seats, signed commercial contract, current billing price/currency/tax and source-specific data rights.
- Provision an approved **pending** billing record with fixed ownership, subscription and version, plus a private revisioned risk ledger and product/source rights.
- Deploy a private worker with tightly scoped `dynamodb:TransactWriteItems` on the exact two tables; verify transaction conditions on real provisioned records. No public HTTP endpoint, no broad cross-tenant scans.
- Implement signed webhook event ingestion, live Stripe object re-fetch, reconciliation retry/dead-letter, monotonic ordering, fresh risk updates for failure/dispute/refund/cancellation, and idempotent reversals. Never call this positive invoice path for a failed payment.
- Test the worker end to end with approved actual Stripe events, two tenants, rate limiting, replay, wrong-owner, refund, cancellation, expiration, seat revocation, source expiry, parallel request races and PITR/rollback.
- Activate a real customer only after independent acceptance and exact deployed SHA, and preserve cancellation management when medicine data rights are suspended.

**Current deployment remains default-deny.** Do not create fake paid customers, send unsolicited email, mutate Stripe live prices/products, activate checkout or claim subscription launch completion from this code alone.
