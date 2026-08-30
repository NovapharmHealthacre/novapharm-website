import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  assessDohsEmailEvidence,
  DohsV3Client,
  type NhsApiEnvironment,
  type PharmacyEmailEnrichmentAssessment,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly apply: boolean;
  readonly checkedAt: string;
  readonly database: string;
  readonly environment: NhsApiEnvironment;
  readonly evidence: string;
  readonly limit: number;
}

interface QueueRow {
  readonly queue_id: string;
  readonly pharmacy_id: string;
  readonly ods_code: string;
  readonly postcode_normalised: string;
  readonly last_evidence_cutoff_at: string | null;
}

interface EnrichmentResult {
  readonly row: QueueRow;
  readonly assessment: PharmacyEmailEnrichmentAssessment;
  readonly sourceUrl: string;
}

function parseOptions(values: readonly string[]): Options {
  let apply = false;
  let database = "";
  let environment: NhsApiEnvironment = "production";
  let evidence = resolve("docs/data/evidence/pharmacy-email-enrichment-dohs.json");
  let limit = 25;
  let checkedAt = process.env.PHARMACY_EMAIL_ENRICHMENT_AT || new Date().toISOString();
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--apply") { apply = true; continue; }
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--environment" && (value === "sandbox" || value === "integration" || value === "production")) { environment = value; index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--limit" && value) { limit = Number(value); index += 1; continue; }
    if (name === "--checked-at" && value) { checkedAt = value; index += 1; continue; }
    throw new Error(`Unknown or incomplete DoHS enrichment argument: ${name}`);
  }
  if (!database) throw new Error("--database is required. The enrichment workflow never selects an implicit production database.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("--limit must be an integer from 1 to 500.");
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error("--checked-at must be an ISO-8601 timestamp.");
  if (apply && environment === "sandbox") throw new Error("Sandbox DoHS observations cannot be written as candidate evidence.");
  return Object.freeze({ apply, checkedAt: new Date(checkedAt).toISOString(), database, environment, evidence, limit });
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function sourceUrl(environment: NhsApiEnvironment, odsCode: string): string {
  const host = environment === "production" ? "api.service.nhs.uk" : environment === "integration" ? "int.api.service.nhs.uk" : "sandbox.api.service.nhs.uk";
  const url = new URL(`https://${host}/service-search-api/`);
  url.searchParams.set("api-version", "3");
  url.searchParams.set("search", odsCode);
  url.searchParams.set("searchFields", "ODSCode");
  return url.href;
}

const options = parseOptions(process.argv.slice(2));
const client = new DohsV3Client({ environment: options.environment, apiKey: process.env.NHS_DOHS_API_KEY });
if (client.configuration.state !== "configured") throw new Error(client.configuration.message);

const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = new SqliteProvider({ DATABASE_PATH: options.database });
await database.initialize();

try {
  const rows = database.raw.prepare(`SELECT
      queue.id AS queue_id, queue.pharmacy_id,
      (SELECT identifier.identifier_value FROM pharmacy_identifiers identifier
        WHERE identifier.pharmacy_id = queue.pharmacy_id
          AND identifier.identifier_type = 'NHS_CONTRACTOR_CODE'
          AND identifier.valid_to IS NULL
        ORDER BY identifier.valid_from DESC LIMIT 1) AS ods_code,
      pharmacy.postcode_normalised, queue.last_evidence_cutoff_at
    FROM pharmacy_enrichment_queue queue
    JOIN pharmacies pharmacy ON pharmacy.pharmacy_id = queue.pharmacy_id
    WHERE queue.reason = 'public_email_new_evidence_required'
      AND queue.status IN ('open', 'no_new_evidence', 'blocked')
      AND pharmacy.country = 'England'
      AND pharmacy.public_business_email IS NULL
      AND EXISTS (SELECT 1 FROM pharmacy_identifiers identifier
        WHERE identifier.pharmacy_id = queue.pharmacy_id
          AND identifier.identifier_type = 'NHS_CONTRACTOR_CODE'
          AND identifier.valid_to IS NULL)
    ORDER BY queue.priority, queue.updated_at, queue.pharmacy_id
    LIMIT ?`).all(options.limit) as unknown as QueueRow[];

  const results: EnrichmentResult[] = [];
  for (const [index, row] of rows.entries()) {
    const organisations = await client.organisationsByOdsCode(row.ods_code, 10);
    const url = sourceUrl(options.environment, row.ods_code);
    const assessment = assessDohsEmailEvidence({
      pharmacyId: row.pharmacy_id,
      odsCode: row.ods_code,
      postcode: row.postcode_normalised,
      lastEvidenceCutoffAt: row.last_evidence_cutoff_at,
    }, organisations, { checkedAt: options.checkedAt, sourceUrl: url });
    results.push(Object.freeze({ row, assessment, sourceUrl: url }));
    if (index < rows.length - 1) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  if (options.apply) {
    await database.transaction(async (transaction: typeof database) => {
      const insertEvidence = transaction.raw.prepare(`INSERT OR IGNORE INTO pharmacy_contact_evidence(
          id, pharmacy_id, contact_type, contact_value, source_type, source_url, evidence_excerpt,
          evidence_sha256, checked_at, status, confidence, reviewer, created_at
        ) VALUES(?, ?, ?, ?, 'nhs_dohs_v3', ?, ?, ?, ?, 'candidate', 'exact_ods_and_postcode', NULL, ?)`);
      const updateQueue = transaction.raw.prepare(`UPDATE pharmacy_enrichment_queue
        SET status = ?, last_evidence_cutoff_at = ?, updated_at = ? WHERE id = ?`);
      for (const result of results) {
        for (const candidate of result.assessment.candidates) {
          const evidenceHash = createHash("sha256").update(`${candidate.odsCode}\u001f${candidate.contactType}\u001f${candidate.contactValue}\u001f${candidate.sourceUrl}\u001f${candidate.checkedAt}`).digest("hex");
          insertEvidence.run(
            stableId(candidate.pharmacyId, candidate.contactType, candidate.contactValue, candidate.sourceType, candidate.sourceUrl),
            candidate.pharmacyId,
            candidate.contactType,
            candidate.contactValue,
            candidate.sourceUrl,
            candidate.evidenceExcerpt,
            evidenceHash,
            candidate.checkedAt,
            options.checkedAt,
          );
        }
        const queueStatus = result.assessment.decision === "candidate_evidence_found"
          ? "in_review"
          : result.assessment.decision === "organisation_mismatch"
            ? "blocked"
            : result.assessment.decision === "cutoff_not_advanced"
              ? null
              : "no_new_evidence";
        if (queueStatus) updateQueue.run(queueStatus, options.checkedAt, options.checkedAt, result.row.queue_id);
      }
    });
  }

  const summary = Object.freeze({
    evidenceType: "nhs-dohs-v3-pharmacy-email-enrichment",
    generatedAt: options.checkedAt,
    environment: options.environment,
    mode: options.apply ? "candidate_evidence_written" : "read_only_assessment",
    recordsSelected: rows.length,
    exactOrganisationsMatched: results.reduce((total, result) => total + result.assessment.matchedOrganisations, 0),
    pharmaciesWithCandidateEvidence: results.filter((result) => result.assessment.candidates.length > 0).length,
    candidatePublicBusinessEmails: results.flatMap((result) => result.assessment.candidates).filter((candidate) => candidate.contactType === "public_business_email").length,
    candidateNhsSharedEmails: results.flatMap((result) => result.assessment.candidates).filter((candidate) => candidate.contactType === "nhs_shared_email").length,
    noEmailEvidence: results.filter((result) => result.assessment.decision === "no_email_evidence").length,
    organisationMismatches: results.filter((result) => result.assessment.decision === "organisation_mismatch").length,
    cutoffNotAdvanced: results.filter((result) => result.assessment.decision === "cutoff_not_advanced").length,
    marketingEligible: 0,
    publicMasterEmailsChanged: 0,
    controls: [
      "Exact current NHS contractor code and postcode match required.",
      "Only candidate evidence is written; no public business email is promoted automatically.",
      "No mailbox pattern is inferred and no campaign eligibility is granted.",
      "Evidence output contains aggregate counts and no contact values.",
    ],
  });
  await mkdir(dirname(options.evidence), { recursive: true });
  await writeFile(options.evidence, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ evidence: options.evidence, recordsSelected: summary.recordsSelected, candidateEvidence: summary.candidatePublicBusinessEmails + summary.candidateNhsSharedEmails, applied: options.apply }));
} finally {
  await database.close();
}
