import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { all, nowIso, one, run, transaction } from "../data/database.mjs";

const uploadTtlMs = Number(process.env.APPLICATION_UPLOAD_TOKEN_TTL_MS || 30 * 60 * 1000);
const resumeTtlMs = Number(process.env.APPLICATION_RESUME_TOKEN_TTL_MS || 24 * 60 * 60 * 1000);
const maximumFiles = 10;

function tokenHash(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

function tokenParts(token) {
  const [id, secret, ...extra] = String(token || "").split(".");
  if (extra.length || !/^[0-9a-f-]{36}$/i.test(id || "") || !/^[A-Za-z0-9_-]{32,}$/.test(secret || "")) return null;
  return { id, secret };
}

function tokenMatches(secret, expectedHash) {
  const actual = Buffer.from(tokenHash(secret), "hex");
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function newTokenRecord(applicationId, purpose, ttlMs, maxFiles = 0) {
  const id = randomUUID();
  const secret = randomBytes(32).toString("base64url");
  const now = nowIso();
  return {
    token: `${id}.${secret}`,
    record: {
      id,
      application_id: applicationId,
      purpose,
      token_hash: tokenHash(secret),
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
      max_files: maxFiles,
      uploaded_count: 0,
      created_at: now
    }
  };
}

async function grantRecord(applicationId, token, purpose, { allowExpired = false } = {}) {
  const parts = tokenParts(token);
  if (!parts) return null;
  const record = await one(`SELECT id, application_id, purpose, token_hash, expires_at, max_files, uploaded_count, revoked_at
    FROM application_upload_grants WHERE id = ? AND application_id = ? AND purpose = ?`, parts.id, applicationId, purpose);
  if (!record || record.revoked_at || (!allowExpired && Date.parse(record.expires_at) <= Date.now())) return null;
  return tokenMatches(parts.secret, record.token_hash) ? record : null;
}

async function insertGrant(record) {
  await run(`INSERT INTO application_upload_grants(
    id, application_id, purpose, token_hash, expires_at, max_files, uploaded_count, created_at
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`, record.id, record.application_id, record.purpose,
  record.token_hash, record.expires_at, record.max_files, record.uploaded_count, record.created_at);
}

async function uploadedDocumentCount(applicationId) {
  return Number((await one(`SELECT COUNT(DISTINCT document_id) AS count FROM document_links
    WHERE entity_type = 'account_application' AND entity_id = ?`, applicationId))?.count || 0);
}

export async function createApplicationUploadAuthorisations(applicationId, expectedDocumentCount = maximumFiles) {
  const application = await one("SELECT id, expected_document_count FROM account_applications WHERE id = ?", applicationId);
  if (!application) throw Object.assign(new Error("Application not found."), { statusCode: 404 });
  const remaining = Math.max(0, maximumFiles - await uploadedDocumentCount(applicationId));
  const upload = newTokenRecord(applicationId, "upload", uploadTtlMs, remaining);
  const resume = newTokenRecord(applicationId, "resume", resumeTtlMs, 0);
  await transaction(async () => {
    await run("UPDATE application_upload_grants SET revoked_at = ? WHERE application_id = ? AND revoked_at IS NULL", nowIso(), applicationId);
    await insertGrant(upload.record);
    await insertGrant(resume.record);
  });
  return {
    uploadToken: upload.token,
    resumeToken: resume.token,
    uploadExpiresAt: upload.record.expires_at,
    resumeExpiresAt: resume.record.expires_at,
    remainingFiles: remaining,
    maximumFiles
  };
}

export async function refreshApplicationUploadAuthorisations(applicationId, resumeToken) {
  const resume = await grantRecord(applicationId, resumeToken, "resume");
  if (!resume) throw Object.assign(new Error("Upload recovery authorisation is invalid or expired."), { statusCode: 403 });
  const application = await one("SELECT expected_document_count FROM account_applications WHERE id = ?", applicationId);
  if (!application) throw Object.assign(new Error("Application not found."), { statusCode: 404 });
  return createApplicationUploadAuthorisations(applicationId, application.expected_document_count);
}

export async function reserveApplicationUpload(applicationId, uploadToken) {
  const grant = await grantRecord(applicationId, uploadToken, "upload");
  if (!grant) throw Object.assign(new Error("Upload authorisation is invalid or expired."), { statusCode: 403 });
  const result = await run(`UPDATE application_upload_grants SET uploaded_count = uploaded_count + 1, last_used_at = ?
    WHERE id = ? AND application_id = ? AND purpose = 'upload' AND revoked_at IS NULL
      AND expires_at > ? AND uploaded_count < max_files`, nowIso(), grant.id, applicationId, nowIso());
  if (!result.changes) throw Object.assign(new Error("The application document limit has been reached."), { statusCode: 409 });
  return { grantId: grant.id };
}

export async function releaseApplicationUploadReservation(grantId) {
  await run(`UPDATE application_upload_grants SET uploaded_count = CASE WHEN uploaded_count > 0 THEN uploaded_count - 1 ELSE 0 END
    WHERE id = ?`, grantId);
}

export async function completeApplicationUploads(applicationId, uploadToken) {
  const grant = await grantRecord(applicationId, uploadToken, "upload");
  if (!grant) throw Object.assign(new Error("Upload authorisation is invalid or expired."), { statusCode: 403 });
  const count = await uploadedDocumentCount(applicationId);
  const application = await one("SELECT expected_document_count FROM account_applications WHERE id = ?", applicationId);
  if (!application) throw Object.assign(new Error("Application not found."), { statusCode: 404 });
  if (count < Number(application.expected_document_count || 0)) {
    throw Object.assign(new Error("One or more expected documents have not been uploaded."), { statusCode: 409, uploadedCount: count });
  }
  await run("UPDATE application_upload_grants SET revoked_at = ? WHERE application_id = ? AND revoked_at IS NULL", nowIso(), applicationId);
  return { uploadedCount: count, authorisationsRevoked: true };
}

export async function applicationUploadState(applicationId) {
  const documents = await all(`SELECT d.id, d.document_number, d.file_name, d.document_class, d.lifecycle_status,
      d.security_status, d.malware_scan_result, d.created_at
    FROM documents d JOIN document_links dl ON dl.document_id = d.id
    WHERE dl.entity_type = 'account_application' AND dl.entity_id = ? ORDER BY d.created_at`, applicationId);
  const activeGrant = await one(`SELECT expires_at, max_files, uploaded_count FROM application_upload_grants
    WHERE application_id = ? AND purpose = 'upload' AND revoked_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1`, applicationId, nowIso());
  return { documents, activeGrant };
}
