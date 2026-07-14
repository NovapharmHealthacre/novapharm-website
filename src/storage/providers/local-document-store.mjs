import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export class LocalDocumentStore {
  constructor(environment = process.env) {
    const defaultDataRoot = dirname(resolve(environment.DATABASE_PATH || join(process.cwd(), "data", "novapharm.sqlite")));
    this.root = resolve(environment.DOCUMENT_STORAGE_ROOT || join(defaultDataRoot, "documents"));
    this.requiresMalwareScan = false;
    this.providerName = "local-private-filesystem";
  }

  async initialize() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
  }

  async putQuarantine({ bytes, objectName }) {
    const storagePath = resolve(this.root, objectName);
    if (!storagePath.startsWith(`${this.root}/`)) throw new Error("Document storage path is invalid.");
    await mkdir(dirname(storagePath), { recursive: true, mode: 0o700 });
    await writeFile(storagePath, bytes, { flag: "wx", mode: 0o600 });
    return { storagePath, securityStatus: "scan_not_configured" };
  }

  async read(storagePath) {
    const resolved = resolve(storagePath);
    if (!resolved.startsWith(`${this.root}/`)) throw new Error("Document storage path is outside the private root.");
    return readFile(resolved);
  }

  async remove(storagePath) {
    const resolved = resolve(storagePath);
    if (resolved.startsWith(`${this.root}/`)) await rm(resolved, { force: true });
  }

  async scanStatus() {
    return { state: "not_configured", result: null, scannedAt: null };
  }

  async promote(storagePath) {
    return storagePath;
  }

  status() {
    return "local_private_storage";
  }
}
