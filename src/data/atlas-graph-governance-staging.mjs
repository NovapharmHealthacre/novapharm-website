/**
 * Private Atlas staging-only governance adapters for the PANDORA evidence graph.
 *
 * No implicit grant or inferred data licence. The collections are empty until
 * separately approved source rights and verified sessions are enrolled.
 *
 * IMPORTANT: Multi-collection reads in this staging adapter are not a
 * transactional permission snapshot. It MUST NOT be enabled as a customer
 * production authority until coherent revocation, session fencing, a durable
 * majority-write audit and independent cross-tenant acceptance are proven.
 */
import { approvedAtlasStagingConfig } from "./atlas-evidence-staging.mjs";

export const graphStagingCollections = Object.freeze({
  rights: "nova_source_rights_grants_staging",
  sessions: "nova_graph_authority_sessions_staging",
  audit: "nova_graph_audit_staging"
});

const ident = /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,127}$/u;
const workspace = /^[a-z0-9][a-z0-9_-]{2,63}$/u;
const revision = /^[A-Za-z0-9._:-]{1,128}$/u;
const digest = /^[a-f0-9]{64}$/u;
const graphPurpose = "internal_evidence_graph";

function safe(raw, pattern, label) {
  if (typeof raw !== "string" || !pattern.test(raw)) throw new Error("Invalid " + label + ".");
  return raw;
}
function timestamp(raw) {
  if (typeof raw !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u.test(raw) ||
      !Number.isFinite(Date.parse(raw))) throw new Error("Invalid UTC timestamp.");
  return raw;
}
function requireAdapter(collection, operation) {
  if (typeof collection?.[operation] !== "function") throw new Error("Governed staging collection unavailable.");
}
function requireEnabled(environment) {
  approvedAtlasStagingConfig(environment);
  if (environment.ATLAS_GRAPH_GOVERNANCE_ENABLED !== "true" ||
      environment.ATLAS_GRAPH_AUDIT_WRITE_ENABLED !== "true" ||
      environment.ATLAS_ENVIRONMENT !== "staging") throw new Error("Atlas graph governance is disabled.");
}
async function single(collection, filter, projection) {
  requireAdapter(collection, "find");
  const cursor = collection.find(filter, { projection: { _id: 0, ...projection } });
  if (typeof cursor?.limit !== "function") throw new Error("Invalid authoritative cursor.");
  const docs = await cursor.limit(2).toArray();
  if (!Array.isArray(docs) || docs.length > 1) throw new Error("Inconsistent authoritative records.");
  return docs[0] ?? null;
}
const rightsProjection = {
  workspace_id: 1, source_id: 1, source_version: 1,
  status: 1, allowed_purposes: 1, rights_revision: 1,
  valid_from: 1, valid_until: 1
};
const sessionProjection = {
  workspace_id: 1, principal_id: 1, authority_revision: 1,
  verified: 1, access_scopes: 1, expires_at: 1, revoked_at: 1
};

function safeRights(grant, w, s, v, now) {
  if (!grant || grant.workspace_id !== w || grant.source_id !== s || grant.source_version !== v ||
      grant.status !== "active" || !Array.isArray(grant.allowed_purposes) ||
      !grant.allowed_purposes.includes(graphPurpose) ||
      typeof grant.rights_revision !== "string" || !revision.test(grant.rights_revision)) return null;
  const from = timestamp(grant.valid_from);
  const until = grant.valid_until == null ? null : timestamp(grant.valid_until);
  if (Date.parse(from) > now || (until && Date.parse(until) <= now)) return null;
  return {
    workspaceId: w, sourceId: s, sourceVersion: v,
    status: "active", allowedPurposes: [graphPurpose],
    rightsRevision: grant.rights_revision,
    validFrom: from, validUntil: until
  };
}

/**
 * Inject private server-owned collection handles. No connection strings,
 * credential loading, internet/network calls or web-accessible routes here.
 */
