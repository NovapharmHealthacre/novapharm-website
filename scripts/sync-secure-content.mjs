import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
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

function writePrivateFileAtomically(destination, bytes) {
  const target = controlledLocalPath(dirname(destination), basename(destination));
  const temporaryPath = `${target}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, bytes, { mode: 0o600, flag: "wx" });
    renameSync(temporaryPath, target);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

function extension(name) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function safeName(name) {
  const value = String(name || "");
  return value.length <= 128 && basename(value) === value && !/[\\/\u0000-\u001f\u007f]/.test(value) && value !== "." && value !== "..";
}

function controlledLocalPath(parent, name) {
  const target = resolve(parent, name);
  const fromRoot = relative(localRoot, target);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error("Secure-content destination escaped the controlled local root.");
  }
  return target;
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
    const nextLocalPath = controlledLocalPath(localPath, item.name);
    if (item.folder) {
      await syncFolder(nextRemotePath, nextLocalPath);
      continue;
    }
    if (!item.file || !allowedExtensions.has(extension(item.name))) continue;
    if (Number(item.size || 0) > maxFileBytes) throw new Error(`Secure content file exceeds the configured limit: ${item.name}`);
    const downloadedBytes = await graph.downloadFile(drive.id, item.id);
    if (downloadedBytes.byteLength === 0 || downloadedBytes.byteLength > maxFileBytes) {
      throw new Error(`Secure content file returned an invalid byte size: ${item.name}`);
    }
    const bytes = extension(item.name) === ".html"
      ? Buffer.from(applyExecutiveBranding(new TextDecoder().decode(downloadedBytes), item.name), "utf8")
      : Buffer.from(downloadedBytes);
    if (bytes.length === 0 || bytes.length > maxFileBytes) throw new Error(`Secure content file exceeds the post-processing limit: ${item.name}`);
    // Graph content is private, path-confined, extension-allowlisted and byte-limited before this exclusive write.
    writePrivateFileAtomically(nextLocalPath, bytes);
    manifest.push({ path: nextRemotePath.slice(remoteRoot.length + 1), itemId: item.id, eTag: item.eTag, size: item.size, lastModifiedDateTime: item.lastModifiedDateTime });
  }
}

await syncFolder(remoteRoot, localRoot);
// This private manifest records validated Graph metadata and is not served by a public route.
writePrivateFileAtomically(join(localRoot, ".sharepoint-manifest.json"), JSON.stringify({ syncedAt: new Date().toISOString(), siteId: site.id, driveId: drive.id, remoteRoot, files: manifest }, null, 2));
console.log(`Synchronized ${manifest.length} controlled Executive Platform files from SharePoint.`);
