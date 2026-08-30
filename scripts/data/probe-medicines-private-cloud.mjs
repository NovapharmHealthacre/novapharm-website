import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";

function optionsFrom(values) {
  let query = "Apixaban";
  let period = "2026-06";
  let evidence = null;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--query" && value) { query = value.trim(); index += 1; continue; }
    if (name === "--period" && value) { period = value; index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    throw new Error(`Unknown or incomplete private-cloud probe argument: ${name}`);
  }
  if (query.length < 2 || query.length > 120) throw new Error("--query must contain 2 to 120 characters.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(period)) throw new Error("--period must use YYYY-MM.");
  return Object.freeze({ query, period, evidence });
}

function outsideRepository(path) {
  const relation = relative(resolve("."), path);
  return isAbsolute(relation) || relation.startsWith("..") || relation === "" ? relation !== "" : false;
}

async function timed(operation) {
  const started = performance.now();
  const value = await operation();
  return Object.freeze({ value, durationMs: Math.round((performance.now() - started) * 100) / 100 });
}

function analyticsEvidence(response) {
  return Object.freeze({
    dataState: response.dataState,
    source: response.source,
    sourcePeriods: response.sourcePeriods,
    summary: response.summary,
    seriesPoints: response.series.length,
    breakdownCounts: {
      geographies: response.breakdowns.geographies.length,
      presentations: response.breakdowns.presentations.length,
      practices: response.breakdowns.practices.length,
    },
    pagination: response.pagination,
    reconciliation: response.reconciliation,
    limitations: response.limitations,
  });
}

const options = optionsFrom(process.argv.slice(2));
const databasePath = resolve(process.env.NOVAPHARM_DATABASE_URL || process.env.DATABASE_PATH || "");
if (process.env.NOVAPHARM_ENVIRONMENT !== "local_private_cloud") {
  throw new Error("The evidence probe requires NOVAPHARM_ENVIRONMENT=local_private_cloud.");
}
if (!databasePath || !outsideRepository(databasePath)) {
  throw new Error("The private-cloud database must be an absolute path outside the Git repository.");
}
process.env.DATABASE_PATH = databasePath;
process.env.DATABASE_PROVIDER = "sqlite";

const context = Object.freeze({ accessScopes: Object.freeze(["board"]) });
const service = await import("../../src/core/medicines-intelligence-service.mjs");
const database = await import("../../src/data/database.mjs");

try {
  const search = await timed(() => service.searchMedicines(options.query, context, 30));
  if (!search.value.results.length) throw new Error(`No governed medicine identity matched ${options.query}.`);
  const selected = search.value.results.find((result) => result.chemicalSubstanceCode) ?? search.value.results[0];
  const detail = await timed(() => service.medicineIdentityDetail(selected.medicineId, context));
  const presentation = await timed(() => service.queryMedicineAnalytics({
    dataset: "epd",
    metric: "items",
    medicineId: selected.medicineId,
    startMonth: options.period,
    endMonth: options.period,
    page: 1,
    pageSize: 50,
  }, context));
  const chemical = selected.chemicalSubstanceCode
    ? await timed(() => service.queryMedicineAnalytics({
      dataset: "epd",
      metric: "items",
      chemicalSubstanceCode: selected.chemicalSubstanceCode,
      startMonth: options.period,
      endMonth: options.period,
      page: 1,
      pageSize: 50,
    }, context))
    : null;

  for (const [scope, result] of [["presentation", presentation.value], ["chemical substance", chemical?.value]]) {
    if (!result) continue;
    if (result.dataState !== "accepted_facts") throw new Error(`${scope} analytics did not resolve accepted facts.`);
    if (!result.sourcePeriods.includes(options.period)) throw new Error(`${scope} analytics did not retain the requested source period.`);
    if (result.reconciliation.applicable !== true || result.reconciliation.reconciles !== true) {
      throw new Error(`${scope} table and series totals did not reconcile.`);
    }
  }
  if (detail.value.analyticalAvailability.epd !== true) throw new Error("The selected identity did not report accepted EPD availability.");

  const evidence = Object.freeze({
    evidenceType: "national-epd-private-cloud-protected-query-probe",
    capturedAt: new Date().toISOString(),
    environment: "local_private_cloud",
    query: options.query,
    requestedPeriod: options.period,
    productionOperationalClaim: false,
    selectedIdentity: {
      medicineId: selected.medicineId,
      canonicalName: selected.canonicalName,
      presentationCode: selected.presentationCode,
      chemicalSubstance: selected.chemicalSubstance,
      chemicalSubstanceCode: selected.chemicalSubstanceCode,
      identityStatus: selected.identityStatus,
    },
    search: {
      durationMs: search.durationMs,
      resultCount: search.value.results.length,
      source: search.value.source,
      sourcePeriod: search.value.sourcePeriod,
      demandFactsIncluded: search.value.demandFactsIncluded,
    },
    detail: {
      durationMs: detail.durationMs,
      medicineLevel: detail.value.medicine.medicineLevel,
      hierarchyDepth: detail.value.hierarchy.length,
      analyticalAvailability: detail.value.analyticalAvailability,
    },
    presentationAnalytics: {
      durationMs: presentation.durationMs,
      ...analyticsEvidence(presentation.value),
    },
    chemicalSubstanceAnalytics: chemical ? {
      durationMs: chemical.durationMs,
      ...analyticsEvidence(chemical.value),
    } : null,
    controls: {
      boardScopeRequired: true,
      rawFactRowsWrittenToEvidence: false,
      pharmacyEmailsWrittenToEvidence: false,
      forecastGenerated: false,
      opportunityScoreGenerated: false,
    },
  });

  if (options.evidence) {
    await mkdir(dirname(options.evidence), { recursive: true });
    await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  console.log(JSON.stringify({
    evidence: options.evidence,
    selectedIdentity: evidence.selectedIdentity,
    timingsMs: {
      search: evidence.search.durationMs,
      detail: evidence.detail.durationMs,
      presentationAnalytics: evidence.presentationAnalytics.durationMs,
      chemicalSubstanceAnalytics: evidence.chemicalSubstanceAnalytics?.durationMs ?? null,
    },
    presentationSummary: evidence.presentationAnalytics.summary,
    chemicalSubstanceSummary: evidence.chemicalSubstanceAnalytics?.summary ?? null,
    productionOperationalClaim: false,
  }));
} finally {
  await database.closeDatabase();
}
