import { readFileSync, existsSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const HOST = "https://novapharmhealthcare.com";
const get = (obj, key) => obj[key] || "";
const metaValue = (html, re) => html.match(re)?.[1] || "";
const jsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
  .map(match => { try { return JSON.parse(match[1]); } catch { return {}; } });
const botBlocked = (rules, name) => new RegExp("User-agent:\\s*" + name + "\\s*\\nDisallow:\\s*\\/\\s*(?=\\n|$)", "i").test(rules);

export function auditSeoCandidate({ files, owner, liveContactHtml, liveContactHttp }) {
  const issues = [], holds = [], products = [];
  const rows = get(files, "shopping/nutraxin-uk.tsv").trim().split(/\r?\n/);
  const keys = rows.shift()?.split("\t") || [];
  const required = ["id", "title", "description", "link", "price", "availability"];
  if (!required.every(key => keys.includes(key))) issues.push("Feed columns missing");
  if (rows.length !== 19) issues.push("Expected exactly 19 product rows");
  const seen = new Set();
  for (const row of rows) {
    const cols = row.split("\t");
    const item = Object.fromEntries(keys.map((key, i) => [key, cols[i]]));
    const match = /^https:\/\/novapharmhealthcare\.com\/products\/nutraxin\/([a-z0-9-]+)\/$/.exec(item.link || "");
    if (!match || !/^NUT-UK-[A-Z0-9-]+$/.test(item.id || "") || seen.has(item.id)) {
      issues.push("Unsafe or duplicate Merchant link / SKU"); continue;
    }
    seen.add(item.id);
    const path = "products/nutraxin/" + match[1] + "/index.html";
    const html = get(files, path);
    const product = jsonLd(html).find(x => x["@type"] === "Product" && x.sku === item.id);
    const offer = product?.offers;
    const meta = metaValue(html, /<meta name="description" content="([^"]+)"/i);
    const canonical = metaValue(html, /<link rel="canonical" href="([^"]+)"/i);
    const verified = Boolean(html && product && canonical === item.link && offer &&
      offer.url === item.link && offer.priceCurrency === "GBP" &&
      String(offer.price) === String(item.price).replace(/ GBP$/, "") &&
      offer.seller?.logo === HOST + "/assets/brand/novapharm-healthcare-logo.png" &&
      product.description === item.description &&
      get(files, "sitemap.xml").includes("<loc>" + item.link + "</loc>") &&
      meta.length >= 35 && meta.length <= 160 && !/noindex/i.test(html));
    products.push({ id: item.id, verified, metaLength: meta.length });
    if (!verified) issues.push("Product source parity failed: " + item.id);
  }
  const robots = get(files, "robots.txt");
  for (const bot of ["Googlebot","Bingbot","OAI-SearchBot","Claude-SearchBot","PerplexityBot","Applebot"]) {
    if (!robots.includes("User-agent: " + bot)) issues.push("Public search bot missing: " + bot);
  }
  for (const bot of ["GPTBot","Google-Extended"]) {
    if (!botBlocked(robots, bot)) issues.push("Model-training restriction missing: " + bot);
  }
  for (const path of ["/portal/","/admin/","/employee/","/api/"]) {
    if (!robots.includes("Disallow: " + path)) issues.push("Protected crawler path missing: " + path);
  }
  const guide = get(files, "llms.txt");
  if (!guide.includes("# NovaPharm Healthcare") ||
      !guide.includes(HOST + "/products/nutraxin/") ||
      !guide.includes(HOST + "/sitemap.xml")) issues.push("Public AI source guide incomplete");
  // Parse complete guide URLs, rather than matching a trusted hostname anywhere in a string.
  for (const token of guide.split(/[\s<>()\[\]"']+/)) {
    if (!token.startsWith("https://") && !token.startsWith("http://")) continue;
    let url;
    try { url = new URL(token.replace(/[.,;]+$/, "")); }
    catch { issues.push("AI source guide includes an invalid URL"); break; }
    if (url.origin !== HOST) {
      issues.push("AI source guide links to an unverified external host");
      break;
    }
    // Reject credentialed URLs and decode escaped path segments before protected-route checks.
    if (url.username || url.password) {
      issues.push("AI source guide includes URL credentials");
      break;
    }
    let pathname = url.pathname;
    try {
      // Catch single and repeatedly encoded protected paths; malformed encoding fails closed.
      while (pathname.includes("%")) {
        const decoded = decodeURIComponent(pathname);
        if (decoded === pathname) break;
        pathname = decoded;
      }
    } catch {
      issues.push("AI source guide includes an invalid encoded path");
      break;
    }
    if (/^\/(?:admin|portal|employee|api)(?:\/|$)/i.test(pathname)) {
      issues.push("AI source guide exposes a protected route");
      break;
    }
  }
  if (!get(files, "portal/index.html").includes("This public website never asks for a portal username, password or confidential company record")) {
    issues.push("Public portal access boundary missing");
  }
  const stagedContact = get(files, "contact/index.html");
  const candidateLive = stagedContact.includes("data-live-b2b-enquiry-form") &&
    stagedContact.includes('src="/assets/js/contact-production.js"') &&
    stagedContact.includes('name="privacyAcknowledgement"') &&
    stagedContact.includes('name="safetyConfirmation"');
  const liveActive = liveContactHttp === 200 && (liveContactHtml || "").includes("data-live-b2b-enquiry-form");
  const liveOrigin = metaValue(liveContactHtml || "", /data-api-origin="([^"]+)"/i);
  const candidateOrigin = metaValue(stagedContact, /data-api-origin="([^"]+)"/i);
  if (liveContactHttp !== 200) holds.push("LIVE_CONTACT_UNKNOWN");
  else if (liveActive && !candidateLive) holds.push("WOULD_DOWNGRADE_LIVE_CONTACT");
  else if (!liveActive) holds.push("LIVE_CONTACT_NOT_VERIFIED");
  else if (candidateLive && (!liveOrigin || candidateOrigin !== liveOrigin)) holds.push("CONTACT_API_ORIGIN_DRIFT");
  if (owner?.productionSignoff !== "granted" ||
      owner?.productionPermissions?.activatePublicCustomerAccess !== true) holds.push("OWNER_APPROVAL_NOT_GRANTED");
  if (stagedContact.includes("data-login-form")) issues.push("Login form in contact artifact");
  const sourceReady = !issues.length && seen.size === 19;
  return { sourceReady, releaseReady: sourceReady && !holds.length,
    disposition: !sourceReady ? "SOURCE_INVALID" : holds.length ? "HELD_FOR_SAFETY_AND_OWNER_APPROVAL" : "PREVIEW_ELIGIBLE_FOR_OWNER_REVIEW",
    products, issues, holds, observed: { liveContactHttp, liveContactActive: liveActive,
      stagedContactActive: candidateLive, contactOriginMatched: Boolean(liveOrigin && candidateOrigin === liveOrigin),
      ownerSignoff: owner?.productionSignoff || "unknown" },
    note: "Read-only: no GitHub Pages deployment, DNS change, customer activation or AWS modification." };
}

