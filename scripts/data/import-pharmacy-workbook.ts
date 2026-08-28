import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import {
  assessPharmacyEmail,
  normalisePostcode,
  pharmacyIdentifierCandidates,
  pharmacySeedIdentity,
  type Jurisdiction,
  type PharmacyEmailAssessment,
} from "../../packages/medicines-intelligence/src/index.ts";

interface Options {
  readonly workbook: string;
  readonly database: string | null;
  readonly evidence: string;
  readonly importAt: string;
  readonly dryRun: boolean;
}

interface WorkbookRecord {
  readonly kind: "workbook";
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly sheets: readonly string[];
  readonly macrosPresent: boolean;
}

interface RowRecord {
  readonly kind: "row";
  readonly sheet: string;
  readonly rowNumber: number;
  readonly cells: readonly unknown[];
  readonly cellTypes: readonly (string | null)[];
  readonly formulas: Readonly<Record<string, string>>;
  readonly styles: Readonly<Record<string, number>>;
}

interface CompleteRecord {
  readonly kind: "complete";
  readonly rowCounts: Readonly<Record<string, number>>;
}

type StreamRecord = WorkbookRecord | RowRecord | CompleteRecord;

const requiredHeaders = Object.freeze([
  "master_row", "country", "pharmacy_name", "legal_entity", "ods_or_regulator_code",
  "gphc_or_psni_registration", "postcode", "phone", "public_business_email", "website",
  "email_type", "email_confidence", "source_email", "full_address", "address_source",
  "address_checked_date", "email_checked_date", "email_status", "email_research_note", "research_pass",
]);
const approvedCountries = new Set(["England", "Scotland", "Wales", "Northern Ireland"]);

function parseOptions(values: readonly string[]): Options {
  let workbook = "";
  let database: string | null = null;
  let evidence = resolve("docs/data/evidence/pharmacy-workbook-import.json");
  let importAt = process.env.PHARMACY_IMPORT_AT || new Date().toISOString();
  let dryRun = false;
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (name === "--dry-run") { dryRun = true; continue; }
    if (name === "--workbook" && value) { workbook = resolve(value); index += 1; continue; }
    if (name === "--database" && value) { database = resolve(value); index += 1; continue; }
    if (name === "--evidence" && value) { evidence = resolve(value); index += 1; continue; }
    if (name === "--import-at" && value) { importAt = value; index += 1; continue; }
    throw new Error(`Unknown or incomplete pharmacy-import argument: ${name}`);
  }
  if (!workbook) throw new Error("--workbook is required.");
  if (!dryRun && !database) throw new Error("--database is required unless --dry-run is used.");
  if (!Number.isFinite(Date.parse(importAt))) throw new Error("--import-at must be an ISO-8601 timestamp.");
  return Object.freeze({ workbook, database, evidence, importAt: new Date(importAt).toISOString(), dryRun });
}

async function sha256File(path: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex");
}

function stableId(...parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 32);
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function integer(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function rowValues(headers: readonly string[], cells: readonly unknown[]): Readonly<Record<string, string | number | null>> {
  return Object.freeze(Object.fromEntries(headers.map((header, index) => {
    const value = cells[index];
    return [header, typeof value === "number" ? value : text(value) || null];
  })));
}

function safeJson(value: unknown): string {
  return JSON.stringify(value);
}

function materialSnapshot(values: Readonly<Record<string, string | number | null>>, postcode: string, email: PharmacyEmailAssessment): Readonly<Record<string, unknown>> {
  return Object.freeze({
    country: text(values.country), status: "active", trading_name: text(values.pharmacy_name),
    legal_entity: text(values.legal_entity) || null, address: text(values.full_address),
    postcode_raw: text(values.postcode), postcode_normalised: postcode,
    telephone: text(values.phone) || null, website: text(values.website) || null,
    public_business_email: email.status === "verified" ? email.email : null, email_type: text(values.email_type) || null,
    email_confidence: text(values.email_confidence) || null,
    email_status: text(values.email_status) || "unknown", email_source: text(values.source_email) || null,
    email_source_url: text(values.source_email) || null,
    email_verified_at: email.verifiedAt,
  });
}

function changedFields(existing: Readonly<Record<string, unknown>>, next: Readonly<Record<string, unknown>>): readonly string[] {
  return Object.keys(next).filter((key) => (existing[key] ?? null) !== (next[key] ?? null));
}

async function* workbookStream(path: string): AsyncGenerator<StreamRecord> {
  const child = spawn(process.env.PYTHON_BINARY || "python3", [resolve("tooling/python/pharmacy_workbook.py"), path], {
    cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PYTHONUTF8: "1" },
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => { if (stderr.length < 8_000) stderr += chunk; });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      yield JSON.parse(line) as StreamRecord;
    }
  } catch (error) {
    child.kill("SIGTERM");
    throw error;
  }
  const exitCode = await new Promise<number | null>((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("close", resolveExit);
  });
  if (exitCode !== 0) throw new Error(`Workbook reader failed with exit ${exitCode}: ${stderr.trim() || "no safe diagnostic"}`);
}

