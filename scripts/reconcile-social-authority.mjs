import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { leadership, pageMeta } from "../src/content/site-content.mjs";
import { SITE_URL } from "../src/seo/authority-config.mjs";

const root = resolve(process.cwd());
const articleDirectory = join(root, "src/content/insights");
const articles = readdirSync(articleDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(articleDirectory, file), "utf8")));
const artDirection = JSON.parse(readFileSync(join(root, "config/module-art-direction.json"), "utf8"));
const artAssets = new Map(artDirection.assets.map((asset) => [asset.id, asset]));

const fallback = {
  url: "/assets/brand/novapharm-healthcare-logo.png",
  type: "image/png",
  width: 3356,
  height: 420,
  alt: "NovaPharm Healthcare official logo"
};

const routeImages = new Map();
for (const module of artDirection.modules) {
  if (!module.heroAsset) continue;
  const asset = artAssets.get(module.heroAsset);
  if (!asset) throw new Error(`Missing art-direction asset ${module.heroAsset} for ${module.route}`);
  routeImages.set(module.route, {
    url: `${asset.base}.jpg`,
    type: "image/jpeg",
    width: module.id === "home" ? 1672 : 1600,
    height: module.id === "home" ? 941 : 900,
    alt: asset.caption || asset.alt
  });
}
routeImages.set("/leadership/", {
  url: "/assets/vishalchakravarty.jpeg",
  type: "image/jpeg",
  width: 1796,
  height: 1749,
  alt: "Vishal Chakravarty, Chief Executive Officer of NovaPharm Healthcare"
});
routeImages.set("/product-portfolio/nutraxin/", {
  url: "/assets/media/products/nutraxin/vitamin-d3-120-tablets.png",
  type: "image/png",
  width: 700,
  height: 700,
  alt: "Nutraxin Vitamin D3 catalogue pack reference"
});
routeImages.set("/cro/", {
  url: "/assets/media/cro/cro-evidence-architecture-1600.jpg",
  type: "image/jpeg",
  width: 1600,
  height: 900,
  alt: "Clinical-development team reviewing programme evidence, responsibilities and milestones"
});

for (const article of articles) {
  routeImages.set(`/news-insights/${article.slug}/`, {
    url: article.heroImage,
    type: article.heroImage.endsWith(".svg") ? "image/svg+xml" : article.heroImage.endsWith(".png") ? "image/png" : "image/jpeg",
    width: 1600,
    height: 900,
    alt: article.title
  });
}

for (const person of leadership) {
  routeImages.set(`/leadership/${person.slug}/`, person.image ? {
    url: person.image,
    type: person.image.endsWith(".png") ? "image/png" : "image/jpeg",
    width: 1102,
    height: 1378,
    alt: `${person.displayName}, ${person.schemaTitle} at NovaPharm Healthcare`
  } : fallback);
}

function routeForFile(file) {
  return file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`;
}

function imageObject(image) {
  const absolute = `${SITE_URL}${image.url}`;
  return {
    "@type": "ImageObject",
    url: absolute,
    contentUrl: absolute,
    width: image.width,
    height: image.height,
    caption: image.alt
  };
}

const files = [
  ...Object.keys(pageMeta).map((slug) => slug ? `${slug}/index.html` : "index.html"),
  ...leadership.map((person) => `leadership/${person.slug}/index.html`),
  ...articles.map((article) => `news-insights/${article.slug}/index.html`),
  "account-application/index.html"
];
const register = [];

for (const file of [...new Set(files)]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const route = routeForFile(file);
  const image = routeImages.get(route) || fallback;
  if (image !== fallback && !existsSync(join(root, image.url.replace(/^\//, "")))) {
    throw new Error(`Social image is missing for ${route}: ${image.url}`);
  }
  const absolute = `${SITE_URL}${image.url}`;
  let html = readFileSync(path, "utf8");
  html = html.replace(/\s*<!-- page-specific-social-start -->[\s\S]*?<!-- page-specific-social-end -->/g, "");
  const social = `\n  <!-- page-specific-social-start -->\n  <meta property="og:image" content="${absolute}">\n  <meta property="og:image:secure_url" content="${absolute}">\n  <meta property="og:image:type" content="${image.type}">\n  <meta property="og:image:width" content="${image.width}">\n  <meta property="og:image:height" content="${image.height}">\n  <meta property="og:image:alt" content="${image.alt.replaceAll('"', '&quot;')}">\n  <!-- page-specific-social-end -->`;
  html = html.replace(/(<meta property="og:image" content="https:\/\/novapharmhealthcare\.com\/assets\/brand\/novapharm-healthcare-logo\.png">)/, `${social}\n  $1`);
  html = html.replace(/<meta name="twitter:image" content="[^"]+">/, `<meta name="twitter:image" content="${absolute}">`);
  html = html.replace(/<meta name="twitter:image:alt" content="[^"]+">/, `<meta name="twitter:image:alt" content="${image.alt.replaceAll('"', '&quot;')}">`);

  const schemas = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    const schema = JSON.parse(match[1]);
    const types = Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]];
    if (types.some((type) => ["WebPage", "AboutPage", "ContactPage", "ProfilePage"].includes(type))) {
      schema.primaryImageOfPage = imageObject(image);
    }
    schemas.push(schema);
  }
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const serialized = schemas.map((schema) => `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n");
  html = html.replace("</head>", `${serialized}\n</head>`);
  writeFileSync(path, html);
  register.push({ route, page: `${SITE_URL}${route}`, ...image, absoluteUrl: absolute });
}

writeFileSync(join(root, "seo/generated/social-image-register.json"), `${JSON.stringify(register, null, 2)}\n`);
console.log(`Assigned representative social images to ${register.length} canonical public pages.`);
