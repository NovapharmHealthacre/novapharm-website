import { encryptFinanceRecord, decryptFinanceRecord } from './finance-aes256.mjs';

const ID = /^[A-Za-z0-9_-]{1,96}$/;
const MAX_BYTES = 8 * 1024 * 1024;
const SOURCES = new Set(['worldBank','ecb','usTreasury','sec-edgar']);
function opaque(value) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error('Invalid Finance identifier');
  return value;
}
function reference(input) {
  if (!input || !SOURCES.has(input.source)) throw new Error('Unsupported Finance source');
  const tenant = opaque(input.tenant), entity = opaque(input.entity), id = opaque(input.id);
  return Object.freeze({ tenant, entity, recordType: 'snapshot-' + input.source, recordId: id });
}
function objectKey(scope) {
  return ['finance','v1',scope.tenant,scope.entity,scope.recordType,scope.recordId+'.json'].join('/');
}
function checkSnapshot(snapshot, source) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Invalid Finance snapshot');
  if (snapshot.publicationApproved !== false || snapshot.productionVerified !== false) throw new Error('Snapshot may not self-authorize publication');
  if (typeof snapshot.retrievedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.retrievedAt))) throw new Error('Invalid source timestamp');
  const rows = source === 'sec-edgar' ? snapshot.facts : snapshot.observations;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100000) throw new Error('Missing or oversized Finance evidence');
  if (rows.some(row => !row || row.source !== source || row.retrievedAt !== snapshot.retrievedAt)) throw new Error('Source or timestamp mismatch');
}
// Dependencies are server-only trusted adapters. verifyAccess MUST independently verify
// the session/service identity, entity membership, and operation on every call.
// audit MUST durably write a metadata-only record or reject; never logs payloads or credentials.
// Storage MUST enforce create-if-absent atomically, with no overwrites or plaintext fallback.
export function createFinanceSnapshotService({provider, storage, verifyAccess, audit}) {
  if (typeof verifyAccess !== 'function' || typeof audit !== 'function' ||
      typeof storage?.create !== 'function' || typeof storage?.read !== 'function' ||
      typeof provider?.generate !== 'function' || typeof provider?.unwrap !== 'function') {
    throw new Error('Finance persistence requires approved server-side adapters');
  }
  async function authorize(actor, scope, action) {
    const decision = await verifyAccess({actor, scope, action});
    if (decision?.allowed !== true) {
      await audit({scope, action, outcome:'denied'});
      throw new Error('Finance access denied');
    }
    const subject = opaque(decision.subject);
    await audit({scope, subject, action, outcome:'authorized'});
    return subject;
  }
  return Object.freeze({
    async save({actor, ref, snapshot}) {
      const scope = reference(ref);
      const subject = await authorize(actor, scope, 'create');
      let bytes;
      try {
        checkSnapshot(snapshot, ref.source);
        bytes = Buffer.from(JSON.stringify(snapshot), 'utf8');
        if (bytes.length > MAX_BYTES) throw new Error('Finance snapshot exceeds record limit');
        const encrypted = await encryptFinanceRecord({plaintext:bytes,scope,provider});
        await storage.create({key:objectKey(scope),envelope:encrypted});
      } catch {
        await audit({scope,subject,action:'create',outcome:'failed_or_commit_uncertain'});
        throw new Error('Finance snapshot could not be saved');
      } finally { bytes?.fill(0); }
      // If the completion audit fails, the caller receives an error and must reconcile
      // the immutable object; never retry with a different identifier blindly.
      await audit({scope,subject,action:'create',outcome:'stored'});
      return {id:scope.recordId,state:'encrypted_snapshot_stored',publicationApproved:false};
    },
    async read({actor, ref}) {
      const scope = reference(ref);
      const subject = await authorize(actor,scope,'read');
      let bytes, snapshot;
      try {
        const envelope = await storage.read({key:objectKey(scope)});
        bytes = await decryptFinanceRecord({envelope,scope,provider});
        snapshot = JSON.parse(bytes.toString('utf8'));
        checkSnapshot(snapshot,ref.source);
      } catch {
        await audit({scope,subject,action:'read',outcome:'failed'});
        throw new Error('Finance snapshot unavailable');
      } finally { bytes?.fill(0); }
      await audit({scope,subject,action:'read',outcome:'read'});
      return snapshot;
    }
  });
}
// Adapter for approved S3 bucket: callbacks wrap authenticated SDK calls.
// Read must return a bounded Buffer (no unbounded stream aggregation).
// S3 adds AES256 server-side encryption; the object itself already contains AES-256-GCM ciphertext.
export function createFinanceS3Storage({bucket,putObject,getObjectBytes}) {
  if(typeof bucket !== 'string' || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) ||
     typeof putObject !== 'function' || typeof getObjectBytes !== 'function') throw new Error('Invalid approved storage configuration');
  function verifyKey(key) {
    if(typeof key !== 'string' || !/^finance\/v1\/[A-Za-z0-9_-]{1,96}\/[A-Za-z0-9_-]{1,96}\/snapshot-(worldBank|ecb|usTreasury|sec-edgar)\/[A-Za-z0-9_-]{1,96}\.json$/.test(key)) throw new Error('Invalid Finance object key');
  }
  return Object.freeze({
    async create({key,envelope}) {
      verifyKey(key);
      if(envelope?.algorithm !== 'aes-256-gcm' || typeof envelope.ciphertext !== 'string') throw new Error('Encrypted envelope required');
      const body=Buffer.from(JSON.stringify(envelope));
      await putObject({Bucket:bucket,Key:key,Body:body,ContentType:'application/json',ServerSideEncryption:'AES256',IfNoneMatch:'*'});
    },
    async read({key}) {
      verifyKey(key);
      const bytes=await getObjectBytes({Bucket:bucket,Key:key,maxBytes:12*1024*1024});
      if(!Buffer.isBuffer(bytes)||bytes.length>12*1024*1024) throw new Error('Invalid encrypted object size');
      return JSON.parse(bytes.toString('utf8'));
    }
  });
}
