import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REPO_ROOT, POLICY_FILE } from "./verify-unified-ci-contract.mjs";

const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const within = (path, root) => path === root || path.startsWith(root + "/");
const safe = path => typeof path === "string" && path.length > 0 &&
  !path.startsWith("/") && !path.includes("\\") && !path.split("/").some(p => !p || p === "." || p === "..") &&
  !/[\x00-\x1f\x7f]/.test(path);

export function buildWorkspaceGraph(policy, manifestFor) {
  assert.equal(policy.schemaVersion, 1);
  const projects = Object.entries(policy.projects).flatMap(([kind, entries]) => {
    assert.ok(["apps", "packages", "native", "integrations"].includes(kind));
    return entries.map(name => {
      const path = kind + "/" + name;
      assert.ok(safe(path));
      return { path, kind, manifest: ["apps", "packages"].includes(kind) ? manifestFor(path) : null };
    });
  });
  assert.equal(new Set(projects.map(x => x.path)).size, projects.length);
  const names = new Map();
  for (const item of projects) {
    if (item.manifest === null) continue;
    assert.ok(typeof item.manifest === "object" && typeof item.manifest.name === "string");
    assert.ok(!names.has(item.manifest.name), "Duplicate workspace package name");
    names.set(item.manifest.name, item.path);
  }
  const edges = [];
  const unresolved = [];
  for (const item of projects) {
    if (!item.manifest) continue;
    for (const section of sections) {
      for (const [name, specifier] of Object.entries(item.manifest[section] ?? {})) {
        assert.equal(typeof specifier, "string");
        const alias = specifier.startsWith("npm:") ? specifier.slice(4).match(/^(@[^/]+\/[^@]+|[^@]+)(?:@|$)/)?.[1] : null;
        const dependency = names.get(alias ?? name);
        if (dependency) edges.push({ consumer: item.path, dependency, section });
        else if (name.startsWith("@novapharm/") || alias?.startsWith("@novapharm/") ||
          /^(workspace:|file:|link:|portal:)/.test(specifier)) {
          unresolved.push({ consumer: item.path, dependency: name, section });
        }
      }
    }
  }
  const nodes = projects.map(({path, kind, manifest}) => ({path, kind, name: manifest?.name ?? null, opaque: !manifest}));
  return { nodes, edges, unresolved };
}

export function affectedWorkspaces(paths, graph) {
  const all = graph.nodes.map(n => n.path).sort();
  const affected = new Set();
  const reasons = new Set();
  if (!Array.isArray(paths) || !paths.length) reasons.add("missing-diff");
  if (graph.unresolved.length) reasons.add("unresolved-local-dependencies");
  for (const path of Array.isArray(paths) ? paths : []) {
    if (!safe(path)) { reasons.add("invalid-path"); continue; }
    const node = graph.nodes.find(n => within(path, n.path));
    if (!node) { reasons.add("shared-or-unregistered-input"); continue; }
    affected.add(node.path);
    if (node.opaque) reasons.add("opaque-project-input");
    // Manifest changes may alter dependency declarations or aliases.
    if (path === node.path + "/package.json") reasons.add("dependency-manifest-change");
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const {consumer, dependency} of graph.edges) {
      if (affected.has(dependency) && !affected.has(consumer)) {
        affected.add(consumer);
        changed = true;
      }
    }
  }
  return { mode: "advisory-only", declaredImpact: [...affected].sort(),
    candidates: reasons.size ? all : [...affected].sort(),
    fallbackReasons: [...reasons].sort(), requiredProjects: all,
    testsSkipped: 0, graphComplete: false };
}

export function readWorkspaceGraph(root = REPO_ROOT) {
  const policy = JSON.parse(readFileSync(join(root, POLICY_FILE), "utf8"));
  return buildWorkspaceGraph(policy, path => {
    const file = join(root, path, "package.json");
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const graph = readWorkspaceGraph();
  const report = {
    mode: "advisory-only", registeredProjects: graph.nodes.length,
    manifestProjects: graph.nodes.filter(n => !n.opaque).length,
    opaqueProjects: graph.nodes.filter(n => n.opaque).map(n => n.path),
    declaredEdges: graph.edges.length,
    unresolved: graph.unresolved,
    impact: affectedWorkspaces(process.argv.slice(2), graph),
    limitations: ["Declared npm manifests only; runtime imports, native dependencies, shared assets and generators are not proven complete.",
      "No build, test, or release gate is selected or skipped by this report."]
  };
  console.log(JSON.stringify(report, null, 2));
}
