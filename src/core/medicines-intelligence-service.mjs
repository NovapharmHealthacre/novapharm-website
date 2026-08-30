import { all, nowIso, one } from "../data/database.mjs";
import { distanceKm, normaliseAnalyticsQuery, normaliseNearbyQuery } from "./medicines-query-contract.mjs";

function forbidden() {
  return Object.assign(new Error("You do not have permission to use Medicines Intelligence."), { statusCode: 403 });
}

function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function notFound() {
  return Object.assign(new Error("Medicine identity not found."), { statusCode: 404 });
}

function requireExecutive(context) {
  if (!context.accessScopes?.includes("board") && !context.accessScopes?.includes("admin")) throw forbidden();
}

function normaliseSearch(value) {
  return String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/gu, " ").trim();
}

function escapedLike(value) {
  return value.replace(/[\\%_]/gu, "\\$&");
}

async function medicineSearchRows(whereSql, whereParams, term, limit) {
  return all(`WITH matched AS (
      SELECT medicine_id, MIN(CASE WHEN normalised_alias = ? THEN 0 ELSE 1 END) AS relevance
      FROM medicine_aliases WHERE ${whereSql} GROUP BY medicine_id
    )
    SELECT dm.medicine_id, dm.canonical_name,
      MAX(CASE WHEN aliases.alias_type = 'BNF_PRESENTATION_CODE' THEN aliases.alias_text END) AS bnf_presentation_code,
      MAX(CASE WHEN aliases.alias_type = 'BNF_PRODUCT' THEN aliases.alias_text END) AS product_name,
      MAX(CASE WHEN aliases.alias_type = 'BNF_PRODUCT_CODE' THEN aliases.alias_text END) AS product_code,
      MAX(CASE WHEN aliases.alias_type = 'BNF_CHEMICAL_SUBSTANCE' THEN aliases.alias_text END) AS chemical_substance,
      MAX(CASE WHEN aliases.alias_type = 'BNF_CHEMICAL_SUBSTANCE_CODE' THEN aliases.alias_text END) AS chemical_substance_code,
      matched.relevance
    FROM matched JOIN dim_medicine dm ON dm.medicine_id = matched.medicine_id AND dm.valid_to IS NULL
    JOIN medicine_aliases aliases ON aliases.medicine_id = dm.medicine_id
    GROUP BY dm.medicine_id, dm.canonical_name, matched.relevance
    ORDER BY matched.relevance, dm.canonical_name, bnf_presentation_code LIMIT ?`, term, ...whereParams, limit);
}

function intersect(left, right) {
  if (left === null) return new Set(right);
  return new Set([...left].filter((value) => right.has(value)));
}

async function medicineIdsForFilters(filters) {
  let candidates = filters.medicineId ? new Set([filters.medicineId]) : null;
  const aliasFilters = [
    ["BNF_CHEMICAL_SUBSTANCE", filters.chemicalSubstance],
    ["BNF_CHEMICAL_SUBSTANCE_CODE", filters.chemicalSubstanceCode],
    ["BNF_PRESENTATION_NAME", filters.presentationName],
    ["BNF_PRESENTATION_CODE", filters.presentationCode],
  ];
  for (const [type, sourceValue] of aliasFilters) {
    if (!sourceValue) continue;
    const normalised = normaliseSearch(sourceValue);
    const rows = await all(`SELECT DISTINCT dm.medicine_id FROM dim_medicine dm
      JOIN medicine_aliases ma ON ma.medicine_id = dm.medicine_id
      WHERE dm.valid_to IS NULL AND ma.valid_to IS NULL AND ma.alias_type = ? AND ma.normalised_alias = ?
      ORDER BY dm.medicine_id LIMIT 1001`, type, normalised);
    candidates = intersect(candidates, new Set(rows.map((row) => row.medicine_id)));
  }
  if (filters.snomedCode) {
    const rows = await all("SELECT medicine_id FROM dim_medicine WHERE valid_to IS NULL AND snomed_code = ? ORDER BY medicine_id LIMIT 1001", filters.snomedCode);
    candidates = intersect(candidates, new Set(rows.map((row) => row.medicine_id)));
  }
  if (filters.supplier) {
    const rows = await all(`SELECT medicine_id FROM dim_medicine WHERE valid_to IS NULL AND lower(supplier_name) = lower(?)
      UNION SELECT medicine_id FROM mart_medicine_supplier_month WHERE lower(supplier_name) = lower(?)
      UNION SELECT medicine_id FROM intelligence_mart_medicine_source_supplier_month WHERE lower(supplier_name) = lower(?)
      ORDER BY medicine_id LIMIT 1001`, filters.supplier, filters.supplier, filters.supplier);
    candidates = intersect(candidates, new Set(rows.map((row) => row.medicine_id)));
  }
  for (const [sourceValue, lengths] of [[filters.bnfChapter, [2]], [filters.bnfSection, [4]], [filters.bnfParagraph, [4, 6]]]) {
    if (!sourceValue) continue;
    const placeholders = lengths.map(() => "?").join(", ");
    const nodes = await all(`SELECT DISTINCT bnf_code FROM dim_bnf WHERE valid_to IS NULL
      AND bnf_level IN (${placeholders}) AND (lower(bnf_code) = lower(?) OR lower(bnf_name) = lower(?))
      ORDER BY bnf_code LIMIT 100`, ...lengths, sourceValue, sourceValue);
    if (!nodes.length) {
      candidates = new Set();
      continue;
    }
    const codeConditions = nodes.map(() => "ma.alias_text LIKE ? ESCAPE '\\'").join(" OR ");
    const rows = await all(`SELECT DISTINCT dm.medicine_id FROM dim_medicine dm
      JOIN medicine_aliases ma ON ma.medicine_id = dm.medicine_id
      WHERE dm.valid_to IS NULL AND ma.valid_to IS NULL AND ma.alias_type = 'BNF_PRESENTATION_CODE'
      AND (${codeConditions}) ORDER BY dm.medicine_id LIMIT 1001`, ...nodes.map((node) => `${escapedLike(node.bnf_code)}%`));
    candidates = intersect(candidates, new Set(rows.map((row) => row.medicine_id)));
  }
  const result = [...(candidates ?? [])];
  if (result.length > 1_000) throw invalid("The medicine filters are too broad. Select a presentation or add another medicine filter.");
  if (filters.medicineId && result.length) {
    const exists = await one("SELECT medicine_id FROM dim_medicine WHERE medicine_id = ? AND valid_to IS NULL", filters.medicineId);
    if (!exists) return [];
  }
  return result;
}

function analyticsMetric(metric, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  const expressions = {
    items: `SUM(${prefix}items)`, quantity: `SUM(${prefix}quantity)`, nic: `SUM(${prefix}nic)`, actual_cost: `SUM(${prefix}actual_cost)`,
    items_per_1000: `CASE WHEN MAX(${prefix}registered_population) > 0 THEN SUM(${prefix}items) * 1000.0 / MAX(${prefix}registered_population) ELSE NULL END`,
  };
  return expressions[metric];
}

