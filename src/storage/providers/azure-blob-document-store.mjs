const scanResultTag = "Malware scanning scan result";
const scanTimeTags = ["Malware scanning scan time UTC", "Malware scanning scan time"];

function cleanSegment(value, fallback = "item") {
  return String(value || fallback).replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180) || fallback;
}

function parseStoragePath(storagePath) {
  const match = String(storagePath || "").match(/^azblob:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error("Azure Blob storage path is invalid.");
  return { container: match[1], blobName: match[2] };
}

function metadataValue(value) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, " ").slice(0, 1000);
}

export class AzureBlobDocumentStore {
  constructor(environment = process.env) {
    this.accountName = String(environment.AZURE_STORAGE_ACCOUNT_NAME || "").trim();
    this.quarantineContainer = String(environment.AZURE_STORAGE_QUARANTINE_CONTAINER || "uploads-quarantine").trim();
    this.privateContainer = String(environment.AZURE_STORAGE_PRIVATE_CONTAINER || "documents-private").trim();
    this.requiresMalwareScan = true;
    this.providerName = "azure-private-blob";
    this.service = null;
  }

  async initialize() {
    if (!/^[a-z0-9]{3,24}$/.test(this.accountName)) throw new Error("AZURE_STORAGE_ACCOUNT_NAME is required for Azure Blob document storage.");
    const [{ BlobServiceClient }, { DefaultAzureCredential }] = await Promise.all([
      import("@azure/storage-blob"),
      import("@azure/identity")
    ]);
    this.service = new BlobServiceClient(`https://${this.accountName}.blob.core.windows.net`, new DefaultAzureCredential());
  }

  #container(name) {
    if (![this.quarantineContainer, this.privateContainer].includes(name)) throw new Error("Azure Blob container is not approved for document storage.");
    return this.service.getContainerClient(name);
  }

  #blob(storagePath) {
    const { container, blobName } = parseStoragePath(storagePath);
    return { container, blobName, client: this.#container(container).getBlockBlobClient(blobName) };
  }

  async putQuarantine({ bytes, objectName, contentType, metadata = {} }) {
    const blobName = objectName.split("/").map((segment) => cleanSegment(segment)).join("/");
    const client = this.#container(this.quarantineContainer).getBlockBlobClient(blobName);
    await client.uploadData(bytes, {
      conditions: { ifNoneMatch: "*" },
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: "no-store",
        blobContentDisposition: "attachment"
      },
      metadata: Object.fromEntries(Object.entries(metadata).map(([key, value]) => [cleanSegment(key, "metadata").toLowerCase(), metadataValue(value)]))
    });
    return { storagePath: `azblob://${this.quarantineContainer}/${blobName}`, securityStatus: "pending_scan" };
  }

  async read(storagePath) {
    const { client } = this.#blob(storagePath);
    return client.downloadToBuffer();
  }

  async remove(storagePath) {
    const { client } = this.#blob(storagePath);
    await client.deleteIfExists({ deleteSnapshots: "include" });
  }

  async scanStatus(storagePath) {
    const { client } = this.#blob(storagePath);
    const tags = (await client.getTags()).tags || {};
    const result = tags[scanResultTag] || null;
    const scannedAt = scanTimeTags.map((key) => tags[key]).find(Boolean) || null;
    if (!result) return { state: "pending", result: null, scannedAt: null };
    if (result === "No threats found") return { state: "clean", result, scannedAt };
    if (result === "Malicious") return { state: "malicious", result, scannedAt };
    return { state: "error", result, scannedAt };
  }

  async promote(storagePath) {
    const source = this.#blob(storagePath);
    if (source.container === this.privateContainer) return storagePath;
    if (source.container !== this.quarantineContainer) throw new Error("Only quarantined documents can be promoted.");
    const bytes = await source.client.downloadToBuffer();
    const properties = await source.client.getProperties();
    const destination = this.#container(this.privateContainer).getBlockBlobClient(source.blobName);
    if (await destination.exists()) {
      const destinationProperties = await destination.getProperties();
      if (destinationProperties.metadata?.checksum !== properties.metadata?.checksum) {
        throw new Error("A different private document already exists at the promotion destination.");
      }
    } else {
      await destination.uploadData(bytes, {
        conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: {
          blobContentType: properties.contentType || "application/octet-stream",
          blobCacheControl: "no-store",
          blobContentDisposition: "attachment"
        },
        metadata: properties.metadata || {}
      });
    }
    return `azblob://${this.privateContainer}/${source.blobName}`;
  }

  status() {
    return "azure_private_blob";
  }
}
