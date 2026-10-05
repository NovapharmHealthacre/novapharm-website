import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse, serialize } from "parse5";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const output = path.resolve(process.argv[2] ?? path.join(root, "artifacts/corporate-pages"));
assert(!existsSync(output), "Output already exists; use a fresh release directory.");
assert(!output.split(path.sep).some((part) => ["01_RAW", "04_WAREHOUSE", ".git"].includes(part)), "Protected output path.");
const stage = mkdtempSync(path.join(tmpdir(), "novapharm-public-pages-"));
const application = path.join(stage, "apps/corporate");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
assert.equal(sha.status, 0);
const sourceEntries = ["apps/corporate", "packages/accessibility", "packages/content", "packages/design-system", "packages/forms", "packages/security", "packages/seo", "assets/brand", "assets/media", "assets/css", "package.json"];
for (const entry of sourceEntries) {
  cpSync(path.join(root, entry), path.join(stage, entry), {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(root, source);
      return !relative.split(path.sep).some((part) => ["node_modules", ".next", "public", "evidence", ".DS_Store", "proxy.ts", "api"].includes(part))
        && !path.basename(source).startsWith(".env")
        && !/\.(?:env|sqlite|db|pem|key|tsbuildinfo)$/.test(source);
    },
  });
}
symlinkSync(path.join(root, "node_modules"), path.join(stage, "node_modules"), "dir");
const env = Object.fromEntries(["PATH", "HOME", "USER", "LANG", "TMPDIR", "CI"].filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
Object.assign(env, { CORPORATE_OUTPUT_TARGET: "github-pages", NEXT_PUBLIC_CORPORATE_OUTPUT_TARGET: "github-pages", PUBLIC_INDEXABLE: "true", PLATFORM_MODE: "PUBLIC_ONLY", NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" });
for (const args of [[path.join(application, "scripts/sync-public-assets.mjs")], [path.join(path.dirname(require.resolve("next/package.json")), "dist/bin/next"), "build", "--webpack"]]) {
  const result = spawnSync(process.execPath, args, { cwd: application, env, stdio: "inherit" });
  assert.equal(result.status, 0, `Public export failed; inspect isolated stage ${stage}`);
}
cpSync(path.join(application, "out"), output, { recursive: true });
writeFileSync(path.join(output, ".nojekyll"), "");
writeFileSync(path.join(output, "CNAME"), "novapharmhealthcare.com\n");
const aliases = {
  "company-profile/index.html": "/about/company/",
  "uk-international-regulatory-services/index.html": "/services/",
  "distributor-opportunities/index.html": "/partner-with-us/",
  "contact.html": "/contact/",
  "solutions.html": "/services/",
  "supply-chain.html": "/partner-with-us/",
  "team.html": "/leadership/",
  "product-portfolio/index.html": "/products/",
  "product-portfolio/nutraxin/index.html": "/products/nutraxin/",
};
for (const [file, destination] of Object.entries(aliases)) {
  const target = path.join(output, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NovaPharm Healthcare</title><meta name="robots" content="noindex"><link rel="canonical" href="https://novapharmhealthcare.com${destination}"><meta http-equiv="refresh" content="0;url=${destination}"></head><body><main><h1>NovaPharm Healthcare</h1><a href="${destination}">Continue to the current page</a></main></body></html>`);
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
}
const records = [];
let htmlCount = 0;
for (const file of files(output)) {
  const relative = path.relative(output, file);
  assert(!/\.(?:map|sqlite|db|pem|key|bak)$/.test(relative), `Private artifact: ${relative}`);
  if (file.endsWith(".html")) {
    const document = parse(readFileSync(file, "utf8"));
    const hashes = new Set();
    let head;
    visit(document, (node) => {
      if (node.tagName === "head") head = node;
      assert(node.tagName !== "form", `A server-dependent form leaked into ${relative}`);
      for (const attr of node.attrs ?? []) {
        assert(!/^on/i.test(attr.name), `Inline event handler in ${relative}`);
        assert(!/^javascript:/i.test(attr.value), `JavaScript URL in ${relative}`);
        if (["src", "href", "action"].includes(attr.name)) assert(!/^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)|^\/(?:api|_next\/image)\//i.test(attr.value), `Local or backend dependency in ${relative}`);
      }
      if (node.tagName === "input") assert(!node.attrs.some((attr) => attr.name === "type" && ["password", "file"].includes(attr.value)), `Private input in ${relative}`);
      if (node.tagName === "script" && !node.attrs.some((attr) => attr.name === "src")) {
        const content = (node.childNodes ?? []).map((child) => child.value ?? "").join("");
        hashes.add(`'sha256-${createHash("sha256").update(content).digest("base64")}'`);
      }
    });
    assert(head, `Missing head in ${relative}`);
    const policy = `default-src 'self'; script-src 'self' ${[...hashes].join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests`;
    head.childNodes.unshift({ nodeName: "meta", tagName: "meta", namespaceURI: "http://www.w3.org/1999/xhtml", attrs: [{ name: "http-equiv", value: "Content-Security-Policy" }, { name: "content", value: policy }], childNodes: [], parentNode: head });
    writeFileSync(file, serialize(document));
    htmlCount += 1;
  }
  records.push({ path: relative, bytes: statSync(file).size, sha256: digest(readFileSync(file)) });
}
const approvedLogo = readFileSync(path.join(root, "assets/brand/novapharm-healthcare-logo.svg"));
assert.equal(digest(readFileSync(path.join(output, "assets/brand/novapharm-healthcare-logo.svg"))), digest(approvedLogo));
assert(htmlCount >= 55, "Incomplete public route export");
writeFileSync(path.join(output, "release.json"), `${JSON.stringify({ product: "NovaPharm Healthcare corporate website", profile: "PUBLIC_ONLY_GITHUB_PAGES", sourceRevision: sha.stdout.trim(), builtAt: new Date().toISOString(), htmlCount, logoSha256: digest(approvedLogo), artifactFingerprint: digest(JSON.stringify(records)), automatedForms: "UNAVAILABLE", authenticatedPortal: "EXTERNAL_OWNER_ONLY", portalUrl: "https://portal.novapharmhealthcare.com/portal/", customerPortal: "UNAVAILABLE", contact: "mailto:vishal@novapharmhealthcare.com" }, null, 2)}\n`);
writeFileSync(`${output}.manifest.json`, `${JSON.stringify({ sourceRevision: sha.stdout.trim(), htmlCount, files: records }, null, 2)}\n`);
console.log(`Validated ${htmlCount} static HTML files. Release: ${output}. Source and private runtime were not mutated.`);
