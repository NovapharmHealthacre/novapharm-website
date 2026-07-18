import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const siteUrl = "https://novapharmhealthcare.com";
const sitemap = readFileSync(resolve(root, "sitemap.xml"), "utf8");
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);

function pagePath(route) {
  return route === "/" ? resolve(root, "index.html") : resolve(root, route.replace(/^\//, ""), "index.html");
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

const prohibitedClaims = [
  ["current regulatory authorisation", /\b(?:NovaPharm|we)\s+(?:holds?|has|have|secured|obtained|was granted)\b[^.]{0,100}\b(?:WDA\(H\)|MHRA (?:licen[cs]e|authorisation|approval)|PLPI (?:licen[cs]e|approval))\b/i],
  ["current licensed status", /\bNovaPharm\b[^.]{0,80}\b(?:is|are)\b[^.]{0,30}\b(?:MHRA[- ]licen[cs]ed|WDA\(H\) holder|PLPI[- ]approved)\b/i],
  ["current NHS supply", /\b(?:NovaPharm|we)\b[^.]{0,80}\b(?:supplies?|supplying|supplier to|framework supplier)\b[^.]{0,80}\bNHS\b/i],
  ["unverified logistics contract", /\b(?:NovaPharm|we)\b[^.]{0,80}\b(?:partnered|contracted|appointed|has an agreement)\b[^.]{0,80}\b(?:Polar Speed|Marken)\b/i],
  ["achieved financial performance", /\b(?:NovaPharm|we)\b[^.]{0,80}\b(?:achieved|generated|reported)\b[^.]{0,80}\b(?:revenue|turnover|sales)\b/i],
  ["operational advanced technology", /\b(?:NovaPharm|we)\b[^.]{0,80}\b(?:operates?|deployed|launched|uses?)\b[^.]{0,80}\b(?:blockchain|AI forecasting|artificial intelligence)\b/i],
  ["current product availability", /\b(?:available now|currently available|in stock|ready to order)\b/i],
  ["private immigration-plan content", /\bInnovator Founder Visa\b/i]
];

const croProhibitedClaims = [
  ["unsupported full-service CRO status", /\bNovaPharm\s+(?:is|operates as|has become)\s+(?:a\s+)?(?:global\s+)?full-service CRO\b/i],
  ["unsupported owned clinical infrastructure", /\bNovaPharm\s+(?:owns|operates)\s+(?:clinical (?:sites|units)|central laboratories|an investigator network|a patient recruitment network|an IMP depot)\b/i],
  ["unsupported in-house clinical function", /\bNovaPharm(?:'s)?\s+in-house\s+(?:biostatistics|data management|medical monitoring|pharmacovigilance)\b/i],
  ["unsupported trial metric", /\b(?:patients enrolled|completed trials|successful submissions|approval rate|trial sites|countries served)\s*:?\s*\d+/i],
  ["unsupported outcome guarantee", /\b(?:guaranteed recruitment|guaranteed timelines?|guaranteed approval|accelerated approval)\b/i],
  ["unsupported authority endorsement", /\bMHRA-approved CRO\b|\bGCP-certified CRO\b/i]
];

const failures = [];
for (const route of routes) {
  const text = visibleText(readFileSync(pagePath(route), "utf8"));
  for (const [label, pattern] of prohibitedClaims) {
    const match = text.match(pattern);
    if (match) {
      const context = text.slice(match.index, match.index + match[0].length + 24);
      if (/\?\s*No\b/i.test(context)) continue;
      failures.push(`${route}: ${label}: ${match[0]}`);
    }
  }
  if (route === "/cro/") {
    for (const [label, pattern] of croProhibitedClaims) {
      const match = text.match(pattern);
      if (match) failures.push(`${route}: ${label}: ${match[0]}`);
    }
  }
}

const croText = visibleText(readFileSync(pagePath("/cro/"), "utf8"));
for (const requiredCroBoundary of [
  "does not present itself as a global full-service CRO",
  "Sponsor-retained",
  "qualified specialists",
  "Do not submit patient data"
]) {
  if (!croText.includes(requiredCroBoundary)) failures.push(`missing CRO responsibility boundary: ${requiredCroBoundary}`);
}

const allPublicText = routes.map((route) => visibleText(readFileSync(pagePath(route), "utf8"))).join(" ");
for (const requiredBoundary of [
  "NovaPharm is pre-operational for regulated wholesale supply",
  "will not commence regulated wholesale activities until the required MHRA authorisations",
  "Product-specific parallel-import activity remains subject to the grant and maintenance of the relevant PLPI licence"
]) {
  if (!allPublicText.includes(requiredBoundary)) failures.push(`missing public regulatory boundary: ${requiredBoundary}`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`Claims audit failed: ${failure}`));
  process.exit(1);
}

console.log(`Public claims audit passed for ${routes.length} indexable pages at ${siteUrl}.`);
