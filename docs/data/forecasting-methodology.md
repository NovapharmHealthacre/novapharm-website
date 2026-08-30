# Forecasting Methodology

Status date: 2026-08-24

## Current state

The repository contains a tested numerical baseline engine. It does not yet contain an approved medicine-demand forecast, NovaPharm sales forecast, or production model run because the required historical national facts and commercial inputs have not been backfilled and accepted.

No forecast value is fabricated to populate the Portal. The Forecasts view remains an explicit unavailable state.

## Two forecasts, never one

### NHS demand forecas

Answers a bounded question about future prescribing or dispensing activity for an explicitly defined source measure. It must retain source, geography, medicine level, unit, coverage, period, and provisional/final status.

### NovaPharm sales forecas

Answers what NovaPharm might realistically sell. It may use a governed NHS-demand forecast as one input, but it also requires approved evidence for product scope, authorisation, availability, inventory, supplier capacity, lead time, costs, prices, margin, account coverage, historical conversion, expected share, and commercial constraints.

Total NHS prescribing or dispensing must never be relabelled as obtainable NovaPharm sales.

## Implemented baseline

`packages/medicines-intelligence/src/forecasting.ts` currently implements:

- monthly non-negative time-series validation;
- a minimum of six ordered observations;
- seasonal-naive and Holt linear candidates;
- seasonal-naive only when at least two complete configured seasons are present;
- bounded Holt alpha/beta grid selection by sum of squared errors;
- rolling-origin one-step backtesting;
- model selection by lowest WAPE, then MAE;
- MAE, WAPE, sMAPE, bias, interval coverage, and observation count;
- residual-based 95% prediction intervals widened by horizon;
- forecast horizons from one to 24 months;
- a feature cut-off that cannot exceed the training cut-off; and
- bottom-up reconciliation for aligned child forecast points.

Model version: `novapharm-baseline-forecast-v1`.

This is ordinary numerical code. An LLM does not generate the forecast.

## Validation method

For each modelled series:

1. Define the source fact, measure, unit, entity level, period, and accepted history.
2. Establish the as-of date and exclude information not genuinely available then.
3. Create rolling origins using only history available at each origin.
4. Score candidates on held-out observations.
5. Select by WAPE then MAE, while reporting the full metric set.
6. Fit the selected model to the accepted training window.
7. publish point values and uncertainty together, never point precision alone;
8. record model, data, feature, and code versions; and
9. monitor error and interval coverage by horizon after actuals arrive.

WAPE is not used alone. Low-volume series, structural breaks, zero-heavy history, source changes, code changes, and provisional revisions require explicit review.

## Feature and leakage controls

Potential features are eligible only when causally or operationally defensible and historically available at the forecast cut-off. They may include registered population, age/sex mix, seasonality, momentum, relevant QOF prevalence, presentation mix, organisation changes, deprivation, rurality, and secondary-care context.

Rules:

- a model trained as of month T may not use a later publication or corrected relationship;
- current organisation mappings may not rewrite historic periods;
- QOF context does not prove individual diagnosis or causation;
- product, stock, price, customer, and campaign variables belong only in the governed commercial model;
- campaign outcomes unavailable at the historical cut-off cannot train that origin;
- missing nation or period data is not synthetically filled to create apparent coverage; and
- source revisions trigger reproducible re-evaluation, not silent replacement.

## Hierarchy and coherence

Where sufficient accepted coverage exists, forecasts may be reconciled across defensible hierarchies such as England to region to ICB to practice, or chemical to presentation. Reconciliation requires common periods, common units, stable definitions, and recorded coverage. Values from prescribing, dispensing, or secondary-care datasets are not added merely because their labels appear related.

## Decision and communication controls

Every displayed forecast must identify:

- whether it is NHS demand or NovaPharm sales;
- observed history and forecast boundary;
- source and unit;
- training and feature cut-offs;
- model and version;
- prediction interval and horizon;
- rolling-backtest quality;
- assumptions and material limitations;
- provisional or revised source status; and
- owner/reviewer and generated time.

The AI analyst, if later enabled, may explain a governed result but cannot alter, invent, or conceal its values.

## Promotion gate

A model remains non-production until:

- full accepted historical facts exist for the intended scope;
- data-quality and revision behaviour are understood;
- leakage tests pass;
- backtests cover relevant horizons and segments;
- baseline comparisons and error thresholds are approved;
- intervals are calibrated sufficiently for the stated use;
- bias, stability, and low-volume behaviour are reviewed;
- commercial assumptions are versioned where applicable;
- access, audit, monitoring, rollback, and human decision boundaries pass staging; and
- the named model owner accepts the release.

Current result: repository engine complete; analytical backfill and model acceptance pending; no production forecast exists.