async function cli() {
  const directory = resolve(process.argv[2] || "_site");
  const paths = ["shopping/nutraxin-uk.tsv","sitemap.xml","robots.txt","llms.txt","contact/index.html","portal/index.html"];
  const files = {};
  for (const p of paths) files[p] = existsSync(join(directory,p)) ? readFileSync(join(directory,p),"utf8") : "";
  const lines = get(files,"shopping/nutraxin-uk.tsv").trim().split(/\r?\n/), keys = (lines.shift() || "").split("\t");
  for (const line of lines) {
    const url = line.split("\t")[keys.indexOf("link")] || "";
    const m = /^https:\/\/novapharmhealthcare\.com\/products\/nutraxin\/([a-z0-9-]+)\/$/.exec(url);
    if (m) { const p = "products/nutraxin/" + m[1] + "/index.html";
      files[p] = existsSync(join(directory,p)) ? readFileSync(join(directory,p),"utf8") : ""; }
  }
  const owner = JSON.parse(readFileSync(resolve("config/intelligence/owner-production-constraints.json"),"utf8"));
  let liveContactHtml = "", liveContactHttp = 0;
  try {
    const r = await fetch(HOST + "/contact/?preflight=" + Date.now(), {
      headers: {"Cache-Control":"no-cache, no-store"}, signal: AbortSignal.timeout(16000) });
    liveContactHttp = r.status; if (r.ok) liveContactHtml = await r.text();
  } catch { /* Fail closed on missing live evidence. */ }
  const result = auditSeoCandidate({ files, owner, liveContactHtml, liveContactHttp });
  const output = resolve("audit/generated/nutraxin-seo-release-preflight.json");
  mkdirSync(dirname(output), {recursive:true});
  writeFileSync(output, JSON.stringify({checkedAt:new Date().toISOString(),...result},null,2)+"\n");
  console.log(JSON.stringify({ disposition:result.disposition, sourceReady:result.sourceReady,
    releaseReady:result.releaseReady, products:result.products.length,
    issues:result.issues, holds:result.holds, observed:result.observed },null,2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    ["## Read-only SEO Pages preflight", "Source verified: "+result.sourceReady,
      "Release ready: "+result.releaseReady, "Holds: "+result.holds.join(", "),
      "No website was deployed by this workflow.", ""].join("\n"));
  if (!result.sourceReady) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await cli();
