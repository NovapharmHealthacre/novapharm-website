# Spain — official AEMPS CIMA live pharmaceutical source evidence

**Scope date:** 18 November 2026. **Country:** Spain (ES). **Source:** AEMPS CIMA public REST service, in the original 101-source registry under `europe-spain-aemps-cima`.

## Publisher-verified source (no private AWS connectivity required)

The Spanish medicines regulator lists CIMA among its open data and REST services: https://sede.aemps.gob.es/datos-abiertos/ . Its official CIMA endpoint https://cima.aemps.es/cima/rest/medicamento?nregistro=51347 returned real JSON for a registered medicine, with native `nregistro` registration identity, `nombre` medicine name, `principiosActivos` active ingredient entries, `presentaciones[].cn` national presentation identifiers and regulatory/prescription attributes. The exact sample registration number comes from CIMA's official REST documentation.

**Important:** CIMA describes authorisation/registration; it is **not a live community pharmacy inventory, procurement quotation, supply guarantee, NHS UK licence, prescribing dataset, drug-interaction decision, or clinically approved AI result**.

## GitHub implementation

- `src/core/intelligence-es-cima-public-live-probe.mjs`: fixed official HTTPS URL, one source record, no user-origin URL or credentials, hard redirect denial, 20s deadline, 64 KiB streamed UTF-8 JSON bound, strict source registration and presentation/ingredient schema, SHA-256 digest over upstream response bytes.
- `scripts/test-intelligence-es-cima-public-live-probe.mjs`: exact registry-country binding; synthetic positive example; negative tests for source ID substitution, malformed medicine IDs, unsafe names, MIME, oversized responses, redirects, transport leaks and clock rollback.
- `scripts/run-intelligence-es-cima-public-live-probe.mjs`: executes actual public-source GET, emits only an evidence receipt with timestamp, digest, size, and validated count, never raw pharmaceutical records.
- `.github/workflows/intelligence-es-cima-public-live-probe.yml`: Node 24 contract tests + real publisher HTTP one-record verification. Stores only a 7-day non-publishable receipt. This is **source-live**, not **NovaPharm-production-live**.

## Source rights and production limitations

AEMPS's official open-data page explains its public sources are reusable by citizens and companies and notes that attribution may apply. The CIMA website and general AEMPS legal notice, rights of third parties, logos, medicine label text, downstream commercial/AI redistribution, rate limits and data vintage need independent legal review before any retained bulk data is admitted.

No licence approval, production ingest, data warehouse storage, authenticated customer route, prescriber decision, signed iOS/Android release, source-data re-distribution, or AWS deployment is implemented here. Country-specific verified production status remains **0%** pending protected release evidence.

**Next steps:** Finish exact-head CI real source call, formalise publisher legal rights and provenance, bind an approved versioned source snapshot to source rights and data quality gates, perform safe staging ingestion and source-native identity matching, test customer roles and audit logs, and separately verify production deployment and rollback.

**Related work:** #808 global-source issue; #839 country register; #844 official FDA and Singapore live-source and quarantine candidate.

### GitHub Actions network failure and remediation (18 November 2026)

The first complete CI run passed all six synthetic source contract tests but its real public GET failed after the previous 8s deadline; the source's actual GitHub-runner connectivity was **not** verified. For the next exact-head run the deadline is increased to a bounded 20s and Node.js 24 `NODE_USE_ENV_PROXY=1` is enabled so an existing trusted runner proxy, when present, can be used by built-in `fetch`; no proxy is installed or provisioned and no secrets are printed. The real-response check remains mandatory. If GitHub network access is blocked, this PR must stay unmerged rather than treating upstream documentation or synthetic fixtures as live production data.
