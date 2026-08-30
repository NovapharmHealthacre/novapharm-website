import assert from "node:assert/strict";
import { test } from "node:test";
import { decideCapacity, estimateBackfillStorage, gibibyte, pathIsInside, privateCloudLayout } from "../src/private-cloud.ts";

test("private-cloud layout remains externalisable and deterministic", () => {
  const layout = privateCloudLayout({
    NOVAPHARM_DATA_ROOT: "/Volumes/NovaPharmData/pharmascope",
    NOVAPHARM_DATABASE_URL: "sqlite:/Volumes/NovaPharmData/pharmascope/database/novapharm.sqlite",
    NOVAPHARM_OBJECT_STORE: "/Volumes/NovaPharmData/pharmascope/objects",
    NOVAPHARM_ENVIRONMENT: "local_private_cloud",
  });
  assert.equal(layout.environment, "local_private_cloud");
  assert.equal(layout.directories.rawImmutable, "/Volumes/NovaPharmData/pharmascope/raw");
  assert.equal(layout.directories.parquet, "/Volumes/NovaPharmData/pharmascope/curated/parquet");
  assert.equal(layout.databasePath, "/Volumes/NovaPharmData/pharmascope/database/novapharm.sqlite");
  assert.equal(pathIsInside(layout.dataRoot, "/workspace/repository"), false);
  assert.equal(pathIsInside("/workspace/repository/data", "/workspace/repository"), true);
  assert.equal(pathIsInside("/Users/owner/Library/Application Support/NovaPharm", "/Users/owner/Documents/NovaPharm/repository"), false);
});

test("backfill planning reserves raw, facts, marts, working space and recovery capacity", () => {
  const plan = estimateBackfillStorage([
    { sourceId: "nhsbsa.epd", period: "2026-06", bytes: 8 * gibibyte },
    { sourceId: "nhsbsa.pca", period: "2026-06", bytes: 1 * gibibyte },
  ]);
  assert.equal(plan.rawBytes, 9 * gibibyte);
  assert.equal(plan.requiredBytes, Math.ceil(plan.rawBytes * 4.25));
  assert.equal(decideCapacity(80 * gibibyte, plan.requiredBytes).status, "sufficient");
  const blocked = decideCapacity(40 * gibibyte, plan.requiredBytes);
  assert.equal(blocked.status, "blocked_insufficient_capacity");
  assert.ok(blocked.shortfallBytes > 0);
});

test("invalid or relative private-cloud paths fail closed", () => {
  assert.throws(() => privateCloudLayout({ NOVAPHARM_DATA_ROOT: "./data", NOVAPHARM_ENVIRONMENT: "local_private_cloud" }), /absolute path/);
  assert.throws(() => privateCloudLayout({ NOVAPHARM_DATA_ROOT: "/data", NOVAPHARM_ENVIRONMENT: "unknown" }), /NOVAPHARM_ENVIRONMENT/);
});
