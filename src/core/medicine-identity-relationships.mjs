/**
 * Read-only, source-backed medicine-identity relationship projection.
 *
 * This adds NO inferred equivalence, clinical claim, licence, commercial
 * opportunity, product authorisation or relationship to another medicine.
 * Its only inputs are records already returned by the board-scoped identity
 * service. It does not query tenant data or create an AI decision.
 */
import { createHash } from "node:crypto";

const fingerprint = (...parts) =>
  createHash("sha256").update(parts.map(value => String(value ?? "")).join("\u0000")).digest("hex");

function value(raw, label, maximum = 512) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > maximum || /[\u0000-\u001F]/u.test(raw)) {
    throw new Error("Invalid authorised " + label + ".");
  }
  return raw.trim();
}
function optional(raw, label, maximum = 512) {
  return raw == null || raw === "" ? null : value(raw, label, maximum);
}
function period(from, to) {
  return {
    validFrom: optional(from, "valid-from", 40),
    validTo: optional(to, "valid-to", 40)
  };
}

export function buildMedicineIdentityRelationships({ medicine, aliases = [], codeHistory = [], hierarchy = [] } = {}) {
  if (!medicine || typeof medicine !== "object" ||
      !/^medicine-[a-f0-9]{32}$/u.test(medicine.medicineId) ||
      !Array.isArray(aliases) || aliases.length > 500 ||
      !Array.isArray(codeHistory) || codeHistory.length > 500 ||
      !Array.isArray(hierarchy) || hierarchy.length > 15) {
    throw new Error("Authoritative identity graph inputs are invalid.");
  }
  const sourceId = value(medicine.sourceId, "source ID", 128);
  const name = value(medicine.canonicalName, "medicine name");
  const id = medicine.medicineId;
  const nodes = new Map();
  const relationships = new Map();
  const putNode = node => {
    const existing = nodes.get(node.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(node)) {
      throw new Error("Conflicting source records share a graph identity.");
    }
    nodes.set(node.id, node);
    return node.id;
  };
  const putRelationship = edge => relationships.set(JSON.stringify(edge), edge);

  const medicineNodeId = putNode({
    id: "medicine:" + fingerprint(id), kind: "medicine", medicineId: id,
    label: name, medicineLevel: optional(medicine.medicineLevel, "medicine level", 80),
    ...period(medicine.validFrom, medicine.validTo)
  });
  const sourceNodeId = putNode({
    id: "source:" + fingerprint(sourceId), kind: "publisher_source",
    sourceId, sourceLastSeenAt: optional(medicine.sourceLastSeenAt, "source freshness", 40)
  });
  putRelationship({ from: medicineNodeId, to: sourceNodeId, relation: "listed_in_source" });

  for (const entry of aliases) {
    const aliasType = value(entry.alias_type, "alias type", 100);
    const label = value(entry.alias_text, "alias", 1000);
    const validity = period(entry.valid_from, entry.valid_to);
    const aliasNodeId = putNode({
      id: "alias:" + fingerprint(id, aliasType, label, validity.validFrom, validity.validTo),
      kind: "recorded_alias", aliasType, label, ...validity
    });
    putRelationship({ from: medicineNodeId, to: aliasNodeId, relation: "has_recorded_alias" });
  }

  for (const entry of codeHistory) {
    const codeSystem = value(entry.code_system, "code system", 80);
    const codeValue = value(entry.code_value, "code value", 200);
    const codeLevel = optional(entry.code_level, "code level", 100);
    const validity = period(entry.valid_from, entry.valid_to);
    const codeNodeId = putNode({
      id: "code:" + fingerprint(id, codeSystem, codeValue, codeLevel, validity.validFrom, validity.validTo),
      kind: "historical_code", codeSystem, codeValue, codeLevel, ...validity,
      changeReason: optional(entry.change_reason, "change reason", 240)
    });
    putRelationship({ from: medicineNodeId, to: codeNodeId, relation: "has_recorded_code" });
  }

  // Parentage is taken ONLY from the authoritative BNF hierarchy returned
  // by the identity service. It is not an inferred chemical/clinical equivalence.
  let parentNodeId = null;
  for (const entry of hierarchy) {
    const code = value(entry.code, "BNF code", 100);
    const label = value(entry.name, "BNF name");
    const validity = period(entry.validFrom, entry.validTo);
    const bnfNodeId = putNode({
      id: "bnf:" + fingerprint(code, validity.validFrom, validity.validTo),
      kind: "bnf_classification", code, label, ...validity
    });
    if (parentNodeId) putRelationship({
      from: parentNodeId, to: bnfNodeId, relation: "bnf_parent_of"
    });
    parentNodeId = bnfNodeId;
  }
  if (parentNodeId) putRelationship({
    from: medicineNodeId, to: parentNodeId, relation: "classified_under_recorded_bnf_leaf"
  });

  return {
    contract: "novapharm.intelligence.identity-relationships.v1",
    dataState: "derived_from_authorised_identity_records",
    sourceId,
    sourceLastSeenAt: optional(medicine.sourceLastSeenAt, "source freshness", 40),
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    relationships: [...relationships.values()].sort((a, b) =>
      a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.relation.localeCompare(b.relation)),
    limitations: [
      "Only recorded source identity, aliases, code history and returned BNF hierarchy are linked.",
      "Alias links do not prove clinical equivalence, marketing authorisation, availability or commercial demand.",
      "Source-specific rights and historical ingestion status are not inferred from this projection.",
      "Protected board/admin service output only; not an authenticated customer or global medicines graph."
    ]
  };
}
