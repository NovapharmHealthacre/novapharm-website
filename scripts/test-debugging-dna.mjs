import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { scanRepository } from "./audit-debugging-dna.mjs";

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "novapharm-debug-dna-"));
  execFileSync("git", ["init", "-q", root]);
  for (const [path, body] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
  execFileSync("git", ["-C", root, "add", "-A"]);
  execFileSync("git", ["-C", root, "-c", "user.name=Audit Fixture",
    "-c", "user.email=audit-fixture@example.invalid", "commit", "-q", "-m", "fixture"]);
  return root;
}

const modules = JSON.stringify(Array.from({ length: 54 }, (_, i) => ({
  code: "MODULE_" + String(i + 1).padStart(2, "0")
})));

test("walks all tracked paths and reports a seven-estate classification without uploading source", () => {
  const root = fixture({
    "index.html": "<!doctype html><html lang=\"en\"><body><main id=\"main\"></main></body></html>",
    "apps/corporate/app/page.tsx": "export default function Page() { return null; }",
    "apps/founder/app/page.tsx": "export default function Page() { return null; }",
    "apps/technology/app/page.tsx": "export default function Page() { return null; }",
    "apps/status/app/page.tsx": "export default function Page() { return null; }",
    "apps/portal/app/page.tsx": "export default function Page() { return null; }",
    "assets/js/site.js": "export const ok = true;",
    "packages/portal-contracts/src/module-catalog.json": modules
  });
  try {
    const report = scanRepository(root);
    assert.equal(report.summary.trackedFiles, 8);
    assert.equal(report.summary.portalModules, 54);
    assert.equal(report.summary.errors, 0);
    assert.equal(report.summary.routeFiles, 6);
    assert.ok(report.summary.inspectedText >= 8);
    assert.ok(report.summary.byEstate.corporate);
    assert.ok(report.summary.byEstate.portal);
    assert.ok(report.summary.byEstate["public-website"]);
    assert.equal(JSON.stringify(report).includes("export const ok"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed on invalid JSON, committed debugger statements and exposed source maps", () => {
  const root = fixture({
    "packages/portal-contracts/src/module-catalog.json": modules,
    "apps/portal/app/page.tsx": "export default function Page() { return null; }",
    "assets/js/client.js": "const value = 1;\n" + "debug" + "ger;\n",
    "assets/js/site.js.map": "{}",
    "docs/invalid.json": "{bad json"
  });
  try {
    const report = scanRepository(root);
    const rules = report.findings.map((item) => item.rule);
    assert.ok(rules.includes("production-debugger"));
    assert.ok(rules.includes("public-sourcemap"));
    assert.ok(rules.includes("json-invalid"));
    assert.ok(report.summary.errors >= 3);
    assert.equal(JSON.stringify(report).includes("{bad json"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports duplicate HTML IDs as warnings without claiming rendered-UI verification", () => {
  const root = fixture({
    "packages/portal-contracts/src/module-catalog.json": modules,
    "index.html": "<!doctype html><html><body><p id=\"same\"></p><p id=\"same\"></p></body></html>"
  });
  try {
    const report = scanRepository(root);
    assert.ok(report.findings.some((item) => item.rule === "html-duplicate-id" && item.severity === "warning"));
    assert.equal(report.summary.errors, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
