import { LocalDocumentStore } from "./providers/local-document-store.mjs";

const configuredProvider = String(process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.AZURE_STORAGE_ACCOUNT_NAME ? "azure-blob" : "local")).trim().toLowerCase();

async function createStore() {
  if (configuredProvider === "local") return new LocalDocumentStore(process.env);
  if (configuredProvider === "local-validation") {
    const { LocalValidationDocumentStore } = await import("./providers/local-validation-document-store.mjs");
    return new LocalValidationDocumentStore(process.env);
  }
  if (configuredProvider === "azure-blob") {
    const { AzureBlobDocumentStore } = await import("./providers/azure-blob-document-store.mjs");
    return new AzureBlobDocumentStore(process.env);
  }
  throw new Error(`Unsupported DOCUMENT_STORAGE_PROVIDER: ${configuredProvider}`);
}

export const documentStore = await createStore();
await documentStore.initialize();

export const documentStorageProvider = configuredProvider;

export function documentStorageStatus() {
  return documentStore.status();
}
