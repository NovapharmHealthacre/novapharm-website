import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
test("WMS private AWS price publisher preserves approved offers and checkout verification parity", () => {
  const result = spawnSync("python3", ["-B", "scripts/test-wms-price-publisher.py"], {
    cwd: root, encoding: "utf8", timeout: 60000, env: { ...process.env, NOVAPHARM_CI_NO_PRODUCTION_WRITES: "1" },
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stdout + "\n" + result.stderr);
});
