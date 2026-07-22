import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { leadership, pageMeta } from "../src/content/site-content.mjs";
import { chunkPublicSources } from "../src/ai/content-chunker.mjs";
import { buildKeywordIndex } from "../src/ai/keyword-index.mjs";
import { PUBLIC_SEMANTIC_MODEL, SEMANTIC_GROUPS, embedText } from "../src/ai/model-registry.mjs";

const root = resolve(process.cwd());
const siteUrl = "https://novapharmhealthcare.com";
const releaseDate = process.env.AI_INDEX_DATE || "2026-07-22";
const excludedRoutes = new Set(["contact", "investor-information", "careers", "legal/privacy", "legal/cookies", "legal/terms"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function write(path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)));
}

function visibleText(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function blocksFromHtml(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error("Approved AI source has no main landmark.");
  const controlled = main
    .replace(/<form\b[\s\S]*?<\/form>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "");
  const blocks = [];
  for (const match of controlled.matchAll(/<(h[1-4]|p|li|td|th|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = visibleText(match[2]);
    if (text.length < 3) continue;
    blocks.push({ type: /^h/i.test(match[1]) ? "heading" : "paragraph", text });
  }
  return blocks;
}

function routePath(slug) {
  return slug ? `/${slug}/` : "/";
}

function fileForSlug(slug) {
  return slug ? `${slug}/index.html` : "index.html";
}

const pageSources = Object.entries(pageMeta)
  .filter(([slug]) => !excludedRoutes.has(slug))
  .map(([slug, meta]) => ({
    id: `page-${slug || "home"}`.replace(/[^a-z0-9-]+/g, "-"),
    file: fileForSlug(slug),
    url: `${siteUrl}${routePath(slug)}`,
    title: meta.title,
    date: releaseDate,
    evidenceStatus: "approved public canonical page",
    capabilityBoundary: slug === "oncology"
      ? "Strategic B2B oncology focus; no product approval, stock, availability, treatment or authorisation claim."
      : "Corporate B2B information; capability maturity and regulatory status remain as labelled on the source page."
  }));

const leadershipSources = leadership.map((person) => ({
  id: `leader-${person.slug}`,
  file: `leadership/${person.slug}/index.html`,
  url: `${siteUrl}/leadership/${person.slug}/`,
  title: `${person.displayName} | NovaPharm Healthcare leadership`,
  date: releaseDate,
  evidenceStatus: "approved public leadership profile",
  capabilityBoundary: "Public professional and governance information only; private CV, contact and personal information are excluded."
}));

const articleDirectory = join(root, "src", "content", "insights");
const articles = readdirSync(articleDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(articleDirectory, file), "utf8")));
const articleSources = articles.map((article) => ({
  id: `article-${article.slug}`,
  file: `news-insights/${article.slug}/index.html`,
  url: `${siteUrl}/news-insights/${article.slug}/`,
  title: article.title,
  date: article.updated || article.published,
  evidenceStatus: "approved published NovaPharm Insight",
  capabilityBoundary: article.disclaimer || "Corporate B2B analysis; not medical, legal or regulatory advice."
}));

const sourceDefinitions = [...pageSources, ...leadershipSources, ...articleSources];
const sources = sourceDefinitions.map((source) => {
  const html = readFileSync(join(root, source.file), "utf8");
  if (/noindex/i.test(html.match(/<meta name="robots" content="([^"]+)"/i)?.[1] || "")) {
    throw new Error(`AI source ${source.file} is noindex.`);
  }
  const blocks = blocksFromHtml(html);
  if (!blocks.length) throw new Error(`AI source ${source.file} produced no approved blocks.`);
  return { ...source, blocks, sourceHash: sha256(blocks.map((block) => `${block.type}:${block.text}`).join("\n")) };
});

const chunks = chunkPublicSources(sources);
const keywordIndex = buildKeywordIndex(chunks);
const corpusHash = sha256(chunks.map((chunk) => chunk.contentHash).join("\n"));
const knowledge = {
  schemaVersion: "1.0.0",
  generatedAt: `${releaseDate}T00:00:00.000Z`,
  corpusHash,
  privacy: { queryLogging: false, externalInference: false, portalDataIncluded: false },
  sourceCount: sources.length,
  chunkCount: chunks.length,
  chunks,
  keywordIndex
};

const modelAsset = {
  ...PUBLIC_SEMANTIC_MODEL,
  semanticGroups: SEMANTIC_GROUPS,
  generatedAt: `${releaseDate}T00:00:00.000Z`
};
const modelJson = `${JSON.stringify(modelAsset, null, 2)}\n`;
const embeddingsAsset = {
  schemaVersion: "1.0.0",
  modelId: PUBLIC_SEMANTIC_MODEL.id,
  modelRevision: PUBLIC_SEMANTIC_MODEL.revision,
  corpusHash,
  vectors: chunks.map((chunk) => ({ id: chunk.id, vector: embedText(`${chunk.sourceTitle} ${chunk.heading} ${chunk.text}`) }))
};
const embeddingsJson = `${JSON.stringify(embeddingsAsset)}\n`;
const knowledgeJson = `${JSON.stringify(knowledge)}\n`;
const manifest = {
  schemaVersion: "1.0.0",
  generatedAt: `${releaseDate}T00:00:00.000Z`,
  corpusHash,
  approvedSourceCount: sources.length,
  chunkCount: chunks.length,
  excludedContent: [
    "portal and private routes",
    "customer and supplier records",
    "uploaded documents",
    "business-plan forecasts and private annexes",
    "supplier pricing and unpublished product lists",
    "contact and account-form submissions"
  ],
  sources: sources.map(({ blocks, ...source }) => ({ ...source, blockCount: blocks.length })),
  assets: {
    knowledgeIndex: { path: "/assets/ai/company-knowledge-index.json", bytes: Buffer.byteLength(knowledgeJson), sha256: sha256(knowledgeJson) },
    semanticModel: { path: "/assets/ai/novapharm-evidence-vector-v1.json", bytes: Buffer.byteLength(modelJson), sha256: sha256(modelJson) },
    embeddings: { path: "/assets/ai/company-embeddings.json", bytes: Buffer.byteLength(embeddingsJson), sha256: sha256(embeddingsJson) }
  }
};

write("assets/ai/company-knowledge-index.json", knowledgeJson);
write("assets/ai/company-source-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
write("assets/ai/novapharm-evidence-vector-v1.json", modelJson);
write("assets/ai/company-embeddings.json", embeddingsJson);

const browserRuntimeFiles = [
  "keyword-index.mjs",
  "model-registry.mjs",
  "citation-resolver.mjs",
  "policy-engine.mjs",
  "privacy-guard.mjs",
  "semantic-worker.mjs",
  "search-controller.mjs"
];
mkdirSync(join(root, "assets", "ai", "runtime"), { recursive: true });
for (const file of browserRuntimeFiles) copyFileSync(join(root, "src", "ai", file), join(root, "assets", "ai", "runtime", file));

console.log(`Built AI knowledge index from ${sources.length} approved sources into ${chunks.length} deterministic chunks.`);
