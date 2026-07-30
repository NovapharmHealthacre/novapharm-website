import assert from "node:assert/strict";
import test from "node:test";
import { people, personBySlug } from "../../content/src/index.ts";
import { canonicalEntityGraph, organisationNode, personNode } from "../src/index.ts";

test("organisation graph uses the official public identity", () => {
  const node = organisationNode();
  assert.equal(node["@id"], "https://novapharmhealthcare.com/#organization");
  assert.equal(node["name"], "NovaPharm Healthcare");
  assert.match(JSON.stringify(node["logo"]), /novapharm-healthcare-logo\.png/);
  assert.deepEqual(node["founder"], { "@id": "https://vishal.novapharmhealthcare.com/#person" });
});

test("Vishal entity has one canonical title and identifier", () => {
  const node = personNode(personBySlug("vishal-chakravarty"));
  assert.equal(node["jobTitle"], "Chief Executive Officer");
  assert.equal(node["@id"], "https://vishal.novapharmhealthcare.com/#person");
  assert.equal(node["url"], "https://vishal.novapharmhealthcare.com/about/");
});

test("entity graph contains one node for each person", () => {
  const graph = canonicalEntityGraph(people);
  const nodes = graph["@graph"] as readonly Record<string, unknown>[];
  assert.equal(nodes.length, people.length + 2);
  assert.equal(new Set(nodes.map((node) => node["@id"])).size, nodes.length);
  assert.doesNotMatch(JSON.stringify(graph), /Responsible Person/);
});