function analyticalSourceState(rowCount, sourceAvailable) {
  if (rowCount > 0) return "accepted_facts";
  return sourceAvailable ? "no_matching_facts" : "source_not_ingested";
}

function section(title, columns, rows, emptyState, { source = "Governed medicines analytics boundary", description = "" } = {}) {
  return { title, description, columns, rows, emptyState, source, rowCount: rows.length };
}

function metric(key, label, value) {
  return { key, label, value: Number(value || 0), format: "number", href: null };
}

function occurredAfter(left, right) {
  if (!left) return false;
  if (!right) return true;
  return Date.parse(left) > Date.parse(right);
}

function sourceHealthRows(registryRows, resourcePeriods, ingestionRuns, schemaVersions) {
  const periodBySource = new Map(resourcePeriods.map((row) => [row.source_id, row.latest_resource_period]));
  const runsBySource = new Map();
  for (const run of ingestionRuns) {
    const existing = runsBySource.get(run.source_id) || [];
    existing.push(run);
    runsBySource.set(run.source_id, existing);
  }
  const schemaBySource = new Map();
  for (const schema of schemaVersions) if (!schemaBySource.has(schema.source_id)) schemaBySource.set(schema.source_id, schema);
  return registryRows.map((source) => {
    const runs = runsBySource.get(source.source_id) || [];
    const latestSuccessful = runs.find((run) => run.status === "succeeded" || run.status === "partial") || null;
    const latestPublished = runs.find((run) => (run.status === "succeeded" || run.status === "partial") && !String(run.run_kind).includes("validation_sample")) || null;
    const latestValidationSample = runs.find((run) => (run.status === "succeeded" || run.status === "partial") && String(run.run_kind).includes("validation_sample")) || null;
    const latestFailed = runs.find((run) => run.status === "failed") || null;
    const schema = schemaBySource.get(source.source_id) || null;
    const discovered = source.latest_discovered_period || periodBySource.get(source.source_id) || null;
    const expected = source.latest_expected_period || discovered;
    const ingested = latestPublished?.reporting_period || null;
    const failureIsCurrent = occurredAfter(latestFailed?.completed_at, latestSuccessful?.completed_at);
    let status = source.status;
    if (failureIsCurrent) status = "failed";
    else if (latestPublished?.status === "partial") status = "partially_ingested";
    else if (latestPublished?.status === "succeeded") status = "ingested";
    else if (latestValidationSample) status = "sample_validated";
    let freshness = "not_evaluated";
    if (failureIsCurrent) freshness = "attention_required";
    else if (latestValidationSample && !latestPublished) freshness = "backfill_pending";
    else if (expected && discovered && expected !== discovered) freshness = "discovery_lag";
    else if (discovered && ingested !== discovered) freshness = "ingestion_lag";
    else if (latestPublished) freshness = "current_at_last_review";
    else if (source.status === "credentials_required" || source.status === "licence_required") freshness = "externally_blocked";
    else if (source.status === "documented_adapter_pending") freshness = "adapter_pending";
    else freshness = "not_ingested";
    let dataQuality = "not_ingested";
    if (schema?.compatibility_status === "schema_review_required") dataQuality = "schema_review_required";
    else if (latestPublished?.status === "partial" || Number(latestPublished?.rejected_rows || 0) > 0) dataQuality = "accepted_with_governed_rejections";
    else if (latestPublished?.status === "succeeded") dataQuality = "validated";
    else if (latestValidationSample) dataQuality = "validation_sample_only";
    let nextAction = "Review source readiness";
    if (failureIsCurrent) nextAction = "Investigate the latest failed run";
    else if (schema?.compatibility_status === "schema_review_required") nextAction = "Review schema drift before publication";
    else if (source.status === "credentials_required") nextAction = "Complete approved server-side API onboarding";
    else if (source.status === "licence_required") nextAction = "Obtain and approve the source licence";
    else if (source.status === "documented_adapter_pending") nextAction = "Implement and validate the governed adapter";
    else if (source.status === "source_review_required") nextAction = "Resolve source discovery evidence";
    else if (latestValidationSample && !latestPublished) nextAction = "Run the governed national backfill and reconciliation";
    else if (discovered && ingested !== discovered) nextAction = "Run the governed backfill and reconciliation";
    else if (latestPublished) nextAction = "Monitor the next publisher release";
    return {
      source_id: source.source_id, dataset_name: source.dataset_name,
      latest_expected_period: expected, latest_discovered_period: discovered,
      latest_ingested_period: ingested, status, freshness,
      last_successful_run: latestSuccessful?.completed_at || null,
      last_failed_run: latestFailed?.completed_at || null,
      schema_status: schema?.compatibility_status || "not_validated",
      row_count: (latestPublished ?? latestValidationSample)?.accepted_rows ?? null,
      data_quality_status: dataQuality, next_action: nextAction,
    };
  });
}

