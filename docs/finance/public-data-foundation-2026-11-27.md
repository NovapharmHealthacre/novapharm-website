# NovaPharm Finance — phase 1, in-house data foundation

This isolated implementation adds no dependencies, subscription, infrastructure, public route, checkout changes, bank writes, secret or customer data. The approved 36-workspace Apple-inspired prototype remains the UI design reference.

## Execute and test
- `node --test scripts/test-finance-public-data.mjs scripts/test-finance-inhouse-analytics.mjs`
- `node scripts/ingest-finance-public-data.mjs --live > /tmp/novapharm-finance-public-data.json`
- Inspect exit status, per-source status, observation periods, coverage, source attribution and rights. Never commit downloaded snapshots or private records. A successful fetch is not a production release.

## Implemented source adapters
- World Bank Indicators API: country metadata, GDP growth, inflation, FDI net inflows and population; exclude aggregate entities, retain most recent usable observation among the last five years. Annual observations are not real-time; dates may differ by country. FDI is not portfolio fund flow.
- ECB daily EUR reference rates: cross-rate calculations, publisher date and retrieved timestamp. These are informational and must not be used for execution, settlement or accounting without an independently approved rate policy.
- Sources: https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures ; https://www.worldbank.org/ext/en/legal/terms-conditions/datasets ; https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html ; https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html . World Bank third-party rights may differ. Review each series before enabling publication; current output explicitly sets publicationApproved=false.
- No fabricated or zero-filled data on errors. Each observation carries source and reporting period.

## In-house analytics
Contribution margin, deterministic liquidity scenarios and concentration/HHI functions, with integer monetary inputs. They require a validated same-currency, same-entity dataset. Unit tests use synthetic fixtures. No accounting posting, payment initiation or validated forecasting claims.

## Next engineering increments
1. Wire approved public observations to an authenticated Finance API and UI; show dates, missing/stale observations and source attribution. Reuse current design-system tokens and immutable deployment verification.
2. Add IMF, BIS, trade, SEC, ONS, central bank and pharma source adapters subject to series rights, rate limits and schema checks. Reuse existing Intelligence data pipeline. No invented market prices or flow corridors.
3. Inspect canonical WMS/order/Stripe/portal and ledger interfaces; read-only tenant-scoped adapters and reconciliations before financial write workflows. Preserve existing payments and warehouse controls.
4. Implement all 36 workspace services progressively: financial management, treasury, commercial finance, terminal, risk, governance. Add validated model inputs and audit trails.
5. Build independent relationship graph, opportunity scoring, scenarios and risk analytics. No proprietary data replication or unlicensed exchange quotes. Real-time exchange prices, bank connectivity and premium holdings cannot be manufactured in-house; leave unsupported fields unavailable.
6. Exact-head CI, source smoke evidence, secure authentication, tenant isolation, privacy and rollback required before production promotion. No new billed resources or DNS changes in this phase.
