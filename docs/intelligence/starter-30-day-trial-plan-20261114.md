# NovaPharm Intelligence: Starter 30-day free trial proposal
Date: 2026-11-14. SOURCE-ONLY / DEFAULT-OFF. Not live.

Offer: first 30 days free, 25 governed medicine searches total for the entire trial, one trial per verified organisation. No card required and NO automatic charging or subscription. Users must actively opt in to a subsequent paid plan via an independently authorised, real Stripe Checkout.

Keep existing owner-approved GBP price IDs and values unchanged: Starter £199/month or £2,030/year; Professional £699/month or £7,130/year; Enterprise indicative from £2,799/month, contract only, taxes extra where applicable. Never present this as live trial availability while customer access remains gated.

Backend design: src/core/intelligence-free-trial.mjs evaluates verified organisation/terms/one-time usage and a private signed/verified trial grant. The existing customer entitlement decision delegates only independently verified 'verified-free-trial-ledger' grants to the new policy, and still requires MFA, tenant alignment, production-approved features, source rights, finite cumulative quota, and a separate default-off trial release gate. It cannot create accounts, issue sessions, grant trials, contact customers, activate subscriptions or charge cards.

Production prerequisites: finish issue #433 including customer-session callbacks, authenticated access, real accepted source observations and rights, MFA and 2-tenant test; create strongly consistent atomic one-per-organisation trial issuance and cumulative quota enforcement; approve trial terms/privacy/tax/retention and cost/rate/abuse controls; verify exact SHA, domain, expiry, account isolation and explicit upgrade in a live acceptance test. Current £0 *additional* AWS budget is not evidence of £0 marginal cost; keep the release flag OFF until confirmed.

Analytics proposal: privacy-governed signup -> approved first query -> day 7 activated -> trial completion -> explicit paid conversion -> paid retention at days 30/90; also provider cost per activated organisation, refusal/revocation rate, and search quota. Do not send emails or publish trial offer as available without owner release signoff.

The unified customer portal and Nutraxin/ESCO checkout are unaffected.

## Source-only conditional DynamoDB transaction preparation

`src/core/intelligence-trial-ledger.mjs` now prepares (without executing) a two-item DynamoDB conditional transaction for the permanent one-trial-per-organisation sentinel and cumulative usage record. It also prepares a three-item search reservation transaction: verify active/expiry and subject; conditionally increment the 25-search total; and write a unique request ID for replay suppression. The private backend must still implement strongly consistent loading, safe retries, audit/recovery, customer-session binding, denial on transaction failure and cost controls. Transaction preparation is NOT ledger activation, entitlement issuance or an approved customer launch.

The permanent sentinel is intentionally never TTL-deleted. A 30-day trial cannot be renewed by creating a second account. The existing source and tenant access gates remain independently authoritative.