async function platformSummary() {
  const [counts, availability, countries, registryRows, resourcePeriods, ingestionRuns, schemaVersions, latest, population] = await Promise.all([
    one(`SELECT
      (SELECT COUNT(*) FROM dim_medicine WHERE source_id = 'nhsbsa.bnf-current' AND valid_to IS NULL) AS medicines,
      (SELECT COUNT(*) FROM dim_bnf WHERE source_id = 'nhsbsa.bnf-current' AND valid_to IS NULL) AS bnf_nodes,
      (SELECT COUNT(*) FROM pharmacies) AS pharmacies,
      (SELECT COUNT(*) FROM pharmacies WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS geocoded_pharmacies,
      (SELECT COUNT(*) FROM dim_practices WHERE valid_to IS NULL) AS practices,
      (SELECT COUNT(*) FROM dim_practices WHERE valid_to IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL) AS geocoded_practices,
      (SELECT COUNT(*) FROM dim_practices WHERE valid_to IS NULL AND registered_population IS NOT NULL) AS population_linked_practices,
      (SELECT COUNT(*) FROM pharmacies WHERE email_status = 'VERIFIED REAL EMAIL' AND public_business_email IS NOT NULL) AS verified_business_emails,
      (SELECT COUNT(*) FROM pharmacies WHERE public_business_email IS NULL AND email_status LIKE 'ACTIONED%') AS blank_actioned_emails,
      (SELECT COUNT(*) FROM pharmacies WHERE customer_status = 'customer') AS linked_customers,
      (SELECT COUNT(*) FROM pharmacies WHERE customer_status = 'prospect') AS linked_prospects,
      (SELECT COUNT(*) FROM pharmacies WHERE marketing_eligible = 1 AND opt_out = 0 AND suppressed_at IS NULL) AS marketing_eligible,
      (SELECT COUNT(*) FROM dim_postcode WHERE terminated_at IS NOT NULL) AS terminated_postcodes,
      (SELECT COUNT(*) FROM data_source_registry) AS governed_sources`),
    one(`SELECT
      CASE WHEN EXISTS(SELECT 1 FROM intelligence_epd_facts fact JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
        WHERE run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%') THEN 1 ELSE 0 END AS epd,
      CASE WHEN EXISTS(SELECT 1 FROM intelligence_pca_facts fact JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
        WHERE run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%') THEN 1 ELSE 0 END AS pca,
      CASE WHEN EXISTS(SELECT 1 FROM fact_scmd_secondary_care fact JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
        WHERE run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%') THEN 1 ELSE 0 END AS scmd,
      CASE WHEN EXISTS(SELECT 1 FROM fact_hospital_community_dispensing fact JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
        WHERE run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%') THEN 1 ELSE 0 END AS hospital_community,
      CASE WHEN EXISTS(SELECT 1 FROM practice_population_history) THEN 1 ELSE 0 END AS registered_population,
      CASE WHEN EXISTS(SELECT 1 FROM forecast_values) THEN 1 ELSE 0 END AS forecasts,
      CASE WHEN EXISTS(SELECT 1 FROM mart_pharmacy_medicine_opportunity) THEN 1 ELSE 0 END AS opportunities,
      CASE WHEN EXISTS(SELECT 1 FROM intelligence_campaigns WHERE status = 'approved') THEN 1 ELSE 0 END AS approved_campaigns`),
    all(`SELECT country, COUNT(*) AS pharmacies,
      SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS geocoded,
      SUM(CASE WHEN email_status = 'VERIFIED REAL EMAIL' AND public_business_email IS NOT NULL THEN 1 ELSE 0 END) AS verified_business_emails
      FROM pharmacies GROUP BY country ORDER BY country`),
    all(`SELECT ds.source_id, ds.publisher, ds.dataset_name, ds.jurisdiction, ds.status,
      ds.last_checked_at, ds.last_successfully_ingested_at, ds.latest_expected_period,
      ds.latest_discovered_period, ds.period_state_evaluated_at
      FROM data_source_registry ds ORDER BY ds.authority_rank, ds.publisher, ds.dataset_name`),
    all(`SELECT source_id, MAX(reporting_period) AS latest_resource_period
      FROM source_resources GROUP BY source_id`),
    all(`SELECT ir.source_id, ir.run_kind, ir.status, ir.started_at, ir.completed_at, ir.accepted_rows, ir.rejected_rows,
      sr.reporting_period FROM ingestion_runs ir LEFT JOIN source_resources sr ON sr.id = ir.source_resource_id
      ORDER BY ir.source_id, ir.started_at DESC`),
    all(`SELECT source_id, compatibility_status, first_seen_at, reviewed_at
      FROM source_schema_versions ORDER BY source_id, first_seen_at DESC`),
    one(`SELECT (SELECT MAX(last_successfully_ingested_at) FROM data_source_registry) AS data_freshness,
      (SELECT MAX(reporting_period) FROM source_resources WHERE source_id = 'nhsbsa.bnf-current') AS bnf_period,
      (SELECT MAX(imported_at) FROM pharmacy_imports) AS pharmacy_imported_at,
      (SELECT MAX(month_key) FROM practice_population_history) AS registered_population_period`),
    one(`SELECT pph.month_key AS reporting_period, COUNT(*) AS practices,
      SUM(pph.registered_population) AS registered_population,
      SUM(CASE WHEN pph.practice_id IS NOT NULL THEN 1 ELSE 0 END) AS matched_practices,
      (SELECT COUNT(*) FROM population_age_sex_history bands WHERE bands.month_key = pph.month_key) AS age_sex_rows,
      (SELECT COUNT(*) FROM practice_monthly_mapping mappings WHERE mappings.month_key = pph.month_key) AS mapping_rows
      FROM practice_population_history pph GROUP BY pph.month_key ORDER BY pph.month_key DESC LIMIT 1`),
  ]);
  return { counts: counts ?? {}, availability: availability ?? {}, countries,
    sources: sourceHealthRows(registryRows, resourcePeriods, ingestionRuns, schemaVersions),
    latest: latest ?? {}, population: population ?? {} };
}

