import test from "node:test";
import assert from "node:assert/strict";
import { buildMedicineIdentityRelationships } from "../src/core/medicine-identity-relationships.mjs";

const payload = {
  medicine: {
    medicineId: "medicine-0123456789abcdef0123456789abcdef",
    canonicalName: "Apixaban oral suspension",
    medicineLevel: "BNF_PRESENTATION",
    sourceId: "nhsbsa.bnf-current",
    sourceLastSeenAt: "2026-07-30T12:00:00Z",
    validFrom: "2026-07-01",
    validTo: null,
    supplierName: "Private supplier that graph must not expose"
  },
  aliases: [
    { alias_type: "BNF_PRESENTATION_CODE", alias_text: "0208020Z0AAACAC", valid_from: "2026-07-01", valid_to: null },
    { alias_type: "BNF_CHEMICAL_SUBSTANCE", alias_text: "Apixaban", valid_from: "2026-07-01", valid_to: null }
  ],
  codeHistory: [
    { code_system: "BNF", code_value: "0208020Z0AAACAC", code_level: "BNF_PRESENTATION",
      valid_from: "2026-07-01", valid_to: null, change_reason: "current_source_identity" }
  ],
  hierarchy: [
    { code: "02", name: "Cardiovascular system", level: 2, validFrom: "2026-07-01", validTo: null },
    { code: "0208020Z0AAACAC", name: "Apixaban oral suspension", level: 7, validFrom: "2026-07-01", validTo: null }
  ]
};

test("recorded medicine identity has deterministic, one-hop source and BNF hierarchy relationships", () => {
  const graph = buildMedicineIdentityRelationships(payload);
  assert.equal(graph.contract, "novapharm.intelligence.identity-relationships.v1");
  assert.equal(graph.dataState, "derived_from_authorised_identity_records");
  assert.equal(graph.sourceId, "nhsbsa.bnf-current");
  assert.equal(graph.nodes.length, 7);
  assert.equal(graph.relationships.length, 6);
  assert.deepEqual(graph.relationships.map(e => e.relation).sort(), [
    "bnf_parent_of", "classified_under_recorded_bnf_leaf", "has_recorded_alias",
    "has_recorded_alias", "has_recorded_code", "listed_in_source"
  ]);
  assert.deepEqual(graph, buildMedicineIdentityRelationships(payload));
  const medicine = graph.nodes.find(n => n.kind === "medicine");
  assert.equal(medicine.label, "Apixaban oral suspension");
  assert.equal(medicine.validFrom, "2026-07-01");
  assert.equal(medicine.validTo, null);
  assert.ok(graph.nodes.some(n => n.kind === "historical_code" && n.codeSystem === "BNF"));
  assert.ok(graph.nodes.some(n => n.kind === "bnf_classification" && n.code === "02"));
});

test("distinct historical time slices remain separate and source text is not invented", () => {
  const former = { ...payload.codeHistory[0], valid_from: "2025-01-01", valid_to: "2025-12-31" };
  const graph = buildMedicineIdentityRelationships({ ...payload, codeHistory: [former, payload.codeHistory[0]] });
  const codes = graph.nodes.filter(n => n.kind === "historical_code");
  assert.equal(codes.length, 2);
  assert.notEqual(codes[0].id, codes[1].id);
  assert.ok(codes.some(n => n.validTo === "2025-12-31"));
  assert.ok(graph.limitations.some(s => /clinical equivalence/.test(s)));
  assert.equal(JSON.stringify(graph).includes("Private supplier"), false);
  assert.equal(graph.relationships.some(e => e.relation.includes("equivalent")), false);
});

test("duplicate identical aliases are deduplicated without relationship inflation", () => {
  const graph = buildMedicineIdentityRelationships({ ...payload, aliases: [payload.aliases[0], payload.aliases[0]] });
  assert.equal(graph.nodes.filter(n => n.kind === "recorded_alias").length, 1);
  assert.equal(graph.relationships.filter(e => e.relation === "has_recorded_alias").length, 1);
});

test("missing source identity or malformed medicine cannot silently form trusted relationships", () => {
  for (const bad of [
    { ...payload, medicine: { ...payload.medicine, sourceId: null } },
    { ...payload, medicine: { ...payload.medicine, medicineId: "other:123" } },
    { ...payload, medicine: { ...payload.medicine, canonicalName: "" } },
    { ...payload, medicine: { ...payload.medicine, canonicalName: "<script>\u0000" } }
  ]) assert.throws(() => buildMedicineIdentityRelationships(bad), /invalid|authoritative|authorised/i);
});

test("invalid code/alias/hierarchy inputs and excessive payloads fail closed", () => {
  for (const bad of [
    { ...payload, aliases: [null] },
    { ...payload, codeHistory: [null] },
    { ...payload, hierarchy: [null] },
    { ...payload, aliases: Array.from({ length: 501 }, () => payload.aliases[0]) },
    { ...payload, codeHistory: Array.from({ length: 501 }, () => payload.codeHistory[0]) },
    { ...payload, hierarchy: Array.from({ length: 16 }, () => payload.hierarchy[0]) }
  ]) assert.throws(() => buildMedicineIdentityRelationships(bad));
});

test("empty recorded relationships never produce implied science or market conclusions", () => {
  const graph = buildMedicineIdentityRelationships({ medicine: payload.medicine, aliases: [], codeHistory: [], hierarchy: [] });
  assert.equal(graph.nodes.length, 2);
  assert.deepEqual(graph.relationships.map(e => e.relation), ["listed_in_source"]);
  assert.ok(!JSON.stringify(graph).includes("approved medicine"));
});
