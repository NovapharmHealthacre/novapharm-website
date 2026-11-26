/**
 * Private four-index production migration orchestrator.
 * No database connection, secrets, public route, cloud action or automatic execution.
 * The private operator must inject the authenticated MongoDB driver, a genuinely
 * independent change/backup authority and an immutable durable audit writer.
 */
import { inspectAtlasFourUniqueIndexes } from "./atlas-four-index-preflight.mjs";
import { ensurePrivateMedicineRightsUniqueIndex } from "./atlas-private-medicine-rights-index.mjs";
import { applyAtlasG2UniqueIndexes } from "./atlas-g2-unique-index-migration.mjs";

const REQUIRED_DB = "novapharm_intelligence_production";
const TICKET = /^[A-Za-z][A-Za-z0-9._:-]{7,127}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{3,127}$/u;
const deny = code => Object.assign(new Error("Four-index production migration denied: " + code), {code});
const REQUIRED = Object.freeze([
  "npi_source_rights","npi_medicine_evidence","npi_evidence_manifests","npi_audit_events"
]);

function authorizeProof(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    value.approved !== true || value.independentMfaVerified !== true ||
    value.changeSignatureVerified !== true ||
    value.backupRestoreVerified !== true ||
    value.productionWritesQuiesced !== true ||
    typeof value.changeTicket !== "string" || !TICKET.test(value.changeTicket) ||
    typeof value.operatorId !== "string" || !ID.test(value.operatorId) ||
    typeof value.backupEvidenceId !== "string" || !ID.test(value.backupEvidenceId) ||
    value.database !== REQUIRED_DB) throw deny("independent_production_authority_required");
  return Object.freeze({
    changeTicket:value.changeTicket,
    operatorId:value.operatorId,
    backupEvidenceId:value.backupEvidenceId
  });
}

async function persist(writer, event) {
  let result;
  try { result = await writer(Object.freeze({...event})); }
  catch { throw deny("durable_audit_unavailable"); }
  if (!result || result.persisted !== true) throw deny("durable_audit_unavailable");
}

export async function inspectFirstCountryIndexReadiness({database}={}) {
  const receipt = await inspectAtlasFourUniqueIndexes({database});
  return Object.freeze({
    ...receipt,
    productionLiveCountries:0,
    sourceRightsGranted:false,
    customerReleaseApproved:false
  });
}

/**
 * Default dry-run. An apply request MUST originate from a private human-controlled
 * maintenance agent, not a browser payload or user-supplied approval boolean.
 * This function cannot independently prove signer identity: verifyChange is an
 * external trusted boundary with MFA, signed change ticket and restore proof.
 * If a partial index write succeeds but audit fails, never drop that index;
 * reconcile independently and rerun a new authorised invocation.
 */
export async function runFirstCountryFourIndexMigration({
  database, apply=false, verifyChange, writeDurableAudit
}={}) {
  if (!database || database.databaseName !== REQUIRED_DB) throw deny("wrong_database");
  if (typeof apply !== "boolean") throw deny("invalid_apply_mode");
  const preflight = await inspectFirstCountryIndexReadiness({database});
  if (!apply || preflight.schemaReady) return Object.freeze({
    contract:"novapharm.intelligence.first-country-index-migration.v1",
    mode:"read-only",ready:preflight.schemaReady,changed:Object.freeze([]),
    preflight,productionIngestionApproved:false,customerReleaseApproved:false
  });
  if (!preflight.mutationCandidate) throw deny("unsafe_index_state");
  if (typeof verifyChange !== "function" || typeof writeDurableAudit !== "function") {
    throw deny("independent_authority_and_audit_required");
  }
  async function verify() {
    let evidence;
    try {
      evidence = await verifyChange(Object.freeze({
        operation:"create_first_country_four_unique_indexes",
        database:REQUIRED_DB,
        collections:REQUIRED,
        productionWritesMustBeQuiesced:true,
        independentRestoreTestRequired:true
      }));
    } catch { throw deny("independent_production_authority_required"); }
    return authorizeProof(evidence);
  }
  const operator = await verify();
  await persist(writeDurableAudit,{
    event:"index_migration_pre_authorized",
    ...operator, database:REQUIRED_DB, uniqueIndexCount:4
  });
  const right = await ensurePrivateMedicineRightsUniqueIndex({
    database,apply:true,changeTicket:operator.changeTicket,
    authorizeMigration: async () => {
      const current = await verify();
      return current.changeTicket === operator.changeTicket &&
        current.operatorId === operator.operatorId &&
        current.backupEvidenceId === operator.backupEvidenceId;
    }
  });
  if (right.changed) await persist(writeDurableAudit,{
    event:"unique_index_verified",collection:"npi_source_rights",
    indexName:"rights_unique_exact_resource_revision",
    ...operator,database:REQUIRED_DB
  });
  const g2 = await applyAtlasG2UniqueIndexes({
    database,
    verifyMigrationAuthority: async () => {
      const current = await verify();
      return {
        authorized:current.changeTicket===operator.changeTicket &&
          current.operatorId===operator.operatorId &&
          current.backupEvidenceId===operator.backupEvidenceId,
        productionWritesQuiesced:true,
        operatorId:current.operatorId,
        changeTicket:current.changeTicket
      };
    },
    beforeIndexCreate: async ({collection}) => {
      if (!REQUIRED.includes(collection) || collection === "npi_source_rights") {
        throw deny("unexpected_index_target");
      }
      const current = await verify();
      return {
        authorized: current.changeTicket === operator.changeTicket &&
          current.operatorId === operator.operatorId &&
          current.backupEvidenceId === operator.backupEvidenceId,
        productionWritesQuiesced: true,
        operatorId: current.operatorId,
        changeTicket: current.changeTicket
      };
    },
    afterVerifiedIndex: async ({collection,indexName}) => {
      await persist(writeDurableAudit,{
        event:"unique_index_verified",collection,indexName,
        ...operator,database:REQUIRED_DB
      });
      return {persisted:true};
    }
  });
  const postflight = await inspectFirstCountryIndexReadiness({database});
  if (!postflight.schemaReady || !g2.ready) throw deny("index_readback_not_complete");
  await persist(writeDurableAudit,{
    event:"four_index_schema_ready",...operator,database:REQUIRED_DB,
    uniqueIndexCount:4
  });
  return Object.freeze({
    contract:"novapharm.intelligence.first-country-index-migration.v1",
    mode:"private-authorised-apply",ready:true,
    changed:Object.freeze([
      ...(right.changed?["npi_source_rights"]:[]),...g2.changed
    ]),
    preflight,postflight,
    productionIngestionApproved:false,sourceRightsGranted:false,
    customerReleaseApproved:false
  });
}
