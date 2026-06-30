import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { allocateNumber, audit, enqueue, nowIso, run, transaction } from "../data/database.mjs";
import { sharePointFolderPath } from "./sharepoint-mapping.mjs";

const allowedEntityTypes = new Set(["customer", "supplier", "product", "order", "invoice", "purchase_order", "quality_record", "regulatory_record", "warehouse_transaction", "employee", "training_record", "account_application"]);
const allowedContentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

function safeName(name) {
  return basename(String(name || "document.bin")).replace(/[^a-zA-Z0-9._ -]/g, "-").slice(0, 180);
}

export function storeDocument({ bytes, fileName, contentType, documentClass, entityType, entityId, businessNumber, displayName, actor }) {
  if (!allowedEntityTypes.has(entityType)) throw Object.assign(new Error("Unsupported document entity type."), { statusCode: 400 });
  if (!entityId) throw Object.assign(new Error("Entity ID is required."), { statusCode: 400 });
  if (!allowedContentTypes.has(contentType)) throw Object.assign(new Error("Unsupported document type."), { statusCode: 415 });
  if (!bytes?.length || bytes.length > 10 * 1024 * 1024) throw Object.assign(new Error("Document must be between 1 byte and 10 MB."), { statusCode: 413 });

  const id = randomUUID();
  const documentNumber = allocateNumber(`document:${String(documentClass || "GEN").toUpperCase()}`, `DOC-${String(documentClass || "GEN").toUpperCase()}-`);
  const cleanName = safeName(fileName);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const folder = resolve(process.cwd(), "data", "documents", entityType, entityId);
  mkdirSync(folder, { recursive: true });
  const storagePath = join(folder, `${id}-${cleanName}`);
  writeFileSync(storagePath, bytes, { flag: "wx" });
  const now = nowIso();

  return transaction(() => {
    run(`INSERT INTO documents(
      id, document_number, title, file_name, content_type, size_bytes, checksum_sha256,
      storage_path, document_class, lifecycle_status, created_at, created_by, updated_at, updated_by
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`, id, documentNumber, cleanName, cleanName, contentType, bytes.length, checksum, storagePath, documentClass || "general", now, actor, now, actor);
    run("INSERT INTO document_links(id, document_id, entity_type, entity_id, relationship, created_at) VALUES(?, ?, ?, ?, 'supporting_document', ?)", randomUUID(), id, entityType, entityId, now);
    audit({ actor, action: "document.created", entityType: "document", entityId: id, after: { documentNumber, entityType, entityId, checksum, size: bytes.length } });
    enqueue({
      eventType: "document.sharepoint_upload_requested",
      aggregateType: "document",
      aggregateId: id,
      destinationSystem: "sharepoint",
      idempotencyKey: `document:${id}:upload:v1`,
      payload: {
        operation: "upload_document",
        documentId: id,
        entityType,
        entityId,
        checksum,
        folderPath: sharePointFolderPath({ entityType, entityId, businessNumber, displayName })
      }
    });
    return { id, documentNumber, fileName: cleanName, checksum, lifecycleStatus: "draft", syncStatus: "pending" };
  });
}
