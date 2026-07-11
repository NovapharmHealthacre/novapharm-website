const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

function encodePath(path) {
  return String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

export function sharePointConfigFromEnv() {
  return {
    tenantId: process.env.MICROSOFT_TENANT_ID || "",
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    hostname: process.env.SHAREPOINT_HOSTNAME || "",
    sitePath: process.env.SHAREPOINT_SITE_PATH || "",
    driveId: process.env.SHAREPOINT_DRIVE_ID || ""
  };
}

export function hasSharePointCredentials(config = sharePointConfigFromEnv()) {
  return Boolean(config.tenantId && config.clientId && config.clientSecret && config.hostname && config.sitePath);
}

export class GraphClient {
  constructor(config = sharePointConfigFromEnv()) {
    this.config = config;
    this.accessToken = "";
    this.expiresAt = 0;
  }

  async token() {
    if (this.accessToken && Date.now() < this.expiresAt - 60_000) return this.accessToken;
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
    const response = await fetch(`${GRAPH_ROOT}${path}`, {
      ...fetchOptions,
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        ...(fetchOptions.body && !(fetchOptions.body instanceof Uint8Array) ? { "Content-Type": "application/json" } : {}),
        ...(fetchOptions.headers || {})
      },
      signal: fetchOptions.signal || AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Microsoft Graph request failed with ${response.status}.`);
      error.code = `graph_${response.status}`;
      error.details = body.slice(0, 500);
      throw error;
    }
    if (response.status === 204) return null;
    if (responseType === "bytes") return new Uint8Array(await response.arrayBuffer());
    if (responseType === "text") return response.text();
    return response.json();
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
