export interface GraphClientConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  sharePointHostname: string;
  sitePath: string;
  driveId?: string;
}

export interface GraphDriveItem {
  id: string;
  name: string;
  webUrl?: string;
  folder?: Record<string, unknown>;
  file?: Record<string, unknown>;
}

export const NOVAPHARM_PORTAL_FOLDERS = [
  "Regulatory Documents",
  "Product Catalogues",
  "Company Documents",
  "Business Plans",
  "Investor Files",
  "Downloads",
  "Announcements",
  "Task Tracking",
  "Executive Platform"
] as const;

export class SharePointGraphClient {
  private token?: string;

  constructor(private readonly config: GraphClientConfig) {
    const required = ["tenantId", "clientId", "clientSecret", "sharePointHostname", "sitePath"] as const;
    for (const key of required) {
      if (!config[key]) {
        throw new Error(`Missing SharePoint Graph configuration: ${key}`);
      }
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.token) return this.token;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials"
    });

    const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    if (!response.ok) {
      throw new Error(`Unable to authenticate to Microsoft Graph: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as { access_token: string };
    this.token = data.access_token;
    return this.token;
  }

  async graph<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`Graph request failed: ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<T>;
  }

  async getSiteId(): Promise<string> {
    const site = await this.graph<{ id: string }>(`/sites/${this.config.sharePointHostname}:${this.config.sitePath}`);
    return site.id;
  }

  async getDefaultDriveId(): Promise<string> {
    if (this.config.driveId) return this.config.driveId;
    const siteId = await this.getSiteId();
    const drive = await this.graph<{ id: string }>(`/sites/${siteId}/drive`);
    return drive.id;
  }

  async ensureFolder(folderName: string): Promise<GraphDriveItem> {
    const driveId = await this.getDefaultDriveId();
    const encoded = encodeURIComponent(folderName);

    try {
      return await this.graph<GraphDriveItem>(`/drives/${driveId}/root:/${encoded}`);
    } catch {
      return this.graph<GraphDriveItem>(`/drives/${driveId}/root/children`, {
        method: "POST",
        body: JSON.stringify({
          name: folderName,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename"
        })
      });
    }
  }

  async provisionPortalFolders(): Promise<GraphDriveItem[]> {
    const results: GraphDriveItem[] = [];
    for (const folder of NOVAPHARM_PORTAL_FOLDERS) {
      results.push(await this.ensureFolder(folder));
    }
    return results;
  }

  async uploadSmallFile(folderName: string, fileName: string, content: Blob | ArrayBuffer | Uint8Array): Promise<GraphDriveItem> {
    const driveId = await this.getDefaultDriveId();
    const folder = encodeURIComponent(folderName);
    const file = encodeURIComponent(fileName);
    const token = await this.getAccessToken();

    const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${folder}/${file}:/content`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: content
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<GraphDriveItem>;
  }
}

export function createClientFromEnvironment(env: Record<string, string | undefined>): SharePointGraphClient {
  return new SharePointGraphClient({
    tenantId: env.MICROSOFT_TENANT_ID || "",
    clientId: env.MICROSOFT_CLIENT_ID || "",
    clientSecret: env.MICROSOFT_CLIENT_SECRET || "",
    sharePointHostname: env.SHAREPOINT_HOSTNAME || "",
    sitePath: env.SHAREPOINT_SITE_PATH || "",
    driveId: env.SHAREPOINT_DRIVE_ID
  });
}
