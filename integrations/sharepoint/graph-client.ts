/**
 * TypeScript facade for the executable server implementation.
 * Runtime logic is intentionally single-sourced in src/integrations/sharepoint.
 */
export type SharePointConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  hostname: string;
  sitePath: string;
  driveId?: string;
};

export {
  GraphClient,
  hasSharePointCredentials,
  sharePointConfigFromEnv
} from "../../src/integrations/sharepoint/graph-client.mjs";
