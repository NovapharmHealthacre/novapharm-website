import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const paths = [
  "apps/corporate/package.json", "apps/founder/package.json",
  "apps/portal/package.json", "apps/status/package.json",
  "apps/technology/package.json", "packages/design-system/package.json",
];
const moduleNames = [
  "react", "react-dom", "@types/react", "@types/react-dom",
];
test("all application workspaces and the shared design system use the same React version family", () => {
  const manifests = paths.map(path => ({ path, manifest: JSON.parse(read(path)) }));
  const seen = new Map();
  for (const { path, manifest } of manifests) {
    for (const name of moduleNames) {
      const v = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
      assert.ok(v, path + " must directly declare " + name);
      if (seen.has(name)) assert.equal(v, seen.get(name), path + " mismatched " + name);
      else seen.set(name, v);
    }
  }
});
test("npm lockfile guarantees a single physical React instance across every workspace", () => {
  const lock = JSON.parse(read("package-lock.json"));
  const names = [...moduleNames, "scheduler"];
  for (const name of names) {
    const path = "node_modules/" + name;
    assert.ok(lock.packages[path]?.version, "Missing canonical root installation " + path);
    const keys = Object.keys(lock.packages).filter(k => k === path || k.endsWith("/" + path));
    assert.deepEqual(keys, [path], "Duplicate React runtime/type installation: " + name);
  }
  const manifests = paths.map(path => ({ path, manifest: JSON.parse(read(path)) }));
  for (const { path, manifest } of manifests) {
    for (const name of moduleNames) {
      const expected = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
      assert.equal(lock.packages["node_modules/" + name].version, expected,
        path + " resolved different " + name);
      const k = path.replace(/\/package.json$/, "");
      const pinned = lock.packages[k]?.dependencies?.[name] ?? lock.packages[k]?.devDependencies?.[name];
      assert.equal(pinned, expected, "Lockfile workspace manifest drift: " + path + " " + name);
    }
  }
});
test("required CI acceptance still includes production readiness and protected contracts", () => {
  const gate = read(".github/workflows/novapharm-unified-ci-gate.yml");
  const prod = read(".github/workflows/ci.yml");
  assert.match(gate, /name: Policy coverage and invariant verification/);
  assert.match(gate, /name: Cross-estate regulated, AI, Google, Apple and native contracts/);
  assert.match(prod, /Run production readiness suite/);
  assert.match(prod, /Enforce readiness result/);
});
