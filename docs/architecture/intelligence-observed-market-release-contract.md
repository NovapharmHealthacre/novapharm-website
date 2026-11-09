# Medicines Terminal | Observed market and geography release contract

**Status: source-conditional implementation.** These display and query controls are not an assertion that NHSBSA/ONS real production data is accepted, licensed or deployed.

## Server-authoritative observed facts

- Keep the medicine identity, source ID, accepted reporting period, geography level and latest permitted source refresh explicit in every protected API response.
- Sort only columns present in a fixed server allowlist, and apply ASC/DESC and stable deterministic tie-breakers **before** LIMIT/OFFSET pagination. Unknown sort keys, scopes, data sources, user SQL fragments and contradictory page parameters must fail closed.
- The UI must display the returned sorting field/order and server page/grain; never re-sort a paginated client subset and claim a complete geographic ranking.
- Show observed NHSBSA EPD/PCA quantities and ONS-linked population denominators only once licence, date, vocabulary identity, deduplication, suppression and ICB boundary version reconcile; distinguish count, spend, rates and currency.
- Each observed trend must use real dated source periods and original values, source ID and metric/unit, source refresh and an accessible tabular equivalent. Missing periods remain missing. No automatically interpolated synthetic line or AI-generated confidence interval may be presented as observed evidence.
- Forecasts belong in a different evidence class with model version, accepted history, temporal backtests and calibrated intervals. The observed trend graphic must never silently substitute predictions, commercial assumptions or invented demonstrations.

## Production acceptance

1. A real authorised OIDC/MFA board session and negative public/other-tenant tests, with versioned source identity.
2. A date-scoped real UK medicine and all underlying raw/mapped source records, with reproducible server sorting across first/second/last page.
3. A 12-period (or source-appropriate) actual observed series with missingness handling and identical labelled values across chart, table and CSV.
4. Source provenance, licensing/scope review, refresh monitoring, sample-vs-live isolation and accessibility checks.
5. Final source SHA, exact-head full CI, deployed app URL and protected production smoke test. Until then, the feature is repository-ready only.

Relates to release tracker #176. Original source-specific candidate PRs #219 and #221 are superseded by the reconciled implementation.
