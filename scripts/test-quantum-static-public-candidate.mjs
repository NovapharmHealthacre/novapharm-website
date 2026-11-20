import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("quantum-research/index.html");
const programme = JSON.parse(read("docs/intelligence/quantum-research-program-v1.json"));
test("quantum static page remains an inert, explicitly unapproved research reference", () => {
  for (const flag of ["publicClaimsApproved","physicalHardwareEnabled","paidComputeEnabled","productionModelConnected","protectedDataIngestionEnabled","clinicalUsePermitted"]) assert.equal(programme[flag],false,flag);
  for(const text of ['name="robots" content="noindex, nofollow"','No live quantum hardware','No simulation job is started','Not medical','No data entry','<main id="main"']) assert.ok(html.includes(text),text);
  for(const marker of [/<form\b/i, /<input\b/i, /<iframe\b/i, /<script\b[^>]*src=(?!["']\/assets\/js\/rtl-localization\.js)/i, /data-login-form|data-contact-form|data-account-application|type="password"|type="file"/i, /fetch\s*\(|new WebSocket|localStorage|sessionStorage/]) assert.doesNotMatch(html,marker);
});
test("static page matches all approved source programme titles and official references", () => {
  const escape = s => String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  assert.equal(programme.modules.length,7);
  for(const module of programme.modules){assert.ok(html.includes(escape(module.title)),module.title);assert.ok(html.includes(escape(module.description)),module.id);}
  for(const p of programme.principles){assert.ok(html.includes(escape(p.title)),p.title);assert.ok(html.includes(escape(p.detail)),p.title);}
  for(const link of programme.links){assert.match(link.href,/^https:\/\/quantumai\.google\/[a-z0-9/-]+$/);assert.ok(html.includes('href="'+link.href+'" target="_blank" rel="noopener noreferrer"'),link.href);}
});
test("state-vector examples are theoretical and never promise actual execution",()=>{
  assert.ok(html.includes("16 MiB state-vector storage only"));
  assert.ok(html.includes("16,384 MiB state-vector storage only"));
  assert.ok(html.includes("No simulation job is started"));
});
test("Pages allowlist, provenance stamp, and RTL inventory include exactly the candidate route",()=>{
  const stage=read("scripts/stage-pages-artifact.mjs");
  const rtl=read("scripts/finalize-public-rtl.mjs");
  const stamp=read("scripts/stamp-public-release-provenance.mjs");
  for(const source of [stage,rtl]) assert.ok(source.includes('"quantum-research"'));
  assert.ok(stage.includes('"quantum-research/index.html"'));
  assert.ok(stamp.includes('"quantum-research/index.html"'));
  assert.ok(stamp.includes("noindex, nofollow"));
  assert.ok(stage.includes("Quantum public candidate provenance mismatch"));
  assert.ok(stage.includes('/<form' + String.fromCharCode(92) + 'b|data-login-form'), "form detection must use a regex word boundary");
  assert.ok(stamp.includes('researchCandidate.replace(/' + String.fromCharCode(92) + 's*<meta'), "repeat build must clean previous SHA");
});
test("standalone public candidate has no inline code, paid SDK or external runtime",()=>{
  const css=read("assets/css/quantum-research.css");
  assert.ok(css.includes(".nq-grid"));
  assert.ok(html.includes('href="/assets/css/quantum-research.css"'));
  assert.doesNotMatch(html,/<script\b/i); // only the normal release builder may inject RTL bootstrap
  assert.doesNotMatch(html,/\/assets\/brand\/favicon\.svg/, "Existing root favicon fallback needs no duplicate inventory reference");
  assert.doesNotMatch(html, /https:\/\/(?!quantumai\.google\/|novapharmhealthcare\.com\/)/);
});
