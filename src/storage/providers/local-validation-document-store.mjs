import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

function within(root, path) {
  const candidate = relative(root, path);
  return candidate === "" || (!candidate.startsWith("..") && !candidate.startsWith("/"));
}

export class LocalValidationDocumentStore {
  constructor(environment = process.env) {
    const protectedValidationMode = environment.LOCAL_PORTAL_MODE === "true" || environment.BROWSER_VALIDATION_MODE === "true";
    if (!protectedValidationMode || environment.NODE_ENV === "production") {
      throw new Error("The local validation document store is restricted to a protected non-production validation environment.");
    }
    this.root = resolve(environment.DOCUMENT_STORAGE_ROOT || "");
    if (!environment.DOCUMENT_STORAGE_ROOT) throw new Error("DOCUMENT_STORAGE_ROOT is required for local validation documents.");
    this.quarantineRoot = resolve(this.root, "quarantine");
    this.cleanRoot = resolve(this.root, "clean-test");
    this.scanResult = String(environment.LOCAL_VALIDATION_SCAN_RESULT || "pending").toLowerCase();
    this.requiresMalwareScan = true;
    this.providerName = "local-validation-private-filesystem";
  }

  async initialize() {
    await mkdir(this.quarantineRoot, { recursive: true, mode: 0o700 });
    await mkdir(this.cleanRoot, { recursive: true, mode: 0o700 });
  }

  async putQuarantine({ bytes, objectName }) {
    const storagePath = resolve(this.quarantineRoot, objectName);
    if (!within(this.quarantineRoot, storagePath)) throw new Error("Document storage path is invalid.");
    await mkdir(dirname(storagePath), { recursive: true, mode: 0o700 });
    await writeFile(storagePath, bytes, { flag: "wx", mode: 0o600 });
    return { storagePath, securityStatus: "quarantine" };
  }

  async read(storagePath) {
    const resolved = resolve(storagePath);
    if (!within(this.root, resolved)) throw new Error("Document storage path is outside the private validation root.");
    return readFile(resolved);
  }

  async remove(storagePath) {
    const resolved = resolve(storagePath);
    if (within(this.root, resolved)) await rm(resolved, { force: true });
  }

  async scanStatus(storagePath) {
    const resolved = resolve(storagePath);
    if (!within(this.quarantineRoot, resolved)) return { state: "error", result: "synthetic_path_rejected", scannedAt: new Date().toISOString() };
    if (this.scanResult !== "clean") return { state: "pending", result: "synthetic_local_validation_pending", scannedAt: null };
    return { state: "clean", result: "synthetic_local_validation_clean_not_production_scanned", scannedAt: new Date().toISOString() };
  }

  async promote(storagePath) {
    const resolved = resolve(storagePath);
    if (!within(this.quarantineRoot, resolved)) throw new Error("Only quarantined local validation documents may be promoted.");
    const cleanPath = resolve(this.cleanRoot, relative(this.quarantineRoot, resolved));
    if (!within(this.cleanRoot, cleanPath)) throw new Error("Clean-test document path is invalid.");
    await mkdir(dirname(cleanPath), { recursive: true, mode: 0o700 });
    await rename(resolved, cleanPath);
    return cleanPath;
  }

  status() {
    return "local_validation_private_storage";
  }
}
