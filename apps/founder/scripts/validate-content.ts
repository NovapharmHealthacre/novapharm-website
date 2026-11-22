import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const articleRoot = path.join(root, "content", "articles");
const pageRoot = path.join(root, "content", "pages");
const publicRoot = path.join(root, "public");

interface ContentSummary {
  readonly filename: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly body: string;
  readonly data: Record<string, unknown>;
}

function stringValue(data: Record<string, unknown>, key: string, filename: string): string {
  const value = data[key];
  if (typeof value !== "string") throw new TypeError(`${filename}: ${key} must be a string`);
  assert.ok(value.trim(), `${filename}: ${key} must not be empty`);
  return value;
}

function readDirectory(directory: string): readonly ContentSummary[] {
  return fs
    .readdirSync(directory)
    .filter((filename) => filename.endsWith(".md"))
    .sort()
    .map((filename) => {
      const source = fs.readFileSync(path.join(directory, filename), "utf8");
      const parsed = matter(source);
      const data = parsed.data as Record<string, unknown>;
      assert.equal(data["public"], true, `${filename}: only explicitly approved public content may be built`);
      assert.doesNotMatch(parsed.content, /<[A-Za-z!/]/, `${filename}: raw HTML is prohibited in Markdown`);
      assert.doesNotMatch(
        parsed.content,
        /\b(?:TODO|TBC|lorem ipsum|placeholder)\b/i,
        `${filename}: placeholder content detected`,
      );
      return {
        filename,
        title: stringValue(data, "title", filename),
        canonicalPath: stringValue(data, "canonicalPath", filename),
        body: parsed.content.trim(),
        data,
      };
    });
}

function unique(values: readonly string[], label: string): void {
  assert.equal(new Set(values).size, values.length, `Duplicate ${label} detected`);
}

const articles = readDirectory(articleRoot);
const pages = readDirectory(pageRoot);
assert.equal(articles.length, 10, "The approved founder corpus must contain ten essays");
assert.equal(pages.length, 7, "The founder app must contain seven approved managed pages");
unique(
  [...articles, ...pages].map((record) => record.title),
  "title",
);
unique(
  [...articles, ...pages].map((record) => record.canonicalPath),
  "canonical path",
);

const articleSlugs = new Set(articles.map((record) => record.filename.replace(/\.md$/, "")));
for (const article of articles) {
  const slug = article.filename.replace(/\.md$/, "");
  assert.equal(article.canonicalPath, `/essays/${slug}/`, `${article.filename}: canonical path mismatch`);
  for (const key of ["description", "summary", "author", "category", "socialImage"] as const)
    stringValue(article.data, key, article.filename);
  for (const key of ["published", "modified"] as const) {
    const value = article.data[key];
    const normalized = value instanceof Date ? value.toISOString().slice(0, 10) : value;
    assert.match(String(normalized), /^\d{4}-\d{2}-\d{2}$/, `${article.filename}: invalid ${key}`);
  }
  const image = stringValue(article.data, "socialImage", article.filename);
  assert.ok(
    fs.existsSync(path.join(publicRoot, image.replace(/^\//, ""))),
    `${article.filename}: social image does not exist`,
  );
  const sources = article.data["sources"];
  assert.ok(Array.isArray(sources), `${article.filename}: sources must be an array`);
  for (const source of sources) {
    assert.ok(source && typeof source === "object", `${article.filename}: invalid source entry`);
    assert.match(
      String((source as Record<string, unknown>)["url"]),
      /^https:\/\//,
      `${article.filename}: source must use HTTPS`,
    );
  }
  const related = article.data["related"];
  assert.ok(Array.isArray(related), `${article.filename}: related must be an array`);
  for (const relatedSlug of related)
    assert.ok(
      articleSlugs.has(String(relatedSlug)),
      `${article.filename}: unknown related essay ${String(relatedSlug)}`,
    );
}

const completeCorpus = [...articles, ...pages].map((record) => `${record.title}\n${record.body}`).join("\n");
assert.doesNotMatch(completeCorpus, /This is a static personal website/i, "Outdated hosting claim detected");
for (const [label, pattern] of [
  ["incorrect executive title", /Founder\s*(?:&|and)\s*Chief Executive Officer/i],
  ["unsupported wholesale authorisation", /NovaPharm (?:is|holds|has) (?:an? )?MHRA[- ]authorised/i],
  ["unsupported NHS supply", /NovaPharm (?:supplies|is supplying) NHS/i],
  ["unsupported GDP guarantee", /100% GDP compliant/i],
] as const) {
  assert.doesNotMatch(completeCorpus, pattern, `${label} detected`);
}

const knowledgePath = path.join(publicRoot, "assets", "founder-knowledge.json");
const knowledge = JSON.parse(fs.readFileSync(knowledgePath, "utf8")) as Record<string, unknown>;
assert.equal(knowledge["schemaVersion"], "1.0.0", "Founder evidence schema version mismatch");
assert.ok(
  Array.isArray(knowledge["documents"]) && knowledge["documents"].length >= articles.length,
  "Founder evidence corpus is incomplete",
);

console.log(
  `Validated ${articles.length} essays, ${pages.length} managed pages and the approved founder evidence corpus.`,
);