export function createAtlasGraphStagingAdapters({
  rightsCollection, sessionsCollection, auditCollection,
  environment = process.env, clock = () => Date.now()
} = {}) {
  requireEnabled(environment);
  requireAdapter(rightsCollection, "find");
  requireAdapter(sessionsCollection, "find");
  requireAdapter(auditCollection, "insertOne");

  async function resolveSourceGrant({ workspaceId, sourceId, sourceVersion, purpose }) {
    const w = safe(workspaceId, workspace, "workspace");
    const s = safe(sourceId, ident, "source");
    const v = safe(sourceVersion, ident, "source version");
    if (purpose !== graphPurpose) return null;
    const grant = await single(rightsCollection,
      { workspace_id: w, source_id: s, source_version: v }, rightsProjection);
    const now = clock();
    if (!Number.isFinite(now)) throw new Error("Invalid authority clock.");
    return safeRights(grant, w, s, v, now);
  }

  async function verifyCurrentAuthority({ principalId, workspaceId, authorityRevision, sourceRightsRevisions }) {
    const principal = safe(principalId, ident, "principal");
    const w = safe(workspaceId, workspace, "workspace");
    const rev = safe(authorityRevision, revision, "authority revision");
    if (!Array.isArray(sourceRightsRevisions) || sourceRightsRevisions.length > 100) return false;
    const now = clock();
    if (!Number.isFinite(now)) return false;
    const session = await single(sessionsCollection,
      { workspace_id: w, principal_id: principal, authority_revision: rev }, sessionProjection);
    if (!session || session.workspace_id !== w || session.principal_id !== principal ||
        session.authority_revision !== rev || session.verified !== true ||
        !Array.isArray(session.access_scopes) ||
        !session.access_scopes.some(scope => scope === "board" || scope === "admin") ||
        session.revoked_at != null || Date.parse(timestamp(session.expires_at)) <= now) return false;

    const seen = new Set();
    for (const entry of sourceRightsRevisions) {
      const [sourceId, sourceVersion] = Array.isArray(entry?.source) ? entry.source : [];
      const s = safe(sourceId, ident, "source");
      const v = safe(sourceVersion, ident, "source version");
      const requiredRev = safe(entry.revision, revision, "rights revision");
      const key = JSON.stringify([s, v]);
      if (seen.has(key)) return false;
      seen.add(key);
      const grant = await resolveSourceGrant({
        workspaceId: w, sourceId: s, sourceVersion: v, purpose: graphPurpose
      });
      if (!grant || grant.rightsRevision !== requiredRev) return false;
    }
    return true;
  }

  async function recordAudit(event) {
    if (!event || event.action !== "intelligence.evidence_graph.read" ||
        !/^[0-9a-f-]{36}$/u.test(event.eventId)) throw new Error("Invalid governed audit event.");
    const doc = {
      event_id: event.eventId,
      action: event.action,
      actor_id: safe(event.actorId, ident, "actor"),
      workspace_id: safe(event.workspaceId, workspace, "workspace"),
      authority_revision: safe(event.authorityRevision, revision, "authority revision"),
      medicine_fingerprint: safe(event.medicineFingerprint, digest, "medicine fingerprint"),
      evidence_count: event.evidenceCount,
      source_count: event.sourceCount,
      provenance_digest: safe(event.provenanceDigest, digest, "provenance digest"),
      recorded_at: new Date(clock()).toISOString()
    };
    if (!Number.isSafeInteger(doc.evidence_count) || doc.evidence_count < 0 ||
        !Number.isSafeInteger(doc.source_count) || doc.source_count < 0 ||
        doc.evidence_count > 100 || doc.source_count > 100) throw new Error("Invalid audit totals.");
    const result = await auditCollection.insertOne(doc, { writeConcern: { w: "majority", j: true } });
    if (!result?.acknowledged || result.insertedId == null) {
      throw new Error("Audit insert not durably acknowledged.");
    }
    return { committed: true, eventId: doc.event_id };
  }
  return Object.freeze({ resolveSourceGrant, verifyCurrentAuthority, recordAudit });
}
