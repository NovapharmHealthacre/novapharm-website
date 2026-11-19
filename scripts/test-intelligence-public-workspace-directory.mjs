import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("src/content/technology-intelligence.html");
const publicArtifact = read("technology/index.html");
const catalogue = read("apps/portal/data/intelligence-workspaces.ts");
const css = read("assets/css/technology-intelligence.css");
const signIn = read("apps/portal/components/intelligence-sign-in.tsx");

const entries = [...catalogue.matchAll(/\{ slug: "([^"]+)", title: "([^"]+)", group: "([^"]+)", state: "([^"]+)", summary: "([^"]+)", requirements: \[([^\]]*)\] \}/g)];
const groups = [...new Set(entries.map(([, , , group]) => group))];
const enc = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

test("public Intelligence directory mirrors all 22 governed workspaces without hidden or duplicate entries", () => {
  assert.equal(entries.length, 22, "The source catalogue must contain exactly 22 workspaces.");
  assert.equal(new Set(entries.map(([, slug]) => slug)).size, 22);
  const ids = [...html.matchAll(/data-npi-workspace="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, entries.length);
  assert.deepEqual(new Set(ids), new Set(entries.map(([, slug]) => slug)));
  for (const [, slug, title, , state, summary] of entries) {
    assert.ok(html.includes('id="workspace-' + slug + '"'));
    assert.ok(html.includes('data-npi-workspace-state="' + state + '"'));
    assert.ok(html.includes("<h4>" + enc(title) + "</h4>"), title);
    assert.ok(html.includes("<p>" + enc(summary) + "</p>"), slug);
  }
});

test("every group is keyboard navigable without JavaScript and has the correct number of entries", () => {
  assert.equal(groups.length, 5);
  assert.equal((html.match(/<details class="npi-directory-group"/g) ?? []).length, groups.length);
  assert.equal((html.match(/<\/summary>/g) ?? []).length, groups.length);
  assert.equal((html.match(/<\/details>/g) ?? []).length >= groups.length, true);
  assert.match(html, /<details class="npi-directory-group" open>/u);
  for (const group of groups) assert.ok(html.includes(enc(group)));
  assert.match(css, /\.npi-directory-group > summary:focus-visible|\.npi-workspace-directory :is\(a,summary\):focus-visible/u);
  assert.match(css, /@media \(max-width: 760px\)/u);
  assert.match(css, /grid-template-columns: minmax\(0,1fr\)/u);
});

test("public source research and protected entry remain distinct and clearly labelled", () => {
  assert.match(html, /id="intelligence-workspace-directory"/u);
  assert.match(html, /href="#intelligence-research" class="npi-button npi-button-primary">Search official sources/u);
  assert.match(html, /href="https:\/\/intelligence\.novapharmhealthcare\.com\/" class="npi-button npi-button-secondary">Open protected sign-in/u);
  assert.match(html, /not access to protected data, a customer entitlement or proof of feature activation/u);
  assert.equal((html.match(/>Explore public research<\/a>/g) ?? []).length, entries.length);
  assert.equal((html.match(/>Protected workspace entry<\/a>/g) ?? []).length, entries.length);
  assert.doesNotMatch(html, /href="\/portal\/executive-platform\/medicines-intelligence\//u);
  assert.doesNotMatch(html, /data-npi-workspace-access="(?:enabled|active|unlocked)"/u);
});

test("customer entry page exposes the public directory without bypassing server authentication", () => {
  assert.match(signIn, /technology\/#intelligence-workspace-directory/u);
  assert.match(signIn, /technology\/#intelligence-research/u);
  assert.match(signIn, /href="\/auth\/customer\/start"/u);
  assert.match(signIn, /href="\/auth\/customer\/register"/u);
  assert.match(signIn, /customer\/session/u);
  assert.doesNotMatch(signIn, /np_session\s*=|localStorage\.setItem/u);
});


test("checked-in public technology route exposes the same 22 workspaces as canonical source", () => {
  const all = [...publicArtifact.matchAll(/data-npi-workspace="([^"]+)"/g)].map(x => x[1]);
  assert.equal(all.length, entries.length);
  assert.deepEqual(new Set(all), new Set(entries.map(([, slug]) => slug)));
  assert.match(publicArtifact, /id="intelligence-workspace-directory"/u);
  assert.match(publicArtifact, /href="#intelligence-research"/u);
  assert.match(publicArtifact, /href="https:\/\/intelligence\.novapharmhealthcare\.com\/"/u);
  assert.doesNotMatch(publicArtifact, /data-npi-workspace-access="(?:enabled|active|unlocked)"/u);
});
