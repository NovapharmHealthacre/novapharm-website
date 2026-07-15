const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
import { isResolvedSecret } from "../../core/secret-value.mjs";

function encodePath(path) {
  return String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

export function sharePointConfigFromEnv() {
  return {
    authMode: String(process.env.MICROSOFT_GRAPH_AUTH_MODE || (process.env.WEBSITE_INSTANCE_ID ? "managed-identity" : "client-secret")).toLowerCase(),
    tenantId: process.env.MICROSOFT_TENANT_ID || "",
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    hostname: process.env.SHAREPOINT_HOSTNAME || "",
    sitePath: process.env.SHAREPOINT_SITE_PATH || "",
    driveId: process.env.SHAREPOINT_DRIVE_ID || ""
  };
}

export function hasSharePointCredentials(config = sharePointConfigFromEnv()) {
  if (!config.hostname || !config.sitePath) return false;
  return hasGraphCredentials(config);
}

export function hasGraphCredentials(config = sharePointConfigFromEnv()) {
  if (config.authMode === "managed-identity") return Boolean(process.env.WEBSITE_INSTANCE_ID || process.env.AZURE_CLIENT_ID);
  return Boolean(config.tenantId && config.clientId && isResolvedSecret(config.clientSecret));
}

export class GraphClient {
  constructor(config = sharePointConfigFromEnv()) {
    this.config = config;
    this.accessToken = "";
    this.expiresAt = 0;
    this.credential = null;
  }

  async token() {
    if (this.accessToken && Date.now() < this.expiresAt - 60_000) return this.accessToken;
    if (this.config.authMode === "managed-identity") {
      if (!this.credential) {
        const { DefaultAzureCredential } = await import("@azure/identity");
        this.credential = new DefaultAzureCredential();
      }
      const token = await this.credential.getToken("https://graph.microsoft.com/.default");
      if (!token?.token) throw Object.assign(new Error("Microsoft Graph managed identity did not return an access token."), { code: "graph_managed_identity_token" });
      this.accessToken = token.token;
      this.expiresAt = Number(token.expiresOnTimestamp || Date.now() + 30 * 60 * 1000);
      return this.accessToken;
    }
    if (!hasGraphCredentials(this.config)) throw Object.assign(new Error("Microsoft Graph client credentials are not configured."), { code: "graph_credentials_missing" });
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials"
    });
    const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) throw Object.assign(new Error("Microsoft Graph authentication failed."), { code: `graph_auth_${response.status}` });
    const payload = await response.json();
    this.accessToken = payload.access_token;
    this.expiresAt = Date.now() + Number(payload.expires_in || 3600) * 1000;
    return this.accessToken;
  }

  async request(path, options = {}) {
    const { responseType = "json", ...fetchOptions } = options;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${GRAPH_ROOT}${path}`, {
        ...fetchOptions,
        headers: {
          Authorization: `Bearer ${await this.token()}`,
          ...(fetchOptions.body && !(fetchOptions.body instanceof Uint8Array) ? { "Content-Type": "application/json" } : {}),
          ...(fetchOptions.headers || {})
        },
        signal: fetchOptions.signal || AbortSignal.timeout(30_000)
      });
      if (response.status === 401 && attempt === 0) {
        this.accessToken = "";
        this.expiresAt = 0;
        continue;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        const retryAfter = response.headers.get("retry-after");
        const retrySeconds = Number(retryAfter);
        const delayMs = Number.isFinite(retrySeconds)
          ? Math.min(30_000, Math.max(0, retrySeconds * 1000))
          : Math.min(8_000, 250 * (2 ** attempt));
        if (response.body) await response.body.cancel().catch(() => {});
        await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
        continue;
      }
      if (!response.ok) {
        const body = await response.text();
        const error = new Error(`Microsoft Graph request failed with ${response.status}.`);
        error.code = `graph_${response.status}`;
        error.details = body.slice(0, 500);
        throw error;
      }
      if (response.status === 202 || response.status === 204 || responseType === "none") return null;
      if (responseType === "bytes") return new Uint8Array(await response.arrayBuffer());
      if (responseType === "text") return response.text();
      return response.json();
    }
    throw Object.assign(new Error("Microsoft Graph retry limit reached."), { code: "graph_retry_exhausted" });
  }

  async site() {
    return this.request(`/sites/${this.config.hostname}:${this.config.sitePath}`);
  }

  async drive(siteId) {
    if (this.config.driveId) return { id: this.config.driveId };
    return this.request(`/sites/${siteId}/drive`);
  }

  async ensureFolder(driveId, folderPath) {
    const segments = String(folderPath).split("/").filter(Boolean);
    let parent = "root";
    let item = null;
    for (const segment of segments) {
      const children = await this.request(`/drives/${driveId}/items/${parent}/children?$select=id,name,folder,webUrl`);
      item = children.value.find((child) => child.name.toLowerCase() === segment.toLowerCase() && child.folder);
      if (!item) {
        item = await this.request(`/drives/${driveId}/items/${parent}/children`, {
          method: "POST",
          body: JSON.stringify({ name: segment, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })
        });
      }
      parent = item.id;
    }
    return item;
  }

  async uploadSmallFile(driveId, folderPath, fileName, bytes, contentType) {
    const target = `${encodePath(folderPath)}/${encodeURIComponent(fileName)}`;
    return this.request(`/drives/${driveId}/root:/${target}:/content`, {
      method: "PUT",
      body: bytes,
      headers: { "Content-Type": contentType || "application/octet-stream" },
      signal: AbortSignal.timeout(60_000)
    });
  }

  async updateListItemFields(driveId, itemId, fields) {
    return this.request(`/drives/${driveId}/items/${itemId}/listItem/fields`, {
      method: "PATCH",
      body: JSON.stringify(fields)
    });
  }

  async listFolderChildren(driveId, folderPath) {
    const path = encodePath(folderPath);
    const endpoint = path
      ? `/drives/${driveId}/root:/${path}:/children?$select=id,name,size,file,folder,eTag,lastModifiedDateTime,webUrl`
      : `/drives/${driveId}/root/children?$select=id,name,size,file,folder,eTag,lastModifiedDateTime,webUrl`;
    return this.request(endpoint);
  }

  async downloadFile(driveId, itemId) {
    return this.request(`/drives/${driveId}/items/${itemId}/content`, {
      responseType: "bytes",
      signal: AbortSignal.timeout(120_000)
    });
  }
}
