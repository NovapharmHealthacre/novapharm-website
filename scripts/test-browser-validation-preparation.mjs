import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const externalValues = {
  RESEND_API_KEY: "synthetic-value-that-must-be-removed",
  MICROSOFT_CLIENT_SECRET: "synthetic-value-that-must-be-removed",
  SHAREPOINT_DRIVE_ID: "synthetic-value-that-must-be-removed"
};
const runtimeRoot = mkdtempSync(join(tmpdir(), "novapharm-browser-preparation-"));
try {
  const result = spawnSync(process.execPath, ["scripts/start-browser-validation.mjs", "--prepare-only", runtimeRoot], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...externalValues
    },
    encoding: "utf8"
  });
  assert.equal(result.status, 0, String(result.stderr || result.stdout));
  const prepared = JSON.parse(result.stdout.trim());
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.data, "synthetic_only");

  const credentialsPath = join(runtimeRoot, "credentials.json");
  const environmentPath = join(runtimeRoot, "server.env");
  const databasePath = join(runtimeRoot, "visual-validation.sqlite");
  assert.equal(existsSync(join(runtimeRoot, "server.pid")), false);
  for (const path of [credentialsPath, environmentPath]) assert.equal(statSync(path).mode & 0o777, 0o600);
  const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
  assert.ok(credentials.username && credentials.password);
  assert.equal(result.stdout.includes(credentials.password), false);

  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.equal(database.prepare("PRAGMA foreign_key_check").all().length, 0);
    assert.equal(database.prepare("SELECT COUNT(*) AS value FROM products WHERE source_system = 'owner_supplied_nutraxin_catalogue'").get().value, 19);
    assert.equal(database.prepare("SELECT COUNT(*) AS value FROM product_claims WHERE public_use_status <> 'blocked'").get().value, 0);
    assert.equal(database.prepare("SELECT COUNT(*) AS value FROM workflow_instances").get().value, 7);
    assert.equal(database.prepare("SELECT COUNT(*) AS value FROM auth_user_scopes WHERE username = ?").get(credentials.username).value, 4);
    assert.equal(database.prepare("SELECT COUNT(*) AS value FROM auth_sessions").get().value, 0);
  } finally {
    database.close();
  }

  const environment = readFileSync(environmentPath, "utf8");
  for (const value of Object.values(externalValues)) {
    assert.equal(environment.includes(value), false);
  }
  console.log("Browser validation preparation passed: protected synthetic identity, isolated SQLite, 19 Nutraxin products, all scopes, no live services and no listening process.");
} finally {
  rmSync(runtimeRoot, { recursive: true, force: true });
}
