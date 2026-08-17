import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { getPlatformCapabilities, resolvePlatformMode } from "../src/core/platform-mode.mjs";

const root = resolve(process.cwd());
const platformMode = resolvePlatformMode();
const platformCapabilities = getPlatformCapabilities(platformMode);
const failures = [];
const excludedTopLevel = new Set([
  ".changeset", ".git", ".github", "_secure", "apps", "architecture", "artifacts", "assets", "audit",
  "compliance", "config", "creative-assets", "data", "database", "deployment", "docs", "final-report",
  "geo", "infra", "integrations", "node_modules", "packages", "performance", "private-content", "public",
  "research", "scripts", "security", "seo", "sharepoint", "src", "tests"
]);

function fail(message) { failures.push(message); }
function text(relative) {
  const target = join(root, relative);
  try {
    return readFileSync(target, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Missing required file: ${relative}`);
      return "";
    }
    throw error;
  }
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
  "Chief Operating Officer"
]) {
  if (!cro.includes(required)) fail(`CRO Senior judgement is missing: ${required}`);
}
if (cro.includes("Managing Director &amp; Chief Operating Officer")) fail("CRO Senior judgement contains Prabhakar's superseded executive title");
const croLeaderCount = (cro.match(/class="cro-leader"/g) || []).length;
if (croLeaderCount !== 3) fail(`CRO Senior judgement must contain exactly 3 leader cards; found ${croLeaderCount}`);

/*
 * Leadership release red-team contract.
 * These checks run after the site build, so the generated public HTML—not a
 * stale checked-in snapshot—is tested as the deployable authority.
 */
const leadershipIndex = text("leadership/index.html");
const girishProfile = text("leadership/girish-achliya/index.html");
const approvedLeadershipTitle = "Chief Scientific Officer";
const supersededLeadershipTitle = "Chief Technical Director";
const approvedPortraits = [
  ["Vishal Chakravarty", "assets/vishalchakravarty.png", 1200, 1200],
  ["Prabhakar Vitthal Lahare", "assets/prabhakarvitthallahare.png", 960, 1200],
  ["Dr Girish Shantilal Achliya", "assets/girishshantilalachliya.png", 960, 1200]
];

if (!leadershipIndex.includes(approvedLeadershipTitle)) fail(`Leadership index is missing Dr Girish's approved title: ${approvedLeadershipTitle}`);
if (leadershipIndex.includes(supersededLeadershipTitle)) fail(`Leadership index still contains superseded title: ${supersededLeadershipTitle}`);
if (!girishProfile.includes(approvedLeadershipTitle)) fail(`Dr Girish profile is missing approved title: ${approvedLeadershipTitle}`);
if (girishProfile.includes(supersededLeadershipTitle)) fail(`Dr Girish profile still contains superseded title: ${supersededLeadershipTitle}`);
if (!girishProfile.includes('"jobTitle":"Chief Scientific Officer"')) fail("Dr Girish structured Person data is missing Chief Scientific Officer jobTitle.");
if (!girishProfile.includes("/assets/girishshantilalachliya.png")) fail("Dr Girish profile is not using the approved PNG portrait master.");
if (!girishProfile.includes("Dr Girish Shantilal Achliya, Chief Scientific Officer of NovaPharm Healthcare")) fail("Dr Girish portrait accessibility text is not aligned to the approved CSO title.");

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const [name, relative, expectedWidth, expectedHeight] of approvedPortraits) {
  const publicPath = `/${relative}`;
  if (!leadershipIndex.includes(publicPath)) fail(`Leadership index is not using the approved portrait for ${name}: ${publicPath}`);
  const absolute = join(root, relative);
  let image;
  try {
    image = readFileSync(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Approved portrait is missing for ${name}: ${relative}`);
      continue;
    }
    fail(`Approved portrait is unreadable for ${name}: ${relative}`);
    continue;
  }
  if (image.length < 24 || !image.subarray(0, 8).equals(pngSignature)) {
    fail(`Approved portrait is not a valid PNG for ${name}: ${relative}`);
    continue;
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    fail(`Approved portrait dimensions changed for ${name}: expected ${expectedWidth}x${expectedHeight}, found ${width}x${height}`);
  }
}

for (const portraitPath of approvedPortraits.map(([, relative]) => `/${relative}`)) {
  if (!cro.includes(portraitPath)) fail(`CRO leadership presentation is not using approved portrait: ${portraitPath}`);
}
if (!cro.includes(approvedLeadershipTitle)) fail(`CRO leadership presentation is missing Dr Girish's approved title: ${approvedLeadershipTitle}`);
if (cro.includes(supersededLeadershipTitle)) fail(`CRO leadership presentation still contains superseded title: ${supersededLeadershipTitle}`);

const leadershipCssSource = text("assets/css/leadership-apple.css");
const cssBundle = text("assets/css/novapharm.bundle.css");
if (!leadershipCssSource.includes("--leadership-apple-contract: 1")) fail("Leadership Apple-aligned source contract is missing.");
if (!cssBundle.includes("--leadership-apple-contract: 1")) fail("Leadership Apple-aligned CSS was not included in the generated bundle.");
if (!leadershipCssSource.includes('-apple-system, BlinkMacSystemFont')) fail("Leadership typography is not using the platform-native Apple system-font stack.");
const appleFontHostTokens = ["//apple.com/", "//www.apple.com/", "//developer.apple.com/"];
const fontAssetExtensions = [".woff", ".woff2", ".ttf", ".otf"];
const hotlinksAppleFont = appleFontHostTokens.some((host) => leadershipCssSource.includes(host))
  && fontAssetExtensions.some((extension) => leadershipCssSource.includes(extension));
if (/@font-face\b/i.test(leadershipCssSource) || hotlinksAppleFont) {
  fail("Leadership CSS must not embed, copy or hotlink Apple proprietary font assets.");
}
if (!leadershipCssSource.includes('body[data-page="leadership"]') || !leadershipCssSource.includes('body[data-page^="leadership/"]')) {
  fail("Leadership visual refinement is not safely scoped to leadership routes.");
}

const oncology = text("oncology/index.html");
if (!oncology.includes("oncology-editorial-gallery")) fail("Oncology editorial image gallery is missing");
for (const asset of [
  "/assets/media/oncology/oncology-formulation-pathways.svg",
  "/assets/media/oncology/oncology-evidence-continuity.svg",
  "/assets/media/oncology/oncology-condition-control.svg"
]) {
  if (!oncology.includes(asset)) fail(`Oncology gallery does not reference ${asset}`);
  try {
    readFileSync(join(root, asset.slice(1)));
  } catch (error) {
    if (error?.code === "ENOENT") fail(`Oncology gallery asset is missing: ${asset}`);
    else fail(`Oncology gallery asset is unreadable: ${asset}`);
  }
}

for (const sitemap of ["sitemap.xml", "sitemap-images.xml", "sitemap-insights.xml"]) {
  const content = text(sitemap);
  if (/\/search\/|\/technology\/ai-governance\//.test(content)) fail(`${sitemap}: still references removed public AI/search routes`);
}

const home = text("index.html");
if (home.includes("nav-search")) fail("Homepage navigation still contains the removed search control");
if (!home.includes("/portal/")) fail("Homepage no longer links to Secure portal");
if (!home.includes("/account-application/")) fail("Homepage no longer links to Open an account");
if (!home.includes("Medicine. Where it needs to be")) fail("Homepage is missing the owner-approved hero title.");

const contact = text("contact/index.html");
if (platformCapabilities.publicForms && !contact.includes("data-contact-form")) fail("Contact enquiry form hook is missing");
if (!platformCapabilities.publicForms && (contact.includes("data-contact-form") || contact.includes("<form"))) fail("PUBLIC_ONLY contact page exposes a server-dependent form");
if (!platformCapabilities.publicForms && !contact.includes("does not collect or transmit enquiry details")) fail("PUBLIC_ONLY contact page is missing the non-collection notice");
if (!text("assets/js/novapharm.js").includes('request("/api/contact"')) fail("Contact form API submission path is missing");

const account = text("account-application/index.html");
if (platformCapabilities.accountApplication && !account.includes("data-account-application")) fail("Account application form hook is missing");
if (!platformCapabilities.accountApplication && (account.includes("data-account-application") || account.includes("<form") || account.includes('type="file"'))) fail("PUBLIC_ONLY account page exposes a server-dependent form or upload");
if (!platformCapabilities.accountApplication && !account.includes("does not accept account applications or business documents")) fail("PUBLIC_ONLY account page is missing the non-collection notice");
if (!text("assets/js/account-application.js").includes('request("/api/account-applications"')) fail("Account application form API submission path is missing");

const portal = text("portal/index.html");
if (platformCapabilities.portal && !portal.includes("data-login-form")) fail("Secure portal login form is missing");
if (platformCapabilities.portal && !portal.includes("data-entra-login")) fail("Microsoft login control is missing");
if (!platformCapabilities.portal && (portal.includes("data-login-form") || portal.includes('type="password"') || portal.includes('name="accessType"'))) fail("PUBLIC_ONLY portal exposes a credential or role-selection control");
if (!platformCapabilities.portal && !portal.includes("This public website never asks for a portal username, password or confidential company record")) fail("PUBLIC_ONLY portal is missing the credential-safety notice");
if (!platformCapabilities.portal) {
  for (const path of ["admin", "employee", "entra-complete", "_secure", "portal/change-password", "portal/dashboard", "portal/executive-platform"]) {
    if (existsSync(join(root, path))) fail(`PUBLIC_ONLY build contains protected path: ${path}`);
  }
}
const portalScript = text("assets/js/portal-login.js");
if (!portalScript.includes('request("/api/health"')) fail("Portal health activation check is missing");
if (!portalScript.includes("/.auth/login/aad")) fail("Microsoft Entra login path is missing");

const cname = text("CNAME").trim();
if (cname !== "novapharmhealthcare.com") fail(`Unexpected CNAME: ${cname}`);

if (failures.length) {
  console.error("Owner corrective release validation failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Owner corrective release validation passed for ${platformMode} across ${publicHtml.length} public HTML documents.`);
