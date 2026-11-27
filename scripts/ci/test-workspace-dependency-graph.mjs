import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceGraph, affectedWorkspaces, readWorkspaceGraph } from "./workspace-dependency-graph.mjs";
const policy = { schemaVersion: 1, projects: { apps: ["a", "b"], packages: ["core", "middle"], native: ["ios"], integrations: ["cloud"] } };
const manifests = {
  "apps/a": {name:"@novapharm/a", dependencies:{"@novapharm/middle":"0.1.0"}},
  "apps/b": {name:"@novapharm/b", devDependencies:{"@novapharm/core":"0.1.0"}},
  "packages/core": {name:"@novapharm/core"},
  "packages/middle": {name:"@novapharm/middle", peerDependencies:{"@novapharm/core":"0.1.0"}}
};
const graph = () => buildWorkspaceGraph(policy, path => manifests[path] ?? null);
test("reverse transitive dependencies reach consumers across dependency sections", () => {
  const g = graph();
  const r = affectedWorkspaces(["packages/core/src/index.ts"], g);
  assert.deepEqual(r.declaredImpact, ["apps/a", "apps/b", "packages/core", "packages/middle"]);
  assert.equal(r.testsSkipped, 0);
  assert.equal(r.requiredProjects.length, 6);
  assert.equal(r.graphComplete, false);
});
test("unknown, opaque, shared, malformed and manifest changes conservatively expand", () => {
  const g = graph();
  for (const paths of [[], ["assets/logo.svg"], ["native/ios/Build.swift"], ["integrations/cloud/config.json"], ["../outside"], ["apps/a/package.json"]]) {
    const r = affectedWorkspaces(paths, g);
    assert.deepEqual(r.candidates, r.requiredProjects);
    assert.ok(r.fallbackReasons.length);
    assert.equal(r.testsSkipped, 0);
  }
});
test("unknown workspace dependencies expand rather than falsely narrow", () => {
  const g = buildWorkspaceGraph(policy, path => path === "apps/a" ? {...manifests[path], dependencies:{"@novapharm/missing":"workspace:*"}} : manifests[path] ?? null);
  assert.equal(g.unresolved.length, 1);
  const r = affectedWorkspaces(["apps/b/index.ts"], g);
  assert.deepEqual(r.candidates, r.requiredProjects);
});
test("duplicate names and malformed dependency specifiers cannot be silently accepted", () => {
  assert.throws(() => buildWorkspaceGraph(policy, path => path.startsWith("apps/") ? {name:"duplicate"} : null), /Duplicate/);
  assert.throws(() => buildWorkspaceGraph(policy, path => path === "apps/a" ? {name:"@novapharm/a", dependencies:{x:null}} : null));
});
test("registered real estate contains declared apps and shared package consumers", () => {
  const g = readWorkspaceGraph();
  assert.ok(g.nodes.length >= 32);
  assert.ok(g.nodes.some(n => n.path === "apps/portal" && n.name === "@novapharm/portal"));
  assert.ok(g.edges.some(e => e.consumer === "apps/portal" && e.dependency === "packages/security"));
  assert.ok(g.nodes.some(n => n.kind === "native" && n.opaque));
  const r = affectedWorkspaces(["packages/security/src/index.ts"], g);
  assert.ok(r.declaredImpact.includes("apps/portal"));
  assert.equal(r.testsSkipped, 0);
});
