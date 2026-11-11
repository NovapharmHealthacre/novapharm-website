# Nutraxin live inventory authority and fulfilment boundaries

Reviewed: 11 November 2026. Production region: eu-north-1.

## Verified AWS deployment

- CloudFormation stack: `novapharm-production-nutraxin-inventory-v2`.
- DynamoDB: `novapharm-production-nutraxin-inventory`, 19 SKU records.
- Quantity: 10,000 **owner-declared units per SKU**, 190,000 in total; not independently audited. These are actual persisted AWS entries, not fabricated payments or shipments.
- Fields include `declaredOnHandUnits`, `reservedUnits`, `fulfilledUnits`, `returnedUnits`, `reconciliationRequired=true`, original seller authority, and `warehouseLocation=not_provided`.
- On-demand billing, deletion protection, point-in-time backups, table streams and resource retention configured.

## Important limits

1. The public catalogue and Stripe checkout are **not yet consuming this new table for atomic allocation**. It is an inventory baseline, not a claim that 190,000 units are reservable or that fulfilment can be automated.
2. Do not decrement inventory upon a browser's checkout click or an unpaid session. Only verified, idempotent, signed paid webhooks may allocate; cancellation, refund and disputes require state transitions with seller review.
3. Track batch/lot, expiry, warehouse location, actual quantity and carrier tracking before promising dispatch; none were invented.
4. `docs/products/nutraxin-label-review-20261111.json` contains 19 product label-review decisions; no approved back-label evidence has been received. Twelve catalogue discrepancies remain, one critical.
5. Customer emails and supplier emails are not permitted without recipient-and-message-specific approval. The payment notification sender remains disabled.
6. The rolled-back provisional stack `novapharm-production-nutraxin-inventory` was not a successful deployment. The working CloudFormation stack is the `-v2` version above.

## Next controlled engineering phase

Introduce lot-aware available-to-promise with conditional or transactional reservations. Reconcile the payment ledger with inventory changes, add fulfilment and carrier-event ingestion, run controlled negative and reconciliation tests, and independently accept UK labels, food business status, VAT details and returns instructions before a 100% consumer commerce claim.
