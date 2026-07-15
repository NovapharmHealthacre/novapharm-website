import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationRoot = resolve(process.cwd(), "database", "azure");
const files = readdirSync(migrationRoot).filter((file) => /^\d{3}_[a-z0-9_]+\.sql$/i.test(file)).sort();
assert.deepEqual(files, ["001_initial.sql", "002_notification_delivery_queue.sql", "003_backend_activation.sql"]);

const sources = Object.fromEntries(files.map((file) => [file, readFileSync(resolve(migrationRoot, file), "utf8")]));
for (const [file, source] of Object.entries(sources)) {
  assert.ok(source.trim(), `${file} must not be empty.`);
  assert.doesNotMatch(source, /\b(PRAGMA|AUTOINCREMENT)\b|\bLIMIT\s+\d+/i, `${file} contains SQLite-only syntax.`);
  assert.doesNotMatch(source, /\?/, `${file} contains an unbound positional parameter.`);
  const batches = source.split(/^\s*GO\s*$/gim).map((batch) => batch.trim()).filter(Boolean);
  assert.ok(batches.length > 0, `${file} does not contain an executable SQL batch.`);
}

const activation = sources["003_backend_activation.sql"];
for (const table of ["application_status_history", "application_upload_grants", "customer_contacts"]) {
  assert.match(activation, new RegExp(`dbo\\.${table}`, "i"), `Activation migration is missing ${table}.`);
}
for (const view of [
  "reporting_current_leads",
  "reporting_application_pipeline",
  "reporting_notification_delivery",
  "reporting_daily_form_activity",
  "reporting_utm_attribution",
  "reporting_active_portal_users",
  "reporting_security_events",
  "reporting_document_quarantine",
  "reporting_account_activation"
]) {
  assert.match(activation, new RegExp(`CREATE OR ALTER VIEW dbo\\.${view}`, "i"), `Activation migration is missing ${view}.`);
  assert.match(activation, new RegExp(`GRANT SELECT ON OBJECT::dbo\\.${view} TO novapharm_reporting_reader`, "i"), `Reporting role is missing access to ${view}.`);
}
assert.match(activation, /TR_application_status_history_immutable/i);
assert.match(activation, /CREATE ROLE novapharm_reporting_reader/i);
assert.match(activation, /SYSUTCDATETIME\(\)/i);

console.log(`Azure SQL migration structure validated: ${files.length} ordered migrations, activation tables, immutable history, 9 reporting views and least-privilege reporting grants.`);
