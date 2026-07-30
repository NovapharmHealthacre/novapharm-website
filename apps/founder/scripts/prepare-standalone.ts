import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const deploymentRoot = path.join(root, ".next", "standalone");
const standaloneRoot = path.join(deploymentRoot, "apps", "founder");
const serverPath = path.join(standaloneRoot, "server.js");

async function walk(directory: string): Promise<readonly string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) return [];
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );
  return paths.flat();
}

async function secureDeploymentArtifact(): Promise<number> {
  const initialFiles = await walk(deploymentRoot);
  await Promise.all(initialFiles.filter((file) => file.endsWith(".map")).map((file) => fs.rm(file)));
  const files = await walk(deploymentRoot);
  const forbidden = files.filter((file) => /(?:^|\/)(?:\.env|\.DS_Store)$|\.map$|\.sqlite(?:-shm|-wal)?$/.test(file));
  assert.deepEqual(
    forbidden,
    [],
    `Forbidden deployment artifacts: ${forbidden.map((file) => path.relative(root, file)).join(", ")}`,
  );

  const textExtensions = new Set([".css", ".html", ".js", ".json", ".mjs", ".txt", ".xml"]);
  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bre_[A-Za-z0-9_-]{20,}\b/,
    /\bPORTAL_PASSWORD\s*=\s*["'][^"']{6,}["']/,
    /\bBOOTSTRAP_ADMIN_PASSWORD\s*=\s*["'][^"']{6,}["']/,
  ];
  for (const file of files) {
    if (!textExtensions.has(path.extname(file))) continue;
    const stat = await fs.stat(file);
    if (stat.size > 2 * 1024 * 1024) continue;
    const content = await fs.readFile(file, "utf8");
    assert.ok(
      secretPatterns.every((pattern) => !pattern.test(content)),
      `Possible secret in deployment artifact: ${path.relative(root, file)}`,
    );
  }
  return files.length;
}

await fs.access(serverPath);
await fs.rm(path.join(standaloneRoot, "public"), { recursive: true, force: true });
await fs.cp(path.join(root, "public"), path.join(standaloneRoot, "public"), { recursive: true });
await fs.mkdir(path.join(standaloneRoot, ".next"), { recursive: true });
await fs.rm(path.join(standaloneRoot, ".next", "static"), { recursive: true, force: true });
await fs.cp(path.join(root, ".next", "static"), path.join(standaloneRoot, ".next", "static"), { recursive: true });
const deploymentFileCount = await secureDeploymentArtifact();

const [server, favicon, staticEntries] = await Promise.all([
  fs.stat(serverPath),
  fs.stat(path.join(standaloneRoot, "public", "favicon.svg")),
  fs.readdir(path.join(standaloneRoot, ".next", "static")),
]);
assert.ok(server.isFile(), "Standalone server entry is missing");
assert.ok(favicon.isFile(), "Standalone public assets are missing");
assert.ok(staticEntries.length > 0, "Standalone Next static assets are missing");
console.log(`Prepared and scanned the founder standalone deployment artifact (${deploymentFileCount} files).`);
