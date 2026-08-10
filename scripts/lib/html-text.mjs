import { parse, parseFragment } from "parse5";

const defaultIgnoredTags = Object.freeze(["script", "style", "noscript", "template"]);

function findElement(node, tagName) {
  if (node?.tagName === tagName) return node;
  for (const child of node?.childNodes || []) {
    const match = findElement(child, tagName);
    if (match) return match;
  }
  return null;
}

function collectText(node, ignoredTags, parts) {
  if (node?.tagName && ignoredTags.has(node.tagName)) return;
  if (node?.nodeName === "#text") parts.push(node.value || "");
  for (const child of node?.childNodes || []) collectText(child, ignoredTags, parts);
}

function normalizedText(node, ignoredTags) {
  const parts = [];
  collectText(node, ignoredTags, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function visibleTextFromHtml(html, { fragment = false, rootTag, ignoredTags = defaultIgnoredTags } = {}) {
  const document = fragment ? parseFragment(String(html || "")) : parse(String(html || ""));
  const root = rootTag ? findElement(document, rootTag) : document;
  if (!root) return "";
  return normalizedText(root, new Set(ignoredTags));
}

export function textContentFromFragment(html) {
  return visibleTextFromHtml(html, { fragment: true });
}

export function extractVisibleBlocks(html, {
  rootTag = "main",
  ignoredTags = [...defaultIgnoredTags, "form", "nav"],
  blockTags = ["h1", "h2", "h3", "h4", "p", "li", "td", "th", "summary"],
} = {}) {
  const document = parse(String(html || ""));
  const root = findElement(document, rootTag);
  if (!root) throw new Error(`Approved HTML source has no ${rootTag} landmark.`);

  const ignored = new Set(ignoredTags);
  const selected = new Set(blockTags);
  const blocks = [];
  const visit = (node) => {
    if (node?.tagName && ignored.has(node.tagName)) return;
    if (node?.tagName && selected.has(node.tagName)) {
      const text = normalizedText(node, ignored);
      if (text.length >= 3) blocks.push({ type: node.tagName.startsWith("h") ? "heading" : "paragraph", text });
      return;
    }
    for (const child of node?.childNodes || []) visit(child);
  };
  visit(root);
  return blocks;
}
