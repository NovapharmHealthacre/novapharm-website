# GBP signed paid-invoice assessment | Nov 12, 2026

## Root cause fixed in source
The owner-approved GBP subscription catalog was deployed in GitHub, but the independent pure paid-invoice assessor `src/core/intelligence-billing-reconciliation.mjs` retained two hard-coded INR checks. This caused legitimate GBP subscriber invoice and subscription-price data to be rejected. The atomic-ledger synthetic regression fixtures also referenced the superseded INR Starter Price ID.

This candidate changes both guards to **GBP**, updates exact approved live Starter/Enterprise Price IDs in *synthetic, no-network tests*, and explicitly denies old INR invoices, legacy Price IDs, and mismatching USD/EUR. Tests cover approved ownership, signed invoice events, paid current period, data-rights/tenant release gates and idempotent DynamoDB transaction preparation.

## Production boundary remains unchanged
The assessor returns **only** `readyForAtomicCommit`; it never authorises access, creates a Stripe charge or customer, or touches AWS. The separately deployed private billing reconciler is still **observe_only** and is not an operational paid-invoice-to-entitlement transaction worker. Stripe webhook quarantine, signed contract acceptance, verified Cognito MFA, owner/tenant/seat records, source licensing, tax/legal review, independent security, refunds, revocation and real browser acceptance are still release conditions. No customer billing or access switch is changed by this PR.
