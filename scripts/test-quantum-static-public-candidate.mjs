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
  assert.ok(rtl.includes('"quantum-research"'));
  assert.ok(stage.includes('const allowedPublicQuantumFiles = new Set(["quantum-research/index.html"])'));
  assert.ok(stage.includes('entry.isDirectory() && entry.name === "quantum-research"'));
  assert.ok(stage.includes('Unreviewed file in public quantum-research directory'));
  assert.ok(stage.includes('!allowedPublicQuantumFiles.has(stagedPath)'));
  assert.doesNotMatch(stage, /^\s*"quantum-research",\s*$/m, "Quantum directory must never be bulk-copied");
  assert.ok(stage.includes('"quantum-research/index.html"'));
  assert.ok(stamp.includes('"quantum-research/index.html"'));
  const pinned = read("scripts/lib/stamp-pinned-public-html.mjs");
  assert.ok(stamp.includes('stampPinnedPublicHtml(root, "quantum-research/index.html", sha, { mustBeNoindex: true })'),
    "Quantum provenance must retain the reviewed noindex gate");
  assert.ok(pinned.includes("noindex, nofollow"),
    "Shared descriptor stamper must reject quantum pages without noindex");
  assert.doesNotMatch(stamp, /existsSync\(researchCandidatePath\)/,
    "Quantum provenance source must be read without a check/read race");
  assert.ok(stage.includes("Quantum public candidate provenance mismatch"));
  assert.ok(stage.includes('/<form' + String.fromCharCode(92) + 'b|data-login-form'), "form detection must use a regex word boundary");
  assert.ok(pinned.includes('html = html.replace(/' + String.fromCharCode(92) + 's*<meta'),
    "repeat build must clean previous SHA on the pinned descriptor");
});
test("standalone public candidate has no inline code, paid SDK or external runtime",()=>{
  const css=read("assets/css/quantum-research.css");
  assert.ok(css.includes(".nq-grid"));
  assert.ok(html.includes('href="/assets/css/quantum-research.css"'));
  // Source HTML is script-free. The approved public builder may inject one
  // exact, local RTL accessibility bootstrap; arbitrary/inline code remains forbidden.
  const approvedRtl = '<script src="/assets/js/rtl-localization.js"></script>';
  const scripts = html.match(/<script\b[\s\S]*?<\/script>/gi) ?? [];
  assert.ok(scripts.length <= 1, "At most one reviewed RTL bootstrap may be present");
  for (const script of scripts) assert.equal(script, approvedRtl, "Unexpected inline/external quantum script");
  assert.doesNotMatch(html.replace(approvedRtl, ""), /<script\b/i, "Unknown quantum script tag");
  assert.doesNotMatch(html,/\/assets\/brand\/favicon\.svg/, "Existing root favicon fallback needs no duplicate inventory reference");
  assert.doesNotMatch(html, /https:\/\/(?!quantumai\.google\/|novapharmhealthcare\.com\/)/);
});

test("both controlled Pages release paths require exact live quantum provenance and noindex", () => {
  for(const workflow of [
    ".github/workflows/pages-live-publish.yml",
    ".github/workflows/pages-public-release-recovery.yml"
  ]){
    const body=read(workflow);
    assert.ok(body.includes('quantum-research/index.html'), workflow+" trigger");
    assert.ok(body.includes("Verify exact quantum reference publication and noindex on custom domain"),workflow);
    assert.ok(body.includes('novapharm-source-sha'),workflow);
    assert.ok(body.includes('noindex, nofollow'),workflow);
    assert.ok(body.includes('quantum-research.css?source='),workflow);
    assert.ok(body.includes('Quantum research route missing, stale, indexable, or unsafe'),workflow);
    assert.ok(body.indexOf('Verify exact quantum reference publication') < body.indexOf('Mark publication successful'), workflow);
    assert.ok(body.includes('! grep -Eiq'),workflow+" public form exclusion");
  }
});

test("quantum stylesheet complies with global negative-letter-spacing restrictions", () => {
  const css = read("assets/css/quantum-research.css");
  assert.doesNotMatch(css, /\bletter-spacing\s*:\s*-/i,
    "Do not exempt quantum CSS from site-wide production CSS policy");
});