const options = parseOptions(process.argv.slice(2));
const workbookStats = await stat(options.workbook);
if (!workbookStats.isFile() || !options.workbook.toLowerCase().endsWith(".xlsx")) throw new Error("The pharmacy seed must be an existing .xlsx file.");
const workbookHash = await sha256File(options.workbook);
const importId = `pharmacy-import-${workbookHash.slice(0, 24)}`;

const { SqliteProvider } = await import("../../src/data/providers/sqlite.mjs");
const database = options.dryRun ? null : new SqliteProvider({ DATABASE_PATH: options.database });
if (database) await database.initialize();

const existingImport = database?.raw.prepare("SELECT reconciliation_json FROM pharmacy_imports WHERE source_sha256 = ?").get(workbookHash) as { reconciliation_json?: string } | undefined;
if (existingImport) {
  const prior = JSON.parse(existingImport.reconciliation_json || "{}") as Record<string, unknown>;
  const evidence = { ...prior, idempotentReplay: true, importedAgain: false };
  await mkdir(dirname(options.evidence), { recursive: true });
  await writeFile(options.evidence, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  await database?.close();
  console.log(JSON.stringify({ importId, idempotentReplay: true, evidence: options.evidence }));
  process.exit(0);
}

let metadata: WorkbookRecord | null = null;
let complete: CompleteRecord | null = null;
const headersBySheet = new Map<string, readonly string[]>();
const masterRows = new Set<number>();
const countryTotals = new Map<string, number>();
const registrationFrequencies = new Map<string, number>();
const contractorFrequencies = new Map<string, number>();
const globalContractorFrequencies = new Map<string, number>();
const conflictRows = new Set<number>();
let sourceRowsStored = 0;
let pharmacyRows = 0;
let inserted = 0;
let matched = 0;
let updated = 0;
let unchanged = 0;
let duplicateCandidates = 0;
let invalidIdentifiers = 0;
let invalidPostcodes = 0;
let verifiedEmails = 0;
let blankActionedEmails = 0;

const raw = database?.raw;
if (raw) {
  raw.exec("BEGIN IMMEDIATE");
  raw.prepare(`INSERT INTO pharmacy_imports(import_id, source_file_name, source_sha256, source_size_bytes, source_modified_at, imported_at, imported_by, source_row_count)
    VALUES(?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(importId, basename(options.workbook), workbookHash, workbookStats.size, workbookStats.mtime.toISOString(), options.importAt, "governed-workbook-importer");
}

try {
  for await (const record of workbookStream(options.workbook)) {
    if (record.kind === "workbook") {
      metadata = record;
      if (record.sha256 !== workbookHash || record.sizeBytes !== workbookStats.size) throw new Error("Workbook reader integrity metadata does not match the imported file.");
      if (record.macrosPresent) throw new Error("Macro-enabled content is not permitted in the pharmacy seed.");
      continue;
    }
    if (record.kind === "complete") { complete = record; continue; }
    const rowHash = createHash("sha256").update(safeJson({ cells: record.cells, cellTypes: record.cellTypes, formulas: record.formulas, styles: record.styles })).digest("hex");
    const sourceRowId = stableId(importId, record.sheet, String(record.rowNumber));
    let headers = headersBySheet.get(record.sheet);
    if (!headers) {
      const candidateHeaders = record.cells.map((value) => text(value));
      const tabularHeader = candidateHeaders.every(Boolean) && new Set(candidateHeaders).size === candidateHeaders.length;
      if (record.sheet === "Pharmacies" && !tabularHeader) throw new Error("Pharmacies worksheet has invalid or duplicate headers.");
      headers = Object.freeze(tabularHeader ? candidateHeaders : record.cells.map((_, index) => `column_${index + 1}`));
      headersBySheet.set(record.sheet, headers);
    }
    const values = rowValues(headers, record.cells);
    if (raw) raw.prepare(`INSERT INTO pharmacy_source_rows(
      id, import_id, source_sheet, source_row_number, master_row, country, pharmacy_name, legal_entity,
      ods_or_regulator_code, gphc_or_psni_registration, postcode, phone, public_business_email, website,
      email_type, email_confidence, source_email, full_address, address_source, address_checked_date,
      email_checked_date, email_status, email_research_note, research_pass, source_row_json, source_row_hash, imported_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(sourceRowId, importId, record.sheet, record.rowNumber, integer(values.master_row), text(values.country) || null,
        text(values.pharmacy_name) || null, text(values.legal_entity) || null, text(values.ods_or_regulator_code) || null,
        text(values.gphc_or_psni_registration) || null, text(values.postcode) || null, text(values.phone) || null,
        text(values.public_business_email).toLowerCase() || null, text(values.website) || null, text(values.email_type) || null,
        text(values.email_confidence) || null, text(values.source_email) || null, text(values.full_address) || null,
        text(values.address_source) || null, text(values.address_checked_date) || null, text(values.email_checked_date) || null,
        text(values.email_status) || null, text(values.email_research_note) || null, text(values.research_pass) || null,
        safeJson(record), rowHash, options.importAt);
    sourceRowsStored += 1;

    if (record.rowNumber === 1 || record.sheet !== "Pharmacies") continue;
    if (safeJson(headers) !== safeJson(requiredHeaders)) throw new Error("Pharmacies worksheet headers do not match the governed 20-column contract.");
    pharmacyRows += 1;
    const masterRow = integer(values.master_row);
    const country = text(values.country);
    const registration = text(values.gphc_or_psni_registration).toUpperCase();
    const contractor = text(values.ods_or_regulator_code).toUpperCase();
    const emailAssessment = assessPharmacyEmail(text(values.public_business_email), text(values.email_status), text(values.email_checked_date));
    if (!masterRow || masterRows.has(masterRow)) { invalidIdentifiers += 1; continue; }
    masterRows.add(masterRow);
    if (!approvedCountries.has(country) || !text(values.pharmacy_name) || !text(values.full_address)) { invalidIdentifiers += 1; continue; }
    countryTotals.set(country, (countryTotals.get(country) ?? 0) + 1);
    if (registration) registrationFrequencies.set(`${country}\u001f${registration}`, (registrationFrequencies.get(`${country}\u001f${registration}`) ?? 0) + 1);
    if (contractor) {
      contractorFrequencies.set(`${country}\u001f${contractor}`, (contractorFrequencies.get(`${country}\u001f${contractor}`) ?? 0) + 1);
      globalContractorFrequencies.set(contractor, (globalContractorFrequencies.get(contractor) ?? 0) + 1);
    }
    let postcode = "";
    try { postcode = normalisePostcode(text(values.postcode)); } catch { invalidPostcodes += 1; continue; }
    if (emailAssessment.status === "verified") verifiedEmails += 1;
    else if (emailAssessment.status === "no_new_evidence") blankActionedEmails += 1;
    else conflictRows.add(masterRow);

    if (!raw) continue;
    const identifiers = pharmacyIdentifierCandidates(country as Jurisdiction, registration, contractor);
    const registrationIdentifier = identifiers.find((candidate) => candidate.priority === 1);
    const contractorIdentifier = identifiers.find((candidate) => candidate.priority === 2);
    const types = {
      registration: registrationIdentifier?.type ?? (country === "Northern Ireland" ? "PSNI_SOURCE_REGISTRATION" : "GPHC_PREMISES"),
      contractor: contractorIdentifier?.type ?? (country === "England" ? "NHS_CONTRACTOR_CODE" : country === "Northern Ireland" ? "NI_ODS_OR_REGULATOR_CODE" : "NATION_CONTRACTOR_CODE"),
    };
    const findIdentity = raw.prepare("SELECT pharmacy_id FROM pharmacy_identifiers WHERE identifier_type = ? AND identifier_value = ? AND valid_to IS NULL");
    const registrationMatch = registration ? findIdentity.get(types.registration, registration) as { pharmacy_id?: string } | undefined : undefined;
    const contractorMatch = contractor ? findIdentity.get(types.contractor, contractor) as { pharmacy_id?: string } | undefined : undefined;
    let pharmacyId = registrationMatch?.pharmacy_id || null;
    let identityConflict = false;
    if (!pharmacyId && contractorMatch?.pharmacy_id) {
      const heldRegistration = raw.prepare("SELECT identifier_value FROM pharmacy_identifiers WHERE pharmacy_id = ? AND identifier_type = ? AND valid_to IS NULL").get(contractorMatch.pharmacy_id, types.registration) as { identifier_value?: string } | undefined;
      if (!registration || !heldRegistration?.identifier_value || heldRegistration.identifier_value === registration) pharmacyId = contractorMatch.pharmacy_id;
      else identityConflict = true;
    }
    if (!pharmacyId) {
      pharmacyId = pharmacySeedIdentity({ country: country as Jurisdiction, registration, contractorCode: identityConflict ? "" : contractor, workbookSha256: workbookHash, masterRow });
      const similar = raw.prepare("SELECT pharmacy_id FROM pharmacies WHERE postcode_normalised = ? AND lower(trading_name) = lower(?)").get(postcode, text(values.pharmacy_name)) as { pharmacy_id?: string } | undefined;
      if (similar?.pharmacy_id && similar.pharmacy_id !== pharmacyId) duplicateCandidates += 1;
    } else matched += 1;
    if (identityConflict) { conflictRows.add(masterRow); duplicateCandidates += 1; }

    const next = materialSnapshot(values, postcode, emailAssessment);
    const existing = raw.prepare("SELECT * FROM pharmacies WHERE pharmacy_id = ?").get(pharmacyId) as Record<string, unknown> | undefined;
    if (!existing) {
      raw.prepare(`INSERT INTO pharmacies(
        pharmacy_id, country, status, trading_name, legal_entity, address, postcode_raw, postcode_normalised,
        telephone, website, public_business_email, email_type, email_confidence, email_status, email_source,
        email_source_url, email_verified_at, marketing_eligible, opt_out, source_first_seen_at, source_last_seen_at,
        valid_from, version
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 1)`)
        .run(pharmacyId, next.country, next.status, next.trading_name, next.legal_entity, next.address,
          next.postcode_raw, next.postcode_normalised, next.telephone, next.website, next.public_business_email,
          next.email_type, next.email_confidence, next.email_status, next.email_source, next.email_source_url,
          next.email_verified_at, options.importAt, options.importAt, options.importAt);
      raw.prepare("INSERT INTO pharmacy_history(id, pharmacy_id, change_type, changed_fields_json, previous_values_json, new_values_json, valid_from, source_import_id, recorded_at) VALUES(?, ?, 'created', ?, '{}', ?, ?, ?, ?)")
        .run(stableId(importId, pharmacyId, "created"), pharmacyId, safeJson(Object.keys(next)), safeJson(next), options.importAt, importId, options.importAt);
      inserted += 1;
    } else {
      const fields = changedFields(existing, next);
      if (fields.length) {
        raw.prepare(`UPDATE pharmacies SET country=?, status=?, trading_name=?, legal_entity=?, address=?, postcode_raw=?, postcode_normalised=?,
          telephone=?, website=?, public_business_email=?, email_type=?, email_confidence=?, email_status=?, email_source=?, email_source_url=?,
          email_verified_at=?, source_last_seen_at=?, version=version+1 WHERE pharmacy_id=?`)
          .run(next.country, next.status, next.trading_name, next.legal_entity, next.address, next.postcode_raw,
            next.postcode_normalised, next.telephone, next.website, next.public_business_email, next.email_type,
            next.email_confidence, next.email_status, next.email_source, next.email_source_url, next.email_verified_at,
            options.importAt, pharmacyId);
        raw.prepare("INSERT INTO pharmacy_history(id, pharmacy_id, change_type, changed_fields_json, previous_values_json, new_values_json, valid_from, source_import_id, recorded_at) VALUES(?, ?, 'source_update', ?, ?, ?, ?, ?, ?)")
          .run(stableId(importId, pharmacyId, "update"), pharmacyId, safeJson(fields),
            safeJson(Object.fromEntries(fields.map((field) => [field, existing[field] ?? null]))),
            safeJson(Object.fromEntries(fields.map((field) => [field, next[field] ?? null]))), options.importAt, importId, options.importAt);
        updated += 1;
      } else {
        raw.prepare("UPDATE pharmacies SET source_last_seen_at = ? WHERE pharmacy_id = ?").run(options.importAt, pharmacyId);
        unchanged += 1;
      }
    }

    for (const { type: identifierType, value: identifierValue, authority } of identifiers) {
      if (!identifierValue) continue;
      const held = findIdentity.get(identifierType, identifierValue) as { pharmacy_id?: string } | undefined;
      if (held?.pharmacy_id && held.pharmacy_id !== pharmacyId) { conflictRows.add(masterRow); continue; }
      raw.prepare("INSERT OR IGNORE INTO pharmacy_identifiers(id, pharmacy_id, identifier_type, identifier_value, nation, authority, valid_from, source_import_id, verification_status) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 'source_supplied')")
        .run(stableId(pharmacyId, identifierType, identifierValue), pharmacyId, identifierType, identifierValue, country, authority, options.importAt, importId);
    }

    if (emailAssessment.status === "verified" && emailAssessment.email) {
      raw.prepare("INSERT OR IGNORE INTO pharmacy_contact_evidence(id, pharmacy_id, contact_type, contact_value, source_type, source_url, checked_at, status, confidence, created_at) VALUES(?, ?, 'public_business_email', ?, 'governed_workbook', ?, ?, 'verified', ?, ?)")
        .run(stableId(pharmacyId, "email", emailAssessment.email, text(values.source_email)), pharmacyId, emailAssessment.email, text(values.source_email) || null,
          emailAssessment.verifiedAt, text(values.email_confidence) || null, options.importAt);
    } else if (emailAssessment.status === "no_new_evidence") {
      raw.prepare("INSERT OR IGNORE INTO pharmacy_enrichment_queue(id, pharmacy_id, reason, priority, status, last_evidence_cutoff_at, next_review_at, created_at, updated_at) VALUES(?, ?, 'public_email_new_evidence_required', 100, 'no_new_evidence', ?, NULL, ?, ?)")
        .run(stableId(pharmacyId, "email-enrichment"), pharmacyId, text(values.email_checked_date) || options.importAt, options.importAt, options.importAt);
    }
    if (identityConflict) {
      raw.prepare("INSERT OR IGNORE INTO pharmacy_enrichment_queue(id, pharmacy_id, reason, priority, status, last_evidence_cutoff_at, next_review_at, created_at, updated_at) VALUES(?, ?, 'identifier_conflict_requires_human_review', 10, 'open', ?, NULL, ?, ?)")
        .run(stableId(pharmacyId, "identity-conflict"), pharmacyId, options.importAt, options.importAt, options.importAt);
    }
  }

  if (!metadata || !complete) throw new Error("Workbook stream ended without complete control records.");
  for (const requiredSheet of ["Summary", "Pharmacies", "New Verified 2026-08-24"]) {
    if (!metadata.sheets.includes(requiredSheet)) throw new Error(`Workbook is missing governed sheet: ${requiredSheet}`);
  }
  if (pharmacyRows !== complete.rowCounts.Pharmacies - 1) throw new Error("Pharmacy data-row count does not reconcile to the worksheet stream.");
  const orderedRows = [...masterRows].toSorted((left, right) => left - right);
  if (orderedRows.length !== pharmacyRows || orderedRows[0] !== 2 || orderedRows.at(-1) !== pharmacyRows + 1 || orderedRows.some((value, index) => value !== index + 2)) {
    throw new Error("master_row values are not unique and contiguous from 2 through the final data row.");
  }

  const duplicateStatistics = (frequencies: ReadonlyMap<string, number>) => ({
    groups: [...frequencies.values()].filter((count) => count > 1).length,
    additionalRows: [...frequencies.values()].reduce((total, count) => total + Math.max(0, count - 1), 0),
  });
  const registrationDuplicates = duplicateStatistics(registrationFrequencies);
  const contractorDuplicates = duplicateStatistics(contractorFrequencies);
  const globalContractorDuplicates = duplicateStatistics(globalContractorFrequencies);
  const conflicts = conflictRows.size;
  const reconciliation = Object.freeze({
    evidenceType: "governed-pharmacy-workbook-import",
    importId, importedAt: options.importAt, sourceFileName: basename(options.workbook), sourceSha256: workbookHash,
    sourceSizeBytes: workbookStats.size, productionImportClaim: false, dryRun: options.dryRun,
    sheets: metadata.sheets, sheetRowCounts: complete.rowCounts, allWorksheetRowsPreserved: sourceRowsStored,
    sourceRowCount: pharmacyRows, inserted, matched, updated, unchanged, duplicateCandidates, conflicts,
    duplicateIdentifierStatistics: {
      registration: registrationDuplicates,
      contractorOrRegulatorWithinNation: contractorDuplicates,
      contractorOrRegulatorGlobal: globalContractorDuplicates,
    },
    invalidIdentifiers, invalidPostcodes, verifiedEmails, blankActionedEmails,
    countryTotals: Object.fromEntries([...countryTotals].toSorted(([left], [right]) => left.localeCompare(right))),
    controls: {
      sourceRowsExpected: 12_936, verifiedEmailsExpected: 7_211, blankActionedExpected: 5_725,
      sourceRowsMatch: pharmacyRows === 12_936, verifiedEmailsMatch: verifiedEmails === 7_211,
      blankActionedMatch: blankActionedEmails === 5_725, allRowsActioned: verifiedEmails + blankActionedEmails === pharmacyRows,
      canonicalPharmacies: raw ? Number((raw.prepare("SELECT COUNT(*) AS value FROM pharmacies").get() as { value: number }).value) : null,
      marketingEligible: raw ? Number((raw.prepare("SELECT COUNT(*) AS value FROM pharmacies WHERE marketing_eligible = 1").get() as { value: number }).value) : null,
    },
    truthBoundaries: [
      "Shared email addresses were retained as contact evidence and never used as branch identity.",
      "Blank emails remain blank; no pattern-derived or guessed address was created.",
      "Unknown email_checked_date values remain null and were not inferred from workbook date or status.",
      "Pharmacy proximity and source inclusion do not prove medicine-level dispensing by a branch.",
      "All imported pharmacies remain marketing-ineligible until a separately approved human workflow authorises use.",
    ],
  });
  if (!reconciliation.controls.sourceRowsMatch || !reconciliation.controls.verifiedEmailsMatch || !reconciliation.controls.blankActionedMatch || !reconciliation.controls.allRowsActioned) {
    throw new Error("Workbook control totals do not match the governed seed contract.");
  }
  if (raw) {
    raw.prepare(`UPDATE pharmacy_imports SET source_row_count=?, inserted_count=?, matched_count=?, updated_count=?, unchanged_count=?,
      duplicate_candidate_count=?, conflict_count=?, invalid_identifier_count=?, invalid_postcode_count=?, verified_email_count=?,
      blank_actioned_email_count=?, country_totals_json=?, reconciliation_json=? WHERE import_id=?`)
      .run(pharmacyRows, inserted, matched, updated, unchanged, duplicateCandidates, conflicts, invalidIdentifiers,
        invalidPostcodes, verifiedEmails, blankActionedEmails, safeJson(reconciliation.countryTotals), safeJson(reconciliation), importId);
    raw.exec("COMMIT");
  }
  await mkdir(dirname(options.evidence), { recursive: true });
  await writeFile(options.evidence, `${JSON.stringify(reconciliation, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ importId, evidence: options.evidence, sourceRowCount: pharmacyRows, verifiedEmails, blankActionedEmails, canonicalPharmacies: reconciliation.controls.canonicalPharmacies, dryRun: options.dryRun }));
} catch (error) {
  if (raw) raw.exec("ROLLBACK");
  throw error;
} finally {
  await database?.close();
}
