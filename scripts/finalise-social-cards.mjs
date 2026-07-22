import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SITE_URL } from "../src/seo/authority-config.mjs";

const root = resolve(process.cwd());
const registerPath = join(root, "seo/generated/social-image-register.json");
const register = JSON.parse(readFileSync(registerPath, "utf8"));

const images = {
  hero: ["/assets/media/home/supply-network-hero.jpg", "Governed pharmaceutical supply network visual for NovaPharm Healthcare", 1672, 941],
  quality: ["/assets/media/products/cardiovascular-quality-control.jpg", "Pharmaceutical quality-control assessment in a laboratory setting", 1600, 900],
  logistics: ["/assets/media/products/hospital-supply-logistics.jpg", "Controlled pharmaceutical logistics and supply-chain environment", 1600, 900],
  science: ["/assets/media/products/oncology-vial-handling.jpg", "Controlled laboratory handling supporting pharmaceutical assessment", 1600, 900],
  traceability: ["/assets/media/products/specialty-pharmacy-handling.jpg", "Controlled sample handling supporting pharmaceutical traceability", 1600, 900],
  evidence: ["/assets/media/modules/insights-evidence-editorial.jpg", "Researcher reviewing approved evidence for responsible pharmaceutical technology", 1600, 900],
  packaging: ["/assets/media/products/licensed-generics-packaging.jpg", "Unbranded pharmaceutical packaging used as representative market-access context", 1600, 900],
  liquids: ["/assets/media/products/oral-liquid-formulation.jpg", "Controlled oral-liquid formulation analysis", 1600, 900]
};

function rasterFor(route) {
  if (route === "/cro/") return ["/assets/media/cro/cro-evidence-architecture-1600.jpg", "Clinical-development team reviewing programme evidence, responsibilities and milestones", 1600, 900];
  if (route === "/regulatory-services/" || route === "/about/governance/") return images.quality;
  if (route === "/services/" || route === "/partner-with-us/") return images.logistics;
  if (route === "/technology/ai-governance/") return images.evidence;
  if (route === "/technology/") return images.traceability;
  if (route === "/news-insights/") return images.science;
  if (route.includes("batch-to-buyer") || route.includes("traceability")) return images.traceability;
  if (route.includes("compliance-first") || route.includes("gdp-qms")) return images.quality;
  if (route.includes("oncology")) return images.science;
  if (route.includes("plpi")) return images.packaging;
  if (route.includes("three-pillar") || route.includes("sourcing")) return images.logistics;
  if (route === "/" || route.startsWith("/about/") || route === "/about/" || route === "/leadership/" || route === "/investor-information/") return images.hero;
  return images.hero;
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

for (const item of register) {
  let next = item;
  if (item.type === "image/svg+xml") {
    const [url, alt, width, height] = rasterFor(item.route);
    next = {
      ...item,
      url,
      type: "image/jpeg",
      width,
      height,
      alt,
      absoluteUrl: `${SITE_URL}${url}`
    };
  }
  const file = next.url.replace(/^\//, "");
  if (!existsSync(join(root, file))) throw new Error(`Raster social preview is missing: ${next.url}`);
  const page = next.route === "/" ? "index.html" : `${next.route.replace(/^\//, "")}index.html`;
  const pagePath = join(root, page);
  let html = readFileSync(pagePath, "utf8");
  const block = `<!-- page-specific-social-start -->\n  <meta property="og:image" content="${next.absoluteUrl}">\n  <meta property="og:image:secure_url" content="${next.absoluteUrl}">\n  <meta property="og:image:type" content="${next.type}">\n  <meta property="og:image:width" content="${next.width}">\n  <meta property="og:image:height" content="${next.height}">\n  <meta property="og:image:alt" content="${escapeAttribute(next.alt)}">\n  <!-- page-specific-social-end -->`;
  html = html.replace(/<!-- page-specific-social-start -->[\s\S]*?<!-- page-specific-social-end -->/, block);
  html = html.replace(/<meta name="twitter:card" content="[^"]+">/, '<meta name="twitter:card" content="summary_large_image">');
  html = html.replace(/<meta name="twitter:image" content="[^"]+">/, `<meta name="twitter:image" content="${next.absoluteUrl}">`);
  html = html.replace(/<meta name="twitter:image:alt" content="[^"]+">/, `<meta name="twitter:image:alt" content="${escapeAttribute(next.alt)}">`);

  const schemas = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    const schema = JSON.parse(match[1]);
    const types = Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]];
    if (types.some((type) => ["WebPage", "AboutPage", "ContactPage", "ProfilePage"].includes(type))) {
      schema.primaryImageOfPage = {
        "@type": "ImageObject",
        url: next.absoluteUrl,
        contentUrl: next.absoluteUrl,
        width: next.width,
        height: next.height,
        caption: next.alt
      };
    }
    schemas.push(schema);
  }
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const serialized = schemas.map((schema) => `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n");
  html = html.replace("</head>", `${serialized}\n</head>`);
  html = html.replace(/[ \t]+$/gm, "");
  writeFileSync(pagePath, html);
  Object.assign(item, next);
}

writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`);
console.log(`Finalised raster social cards for ${register.length} canonical public pages.`);
