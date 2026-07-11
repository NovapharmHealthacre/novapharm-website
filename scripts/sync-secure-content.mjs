import "dotenv/config";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { GraphClient, hasSharePointCredentials, sharePointConfigFromEnv } from "../src/integrations/sharepoint/graph-client.mjs";
import { applyExecutiveBranding } from "../src/integrations/sharepoint/secure-content-branding.mjs";

const config = sharePointConfigFromEnv();
if (!hasSharePointCredentials(config)) {
  console.log("Secure SharePoint content sync skipped: Microsoft Graph credentials are not configured.");
  process.exit(0);
}

const secureRoot = resolve(process.env.SECURE_CONTENT_ROOT || join(process.cwd(), "_secure"));
const localRoot = join(secureRoot, "executive-platform");
const remoteRoot = process.env.SHAREPOINT_EXECUTIVE_PLATFORM_PATH || (process.env.NODE_ENV === "production" ? "" : "Executive Platform");
if (!remoteRoot) throw new Error("SHAREPOINT_EXECUTIVE_PLATFORM_PATH is required in production.");
const allowedExtensions = new Set([".html", ".js", ".pdf", ".json"]);
const maxFileBytes = Number(process.env.SECURE_CONTENT_MAX_FILE_BYTES || 25 * 1024 * 1024);
const manifest = [];

function extension(name) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function safeName(name) {
  return basename(String(name || "")) === name && name !== "." && name !== "..";
}

const graph = new GraphClient(config);
const site = await graph.site();
const drive = await graph.drive(site.id);

async function syncFolder(remotePath, localPath) {
  mkdirSync(localPath, { recursive: true });
  const children = await graph.listFolderChildren(drive.id, remotePath);
  for (const item of children.value || []) {
    if (!safeName(item.name)) throw new Error("SharePoint returned an unsafe secure-content item name.");
    if (remotePath === remoteRoot && item.name === "index.html") continue;
    const nextRemotePath = `${remotePath}/${item.name}`;
    const nextLocalPath = join(localPath, item.name);
    if (item.folder) {
      await syncFolder(nextRemotePath, nextLocalPath);
      continue;
    }
    if (!item.file || !allowedExtensions.has(extension(item.name))) continue;
    if (Number(item.size || 0) > maxFileBytes) throw new Error(`Secure content file exceeds the configured limit: ${item.name}`);
    const downloadedBytes = await graph.downloadFile(drive.id, item.id);
    const bytes = extension(item.name) === ".html"
      ? Buffer.from(applyExecutiveBranding(new TextDecoder().decode(downloadedBytes), item.name), "utf8")
      : Buffer.from(downloadedBytes);
    const temporaryPath = `${nextLocalPath}.tmp`;
    writeFileSync(temporaryPath, bytes, { mode: 0o600 });
    renameSync(temporaryPath, nextLocalPath);
    manifest.push({ path: nextRemotePath.slice(remoteRoot.length + 1), itemId: item.id, eTag: item.eTag, size: item.size, lastModifiedDateTime: item.lastModifiedDateTime });
  }
}

await syncFolder(remoteRoot, localRoot);
writeFileSync(join(localRoot, ".sharepoint-manifest.json"), JSON.stringify({ syncedAt: new Date().toISOString(), siteId: site.id, driveId: drive.id, remoteRoot, files: manifest }, null, 2), { mode: 0o600 });
console.log(`Synchronized ${manifest.length} controlled Executive Platform files from SharePoint.`);
