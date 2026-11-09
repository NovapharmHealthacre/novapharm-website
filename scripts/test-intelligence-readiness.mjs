import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";

const databasePath = `/tmp/novapharm-intelligence-readiness-${process.pid}-${Date.now()}.sqlite`;
process.env.NODE_ENV = "test";
process.env.DATABASE_PROVIDER = "sqlite";
process.env.DATABASE_PATH = databasePath;
process.env.SESSION_SECRET = randomBytes(36).toString("base64url");

const database = await import("../src/data/database.mjs");
const { intelligenceReleaseReadiness } = await import("../src/core/intelligence-release-readiness.mjs");

try {
  await assert.rejects(
    () => intelligenceReleaseReadiness({ accessScopes: ["customer"] }),
    (error) => error.statusCode === 403,
    "Customers must never inspect the private source and AI inventory",
  );
  const readiness = await intelligenceReleaseReadiness(
    { accessScopes: ["board"] },
    { NODE_ENV: "production", INTERNAL_AI_PROVIDER: "none" },
  );
  assert.equal(readiness.access, "board-admin-only");
  assert.equal(readiness.sourceRegister.total, 0);
  assert.deepEqual(readiness.sourceRegister.sources, []);
  assert.equal(readiness.nova.productionApproved, false);
  assert.equal(readiness.forecasting.productionApproved, false);
  assert.equal(readiness.pandora.intendedAnalyticalWorkspaces, 22);
  assert.equal(readiness.pandora.productionOperational, false);
  assert.equal(readiness.production.status, "not-certified");
  assert.equal(readiness.forecasting.persistedValueCount, 0);
  assert.equal(JSON.stringify(readiness).includes("secret"), false);
  console.log("Intelligence readiness rejects customers and never fabricates global data, NOVA or production forecasts.");
} finally {
  await database.closeDatabase();
  rmSync(databasePath, { force: true });
}
