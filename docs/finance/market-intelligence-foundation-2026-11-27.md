# Finance market intelligence foundation
Independent of PR #1289, to avoid restarting its CI. This is a read-only source increment, not a deployed API or UI. No new billable resources or private data.

Run `node --test scripts/test-finance-market-intelligence.mjs` and explicitly run `node scripts/ingest-finance-treasury.mjs --live` in an authorized environment for genuine-source evidence. Do not commit snapshots. Publisher documentation: https://fiscaldata.treasury.gov/api-documentation/ ; https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/ ; https://fiscaldata.treasury.gov/datasets/average-interest-rates-treasury-securities/ .

Daily federal debt uses exact decimal strings and component reconciliation. Monthly average interest on outstanding debt is not a market yield or real-time quote. Separate sources fail independently. Review terms and freshness prior to publication.

The country-layer contract consumes compatible World Bank observations and a governed ISO3 country registry. It supports GDP growth, inflation, annual FDI and population. Explicit reporting year, missing observations, stale observations, coverage and deterministic ranks are returned. The preliminary age thresholds (2 years for GDP/inflation/population; 3 for FDI) are engineering defaults, not validated economic models. No fabricated corridors or opportunity index. FDI is not portfolio investment or live flow. Historical snapshots beyond the latest observation require future ingestion work.

Next: connect governed authenticated application read routes, wire the approved map UI to these objects, verify publisher response evidence, expand country-series and capital-flow sources, then integrate internal finance data using existing authorization and reconciliation controls. No production routing, checkout, WMS or banking modifications in this PR.