export async function medicinesIntelligenceModuleView(snapshot) {
  const summary = await platformSummary();
  const governedEvidenceLoaded = Number(summary.counts.medicines) > 0 || Number(summary.counts.pharmacies) > 0 || Number(summary.counts.governed_sources) > 0;
  const capabilityRows = [
    { capability: "Medicine search", state: Number(summary.counts.medicines) > 0 ? "repository_validated" : "no_catalogue", evidence: `${Number(summary.counts.medicines || 0).toLocaleString("en-GB")} current BNF presentations` },
    { capability: "Pharmacy geography", state: Number(summary.counts.geocoded_pharmacies) === Number(summary.counts.pharmacies) && Number(summary.counts.pharmacies) > 0 ? "repository_validated" : "incomplete", evidence: `${Number(summary.counts.geocoded_pharmacies || 0).toLocaleString("en-GB")} of ${Number(summary.counts.pharmacies || 0).toLocaleString("en-GB")} postcode centroids` },
    { capability: "Registered practice population", state: Number(summary.availability.registered_population) ? "repository_validated" : "not_ingested", evidence: Number(summary.availability.registered_population) ? `${Number(summary.population.practices || 0).toLocaleString("en-GB")} practice totals with contemporaneous mapping for ${summary.population.reporting_period}` : "No monthly registered-population snapshot has completed governed ingestion" },
    { capability: "Prescribing and dispensing facts", state: Number(summary.availability.epd) || Number(summary.availability.pca) ? "available" : "not_ingested", evidence: "No national fact history is presented until a governed EPD or PCA ingest succeeds" },
    { capability: "Forecasts", state: Number(summary.availability.forecasts) ? "available" : "not_computed", evidence: "Forecasting requires leakage-safe historical facts and accepted backtests" },
    { capability: "Commercial opportunities", state: Number(summary.availability.opportunities) ? "available" : "not_scored", evidence: "No medicine-to-pharmacy score exists without demand, distance and commercial evidence" },
    { capability: "Campaigns", state: Number(summary.availability.approved_campaigns) ? "approved_records_available" : "no_approved_campaign", evidence: "All imported pharmacy contacts remain marketing-ineligible by default" },
  ];
  const contactEvidenceRows = [
    { evidence_state: "Verified public non-NHS business email", records: Number(summary.counts.verified_business_emails || 0), operational_meaning: "Evidence-backed contact value; not automatic marketing permission" },
    { evidence_state: "Research actioned, no new evidence", records: Number(summary.counts.blank_actioned_emails || 0), operational_meaning: "Address remains blank and is queued for evidence-led review" },
    { evidence_state: "Linked customer", records: Number(summary.counts.linked_customers || 0), operational_meaning: "Requires separately authorised commercial system evidence" },
    { evidence_state: "Linked prospect", records: Number(summary.counts.linked_prospects || 0), operational_meaning: "Requires separately authorised commercial system evidence" },
    { evidence_state: "Marketing eligible", records: Number(summary.counts.marketing_eligible || 0), operational_meaning: "Fails closed until legal, suppression and campaign approval gates pass" },
  ];
  return {
    ...snapshot,
    dataState: governedEvidenceLoaded ? "authoritative_non_production_validation" : "governed_sources_not_loaded",
    dataFreshness: summary.latest.data_freshness || summary.latest.pharmacy_imported_at || snapshot.dataFreshness,
    readOnly: true,
    actions: [],
    metrics: [
      metric("medicines", "Medicine presentations", summary.counts.medicines),
      metric("pharmacies", "Pharmacy records", summary.counts.pharmacies),
      metric("population-linked-practices", "Population-linked practices", summary.counts.population_linked_practices),
      metric("governed-sources", "Governed sources", summary.counts.governed_sources),
    ],
    sections: [
      section("Platform readiness", [["capability", "Capability"], ["state", "State", "status"], ["evidence", "Evidence"]], capabilityRows, "No medicines-intelligence capability evidence is recorded.", { description: "Repository capability and production operation are deliberately separate states." }),
      section("Pharmacy geography", [["country", "Nation"], ["pharmacies", "Pharmacies", "number"], ["geocoded", "Geocoded", "number"], ["verified_business_emails", "Workbook-verified business emails", "number"]], summary.countries, "No pharmacy records are imported.", { source: "Owner-supplied pharmacy master and ONS postcode geography" }),
      section("Pharmacy contact evidence", [["evidence_state", "Evidence state"], ["records", "Records", "number"], ["operational_meaning", "Operational meaning"]], contactEvidenceRows, "No pharmacy contact evidence is recorded.", { source: "Owner-supplied pharmacy master and governed contact evidence", description: "Contact evidence, customer state and marketing permission remain separate facts." }),
      section("Practice population context", [["reporting_period", "Period"], ["practices", "Practice totals", "number"], ["registered_population", "Registered population", "number"], ["matched_practices", "Matched practices", "number"], ["age_sex_rows", "Age and sex rows", "number"], ["mapping_rows", "Monthly mappings", "number"]], summary.population.reporting_period ? [summary.population] : [], "No registered-practice population snapshot is ingested.", { source: "NHS England Patients Registered at a GP Practice", description: "Published aggregate counts and monthly organisation mapping; practice postcode is not patient residence." }),
      section("Data sources and quality", [["dataset_name", "Source"], ["latest_expected_period", "Expected"], ["latest_discovered_period", "Discovered"], ["latest_ingested_period", "Ingested"], ["status", "Status", "status"], ["freshness", "Freshness", "status"], ["last_successful_run", "Last success"], ["last_failed_run", "Last failure"], ["schema_status", "Schema", "status"], ["row_count", "Rows", "number"], ["data_quality_status", "Data quality", "status"], ["next_action", "Next action"]], summary.sources, "No governed source registry is available.", { source: "Governed source, resource, schema and ingestion ledgers", description: "Expected, discovered and ingested periods are distinct. Missing evidence remains visible rather than being inferred as complete." }),
    ],
    notices: [
      "Current BNF identity, the supplied UK pharmacy master, ONS postcode geography and the latest validated registered-practice population snapshot are authoritative repository-validation inputs; this is not a production deployment claim.",
      "Prescribing, community dispensing, secondary care, NovaPharm sales, stock and customer facts remain separate. No absent fact is replaced with a synthetic value.",
      "Postcode coordinates are centroids, not premises surveys or patient-home locations. Pharmacy proximity never proves medicine dispensing.",
      `BNF catalogue period: ${summary.latest.bnf_period || "not available"}. Marketing-eligible contacts: ${Number(summary.counts.marketing_eligible || 0).toLocaleString("en-GB")}.`,
      `Registered-practice population period: ${summary.latest.registered_population_period || "not available"}. The values are aggregate practice-list counts, not patient records.`,
      "Current release classification: informational only. Production identity, managed analytics storage, scheduled ingestion and owner acceptance remain external gates.",
    ],
  };
}

