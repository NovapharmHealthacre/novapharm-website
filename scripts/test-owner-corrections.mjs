import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const failures = [];
const excludedTopLevel = new Set([
  ".git", ".github", "_secure", "architecture", "audit", "compliance", "data", "database",
  "deployment", "docs", "final-report", "geo", "integrations", "node_modules", "performance",
  "private-content", "public", "research", "scripts", "security", "seo", "sharepoint", "src", "tests"
]);

function fail(message) { failures.push(message); }
function text(relative) {
  const target = join(root, relative);
  if (!existsSync(target)) {
    fail(`Missing required file: ${relative}`);
    return "";
  }
  return readFileSync(target, "utf8");
}
function walkHtml(directory, relative = "") {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!relative && excludedTopLevel.has(entry.name)) continue;
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(absolute, nextRelative));
    else if (entry.name.endsWith(".html")) files.push({ absolute, relative: nextRelative });
  }
  return files;
}

const publicHtml = walkHtml(root);
const forbidden = [
  ["data-ai-search-open", "public AI/search trigger"],
  ["ai-search-dialog", "public AI/search dialog"],
  ["/assets/js/ai-search.js", "public AI/search script"],
  ["Search &amp; Ask NovaPharm", "public Search & Ask label"],
  ["/technology/ai-governance/", "AI Governance route link"],
  ["/search/", "public search route link"],
  ["Responsible AI at NovaPharm", "Responsible AI CTA"]
];
for (const file of publicHtml) {
  const html = readFileSync(file.absolute, "utf8");
  for (const [needle, label] of forbidden) {
    if (html.includes(needle)) fail(`${file.relative}: contains ${label}`);
  }
}

for (const relative of ["search", "technology/ai-governance", "assets/ai", "assets/js/ai-search.js", "assets/css/ai-search.css"]) {
  if (existsSync(join(root, relative))) fail(`Removed public AI/search path still exists: ${relative}`);
}

const cro = text("cro/index.html");
for (const required of [
  "/leadership/vishal-chakravarty/",
  "/leadership/girish-achliya/",
  "/leadership/prabhakar-lahare/",
  "Prabhakar Vitthal Lahare",
  "Managing Director &amp; Chief Operating Officer"
]) {
  if (!cro.includes(required)) fail(`CRO Senior judgement is missing: ${required}`);
}
const croLeaderCount = (cro.match(/class="cro-leader"/g) || []).length;
if (croLeaderCount !== 3) fail(`CRO Senior judgement must contain exactly 3 leader cards; found ${croLeaderCount}`);

const oncology = text("oncology/index.html");
if (!oncology.includes("oncology-editorial-gallery")) fail("Oncology editorial image gallery is missing");
for (const asset of [
  "/assets/media/oncology/oncology-formulation-pathways.svg",
  "/assets/media/oncology/oncology-evidence-continuity.svg",
  "/assets/media/oncology/oncology-condition-control.svg"
]) {
  if (!oncology.includes(asset)) fail(`Oncology gallery does not reference ${asset}`);
  if (!existsSync(join(root, asset.slice(1))) || !statSync(join(root, asset.slice(1))).isFile()) fail(`Oncology gallery asset is missing: ${asset}`);
}

for (const sitemap of ["sitemap.xml", "sitemap-images.xml", "sitemap-insights.xml"]) {
  const content = text(sitemap);
  if (/\/search\/|\/technology\/ai-governance\//.test(content)) fail(`${sitemap}: still references removed public AI/search routes`);
}

const home = text("index.html");
if (home.includes("nav-search")) fail("Homepage navigation still contains the removed search control");
if (!home.includes("/portal/")) fail("Homepage no longer links to Secure portal");
if (!home.includes("/account-application/")) fail("Homepage no longer links to Open an account");

const contact = text("contact/index.html");
if (!contact.includes("data-contact-form")) fail("Contact enquiry form hook is missing");
if (!text("assets/js/novapharm.js").includes('request("/api/contact"')) fail("Contact form API submission path is missing");

const account = text("account-application/index.html");
if (!account.includes("data-account-application")) fail("Account application form hook is missing");
if (!text("assets/js/account-application.js").includes('request("/api/account-applications"')) fail("Account application API path is missing");

const portal = text("portal/index.html");
if (!portal.includes("data-login-form")) fail("Secure portal login form is missing");
if (!portal.includes("data-entra-login")) fail("Microsoft login control is missing");
const portalScript = text("assets/js/portal-login.js");
if (!portalScript.includes('request("/api/health"')) fail("Portal health activation check is missing");
if (!portalScript.includes("/.auth/login/aad")) fail("Microsoft Entra login path is missing");

const cname = text("CNAME").trim();
if (cname !== "novapharmhealthcare.com") fail(`Unexpected CNAME: ${cname}`);

if (failures.length) {
  console.error("Owner corrective release validation failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Owner corrective release validation passed across ${publicHtml.length} public HTML documents.`);
