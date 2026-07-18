import { createHash, randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { allocateNumber, audit, enqueue, nowIso, one, run, transaction } from "../data/database.mjs";
import { documentStore } from "../storage/document-store.mjs";
import { sharePointFolderPath } from "./sharepoint-mapping.mjs";

const allowedEntityTypes = new Set(["customer", "supplier", "product", "order", "invoice", "purchase_order", "quality_record", "regulatory_record", "warehouse_transaction", "employee", "training_record", "account_application"]);
const allowedContentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const allowedExtensions = new Map([
  ["application/pdf", new Set([".pdf"])],
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["text/csv", new Set([".csv"])],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", new Set([".docx"])],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new Set([".xlsx"])]
]);
const allowedDocumentClasses = new Set([
  "agreement",
  "company_due_diligence",
  "customer_onboarding",
  "licence",
  "general",
  "invoice",
  "quality",
  "regulatory",
  "statement",
  "training"
]);
const blockedEmbeddedExtensions = new Set([".bat", ".cmd", ".com", ".exe", ".htm", ".html", ".js", ".mjs", ".php", ".ps1", ".rar", ".sh", ".svg", ".zip", ".7z"]);

function safeName(name) {
  return basename(String(name || "document.bin")).replace(/[^a-zA-Z0-9._ -]/g, "-").slice(0, 180) || "document.bin";
}

function signatureMatches(bytes, contentType) {
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (contentType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType.includes("openxmlformats")) return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return contentType === "text/csv" && !bytes.includes(0);
}

function safeExtensionChain(fileName) {
  const lower = fileName.toLowerCase();
  return ![...blockedEmbeddedExtensions].some((extension) => lower.slice(0, -extname(lower).length).endsWith(extension));
}

function containsUnsupportedOfficeContent(bytes, contentType) {
  if (!contentType.includes("openxmlformats")) return false;
  const packageIndex = bytes.toString("latin1");
  return /vbaProject\.bin|\/(?:embeddings|externalLinks)\//i.test(packageIndex);
}

export async function storeDocument({ bytes: inputBytes, fileName, contentType, documentClass, entityType, entityId, businessNumber, displayName, actor }) {
  if (!allowedEntityTypes.has(entityType)) throw Object.assign(new Error("Unsupported document entity type."), { statusCode: 400 });
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(String(entityId || ""))) throw Object.assign(new Error("Entity ID is invalid."), { statusCode: 400 });
  if (!allowedContentTypes.has(contentType)) throw Object.assign(new Error("Unsupported document type."), { statusCode: 415 });
  const bytes = Buffer.from(inputBytes || []);
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw Object.assign(new Error("Document must be between 1 byte and 10 MB."), { statusCode: 413 });

  const cleanName = safeName(fileName);
  if (!safeExtensionChain(cleanName) || !allowedExtensions.get(contentType)?.has(extname(cleanName).toLowerCase()) || !signatureMatches(bytes, contentType)) {
    throw Object.assign(new Error("Document extension or file signature does not match the selected type."), { statusCode: 415 });
  }
  if (containsUnsupportedOfficeContent(bytes, contentType)) {
    throw Object.assign(new Error("Documents containing macros, embedded objects or external workbook links are not accepted."), { statusCode: 415 });
  }
  const cleanClass = String(documentClass || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64) || "general";
  if (!allowedDocumentClasses.has(cleanClass)) throw Object.assign(new Error("Unsupported document class."), { statusCode: 400 });
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const idempotencyKey = createHash("sha256").update(`${entityType}:${entityId}:${checksum}`).digest("hex");
  const existing = await one(`SELECT id, document_number, file_name, checksum_sha256, lifecycle_status, security_status
    FROM documents WHERE idempotency_key = ?`, idempotencyKey);
  if (existing) {
    return {
      id: existing.id,
      documentNumber: existing.document_number,
      fileName: existing.file_name,
      checksum: existing.checksum_sha256,
      lifecycleStatus: existing.lifecycle_status,
      securityStatus: existing.security_status,
      syncStatus: "existing",
      duplicate: true
    };
  }
  const id = randomUUID();
  const documentNumber = await allocateNumber(`document:${cleanClass.toUpperCase()}`, `DOC-${cleanClass.toUpperCase()}-`);
  const now = nowIso();
  let stored = null;

  try {
    stored = await documentStore.putQuarantine({
      bytes,
      objectName: `${entityType}/${entityId}/${id}-${cleanName}`,
      contentType,
      metadata: { documentid: id, entitytype: entityType, entityid: entityId, checksum }
    });
    const lifecycleStatus = documentStore.requiresMalwareScan ? "quarantine" : "draft";
    return transaction(async () => {
      await run(`INSERT INTO documents(
        id, document_number, title, file_name, content_type, size_bytes, checksum_sha256,
        idempotency_key, storage_path, document_class, lifecycle_status, security_status, created_at, created_by, updated_at, updated_by
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, documentNumber, cleanName, cleanName, contentType, bytes.length, checksum, idempotencyKey, stored.storagePath, cleanClass, lifecycleStatus, stored.securityStatus, now, actor, now, actor);
      await run("INSERT INTO document_links(id, document_id, entity_type, entity_id, relationship, created_at) VALUES(?, ?, ?, ?, 'supporting_document', ?)", randomUUID(), id, entityType, entityId, now);
      await audit({ actor, action: "document.created", entityType: "document", entityId: id, after: { documentNumber, entityType, entityId, checksum, size: bytes.length, securityStatus: stored.securityStatus } });
      if (documentStore.requiresMalwareScan) {
        await enqueue({
          eventType: "document.malware_scan_requested",
          aggregateType: "document",
          aggregateId: id,
          destinationSystem: "azure_storage",
          idempotencyKey: `document:${id}:malware-scan:v1`,
          payload: {
            operation: "verify_malware_scan",
            documentId: id,
            entityType,
            entityId,
            checksum,
            folderPath: sharePointFolderPath({ entityType, entityId, businessNumber, displayName })
          }
        });
      }
      return {
        id,
        documentNumber,
        fileName: cleanName,
        checksum,
        lifecycleStatus,
        securityStatus: stored.securityStatus,
        syncStatus: documentStore.requiresMalwareScan ? "pending_scan" : "blocked_scan_not_configured"
      };
    });
  } catch (error) {
    if (stored?.storagePath) await documentStore.remove(stored.storagePath);
    const duplicate = await one(`SELECT id, document_number, file_name, checksum_sha256, lifecycle_status, security_status
      FROM documents WHERE idempotency_key = ?`, idempotencyKey);
    if (duplicate) {
      return {
        id: duplicate.id,
        documentNumber: duplicate.document_number,
        fileName: duplicate.file_name,
        checksum: duplicate.checksum_sha256,
        lifecycleStatus: duplicate.lifecycle_status,
        securityStatus: duplicate.security_status,
        syncStatus: "existing",
        duplicate: true
      };
    }
    throw error;
  }
}
