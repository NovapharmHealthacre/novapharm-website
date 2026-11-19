# Nutraxin production payment persistence foundation

This stack reserves **empty**, protected DynamoDB storage in AWS eu-north-1. Deploying it does **not** activate Stripe Checkout or grant an application access to the tables.

- CloudFormation template: `infra/aws/nutraxin-production-payment-ledger.json`.
- Stack name: `novapharm-production-nutraxin-payment-ledger`.
- Resources: `novapharm-production-nutraxin-payment-ledger` and `novapharm-production-nutraxin-payment-outbox`.
- Security: DynamoDB encryption at rest, point-in-time recovery, deletion protection, CloudFormation retention, no IAM access grants and no public endpoints, credentials or hardcoded prices.
- Data: never store card number, CVV, bank coordinates, full Stripe API keys or raw personal/customer documents.

## Proposed application transaction invariants (not wired yet)

1. A verified, approved customer sees only their tenant-scoped server-stored quote. The final order must have confirmed SKU, item prices, shipping, tax treatment, availability or manufacturing lead time and expiry.
2. A transactional write reserves a unique active payment attempt against `pk=ORDER#<id>`, `sk=ATTEMPT#<id>`; the order record uses `sk=SUMMARY`. Concurrent attempts must be rejected unless a prior attempt is terminal.
3. A Stripe session is created using a server-only, least-privilege restricted key retrieved from AWS Secrets Manager and an idempotency key. Persist the mapping `pk=STRIPE_SESSION#<session-id>`, `sk=META` with `attribute_not_exists(pk)` before returning a hosted Checkout URL. Never interpret the browser success redirect as proof of payment.
4. The webhook verifies the **raw** Stripe signature and expiry, reconciles session/account/order/currency/amount and atomically writes a once-only `pk=STRIPE_EVENT#<event-id>`, `sk=META` record alongside payment state changes and a durable outbox item.
5. A private outbox consumer handles dispatch instructions, paid-order notifications, refunds, disputes and exception escalation. No fulfilment starts from a raw unsigned callback.
6. Use atomic DynamoDB `TransactWriteItems` with conditional expressions and consistent reads. Implement rejection/retry/duplicate delivery contracts. Protect personally identifiable and commercial data through tenant filters and least-privilege role permissions.
7. Store confirmed business tax decisions separately from illustrative 20% VAT quotes; never collect an unverified VAT charge or issue invoices before HMRC status and product tax classification are confirmed.
8. Production default remains `PAYMENTS_ENABLED=false`. None of the above steps, other than storage creation, is implemented by this stack. Real charging requires verified webhook, complete transactional persistence and an approved release.

No plaintext API credentials are accessed or copied by this stack.
