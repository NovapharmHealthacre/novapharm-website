import { createHash, randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { allocateNumber, audit, enqueue, nowIso, run, transaction } from "../data/database.mjs";
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

export async function storeDocument({ bytes: inputBytes, fileName, contentType, documentClass, entityType, entityId, businessNumber, displayName, actor }) {
  if (!allowedEntityTypes.has(entityType)) throw Object.assign(new Error("Unsupported document entity type."), { statusCode: 400 });
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(String(entityId || ""))) throw Object.assign(new Error("Entity ID is invalid."), { statusCode: 400 });
  if (!allowedContentTypes.has(contentType)) throw Object.assign(new Error("Unsupported document type."), { statusCode: 415 });
  const bytes = Buffer.from(inputBytes || []);
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw Object.assign(new Error("Document must be between 1 byte and 10 MB."), { statusCode: 413 });

  const cleanName = safeName(fileName);
  if (!allowedExtensions.get(contentType)?.has(extname(cleanName).toLowerCase()) || !signatureMatches(bytes, contentType)) {
    throw Object.assign(new Error("Document extension or file signature does not match the selected type."), { statusCode: 415 });
  }
  const cleanClass = String(documentClass || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64) || "general";
  const id = randomUUID();
  const documentNumber = await allocateNumber(`document:${cleanClass.toUpperCase()}`, `DOC-${cleanClass.toUpperCase()}-`);
  const checksum = createHash("sha256").update(bytes).digest("hex");
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
        storage_path, document_class, lifecycle_status, security_status, created_at, created_by, updated_at, updated_by
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, documentNumber, cleanName, cleanName, contentType, bytes.length, checksum, stored.storagePath, cleanClass, lifecycleStatus, stored.securityStatus, now, actor, now, actor);
      await run("INSERT INTO document_links(id, document_id, entity_type, entity_id, relationship, created_at) VALUES(?, ?, ?, ?, 'supporting_document', ?)", randomUUID(), id, entityType, entityId, now);
      await audit({ actor, action: "document.created", entityType: "document", entityId: id, after: { documentNumber, entityType, entityId, checksum, size: bytes.length, securityStatus: stored.securityStatus } });
      await enqueue({
        eventType: documentStore.requiresMalwareScan ? "document.malware_scan_requested" : "document.sharepoint_upload_requested",
        aggregateType: "document",
        aggregateId: id,
        destinationSystem: documentStore.requiresMalwareScan ? "azure_storage" : "sharepoint",
        idempotencyKey: documentStore.requiresMalwareScan ? `document:${id}:malware-scan:v1` : `document:${id}:upload:v1`,
        payload: {
          operation: documentStore.requiresMalwareScan ? "verify_malware_scan" : "upload_document",
          documentId: id,
          entityType,
          entityId,
          checksum,
          folderPath: sharePointFolderPath({ entityType, entityId, businessNumber, displayName })
        }
      });
      return { id, documentNumber, fileName: cleanName, checksum, lifecycleStatus, securityStatus: stored.securityStatus, syncStatus: "pending" };
    });
  } catch (error) {
    if (stored?.storagePath) await documentStore.remove(stored.storagePath);
    throw error;
  }
}
