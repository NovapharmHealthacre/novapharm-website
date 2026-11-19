import { createHash } from "node:crypto";
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
const croLeadershipLine = cro.match(/class="npd-leadership-line"[\s\S]*?<\/div>/)?.[0] ?? "";
const croLeaderCount = (croLeadershipLine.match(/<a /g) || []).length;
if (croLeaderCount !== 3) fail(`CRO Senior judgement must contain exactly 3 linked leadership records; found ${croLeaderCount}`);

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
  ["Vishal Chakravarty", "creative-assets/leadership/approved-2026-08-17/vishal-chakravarty.png", "/assets/media/leadership/vishal-chakravarty", 1200],
  ["Prabhakar Vitthal Lahare", "creative-assets/leadership/approved-2026-08-17/prabhakar-vitthal-lahare.png", "/assets/media/leadership/prabhakar-lahare", 960],
  ["Dr Girish Shantilal Achliya", "creative-assets/leadership/approved-2026-08-17/girish-shantilal-achliya.png", "/assets/media/leadership/girish-achliya", 960]
];

if (!leadershipIndex.includes(approvedLeadershipTitle)) fail(`Leadership index is missing Dr Girish's approved title: ${approvedLeadershipTitle}`);
if (leadershipIndex.includes(supersededLeadershipTitle)) fail(`Leadership index still contains superseded title: ${supersededLeadershipTitle}`);
if (!girishProfile.includes(approvedLeadershipTitle)) fail(`Dr Girish profile is missing approved title: ${approvedLeadershipTitle}`);
if (girishProfile.includes(supersededLeadershipTitle)) fail(`Dr Girish profile still contains superseded title: ${supersededLeadershipTitle}`);
if (!girishProfile.includes('"jobTitle":"Chief Scientific Officer"')) fail("Dr Girish structured Person data is missing Chief Scientific Officer jobTitle.");
if (!girishProfile.includes("/assets/media/leadership/girish-achliya-960.jpg")) fail("Dr Girish profile is not using the approved responsive portrait fallback.");
if (!girishProfile.includes("Dr Girish Shantilal Achliya, Chief Scientific Officer of NovaPharm Healthcare")) fail("Dr Girish portrait accessibility text is not aligned to the approved CSO title.");

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const [name, master, publicBase, fallbackWidth] of approvedPortraits) {
  const fallback = `${publicBase}-${fallbackWidth}.jpg`;
  for (const extension of ["avif", "webp", "jpg"]) {
    if (!leadershipIndex.includes(`${publicBase}-480.${extension}`)) fail(`Leadership index is missing the responsive ${extension.toUpperCase()} portrait for ${name}`);
  }
  if (!leadershipIndex.includes(fallback)) fail(`Leadership index is not using the approved portrait fallback for ${name}: ${fallback}`);
  const absolute = join(root, master);
  let image;
  try {
    image = readFileSync(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") {
      fail(`Approved portrait master is missing for ${name}: ${master}`);
      continue;
    }
    fail(`Approved portrait master is unreadable for ${name}: ${master}`);
    continue;
  }
  if (image.length < 24 || !image.subarray(0, 8).equals(pngSignature)) {
    fail(`Approved portrait master is not a valid PNG for ${name}: ${master}`);
  }
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
if (oncology.includes("oncology-editorial-gallery")) fail("Oncology retains the superseded decorative editorial gallery");
const pagesPublishWorkflow = text(".github/workflows/pages-live-publish.yml");
const liveOncologyGalleryAssertions = pagesPublishWorkflow
  .split(/\r?\n/)
  .filter((line) => line.includes("oncology-editorial-gallery") && line.includes("/tmp/live-oncology.html"));
if (liveOncologyGalleryAssertions.length !== 1) {
  fail(`Pages custom-domain smoke must contain exactly one Oncology gallery assertion; found ${liveOncologyGalleryAssertions.length}`);
} else if (!liveOncologyGalleryAssertions[0].includes("&& ! grep -Fq 'oncology-editorial-gallery' /tmp/live-oncology.html")) {
  fail("Pages custom-domain smoke does not enforce the approved absence of the Oncology editorial gallery");
}
for (const asset of [
  "/assets/media/oncology/oncology-formulation-pathways.svg",
  "/assets/media/oncology/oncology-evidence-continuity.svg",
  "/assets/media/oncology/oncology-condition-control.svg"
]) {
  if (oncology.includes(asset)) fail(`Oncology public presentation still references prohibited diagram artwork: ${asset}`);
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
const canonicalRecords = JSON.parse(text("seo/generated/page-metadata-register.json"));
const canonicalBuildSha = home.match(/<meta name="novapharm-source-sha" content="([0-9a-f]{40})">/)?.[1];
if (!canonicalBuildSha) fail("Homepage is missing verifiable exact-source release metadata");
for (const record of canonicalRecords) {
  const output = text(record.file);
  const tags = [...output.matchAll(/<meta name="novapharm-source-sha" content="([0-9a-f]{40})">/g)];
  if (tags.length !== 1 || tags[0][1] !== canonicalBuildSha) {
    fail(`${record.file} has missing, duplicate or inconsistent exact-source release metadata`);
  }
}

if (home.includes("nav-search")) fail("Homepage navigation still contains the removed search control");
// The actual visible header, not merely the footer, must show the secure
// customer portal and the supplied red NovaPharm Healthcare master logo.
const homeHeaderStart = home.indexOf('<header class="site-header npd-header"');
const homeHeader = homeHeaderStart < 0 ? "" : home.slice(homeHeaderStart, home.indexOf("</header>", homeHeaderStart) + 9);
const homePrimaryNavStart = homeHeader.indexOf('<nav class="site-nav npd-global-nav"');
const homePrimaryNav = homePrimaryNavStart < 0 ? "" : homeHeader.slice(homePrimaryNavStart, homeHeader.indexOf("</nav>", homePrimaryNavStart) + 6);
if (!homePrimaryNav.includes('<a href="https://portal.novapharmhealthcare.com/">Secure Portal</a>')) fail("Homepage primary header hides Secure Portal");
if (!homeHeader.includes('<picture class="brand-logo"><img src="/assets/brand/novapharm-healthcare-logo.png"')) fail("Homepage header is not using the supplied official PNG logo");
if (homeHeader.includes('<source srcset="/assets/brand/novapharm-healthcare-logo.svg"')) fail("Homepage header still prioritises the replaced vector wordmark");
for (const route of ["capabilities", "oncology", "products"]) {
  const html = text(route + "/index.html");
  const headerStart = html.indexOf('<header class="site-header npd-header"');
  const header = headerStart < 0 ? "" : html.slice(headerStart, html.indexOf("</header>", headerStart) + 9);
  if (!header.includes('href="https://portal.novapharmhealthcare.com/"')) fail(route + " primary header must link to live secure portal");
  if (!header.includes('<picture class="brand-logo"><img src="/assets/brand/novapharm-healthcare-logo.png"')) fail(route + " primary header must use official NovaPharm logo");
}
// Catch the legacy black NOVAPHARM pseudo-logo and stale CSS in rendered pages.
const homepageCss = text("assets/css/homepage-editorial.css");
// A positive logo visibility rule and an empty pseudo-element are approved.
// Reject only actual hiding or text substitution, rather than any selector mention.
if (/content:\s*["']NOVAPHARM["']/i.test(homepageCss)) fail("Approved public header is still replaced by the old text wordmark");
if (!/\.site-header \.brand > img\s*\{[\s\S]*?display:\s*block/.test(homepageCss)) fail("Official public header image visibility rule is missing");
if (!/\.site-header \.brand::after\s*\{\s*content:\s*none/.test(homepageCss)) fail("Legacy text-wordmark pseudo-element must remain disabled");
const publicCssSha256 = createHash("sha256").update(readFileSync(join(root, "assets/css/novapharm.bundle.css"))).digest("hex");
const expectedPublicCssHref = `href="/assets/css/novapharm.bundle.css?v=20261111-forensic-design-v3&amp;sha256=${publicCssSha256}"`;
for (const route of ["index.html", "capabilities/index.html", "oncology/index.html", "products/index.html"]) {
  const page = text(route);
  if (!page.includes(expectedPublicCssHref)) fail(route + " must link to the approved design CSS semantic version and exact CSS SHA-256");
  if (!page.includes('<picture class="brand-logo"><img ')) fail(route + " must preserve the official image-based header logo");
}
const approvedProductsCss = text("assets/css/products-editorial.css");
if (!approvedProductsCss.includes("clip-path:inset(2% 2% 2% 2%)")) fail("Products ESCO source-photo border must be removed in Safari");
if (!approvedProductsCss.includes(".np-products-page .np-products-stage::after { display:none; }")) fail("Products hero still shows a horizontal divider");

if (!home.includes('<a href="https://portal.novapharmhealthcare.com/">Secure Portal</a>')) fail("Homepage Secure Portal navigation does not target the hosted customer portal");
if (home.includes('<a href="/portal/">Secure Portal</a>')) fail("Homepage still routes Secure Portal navigation to the static holding page");
if (!home.includes("/account-application/")) fail("Homepage no longer links to Open an account");
if (!home.includes("Medicine. Where it needs to be")) fail("Homepage is missing the owner-approved hero title.");
if (!home.includes("A better way to understand, access and move medicine.")) fail("Homepage is missing the owner-approved Earth hero subtitle.");

const contact = text("contact/index.html");
if (platformCapabilities.publicForms && !contact.includes("data-contact-form")) fail("Contact enquiry form hook is missing");
if (!platformCapabilities.publicForms && contact.includes("data-contact-form")) fail("PUBLIC_ONLY contact page exposes server-side intake");
if (!platformCapabilities.publicForms && contact.includes("<form") && (!contact.includes("data-email-enquiry-form") || !contact.includes('action="mailto:vishal@novapharmhealthcare.com"'))) fail("PUBLIC_ONLY contact page has an unapproved non-email form");
if (!platformCapabilities.publicForms && !contact.includes("does not collect or transmit enquiry details")) fail("PUBLIC_ONLY contact page is missing the non-collection notice");
if (!text("assets/js/novapharm.js").includes('request("/api/contact"')) fail("Contact form API submission path is missing");

const account = text("account-application/index.html");
if (platformCapabilities.accountApplication && !account.includes("data-account-application")) fail("Account application form hook is missing");
if (platformCapabilities.accountApplication && !account.includes("data-application-status")) fail("Account application live-status region is missing");
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