export async function searchMedicines(query, context, requestedLimit = 30) {
  requireExecutive(context);
  const term = normaliseSearch(query);
  if (term.length < 2 || term.length > 120) throw invalid("Enter between 2 and 120 characters to search medicine identities.");
  const limit = Number(requestedLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw invalid("Medicine search limit is invalid.");
  const prefixRows = await medicineSearchRows(
    "normalised_alias >= ? AND normalised_alias < ?",
    [term, `${term}\uffff`],
    term,
    limit,
  );
  const escaped = escapedLike(term);
  const rows = prefixRows.length ? prefixRows : await medicineSearchRows(
    "normalised_alias LIKE ? ESCAPE '\\'",
    [`%${escaped}%`],
    term,
    limit,
  );
  const source = await one(`SELECT
    (SELECT MAX(reporting_period) FROM source_resources WHERE source_id = 'nhsbsa.bnf-current') AS period,
    (SELECT MAX(source_last_seen_at) FROM dim_medicine WHERE source_id = 'nhsbsa.bnf-current') AS freshness`);
  return {
    query: String(query).trim(), normalisedQuery: term, source: "NHSBSA BNF Code Information - Current Year",
    sourcePeriod: source?.period || null, demandFactsIncluded: false, results: rows.map((row) => ({
      medicineId: row.medicine_id, canonicalName: row.canonical_name, presentationCode: row.bnf_presentation_code,
      productName: row.product_name, productCode: row.product_code, chemicalSubstance: row.chemical_substance,
      chemicalSubstanceCode: row.chemical_substance_code, identityStatus: "bnf_current_identity_only",
    })), dataFreshness: source?.freshness || null, generatedAt: nowIso(),
  };
}

export async function medicineIdentityDetail(medicineId, context) {
  requireExecutive(context);
  const id = String(medicineId ?? "").trim();
  if (!/^medicine-[a-f0-9]{32}$/u.test(id)) throw invalid("Medicine identity is invalid.");
  const medicine = await one(`SELECT medicine_id, canonical_name, medicine_level, snomed_code, dm_d_status,
    supplier_name, formulation, route, strength, unit_of_measure, valid_from, valid_to, source_id, source_last_seen_at
    FROM dim_medicine WHERE medicine_id = ?`, id);
  if (!medicine) throw notFound();
  const [aliases, codeHistory, factState] = await Promise.all([
    all("SELECT alias_type, alias_text, valid_from, valid_to FROM medicine_aliases WHERE medicine_id = ? ORDER BY alias_type, alias_text", id),
    all("SELECT code_system, code_value, code_level, valid_from, valid_to, change_reason FROM medicine_code_history WHERE medicine_id = ? ORDER BY valid_from DESC, code_system", id),
    one(`SELECT
      CASE WHEN EXISTS(SELECT 1 FROM intelligence_epd_facts fact JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
        WHERE fact.medicine_id = ? AND run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%') THEN 1 ELSE 0 END AS epd,
      CASE WHEN EXISTS(SELECT 1 FROM intelligence_pca_facts fact JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
        WHERE fact.medicine_id = ? AND run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%') THEN 1 ELSE 0 END AS pca,
      CASE WHEN EXISTS(SELECT 1 FROM fact_scmd_secondary_care fact JOIN ingestion_runs run ON run.id = fact.ingestion_run_id
        WHERE fact.medicine_id = ? AND run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%') THEN 1 ELSE 0 END AS scmd,
      CASE WHEN EXISTS(SELECT 1 FROM forecast_values WHERE entity_type = 'medicine' AND entity_id = ?) THEN 1 ELSE 0 END AS forecast`, id, id, id, id),
  ]);
  const latestCode = codeHistory.find((entry) => entry.code_system === "BNF" && entry.code_level === "BNF_PRESENTATION");
  const hierarchy = [];
  let node = latestCode ? await one("SELECT bnf_id, bnf_code, bnf_name, bnf_level, parent_bnf_id, valid_from, valid_to FROM dim_bnf WHERE bnf_code = ? AND valid_from = ?", latestCode.code_value, latestCode.valid_from) : null;
  while (node && hierarchy.length < 15) {
    hierarchy.unshift({ code: node.bnf_code, name: node.bnf_name, level: node.bnf_level, validFrom: node.valid_from, validTo: node.valid_to });
    node = node.parent_bnf_id ? await one("SELECT bnf_id, bnf_code, bnf_name, bnf_level, parent_bnf_id, valid_from, valid_to FROM dim_bnf WHERE bnf_id = ?", node.parent_bnf_id) : null;
  }
  return {
    medicine: { medicineId: medicine.medicine_id, canonicalName: medicine.canonical_name, medicineLevel: medicine.medicine_level,
      snomedCode: medicine.snomed_code, dmDStatus: medicine.dm_d_status, supplierName: medicine.supplier_name,
      formulation: medicine.formulation, route: medicine.route, strength: medicine.strength, unitOfMeasure: medicine.unit_of_measure,
      validFrom: medicine.valid_from, validTo: medicine.valid_to, sourceId: medicine.source_id, sourceLastSeenAt: medicine.source_last_seen_at },
    aliases, codeHistory, hierarchy,
    analyticalAvailability: { epd: Boolean(factState?.epd), pca: Boolean(factState?.pca), scmd: Boolean(factState?.scmd), forecast: Boolean(factState?.forecast) },
    limitations: [
      "This identity result does not assert prescribing, dispensing, sales, stock or product availability.",
      "SNOMED and dm+d fields remain absent until their separately governed source mapping is ingested.",
      "Current BNF identity is not used to rewrite historical source coding.",
    ],
    dataFreshness: medicine.source_last_seen_at,
    generatedAt: nowIso(),
  };
}

function epdScope(query, medicineIds) {
  const conditions = [`f.medicine_id IN (${medicineIds.map(() => "?").join(", ")})`, "ir.status = 'succeeded'", "ir.run_kind NOT LIKE '%validation_sample%'"];
  const params = [...medicineIds];
  const addTextFilter = (value, sql) => {
    if (!value) return;
    conditions.push(sql);
    params.push(value, value);
  };
  if (query.filters.startMonth) { conditions.push("f.month_key >= ?"); params.push(query.filters.startMonth); }
  if (query.filters.endMonth) { conditions.push("f.month_key <= ?"); params.push(query.filters.endMonth); }
  addTextFilter(query.filters.region, "(lower(COALESCE(f.regional_office_code, mapping.commissioning_region_code)) = lower(?) OR lower(COALESCE(f.regional_office_name, mapping.commissioning_region_name)) = lower(?))");
  addTextFilter(query.filters.icb, "(lower(COALESCE(f.icb_code, mapping.icb_code)) = lower(?) OR lower(COALESCE(f.icb_name, mapping.icb_name)) = lower(?))");
  if (query.filters.practiceCode) { conditions.push("f.practice_id IS NOT NULL AND lower(COALESCE(f.practice_code, practice.practice_code)) = lower(?)"); params.push(query.filters.practiceCode); }
  if (query.filters.postcode) { conditions.push("f.practice_id IS NOT NULL AND COALESCE(f.practice_postcode, postcode.postcode_normalised) = ?"); params.push(query.filters.postcode); }
  const metric = query.metric === "items_per_1000"
    ? "CASE WHEN MAX(population.registered_population) > 0 THEN SUM(f.items) * 1000.0 / MAX(population.registered_population) ELSE NULL END"
    : analyticsMetric(query.metric, "f");
  return {
    sourceId: "nhsbsa.epd",
    source: "NHSBSA English Prescribing Dataset",
    params,
    cte: `WITH scoped AS (
      SELECT f.month_key, f.medicine_id, medicine.canonical_name, f.practice_id,
        CASE WHEN f.practice_id IS NOT NULL THEN COALESCE(f.practice_code, practice.practice_code) END AS practice_code,
        CASE WHEN f.practice_id IS NOT NULL THEN COALESCE(f.practice_name, practice.practice_name) END AS practice_name,
        CASE WHEN f.practice_id IS NOT NULL THEN COALESCE(f.practice_postcode, postcode.postcode_normalised) END AS practice_postcode,
        COALESCE(f.icb_code, mapping.icb_code) AS icb_code,
        COALESCE(f.icb_name, mapping.icb_name) AS icb_name,
        COALESCE(f.regional_office_code, mapping.commissioning_region_code) AS region_code,
        COALESCE(f.regional_office_name, mapping.commissioning_region_name) AS region_name,
        SUM(f.items) AS items, SUM(f.quantity) AS quantity, SUM(f.nic) AS nic, SUM(f.actual_cost) AS actual_cost,
        MAX(population.registered_population) AS registered_population, ${metric} AS metric_value,
        MAX(ir.source_cutoff_at) AS source_cutoff_at
      FROM intelligence_epd_facts f
      JOIN ingestion_runs ir ON ir.id = f.ingestion_run_id
      JOIN dim_medicine medicine ON medicine.medicine_id = f.medicine_id
      LEFT JOIN dim_practices practice ON practice.practice_id = f.practice_id
      LEFT JOIN dim_postcode postcode ON postcode.postcode_id = practice.postcode_id
      LEFT JOIN practice_monthly_mapping mapping ON f.practice_id IS NOT NULL
        AND mapping.practice_code = COALESCE(f.practice_code, practice.practice_code) AND mapping.month_key = f.month_key
      LEFT JOIN practice_population_history population ON f.practice_id IS NOT NULL
        AND population.practice_code = COALESCE(f.practice_code, practice.practice_code) AND population.month_key = f.month_key
      WHERE ${conditions.join(" AND ")}
      GROUP BY f.month_key, f.medicine_id, medicine.canonical_name, f.practice_id,
        CASE WHEN f.practice_id IS NOT NULL THEN COALESCE(f.practice_code, practice.practice_code) END,
        CASE WHEN f.practice_id IS NOT NULL THEN COALESCE(f.practice_name, practice.practice_name) END,
        CASE WHEN f.practice_id IS NOT NULL THEN COALESCE(f.practice_postcode, postcode.postcode_normalised) END,
        COALESCE(f.icb_code, mapping.icb_code), COALESCE(f.icb_name, mapping.icb_name),
        COALESCE(f.regional_office_code, mapping.commissioning_region_code),
        COALESCE(f.regional_office_name, mapping.commissioning_region_name)
    ), scoped_population AS (
      SELECT month_key, practice_id, MAX(icb_code) AS icb_code,
        MAX(registered_population) AS registered_population
      FROM scoped
      WHERE practice_id IS NOT NULL AND registered_population > 0
      GROUP BY month_key, practice_id
    )`,
    columns: ["month_key", "medicine_id", "canonical_name", "practice_id", "practice_code", "practice_name", "practice_postcode", "icb_code", "icb_name", "region_code", "region_name", "items", "quantity", "nic", "actual_cost", "registered_population", "metric_value", "source_cutoff_at"],
  };
}

function pcaScope(query, medicineIds) {
  const conditions = [`f.medicine_id IN (${medicineIds.map(() => "?").join(", ")})`, "ir.status = 'succeeded'", "ir.run_kind NOT LIKE '%validation_sample%'"];
  const params = [...medicineIds];
  const addGeographyFilter = (value) => {
    if (!value) return;
    conditions.push("(lower(COALESCE(f.icb_code, geography.geography_code)) = lower(?) OR lower(COALESCE(f.icb_name, geography.geography_name)) = lower(?) OR lower(COALESCE(f.region_code, parent.geography_code)) = lower(?) OR lower(COALESCE(f.region_name, parent.geography_name)) = lower(?))");
    params.push(value, value, value, value);
  };
  if (query.filters.startMonth) { conditions.push("f.month_key >= ?"); params.push(query.filters.startMonth); }
  if (query.filters.endMonth) { conditions.push("f.month_key <= ?"); params.push(query.filters.endMonth); }
  addGeographyFilter(query.filters.region);
  addGeographyFilter(query.filters.icb);
  return {
    sourceId: "nhsbsa.pca",
    source: "NHSBSA Prescription Cost Analysis Monthly Administrative Data",
    params,
    cte: `WITH scoped AS (
      SELECT f.month_key, f.medicine_id, medicine.canonical_name, f.geography_id,
        CASE WHEN f.icb_code IS NOT NULL THEN 'ICB' WHEN f.region_code IS NOT NULL THEN 'NHS_REGION' ELSE geography.geography_type END AS geography_type,
        COALESCE(f.icb_code, f.region_code, geography.geography_code) AS geography_code,
        COALESCE(f.icb_name, f.region_name, geography.geography_name) AS geography_name,
        SUM(f.items) AS items, SUM(f.quantity) AS quantity, SUM(f.nic) AS nic, SUM(f.actual_cost) AS actual_cost,
        NULL AS registered_population, ${analyticsMetric(query.metric, "f")} AS metric_value,
        MAX(ir.source_cutoff_at) AS source_cutoff_at
      FROM intelligence_pca_facts f
      JOIN ingestion_runs ir ON ir.id = f.ingestion_run_id
      JOIN dim_medicine medicine ON medicine.medicine_id = f.medicine_id
      LEFT JOIN dim_geography geography ON geography.geography_id = f.geography_id
      LEFT JOIN dim_geography parent ON parent.geography_id = geography.parent_geography_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY f.month_key, f.medicine_id, medicine.canonical_name, f.geography_id,
        CASE WHEN f.icb_code IS NOT NULL THEN 'ICB' WHEN f.region_code IS NOT NULL THEN 'NHS_REGION' ELSE geography.geography_type END,
        COALESCE(f.icb_code, f.region_code, geography.geography_code),
        COALESCE(f.icb_name, f.region_name, geography.geography_name)
    )`,
    columns: ["month_key", "medicine_id", "canonical_name", "geography_type", "geography_code", "geography_name", "items", "quantity", "nic", "actual_cost", "registered_population", "metric_value", "source_cutoff_at"],
  };
}

function emptyAnalyticsSummary() {
  return {
    totalItems: null,
    totalQuantity: null,
    totalNic: null,
    totalActualCost: null,
    practiceCount: null,
    geographyCount: null,
    latestItemsPer1000: null,
    firstMonth: null,
    latestMonth: null,
    sourceCutoffAt: null,
  };
}

function normaliseAnalyticsSummary(row, hasFacts) {
  if (!hasFacts || !row) return emptyAnalyticsSummary();
  const numberOrNull = (value) => value === null || value === undefined ? null : Number(value);
  return {
    totalItems: numberOrNull(row.total_items),
    totalQuantity: numberOrNull(row.total_quantity),
    totalNic: numberOrNull(row.total_nic),
    totalActualCost: numberOrNull(row.total_actual_cost),
    practiceCount: numberOrNull(row.practice_count),
    geographyCount: numberOrNull(row.geography_count),
    latestItemsPer1000: numberOrNull(row.latest_items_per_1000),
    firstMonth: row.first_month || null,
    latestMonth: row.latest_month || null,
    sourceCutoffAt: row.source_cutoff_at || null,
  };
}

function breakdownMetric(metric, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return metric === "items_per_1000"
    ? `CASE WHEN SUM(${prefix}registered_population) > 0 THEN SUM(${prefix}items) * 1000.0 / SUM(${prefix}registered_population) ELSE NULL END`
    : analyticsMetric(metric, alias);
}

export async function queryMedicineAnalytics(input, context) {
  requireExecutive(context);
  let query;
  try { query = normaliseAnalyticsQuery(input); } catch (error) { throw invalid(error.message); }
  const medicineIds = await medicineIdsForFilters(query.filters);
  const scope = query.dataset === "epd" ? epdScope(query, medicineIds.length ? medicineIds : ["medicine-no-match"]) : pcaScope(query, medicineIds.length ? medicineIds : ["medicine-no-match"]);
  const sourceAvailable = await one(`SELECT CASE WHEN EXISTS(
    SELECT 1 FROM ingestion_runs ir
    WHERE ir.source_id = ? AND ir.status = 'succeeded' AND ir.run_kind NOT LIKE '%validation_sample%'
      AND COALESCE(ir.accepted_rows, 0) > 0
  ) THEN 1 ELSE 0 END AS available`, scope.sourceId);
  if (!medicineIds.length) {
    const reconciliationApplicable = query.metric !== "items_per_1000";
    return { query, source: scope.source, sourcePeriods: [], dataState: analyticalSourceState(0, Boolean(sourceAvailable?.available)), rows: [], series: [],
      summary: emptyAnalyticsSummary(), breakdowns: { geographies: [], presentations: [], practices: [] },
      pagination: { page: query.page, pageSize: query.pageSize, totalRows: 0, totalPages: 0 },
      reconciliation: { applicable: reconciliationApplicable, tableTotal: reconciliationApplicable ? 0 : null, seriesTotal: reconciliationApplicable ? 0 : null, reconciles: reconciliationApplicable ? true : null, seriesTruncated: false },
      limitations: ["No current canonical medicine identity matched every supplied medicine filter.", "No result is imputed from a similar medicine name or code."], generatedAt: nowIso() };
  }
  const firstRow = (query.page - 1) * query.pageSize + 1;
  const lastRow = firstRow + query.pageSize - 1;
  const isEpd = query.dataset === "epd";
  const selectedMetric = breakdownMetric(query.metric, "scoped");
  const summaryQuery = `${scope.cte} SELECT
    SUM(items) AS total_items, SUM(quantity) AS total_quantity, SUM(nic) AS total_nic,
    SUM(actual_cost) AS total_actual_cost,
    ${isEpd ? "COUNT(DISTINCT practice_id)" : "NULL"} AS practice_count,
    COUNT(DISTINCT ${isEpd ? "icb_code" : "geography_code"}) AS geography_count,
    ${isEpd ? `(SELECT CASE WHEN SUM(latest.items) > 0 AND MAX(denominator.registered_population) > 0
      THEN SUM(latest.items) * 1000.0 / MAX(denominator.registered_population) ELSE NULL END
      FROM scoped latest CROSS JOIN (
        SELECT SUM(registered_population) AS registered_population FROM scoped_population
        WHERE month_key = (SELECT MAX(month_key) FROM scoped)
      ) denominator WHERE latest.month_key = (SELECT MAX(month_key) FROM scoped))` : "NULL"} AS latest_items_per_1000,
    MIN(month_key) AS first_month, MAX(month_key) AS latest_month,
    MAX(source_cutoff_at) AS source_cutoff_at FROM scoped`;
  const geographyCode = isEpd ? "scoped.icb_code" : "scoped.geography_code";
  const geographyName = isEpd ? "scoped.icb_name" : "scoped.geography_name";
  const rateByGeography = isEpd && query.metric === "items_per_1000";
  const geographyQuery = `${scope.cte}${rateByGeography ? `, geography_population AS (
      SELECT icb_code, SUM(registered_population) AS registered_population
      FROM scoped_population WHERE icb_code IS NOT NULL GROUP BY icb_code
    )` : ""} SELECT
    ${geographyCode} AS code,
    ${geographyName} AS name,
    SUM(scoped.items) AS items, SUM(scoped.quantity) AS quantity, SUM(scoped.nic) AS nic,
    SUM(scoped.actual_cost) AS actual_cost,
    ${rateByGeography
      ? "CASE WHEN MAX(geography_population.registered_population) > 0 THEN SUM(scoped.items) * 1000.0 / MAX(geography_population.registered_population) ELSE NULL END"
      : selectedMetric} AS selected_metric
    FROM scoped${rateByGeography ? " LEFT JOIN geography_population ON geography_population.icb_code = scoped.icb_code" : ""}
    WHERE ${geographyCode} IS NOT NULL
    GROUP BY ${geographyCode}, ${geographyName}
    ORDER BY selected_metric DESC, name LIMIT 8`;
  const presentationQuery = `${scope.cte} SELECT medicine_id, canonical_name,
    SUM(scoped.items) AS items, SUM(scoped.quantity) AS quantity, SUM(scoped.nic) AS nic,
    SUM(scoped.actual_cost) AS actual_cost, ${selectedMetric} AS selected_metric
    FROM scoped GROUP BY scoped.medicine_id, scoped.canonical_name
    ORDER BY selected_metric DESC, canonical_name LIMIT 8`;
  const practicePromise = !isEpd ? Promise.resolve([]) : query.metric === "items_per_1000"
    ? all(`${scope.cte}, practice_population AS (
      SELECT practice_id, SUM(registered_population) AS registered_population
      FROM scoped_population GROUP BY practice_id
    ) SELECT scoped.practice_code, scoped.practice_name, scoped.practice_postcode, scoped.icb_code, scoped.icb_name,
      SUM(scoped.items) AS items, SUM(scoped.quantity) AS quantity, SUM(scoped.nic) AS nic,
      SUM(scoped.actual_cost) AS actual_cost,
      CASE WHEN MAX(practice_population.registered_population) > 0
        THEN SUM(scoped.items) * 1000.0 / MAX(practice_population.registered_population) ELSE NULL END AS selected_metric
      FROM scoped LEFT JOIN practice_population ON practice_population.practice_id = scoped.practice_id
      WHERE scoped.practice_id IS NOT NULL
      GROUP BY scoped.practice_code, scoped.practice_name, scoped.practice_postcode, scoped.icb_code, scoped.icb_name
      ORDER BY selected_metric DESC, scoped.practice_name LIMIT 8`, ...scope.params)
    : all(`${scope.cte} SELECT scoped.practice_code, scoped.practice_name, scoped.practice_postcode, scoped.icb_code, scoped.icb_name,
      SUM(scoped.items) AS items, SUM(scoped.quantity) AS quantity, SUM(scoped.nic) AS nic,
      SUM(scoped.actual_cost) AS actual_cost, ${selectedMetric} AS selected_metric
      FROM scoped WHERE scoped.practice_id IS NOT NULL
      GROUP BY scoped.practice_code, scoped.practice_name, scoped.practice_postcode, scoped.icb_code, scoped.icb_name
      ORDER BY selected_metric DESC, scoped.practice_name LIMIT 8`, ...scope.params);
  const seriesQuery = isEpd && query.metric === "items_per_1000"
    ? `${scope.cte}, monthly_population AS (
      SELECT month_key, SUM(registered_population) AS registered_population
      FROM scoped_population GROUP BY month_key
    ) SELECT scoped.month_key, SUM(scoped.items) AS items, SUM(scoped.quantity) AS quantity,
      SUM(scoped.nic) AS nic, SUM(scoped.actual_cost) AS actual_cost,
      CASE WHEN MAX(monthly_population.registered_population) > 0
        THEN SUM(scoped.items) * 1000.0 / MAX(monthly_population.registered_population) ELSE NULL END AS metric_value,
      MAX(scoped.source_cutoff_at) AS source_cutoff_at
      FROM scoped LEFT JOIN monthly_population ON monthly_population.month_key = scoped.month_key
      GROUP BY scoped.month_key ORDER BY scoped.month_key DESC LIMIT 120`
    : `${scope.cte} SELECT scoped.month_key, SUM(scoped.items) AS items, SUM(scoped.quantity) AS quantity,
      SUM(scoped.nic) AS nic, SUM(scoped.actual_cost) AS actual_cost, SUM(scoped.metric_value) AS metric_value,
      MAX(scoped.source_cutoff_at) AS source_cutoff_at
      FROM scoped GROUP BY scoped.month_key ORDER BY scoped.month_key DESC LIMIT 120`;
  const [countResult, summaryRow, rows, series, periods, geographies, presentations, practices] = await Promise.all([
    one(`${scope.cte} SELECT COUNT(*) AS total_rows, COUNT(DISTINCT month_key) AS month_count, SUM(metric_value) AS metric_total FROM scoped`, ...scope.params),
    one(summaryQuery, ...scope.params),
    all(`${scope.cte}, ranked AS (SELECT scoped.*, ROW_NUMBER() OVER (ORDER BY month_key DESC, canonical_name, medicine_id) AS row_number_value FROM scoped)
      SELECT ${scope.columns.join(", ")} FROM ranked WHERE row_number_value BETWEEN ? AND ? ORDER BY row_number_value`, ...scope.params, firstRow, lastRow),
    all(seriesQuery, ...scope.params),
    all(`SELECT DISTINCT resource.reporting_period FROM ingestion_runs run
      LEFT JOIN source_resources resource ON resource.id = run.source_resource_id
      WHERE run.source_id = ? AND run.status = 'succeeded' AND run.run_kind NOT LIKE '%validation_sample%'
      AND resource.reporting_period IS NOT NULL ORDER BY resource.reporting_period`, scope.sourceId),
    all(geographyQuery, ...scope.params),
    all(presentationQuery, ...scope.params),
    practicePromise,
  ]);
  const totalRows = Number(countResult?.total_rows || 0);
  const monthCount = Number(countResult?.month_count || 0);
  const tableTotal = query.metric === "items_per_1000" ? null : Number(countResult?.metric_total || 0);
  const chronologicalSeries = [...series].reverse();
  const seriesTotal = query.metric === "items_per_1000" ? null : chronologicalSeries.reduce((sum, row) => sum + Number(row.metric_value || 0), 0);
  const reconciliationApplicable = query.metric !== "items_per_1000" && monthCount <= 120;
  return {
    query, source: scope.source, sourcePeriods: periods.map((row) => row.reporting_period),
    dataState: analyticalSourceState(totalRows, Boolean(sourceAvailable?.available)), rows, series: chronologicalSeries,
    summary: normaliseAnalyticsSummary(summaryRow, totalRows > 0),
    breakdowns: { geographies, presentations, practices },
    pagination: { page: query.page, pageSize: query.pageSize, totalRows, totalPages: Math.ceil(totalRows / query.pageSize) },
    reconciliation: { applicable: reconciliationApplicable, tableTotal, seriesTotal,
      reconciles: reconciliationApplicable ? Math.abs(tableTotal - seriesTotal) < 0.000001 : null,
      seriesTruncated: monthCount > 120 },
    limitations: [
      query.dataset === "epd" ? "EPD describes prescribing attributed to published practices; practice postcode is not patient residence." : "PCA describes community dispensing and reimbursement-oriented management information; it is not prescribing or NovaPharm sales.",
      "Only successful non-sample ingestion runs can contribute to this response.",
      "No result establishes stock, product availability, pharmacy-level medicine dispensing or obtainable NovaPharm sales.",
    ], generatedAt: nowIso(),
  };
}

function periodBounds(period) {
  if (!period) return null;
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${period}-01`, end: `${period}-${String(lastDay).padStart(2, "0")}` };
}

export async function nearbyHealthcareOrganisations(input, context) {
  requireExecutive(context);
  let query;
  try { query = normaliseNearbyQuery(input); } catch (error) { throw invalid(error.message); }
  const bounds = periodBounds(query.period);
  const periodClause = bounds ? "AND (introduced_at IS NULL OR introduced_at <= ?) AND (terminated_at IS NULL OR terminated_at >= ?)" : "";
  const origin = await one(`SELECT postcode_normalised, latitude, longitude, introduced_at, terminated_at, source_id
    FROM dim_postcode WHERE postcode_normalised = ? AND latitude IS NOT NULL AND longitude IS NOT NULL ${periodClause}
    ORDER BY CASE WHEN terminated_at IS NULL THEN 0 ELSE 1 END, source_last_seen_at DESC LIMIT 1`, query.postcode, ...(bounds ? [bounds.end, bounds.start] : []));
  if (!origin) throw notFoundPostcode(query.postcode, query.period);
  const latitudeDelta = query.radiusKm / 110.574;
  const longitudeScale = Math.max(Math.cos(Number(origin.latitude) * Math.PI / 180), 0.2);
  const longitudeDelta = query.radiusKm / (111.320 * longitudeScale);
  const candidateParams = [Number(origin.latitude) - latitudeDelta, Number(origin.latitude) + latitudeDelta, Number(origin.longitude) - longitudeDelta, Number(origin.longitude) + longitudeDelta];
  const organisationPeriodClause = bounds ? "(valid_from IS NULL OR valid_from <= ?) AND (valid_to IS NULL OR valid_to >= ?)" : "valid_to IS NULL";
  const organisationPeriodParams = bounds ? [bounds.end, bounds.start] : [];
  const [pharmacyCandidates, practiceCandidates] = await Promise.all([
    all(`SELECT pharmacy_id, trading_name, country, postcode_normalised, latitude, longitude, customer_status,
      CASE WHEN public_business_email IS NOT NULL AND email_status = 'VERIFIED REAL EMAIL' THEN 1 ELSE 0 END AS verified_business_email
      FROM pharmacies WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? AND ${organisationPeriodClause}
      ORDER BY pharmacy_id LIMIT 501`, ...candidateParams, ...organisationPeriodParams),
    all(`SELECT practice_id, practice_code, practice_name, latitude, longitude, population_period, registered_population
      FROM dim_practices WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? AND ${organisationPeriodClause}
      ORDER BY practice_id LIMIT 501`, ...candidateParams, ...organisationPeriodParams),
  ]);
  const originPoint = { latitude: Number(origin.latitude), longitude: Number(origin.longitude) };
  const ranked = (rows, kind) => rows.map((row) => ({ ...row, kind, distance_km: distanceKm(originPoint, { latitude: Number(row.latitude), longitude: Number(row.longitude) }) }))
    .filter((row) => row.distance_km <= query.radiusKm)
    .toSorted((left, right) => left.distance_km - right.distance_km || String(left[`${kind}_id`] ?? "").localeCompare(String(right[`${kind}_id`] ?? "")));
  const allPharmacies = ranked(pharmacyCandidates, "pharmacy");
  const allPractices = ranked(practiceCandidates, "practice");
  return {
    query, origin: { postcode: origin.postcode_normalised, latitude: Number(origin.latitude), longitude: Number(origin.longitude), introducedAt: origin.introduced_at, terminatedAt: origin.terminated_at, sourceId: origin.source_id },
    pharmacies: allPharmacies.slice(0, query.limit), practices: allPractices.slice(0, query.limit),
    resultCounts: { pharmacies: allPharmacies.length, practices: allPractices.length },
    truncated: pharmacyCandidates.length === 501 || practiceCandidates.length === 501 || allPharmacies.length > query.limit || allPractices.length > query.limit,
    source: "ONS postcode-centroid geography and governed organisation masters",
    limitations: ["Distances are great-circle calculations between postcode centroids, not travel time or premises survey coordinates.", "Nearby prescribing does not prove that a pharmacy dispensed a medicine.", "No public business email value is returned by this geography endpoint."],
    generatedAt: nowIso(),
  };
}

function notFoundPostcode(postcode, period) {
  const suffix = period ? ` for ${period}` : "";
  return Object.assign(new Error(`No governed postcode coordinate is available for ${postcode}${suffix}.`), { statusCode: 404 });
}
