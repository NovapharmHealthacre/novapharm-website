/**
 * Read-only Git-object inventory of the exact committed revision.
 * No repository-controlled path is ever passed to a filesystem read API.
 * The report contains tracked paths, sizes and rule IDs, never source bodies.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TEXT_EXTENSIONS = new Set([
  ".bicep", ".bicepparam", ".cjs", ".css", ".html", ".htm",
  ".js", ".json", ".jsx", ".md", ".mjs", ".mts", ".py", ".sh",
  ".sql", ".svg", ".swift", ".ts", ".tsx", ".txt", ".xml",
  ".yaml", ".yml"
]);
const SCRIPT_EXTENSIONS = new Set([".js", ".jsx", ".cjs", ".mjs", ".mts", ".ts", ".tsx"]);
const MAX_READ_BYTES = 4 * 1024 * 1024;
const OUTPUT_DIR = "artifacts/debugging";
const OUTPUT_FILE = "artifacts/debugging/site-audit.json";

function estateFor(path) {
  if (path.startsWith("apps/corporate/")) return "corporate";
  if (path.startsWith("apps/founder/")) return "founder";
  if (path.startsWith("apps/technology/")) return "technology";
  if (path.startsWith("apps/status/")) return "status";
  if (path.startsWith("apps/portal/") || path.startsWith("portal/")) return "portal";
  if (/(^|\/)(intelligence|nova-ml|medicines)(\/|-)/i.test(path)) return "intelligence";
  if (/(^|\/)(wms|distribution)(\/|-)/i.test(path)) return "distribution";
  if (path.startsWith("apps/") || path.startsWith("packages/")) return "shared-platform";
  if (path.startsWith(".github/")) return "ci";
  if (path.startsWith("scripts/") || path.startsWith("tooling/")) return "quality-tooling";
  if (path.startsWith("docs/") || path.startsWith("audit/")) return "documentation";
  if (path.startsWith("assets/") || path.endsWith(".html") ||
      path.startsWith("legal/") || path.startsWith("src/")) return "public-website";
  return "other";
}

function extension(path) {
  const match = /\.([a-z0-9]+)$/i.exec(path);
  return match ? "." + match[1].toLowerCase() : "";
}

function kindFor(path) {
  if (path.endsWith(".html") || /\/app\/.*\/(?:page|route)\.(?:tsx?|jsx?)$/.test(path) ||
      /\/app\/(?:page|route)\.(?:tsx?|jsx?)$/.test(path)) return "page-or-route";
  if (path.startsWith(".github/workflows/")) return "workflow";
  const ext = extension(path);
  if (SCRIPT_EXTENSIONS.has(ext) || ext === ".py" || ext === ".swift") return "source";
  if (ext === ".css") return "stylesheet";
  if (ext === ".json" || ext === ".yaml" || ext === ".yml") return "configuration";
  if (ext === ".md") return "documentation";
  if (TEXT_EXTENSIONS.has(ext)) return "other-text";
  return "binary-or-other";
}

function htmlWarnings(source, path, findings) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");
  const isStandalone = /(^|\/)index\.html$/i.test(path) || /^[^/]+\.html$/i.test(path);
  if (isStandalone && !/<!doctype\s+html\b/i.test(withoutComments) &&
      !/^\s*<(?:svg|template)\b/i.test(withoutComments)) {
    findings.push({ path, rule: "html-doctype", severity: "warning",
      detail: "Standalone HTML has no explicit doctype; inspect in a browser." });
  }
  const tagSource = withoutComments.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const ids = new Set();
  let duplicates = 0;
  for (const tag of tagSource.match(/<[a-z][^>]*>/gi) ?? []) {
    const match = /\sid\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(tag);
    if (!match) continue;
    const id = match[1] ?? match[2];
    if (ids.has(id)) duplicates++;
    ids.add(id);
  }
  if (duplicates) findings.push({ path, rule: "html-duplicate-id", severity: "warning",
    detail: String(duplicates) + " repeated literal HTML id attribute(s); inspect rendered DOM." });
}

function gitObjects(root) {
  // The Git object ID is hex-validated; source filenames never become shell or fs paths.
  const tree = execFileSync("git", ["-C", root, "ls-tree", "-r", "-l", "-z", "HEAD"],
    { maxBuffer: 16 * 1024 * 1024 }).toString("utf8");
  const entries = [];
  for (const line of tree.split("\0").filter(Boolean)) {
    const match = /^(\d{6}) blob ([0-9a-f]{40,64})\s+(\d+)\t([\s\S]+)$/.exec(line);
    if (!match) continue; // Git submodules are commit objects, not content files.
    entries.push({ mode: match[1], oid: match[2], bytes: Number(match[3]), path: match[4] });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function blobText(root, oid) {
  if (!/^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(oid)) {
    throw new Error("Invalid Git object identifier.");
  }
  return execFileSync("git", ["-C", root, "cat-file", "blob", oid],
    { encoding: "utf8", maxBuffer: MAX_READ_BYTES + 1024 * 1024 });
}

export function scanRepository(root = process.cwd()) {
  root = resolve(root);
  const entries = gitObjects(root);
  const findings = [];
  const files = [];
  const byEstate = {};
  const byKind = {};
  let inspectedText = 0;
  let metadataOnly = 0;
  let routes = 0;
  let totalBytes = 0;
  const byPath = new Map();

  for (const entry of entries) {
    const { path, bytes, mode } = entry;
    byPath.set(path, entry);
    const estate = estateFor(path);
    const kind = kindFor(path);
    byEstate[estate] = (byEstate[estate] ?? 0) + 1;
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    if (kind === "page-or-route") routes++;
    totalBytes += bytes;

    const ext = extension(path);
    let inspection = "metadata-only";
    if (mode === "120000") {
      inspection = "symlink-metadata";
      metadataOnly++;
    } else if (TEXT_EXTENSIONS.has(ext) && bytes <= MAX_READ_BYTES) {
      inspection = "text";
      inspectedText++;
      const source = blobText(root, entry.oid);
      if (ext === ".json") {
        try { JSON.parse(source); } catch {
          findings.push({ path, rule: "json-invalid", severity: "error",
            detail: "Committed JSON cannot be parsed." });
        }
      }
      if (SCRIPT_EXTENSIONS.has(ext) && /^\s*debugger\s*;?\s*(?:\/\/.*)?$/m.test(source)) {
        findings.push({ path, rule: "production-debugger", severity: "error",
          detail: "An unconditional debugger statement is present." });
      }
      if (ext === ".html" || ext === ".htm") htmlWarnings(source, path, findings);
    } else {
      metadataOnly++;
      if (TEXT_EXTENSIONS.has(ext)) inspection = "oversize-text-metadata";
    }

    const exposed = path.startsWith("assets/") || path.startsWith("public/") ||
      /^apps\/[^/]+\/public\//.test(path);
    if (exposed && path.endsWith(".map")) {
      findings.push({ path, rule: "public-sourcemap", severity: "error",
        detail: "Public source map requires restricted-publication review." });
    }
    files.push({ path, estate, kind, bytes, inspection });
  }

  const modulePath = "packages/portal-contracts/src/module-catalog.json";
  let portalModules = null;
  const moduleEntry = byPath.get(modulePath);
  if (!moduleEntry) {
    findings.push({ path: modulePath, rule: "module-catalog-missing", severity: "error",
      detail: "Governed Portal module catalogue is missing." });
  } else {
    try {
      const modules = JSON.parse(blobText(root, moduleEntry.oid));
      portalModules = Array.isArray(modules) ? modules.length : null;
      if (!Array.isArray(modules) || modules.length !== 54 ||
          new Set(modules.map((item) => item.code)).size !== 54) {
        findings.push({ path: modulePath, rule: "module-catalog-integrity", severity: "error",
          detail: "Portal inventory must contain 54 distinct codes." });
      }
    } catch {
      findings.push({ path: modulePath, rule: "module-catalog-unreadable", severity: "error",
        detail: "Portal inventory could not be parsed." });
    }
  }

  const summary = {
    trackedFiles: entries.length, inspectedText, metadataOnly, routeFiles: routes,
    portalModules, totalBytes, byEstate, byKind,
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length
  };
  return { schemaVersion: 2, scope: "exact-commit-git-object-inventory-not-runtime-certification",
    summary, files, findings };
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--strict")) {
    throw new Error("Only --strict is supported; audit output uses a fixed path.");
  }
  const report = scanRepository(process.cwd());
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2) + "\n");
  console.log("NovaPharm debugging inventory: " + JSON.stringify(report.summary));
  for (const finding of report.findings.slice(0, 50)) {
    console.log(finding.severity.toUpperCase() + " " + finding.rule + " " + finding.path);
  }
  if (report.findings.length > 50) console.log("Additional findings are in the JSON audit artifact.");
  if (args.includes("--strict") && report.summary.errors) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
