# NovaPharm Intelligence | Stripe Billing release contract

**Status: PRELAUNCH, NOT ACTIVATED.** This document describes acceptance gates for a future authenticated subscription service. It does not authorise charging customers, grant medicines data rights or assert that production is live.

## Separation of responsibilities

- The public Starter / Professional / Enterprise pricing cards are **nonbinding plan enquiries**. Browser-selected plans, amounts and URLs are never authoritative billing or entitlement inputs.
- The server must persist a contract-approved checkout intent under an immutable opaque ID, with exact tenant, OIDC subject, plan, annual/monthly term, jurisdiction, tax basis and immutable Stripe Price ID obtained from a reviewed server catalogue. No guessed or public browser prices.
- Stripe-hosted Checkout (subscription mode) may begin only after a verified OIDC/MFA customer session, accepted commercial terms, source licensing and production-approved feature subset. Billing secrets live in a least-privilege secret manager, not the browser or repository.
- The webhook handler must verify the **exact raw body** using that endpoint's dedicated rotating Stripe-signing secret. Test and live events, account, customer and subscription must match separate authoritative billing ledgers. Ignore untrusted Stripe metadata, user-submitted emails and plan names for tenant rights.
- A signed `customer.subscription.updated` or `invoice.paid` event is **not** proof of activation. Place event IDs and business-object transitions into a durable unique-indexed ledger, reconcile asynchronously and idempotently, then check contract, paid state, cancellation dates, invoice tax, chargebacks/refunds, accepted licensed datasets, enabled feature flags and known OIDC user/tenant before granting any entitlement.
- Refund, past-due, canceled and expired subscriptions revoke access promptly under policy. An event replay must never mint a second customer, invoice, entitlement or outbound confirmation. Enterprise rights and quota require signed individual contracts, never an implied unlimited allowance.
- Stripe's existing Nutraxin and ESCO physical-goods payment endpoints, secrets, products and event ledgers must remain isolated from Intelligence subscriptions.

## Operational release proof required

1. Approved production domain, valid HTTPS and actual Medicines Terminal/API serving runtime, including unauthorized 401/403 and explicit `Cache-Control: no-store`.
2. Real Cognito/Entra OIDC login with MFA, aud/iss/nonce validation, revocable durable server sessions, CSRF, negative tenant and cross-user access tests.
3. Accepted data licences and actual dated source records; NOVA RAG and forecasts only for independently approved rights and versioned models.
4. Configured and verified merchant Stripe Billing products, Prices, tax and invoice policies; approved service-specific webhook URL and signing secret; Stripe-hosted customer portal and cancellation/renewal handling.
5. Full zero-charge synthetic checkout, signed-webhook replay/out-of-order tests, same-tenant grants, expiry/revocation, end-to-end test purchase/renewal/refund, notification and reconciliation.
6. Signed production deployment evidence: exact source SHA, container digest, source licences, monitoring and alerts, backups/restore, disaster recovery, rollback, acceptance owner and release window.

**Current code boundary:** `src/core/intelligence-subscription-entitlements.mjs` and `src/core/intelligence-billing-events.mjs` are pure server-side policy/verification modules. They are not connected to production routes, do not store events or initiate Stripe Checkout, and always produce no access grant from an incoming webhook alone.
