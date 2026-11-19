/**
 * Opt-in, rate-limited Apple HIG source metadata audit.
 * Reads only public official Apple Markdown and stores headings/links/digests,
 * never copyrighted full text, fonts, images, credentials or user data.
 * Usage: HIG_SOURCE_AUDIT_NETWORK=1 node scripts/audit-apple-hig-official-sources.mjs
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const input = "docs/design/apple-hig-172-topic-acceptance-register.json";
const output = "audit/evidence/apple-hig-official-source-metadata.json";
const catalogue = JSON.parse(readFileSync(input, "utf8")).topics;
assert.equal(catalogue.length, 172, "Audit only the owner's exact 172 HIG parent URLs");
assert.equal(new Set(catalogue.map((x) => x.markdown)).size, 172);

const officialRoot = "https://developer.apple.com/design/human-interface-guidelines/";
function canonicalHigLink(raw) {
  if (!raw || raw.startsWith("doc://") || raw.startsWith("mailto:")) return null;
  let url;
  try {
    url = new URL(raw, officialRoot);
  } catch {
    return null;
  }
  if (url.hostname !== "developer.apple.com" || url.protocol !== "https:") return null;
  const path = url.pathname.toLowerCase().replace(/\/design\/human-interface-guidelines\//, "/design/human-interface-guidelines/");
  if (!path.startsWith("/design/human-interface-guidelines/")) return null;
  const slug = path.split("/").filter(Boolean).at(-1)?.replace(/\.md$/, "");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;
  return officialRoot + slug + (url.hash || "");
}
function extractMetadata(markdown) {
  const h1 = markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? null;
  const headings = [...markdown.matchAll(/^#{1,4}\s+(.+)$/gm)]
    .map((match) => match[1].trim().slice(0, 160)).slice(0, 90);
  const urls = [...markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)]
    .map((match) => canonicalHigLink(match[1])).filter(Boolean);
  return { h1, headings, insideHigLinks: [...new Set(urls)].slice(0, 250) };
}
async function inspectOne(topic, index) {
  const u = new URL(topic.markdown);
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "developer.apple.com");
  assert.ok(u.pathname.startsWith("/design/human-interface-guidelines/") && u.pathname.endsWith(".md"));
  await sleep(300);
  const base = { index, titleFromOwnerIndex: topic.title, source: topic.markdown };
  try {
    const response = await fetch(u, {
      redirect: "follow",
      headers: { Accept: "text/markdown", "User-Agent": "NovaPharm-HIG-Source-Metadata-Audit/1.0" },
      signal: AbortSignal.timeout(12000)
    });
    if (new URL(response.url).hostname !== "developer.apple.com") {
      return { ...base, result: "unverified_redirect", finalHost: new URL(response.url).hostname };
    }
    if (!response.ok) return { ...base, result: "unverified_http", statusCode: response.status };
    const text = await response.text();
    if (text.length > 1_000_000) return { ...base, result: "unverified_oversized" };
    if (!text.startsWith("<!--") && !/^# /m.test(text)) {
      return { ...base, result: "unverified_non_markdown", statusCode: response.status };
    }
    const meta = extractMetadata(text);
    return {
      ...base,
      result: meta.h1 ? "source_metadata_read" : "unverified_missing_title",
      statusCode: response.status,
      finalUrl: response.url,
      contentSha256: createHash("sha256").update(text).digest("hex"),
      headingTitle: meta.h1,
      headingTitleMatchesIndex: meta.h1?.toLowerCase() === topic.title.toLowerCase(),
      headings: meta.headings,
      insideHigLinks: meta.insideHigLinks
    };
  } catch (error) {
    return { ...base, result: "unverified_network", reason: String(error?.name || "NetworkError").slice(0, 100) };
  }
}
async function run() {
  if (process.env.HIG_SOURCE_AUDIT_NETWORK !== "1") {
    throw new Error("Opt-in network gate required: set HIG_SOURCE_AUDIT_NETWORK=1");
  }
  const results = Array(catalogue.length);
  let index = 0;
  async function worker() {
    while (index < catalogue.length) {
      const i = index++;
      results[i] = await inspectOne(catalogue[i], i);
      if ((i + 1) % 25 === 0) console.log("Audited " + (i + 1) + " source URLs");
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  const parentUrls = new Set(catalogue.map((topic) => topic.url));
  const discovered = [...new Set(results.flatMap((r) => r.insideHigLinks ?? []))].sort();
  const report = {
    scope: "Apple official Markdown metadata only. Does not copy complete Apple articles or verify any NovaPharm implementation.",
    checkedAt: new Date().toISOString(),
    attempted: results.length,
    read: results.filter((r) => r.result === "source_metadata_read").length,
    unresolved: results.filter((r) => r.result !== "source_metadata_read").map((r) => ({ source:r.source, result:r.result, statusCode:r.statusCode ?? null })),
    insideHigLinksDiscovered: discovered.length,
    linkedTopicsNotInOwnerParentIndex: discovered.filter((url) => !parentUrls.has(url.split("#")[0])),
    records: results
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({attempted:report.attempted,read:report.read,unresolved:report.unresolved.length,insideLinks:discovered.length}));
  if (report.unresolved.length) process.exitCode = 1;
}
run().catch((error) => { console.error(String(error)); process.exitCode = 1; });
