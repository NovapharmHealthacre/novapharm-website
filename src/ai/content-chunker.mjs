import { createHash } from "node:crypto";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function wordCount(value) {
  return String(value).match(/\S+/g)?.length || 0;
}

export function chunkPublicSource(source, { targetWords = 180, maximumWords = 280 } = {}) {
  const chunks = [];
  let heading = source.title;
  let paragraphs = [];
  let words = 0;

  const flush = () => {
    const text = paragraphs.join(" ").replace(/\s+/g, " ").trim();
    if (!text) return;
    const ordinal = chunks.length + 1;
    const id = `${source.id}-${String(ordinal).padStart(3, "0")}`;
    chunks.push({
      id,
      sourceId: source.id,
      sourceTitle: source.title,
      sourceUrl: source.url,
      sourceDate: source.date || null,
      evidenceStatus: source.evidenceStatus || "approved public information",
      capabilityBoundary: source.capabilityBoundary || "Corporate B2B information; not medical advice, product availability or regulatory approval.",
      heading,
      text,
      wordCount: wordCount(text),
      contentHash: hash(`${source.url}\n${heading}\n${text}`)
    });
    paragraphs = [];
    words = 0;
  };

  for (const block of source.blocks) {
    if (block.type === "heading") {
      flush();
      heading = block.text;
      continue;
    }
    const count = wordCount(block.text);
    if (words >= targetWords && words + count > maximumWords) flush();
    paragraphs.push(block.text);
    words += count;
  }
  flush();
  return chunks;
}

export function chunkPublicSources(sources, options) {
  return sources.flatMap((source) => chunkPublicSource(source, options));
}
