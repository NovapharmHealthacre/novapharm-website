import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outputRoot = path.join(root, "artifacts", "azure-release");
const nextApplications = ["corporate", "technology", "founder", "portal", "status"];
const releaseVersion = String(process.env.GITHUB_SHA || process.env.RELEASE_VERSION || "local-uncommitted").trim();

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are prohibited in release artifacts: ${path.relative(root, target)}`);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}

function shouldCopy(source) {
  const basename = path.basename(source);
  return basename !== ".DS_Store" && !source.endsWith(".map") && basename !== ".env";
}

async function copyTree(source, destination) {
  assert.ok(await exists(source), `Required release source is missing: ${path.relative(root, source)}`);
  await fs.cp(source, destination, { recursive: true, dereference: true, filter: shouldCopy });
}

async function resolveInstalledPackage(packageName, fromDirectory) {
  let cursor = fromDirectory;
  while (true) {
    const candidate = path.join(cursor, "node_modules", ...packageName.split("/"));
    if (await exists(path.join(candidate, "package.json"))) return candidate;
    const parent = path.dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}

async function copyProductionDependencyClosure(destinationRoot) {
  const rootPackage = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const queue = Object.keys(rootPackage.dependencies ?? {}).map((name) => ({ name, from: root, required: true }));
  const copied = new Set();

  while (queue.length) {
    const request = queue.shift();
    const source = await resolveInstalledPackage(request.name, request.from);
    if (!source) {
      assert.equal(request.required, false, `Required runtime dependency ${request.name} is not installed.`);
      continue;
    }
    const relative = path.relative(root, source);
    assert.ok(relative.startsWith("node_modules/"), `Runtime dependency escaped node_modules: ${relative}`);
    if (copied.has(relative)) continue;
    copied.add(relative);
    await copyTree(source, path.join(destinationRoot, relative));

    const packageJson = JSON.parse(await fs.readFile(path.join(source, "package.json"), "utf8"));
    const requiredDependencies = { ...(packageJson.dependencies ?? {}) };
    const optionalDependencies = { ...(packageJson.optionalDependencies ?? {}) };
    const peerDependencies = { ...(packageJson.peerDependencies ?? {}) };
    const peerMetadata = packageJson.peerDependenciesMeta ?? {};
    for (const name of Object.keys(requiredDependencies)) queue.push({ name, from: source, required: true });
    for (const name of Object.keys(optionalDependencies)) queue.push({ name, from: source, required: false });
    for (const name of Object.keys(peerDependencies)) queue.push({ name, from: source, required: peerMetadata[name]?.optional !== true });
  }
  return copied.size;
}

async function packageNextApplication(name) {
  const source = path.join(root, "apps", name, ".next", "standalone");
  const destination = path.join(outputRoot, name);
  await copyTree(source, destination);
  await fs.access(path.join(destination, "apps", name, "server.js"));
}

async function packageApi() {
  const destination = path.join(outputRoot, "api");
  await fs.mkdir(destination, { recursive: true });
  await Promise.all([
    copyTree(path.join(root, "apps", "api", "dist"), path.join(destination, "apps", "api", "dist")),
    copyTree(path.join(root, "src"), path.join(destination, "src")),
    copyTree(path.join(root, "database"), path.join(destination, "database")),
    copyTree(path.join(root, "config"), path.join(destination, "config")),
    copyTree(path.join(root, "packages", "portal-contracts", "src"), path.join(destination, "packages", "portal-contracts", "src")),
    fs.copyFile(path.join(root, "server.mjs"), path.join(destination, "server.mjs")),
  ]);
  await fs.mkdir(path.join(destination, "_secure"), { recursive: true });
  await fs.writeFile(path.join(destination, "package.json"), `${JSON.stringify({ name: "novapharm-api-release", private: true, type: "module", engines: { node: "24.x" } }, null, 2)}\n`);
  return copyProductionDependencyClosure(destination);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function validateArtifact(name) {
  const directory = path.join(outputRoot, name);
  const files = await walk(directory);
  const forbidden = files.filter((file) => {
    const relative = path.relative(directory, file);
    const firstPartyPath = !relative.startsWith("node_modules/");
    return (firstPartyPath && /(?:^|\/)(?:\.git|\.github|test|tests|docs|artifacts|private-content|tmp)(?:\/|$)/.test(relative))
      || /(?:^|\/)(?:\.env|\.DS_Store)$/.test(relative)
      || /\.(?:map|sqlite|sqlite-shm|sqlite-wal)$/i.test(relative);
  });
  assert.deepEqual(forbidden, [], `${name} contains forbidden files: ${forbidden.map((file) => path.relative(directory, file)).join(", ")}`);

  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\r\n]{80,}/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bre_[A-Za-z0-9_-]{20,}\b/,
  ];
  for (const file of files) {
    const relative = path.relative(directory, file);
    if (!/[.](?:css|html|js|json|mjs|mts|ts|txt|xml)$/i.test(file)) continue;
    const handle = await fs.open(file, "r");
    try {
      const stat = await handle.stat();
      if (stat.size > 2 * 1024 * 1024) continue;
      const content = await handle.readFile({ encoding: "utf8" });
      assert.ok(secretPatterns.every((pattern) => !pattern.test(content)), `Possible secret in ${path.relative(directory, file)}`);
      if (!relative.startsWith("node_modules/")) {
        assert.doesNotMatch(
          content,
          /\b(?:PORTAL_PASSWORD|BOOTSTRAP_ADMIN_PASSWORD|SESSION_SECRET|PORTAL_GATEWAY_SECRET)\s*=\s*["'][^"']{6,}["']/,
          `Possible first-party secret assignment in ${relative}`,
        );
      }
    } finally {
      await handle.close();
    }
  }

  const records = await Promise.all(files.map(async (file) => {
    const content = await fs.readFile(file);
    return { path: path.relative(directory, file), bytes: content.length, sha256: sha256(content) };
  }));
  records.sort((left, right) => left.path.localeCompare(right.path));
  return {
    application: name,
    releaseVersion,
    fileCount: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    digest: sha256(records.map((record) => `${record.sha256}  ${record.path}`).join("\n")),
  };
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });
for (const application of nextApplications) await packageNextApplication(application);
const apiDependencyCount = await packageApi();

const manifests = [];
for (const application of [...nextApplications, "api"]) manifests.push(await validateArtifact(application));
const releaseManifest = {
  schemaVersion: 1,
  releaseVersion,
  generatedAt: new Date().toISOString(),
  apiDependencyPackages: apiDependencyCount,
  applications: manifests,
};
await fs.writeFile(path.join(outputRoot, "release-manifest.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`);

for (const manifest of manifests) {
  console.log(`${manifest.application}: ${manifest.fileCount} files, ${manifest.totalBytes} bytes, ${manifest.digest.slice(0, 16)}`);
}
console.log(`Packaged six isolated Azure release artifacts at ${path.relative(root, outputRoot)}.`);
