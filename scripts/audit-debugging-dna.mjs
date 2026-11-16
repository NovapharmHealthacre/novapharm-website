/**
 * Read-only, whole-repository debugging inventory.
 * The report contains only tracked paths, size, classification and rule IDs:
 * never file bodies, credentials, HTTP payloads or customer information.
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TEXT_EXTENSIONS = new Set([
  ".bicep", ".bicepparam", ".cjs", ".css", ".html", ".htm",
  ".js", ".json", ".jsx", ".md", ".mjs", ".mts", ".py", ".sh",
  ".sql", ".svg", ".swift", ".ts", ".tsx", ".txt", ".xml",
  ".yaml", ".yml"
]);
const SCRIPT_EXTENSIONS = new Set([".js", ".jsx", ".cjs", ".mjs", ".mts", ".ts", ".tsx"]);
const MAX_READ_BYTES = 4 * 1024 * 1024;

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

function kindFor(path) {
  if (path.endsWith(".html") || /\/app\/.*\/(?:page|route)\.(?:tsx?|jsx?)$/.test(path) ||
      /\/app\/(?:page|route)\.(?:tsx?|jsx?)$/.test(path)) return "page-or-route";
  if (path.startsWith(".github/workflows/")) return "workflow";
  const ext = extname(path).toLowerCase();
  if (SCRIPT_EXTENSIONS.has(ext) || ext === ".py" || ext === ".swift") return "source";
  if (ext === ".css") return "stylesheet";
  if (ext === ".json" || ext === ".yaml" || ext === ".yml") return "configuration";
  if (ext === ".md") return "documentation";
  if (TEXT_EXTENSIONS.has(ext)) return "other-text";
  return "binary-or-other";
}

function htmlWarnings(source, path, findings) {
  // Only literal tags are inspectable here; dynamic React/DOM output remains a browser-test concern.
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, "");
  if ((/(^|\/)index\.html$/i.test(path) || /^[^/]+\.html$/i.test(path)) &&
      !/<!doctype\s+html\b/i.test(withoutComments) && !/^\s*<(?:svg|template)\b/i.test(withoutComments)) {
    findings.push({ path, rule: "html-doctype", severity: "warning",
      detail: "Static HTML has no explicit HTML doctype; verify rendering in browser." });
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

export function scanRepository(root = process.cwd()) {
  root = resolve(root);
  const tracked = execFileSync("git", ["-C", root, "ls-files", "--cached", "-z"],
    { maxBuffer: 16 * 1024 * 1024 }).toString("utf8").split("\0").filter(Boolean).sort();
  const findings = [];
  const files = [];
  const byEstate = {};
  const byKind = {};
  let inspectedText = 0;
  let metadataOnly = 0;
  let routes = 0;
  let totalBytes = 0;

  for (const path of tracked) {
    const full = join(root, path);
    const estate = estateFor(path);
    const kind = kindFor(path);
    byEstate[estate] = (byEstate[estate] ?? 0) + 1;
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    if (kind === "page-or-route") routes++;

    if (!existsSync(full)) {
      findings.push({ path, rule: "tracked-file-missing", severity: "error",
        detail: "Tracked file does not exist in checkout." });
      files.push({ path, estate, kind, inspection: "missing", bytes: 0 });
      continue;
    }

    const stat = lstatSync(full);
    const bytes = stat.size;
    totalBytes += bytes;
    const ext = extname(path).toLowerCase();
    let inspection = "metadata-only";
    if (stat.isSymbolicLink()) {
      inspection = "symlink-metadata";
    } else if (stat.isFile() && TEXT_EXTENSIONS.has(ext) && bytes <= MAX_READ_BYTES) {
      inspection = "text";
      inspectedText++;
      const source = readFileSync(full, "utf8");
      if (ext === ".json") {
        try { JSON.parse(source); } catch {
          findings.push({ path, rule: "json-invalid", severity: "error",
            detail: "Tracked JSON cannot be parsed." });
        }
      }
      if (SCRIPT_EXTENSIONS.has(ext) && /^\s*debugger\s*;?\s*(?:\/\/.*)?$/m.test(source)) {
        findings.push({ path, rule: "production-debugger", severity: "error",
          detail: "An unconditional debugger statement is present." });
      }
      if (ext === ".html" || ext === ".htm") htmlWarnings(source, path, findings);
    } else {
      metadataOnly++;
      if (stat.isFile() && TEXT_EXTENSIONS.has(ext)) inspection = "oversize-text-metadata";
    }

    const exposed = path.startsWith("assets/") || path.startsWith("public/") ||
      /^apps\/[^/]+\/public\//.test(path);
    if (exposed && path.endsWith(".map")) {
      findings.push({ path, rule: "public-sourcemap", severity: "error",
        detail: "Public source map requires explicit restricted-publication review." });
    }
    files.push({ path, estate, kind, bytes, inspection });
  }

  // Read the authoritative Portal module catalogue, not a guessed list of routes.
  const modulePath = "packages/portal-contracts/src/module-catalog.json";
  let portalModules = null;
  if (!tracked.includes(modulePath)) {
    findings.push({ path: modulePath, rule: "module-catalog-missing", severity: "error",
      detail: "Governed Portal module catalogue is missing." });
  } else {
    try {
      const modules = JSON.parse(readFileSync(join(root, modulePath), "utf8"));
      portalModules = Array.isArray(modules) ? modules.length : null;
      if (!Array.isArray(modules) || modules.length !== 54 ||
          new Set(modules.map((item) => item.code)).size !== 54) {
        findings.push({ path: modulePath, rule: "module-catalog-integrity", severity: "error",
          detail: "Portal module inventory must contain 54 distinct codes." });
      }
    } catch {
      // json-invalid reports syntax errors already, but keep the module failure explicit.
      findings.push({ path: modulePath, rule: "module-catalog-unreadable", severity: "error",
        detail: "Portal module inventory could not be read." });
    }
  }

  const summary = {
    trackedFiles: tracked.length, inspectedText, metadataOnly, routeFiles: routes,
    portalModules, totalBytes, byEstate, byKind,
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length
  };
  return { schemaVersion: 1, scope: "tracked-source-inventory-not-runtime-certification",
    summary, files, findings };
}

function runCli() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const index = args.indexOf("--out");
  if (index !== -1 && (!args[index + 1] || args[index + 1].startsWith("--"))) {
    throw new Error("--out requires a path");
  }
  const report = scanRepository(process.cwd());
  if (index !== -1) {
    const target = resolve(args[index + 1]);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(report, null, 2) + "\n");
  }
  console.log("NovaPharm debugging inventory: " + JSON.stringify(report.summary));
  for (const finding of report.findings.slice(0, 50)) {
    console.log(finding.severity.toUpperCase() + " " + finding.rule + " " + finding.path);
  }
  if (report.findings.length > 50) console.log("Additional findings are in the JSON audit artifact.");
  if (strict && report.summary.errors) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
