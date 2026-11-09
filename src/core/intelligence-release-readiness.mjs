import { all, nowIso, one } from "../data/database.mjs";
import { internalAiGatewayStatus } from "./ai/ai-gateway.mjs";

function requireExecutive(context) {
  if (!context?.accessScopes?.includes("board") && !context?.accessScopes?.includes("admin")) {
    throw Object.assign(new Error("Medicines Intelligence readiness requires executive access."), { statusCode: 403 });
  }
}

/**
 * Read-only proof inventory. A source record or an ingested row never certifies
 * licensed global coverage, production model validation or operational release.
 * No secrets, patient data, medicine observations or tenant records are returned.
 */
export async function intelligenceReleaseReadiness(context, environment = process.env) {
  requireExecutive(context);
  const [sourceCount, sources, acceptedRuns, forecastValues] = await Promise.all([
    one("SELECT COUNT(*) AS total FROM data_source_registry"),
    all(`SELECT source_id, publisher, dataset_name, jurisdiction, status, licence,
      last_checked_at, last_successfully_ingested_at
      FROM data_source_registry ORDER BY source_id LIMIT 500`),
    all(`SELECT source_id, COUNT(*) AS accepted_runs, COALESCE(SUM(accepted_rows), 0) AS accepted_rows
      FROM ingestion_runs WHERE status = 'succeeded' AND COALESCE(accepted_rows, 0) > 0
      AND run_kind NOT LIKE '%validation_sample%'
      GROUP BY source_id ORDER BY source_id`),
    one("SELECT COUNT(*) AS total FROM forecast_values"),
  ]);
  const acceptedBySource = new Map(acceptedRuns.map((row) => [row.source_id, row]));
  const sourceInventory = sources.map((source) => {
    const accepted = acceptedBySource.get(source.source_id);
    return {
      sourceId: source.source_id,
      publisher: source.publisher,
      dataset: source.dataset_name,
      jurisdiction: source.jurisdiction,
      registryState: source.status,
      licenceRecorded: Boolean(String(source.licence || "").trim()),
      lastCheckedAt: source.last_checked_at || null,
      lastIngestedAt: source.last_successfully_ingested_at || null,
      nonSampleAcceptedRuns: Number(accepted?.accepted_runs || 0),
      nonSampleAcceptedRows: Number(accepted?.accepted_rows || 0),
      productionRightsCertified: false,
    };
  });
  const ai = internalAiGatewayStatus(environment);
  return {
    contract: "novapharm.intelligence.release-readiness.v1",
    generatedAt: nowIso(),
    access: "board-admin-only",
    sourceRegister: {
      total: Number(sourceCount?.total || 0),
      truncated: Number(sourceCount?.total || 0) > sourceInventory.length,
      sources: sourceInventory,
    },
    nova: {
      provider: ai.provider,
      providerStatus: ai.status,
      productionApproved: false,
      modelGateway: "not-production-certified",
      limitations: ["No authorised NOVA model deployment or governed source-to-answer acceptance is certified by this endpoint."],
    },
    forecasting: {
      persistedValueCount: Number(forecastValues?.total || 0),
      productionApproved: false,
      limitations: ["Stored forecast values, if any, are not proof of accepted backtests, intervals, leakage controls or model governance."],
    },
    pandora: {
      intendedAnalyticalWorkspaces: 22,
      productionOperational: false,
      limitations: ["Navigable views are not equivalent to accepted data services, licensed country coverage or deployed models."],
    },
    production: {
      status: "not-certified",
      pending: [
        "Authoritative production runtime, DNS, API origin and identity acceptance",
        "Source-specific rights, provenance, freshness and successful non-sample ingestion",
        "NOVA approved model, redaction, citations, evidence audit and endpoint/residency controls",
        "Forecast lineage, backtesting, intervals and model-owner release",
        "Cross-browser, tenant isolation, backup, monitoring and end-to-end production smoke"
      ]
    }
  };
}
