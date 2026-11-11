# NovaPharm Intelligence forecasting release acceptance

**Status:** candidate seasonal-naive baseline; `productionApproved: false`. This is not an authorised customer forecasting feature or a calibrated predictive interval. Master evidence gate: #176 G1, G2, G4, G5, G7.

## Evidence required before production approval

1. **Rights:** legal/source owner provides source-by-source permitted-use record covering analytics, derivative metrics, forecasting, redistribution, geography, retention and customer access. Rights must be enforced by the server from durable records, not from caller-supplied boolean flags.
2. **Accepted history:** at least 36 consecutive distinct monthly observations for each medicine, jurisdiction, exact measure and unit (no inferred gaps, duplicates, synthetic samples, mixed EPD/PCA/SCMD or missing accepted-ingestion/provenance records). Reconcile source totals and mapping against original release identifiers; verify hash and source publication dates.
3. **Study design:** immutable training/validation cutoff, genuine held-out windows and rolling-origin backtests on multiple medicines and market segments. Compare seasonal-naive against a nonseasonal naive and a moving-average comparator. Document negative controls, sparse series, structural breaks and zero-demand cases.
4. **Uncertainty:** evaluate empirical 80% and 90% interval coverage, widths, subgroup stability and miscalibration on data **not reused for fitting the interval**. Candidate 12-month absolute-error bands are **not calibrated intervals**. Report bias, MAE, WAPE (when denominator nonzero), sMAPE, horizon-specific performance and coverage.
5. **Security:** enforce authenticated customer identity, role/tenant scopes, source entitlements and medicine-level access in production server routes; verify cross-tenant 403/404s with distinct test tenants. No direct public access to this evaluator.
6. **Operations:** model/version and input fingerprint audit, drift monitoring, freshness limits, retry/rate limits, downtime and no-data abstention, SLO alerts, rollback, cost controls and privacy review.
7. **Sign-off:** dated independent technical model validation, data owner/rights acceptance, security review, product owner approval and release smoke proof from actual production origin, with evidence URLs.

## Baseline implemented in PR #396

Pure Node 24 evaluator: gated 36–240 consecutive monthly data points; three 12-month seasonal-naive predictions; one 12-month holdout evaluation; MAE/sMAPE; visible uncalibrated absolute-error range; input fingerprint; fail-closed response; `customerForecastingEnabled: false` and `productionApproved: false`.

**Do not treat an accepted *evaluation request* as acceptance of input licensing, real observed data, model accuracy or model owner approval.** Synthetic regression fixtures demonstrate arithmetic/guard behavior only.

### Reproducible test

```sh
node --test scripts/test-medicine-forecast-baseline.mjs
```

A separate GitHub Actions check runs on relevant changed files. Final production approval is deliberately impossible in this candidate evaluator until the above independent evidence exists.
