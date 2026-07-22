import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const excludedTopLevel = new Set([
  ".git", ".github", "_secure", "architecture", "audit", "compliance", "data", "database",
  "deployment", "docs", "final-report", "geo", "integrations", "node_modules", "performance",
  "private-content", "public", "research", "scripts", "security", "seo", "sharepoint", "src", "tests"
]);

function walkHtml(directory, relative = "") {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!relative && excludedTopLevel.has(entry.name)) continue;
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(absolute, nextRelative));
    else if (entry.name.endsWith(".html")) files.push({ absolute, relative: nextRelative });
  }
  return files;
}

function removePublicAi(html) {
  return html
    .replace(/\s*<a\b[^>]*\bdata-ai-search-open\b[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/\s*<button\b[^>]*\bdata-ai-search-open\b[^>]*>[\s\S]*?<\/button>/g, "")
    .replace(/\s*<dialog class="ai-search-dialog"[\s\S]*?<\/dialog>/g, "")
    .replace(/\s*<script type="module" src="\/assets\/js\/ai-search\.js"><\/script>/g, "")
    .replace(/\s*<section class="section section-band related-capability"><div class="container editorial-split"><div class="editorial-index">Responsible AI<\/div>[\s\S]*?<\/section>/g, "")
    .replace(/\s*<section class="section section-band oncology-ai-roadmap"[\s\S]*?<\/section>/g, "")
    .replace(/\s*<section id="artificial-intelligence">[\s\S]*?<\/section>/g, "")
    .replace(/<h2>12\. Changes<\/h2>/g, "<h2>11. Changes</h2>")
    .replace(/\s*<a\b[^>]*href="\/technology\/ai-governance\/"[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/\s*<a\b[^>]*href="\/search\/"[^>]*>[\s\S]*?<\/a>/g, "");
}

const prabhakarCard = `<a class="cro-leader" href="/leadership/prabhakar-lahare/"><div class="cro-leader-media"><img src="/assets/prabhakarvitthallahare.jpeg" alt="Prabhakar Vitthal Lahare, Managing Director and Chief Operating Officer of NovaPharm Healthcare" width="1121" height="1280" loading="lazy" decoding="async"></div><div><span>Managing Director &amp; Chief Operating Officer</span><h3>Prabhakar Vitthal Lahare</h3><p>Connects operating strategy, manufacturing partnerships, quality governance and supply continuity to controlled programme execution.</p><strong>View verified profile</strong></div></a>`;

const oncologyGallery = `<section class="section oncology-editorial-gallery" data-reveal><div class="container"><div class="section-head"><span class="section-kicker">Oncology operating contexts</span><h2>Product, evidence and continuity must be read together.</h2><p>Representative pharmaceutical imagery supports the operating model across product assessment, batch evidence and programme coordination.</p></div><div class="oncology-editorial-grid"><figure><picture><source srcset="/assets/media/modules/product-portfolio-evidence-960.avif 960w, /assets/media/modules/product-portfolio-evidence.avif 1600w" sizes="(max-width: 760px) 100vw, 34vw" type="image/avif"><source srcset="/assets/media/modules/product-portfolio-evidence-960.webp 960w, /assets/media/modules/product-portfolio-evidence.webp 1600w" sizes="(max-width: 760px) 100vw, 34vw" type="image/webp"><img src="/assets/media/modules/product-portfolio-evidence.jpg" srcset="/assets/media/modules/product-portfolio-evidence-960.jpg 960w, /assets/media/modules/product-portfolio-evidence.jpg 1600w" sizes="(max-width: 760px) 100vw, 34vw" alt="Pharmaceutical product and evidence review in a controlled professional setting" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>Product and evidence assessment</figcaption></figure><figure><picture><source srcset="/assets/media/stories/regulatory-batch-integrity-960.avif 960w, /assets/media/stories/regulatory-batch-integrity.avif 1600w" sizes="(max-width: 760px) 100vw, 34vw" type="image/avif"><source srcset="/assets/media/stories/regulatory-batch-integrity-960.webp 960w, /assets/media/stories/regulatory-batch-integrity.webp 1600w" sizes="(max-width: 760px) 100vw, 34vw" type="image/webp"><img src="/assets/media/stories/regulatory-batch-integrity.jpg" srcset="/assets/media/stories/regulatory-batch-integrity-960.jpg 960w, /assets/media/stories/regulatory-batch-integrity.jpg 1600w" sizes="(max-width: 760px) 100vw, 34vw" alt="Quality specialist reviewing batch, temperature and document evidence" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>Batch and condition evidence</figcaption></figure><figure><picture><source srcset="/assets/media/cro/cro-evidence-architecture-640.avif 640w, /assets/media/cro/cro-evidence-architecture-960.avif 960w, /assets/media/cro/cro-evidence-architecture-1600.avif 1600w" sizes="(max-width: 760px) 100vw, 34vw" type="image/avif"><source srcset="/assets/media/cro/cro-evidence-architecture-640.webp 640w, /assets/media/cro/cro-evidence-architecture-960.webp 960w, /assets/media/cro/cro-evidence-architecture-1600.webp 1600w" sizes="(max-width: 760px) 100vw, 34vw" type="image/webp"><img src="/assets/media/cro/cro-evidence-architecture-1600.jpg" srcset="/assets/media/cro/cro-evidence-architecture-640.jpg 640w, /assets/media/cro/cro-evidence-architecture-960.jpg 960w, /assets/media/cro/cro-evidence-architecture-1600.jpg 1600w" sizes="(max-width: 760px) 100vw, 34vw" alt="Clinical-development team reviewing evidence, responsibilities and milestones" width="1600" height="900" loading="lazy" decoding="async"></picture><figcaption>Programme evidence continuity</figcaption></figure></div></div></section>`;

for (const file of walkHtml(root)) {
  let html = readFileSync(file.absolute, "utf8");
  html = removePublicAi(html);

  if (file.relative === "cro/index.html" && !html.includes("/leadership/prabhakar-lahare/")) {
    const marker = '<a class="cro-leader" href="/leadership/girish-achliya/">';
    const start = html.indexOf(marker);
    if (start < 0) throw new Error("CRO leadership marker was not found.");
    const end = html.indexOf("</a>", start);
    if (end < 0) throw new Error("CRO leadership card boundary was not found.");
    html = `${html.slice(0, end + 4)}${prabhakarCard}${html.slice(end + 4)}`;
  }

  if (file.relative === "oncology/index.html" && !html.includes("oncology-editorial-gallery")) {
    const marker = '<section class="section oncology-readiness"';
    const index = html.indexOf(marker);
    if (index < 0) throw new Error("Oncology readiness marker was not found.");
    html = `${html.slice(0, index)}${oncologyGallery}${html.slice(index)}`;
  }

  writeFileSync(file.absolute, html);
}

for (const relative of ["search", "technology/ai-governance", "assets/ai"]) {
  const target = join(root, relative);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}
for (const relative of ["assets/js/ai-search.js", "assets/css/ai-search.css"]) {
  const target = join(root, relative);
  if (existsSync(target) && statSync(target).isFile()) rmSync(target, { force: true });
}

for (const sitemapName of ["sitemap.xml", "sitemap-images.xml", "sitemap-insights.xml"]) {
  const target = join(root, sitemapName);
  if (!existsSync(target)) continue;
  const cleaned = readFileSync(target, "utf8")
    .replace(/\s*<url>[\s\S]*?<loc>https:\/\/novapharmhealthcare\.com\/(?:search|technology\/ai-governance)\/<\/loc>[\s\S]*?<\/url>/g, "")
    .replace(/\s*<sitemap>[\s\S]*?<loc>https:\/\/novapharmhealthcare\.com\/(?:search|technology\/ai-governance)\/[\s\S]*?<\/sitemap>/g, "");
  writeFileSync(target, cleaned);
}

const robotsPath = join(root, "robots.txt");
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, "utf8")
    .split("\n")
    .filter((line) => !/search\/|technology\/ai-governance\//.test(line))
    .join("\n");
  writeFileSync(robotsPath, robots.endsWith("\n") ? robots : `${robots}\n`);
}

console.log("Applied owner corrections: public AI/search removed, CRO leadership completed, Oncology imagery expanded.");
