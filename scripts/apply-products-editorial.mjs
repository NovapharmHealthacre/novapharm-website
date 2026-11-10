import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Restore the owner-approved Products experience after the catalogue, SEO,
// supplier/storefront and shared-shell generators have finished.
const pagePath = resolve("products/index.html");
const templatePath = resolve("src/content/products-editorial.html");
const sheet = "/assets/css/products-editorial.css";
const assets = [
  "assets/media/products/nutraxin/vitamin-d3-120-tablets.png",
  "assets/media/esco/esco-p07-image01.webp",
  "assets/media/esco/esco-p26-image01.webp",
  "assets/media/modules/product-portfolio-evidence.jpg"
];
for (const file of [pagePath,templatePath,resolve("assets/css/products-editorial.css"),...assets.map(resolve)]) {
  if (!existsSync(file)) throw new Error("Approved Products asset missing: "+file);
}
const template=readFileSync(templatePath,"utf8").trim();
let html=readFileSync(pagePath,"utf8");
if (!/^<main id="main"[\s\S]*<\/main>$/.test(template)) throw new Error("Products template must be exactly one main element.");
const mains=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/g)||[];
if (mains.length!==1) throw new Error("Expected exactly one generated Products main.");
html=html.replace(mains[0],template);
if(!html.includes('href="'+sheet+'"')) html=html.replace("</head>",'  <link rel="stylesheet" href="'+sheet+'">\n</head>');
const escoLink='<a href="/products/esco/">ESCO Anand</a>';
const local=html.match(/<nav class="npd-local-nav"[\s\S]*?<\/nav>/)?.[0];
if (local && !local.includes('href="/products/esco/"')) {
  html=html.replace(local,local.replace('<a href="/products/strategic-portfolio/">',escoLink+'<a href="/products/strategic-portfolio/">'));
}
const meg=html.match(/<div class="npd-mega" id="npd-mega-products"[\s\S]*?<\/div><\/div>/)?.[0];
if (meg && !meg.includes('href="/products/esco/"')) {
  html=html.replace(meg,meg.replace('<a href="/products/strategic-portfolio/">',escoLink+'<a href="/products/strategic-portfolio/">'));
}
html=html.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Explore NovaPharm\'s Nutraxin wellness products, ESCO Anand hospital and laboratory equipment, and strategic pharmaceutical portfolio.">');
const required=['Different products.','One purpose.','Wellness,','Better care.','Focused on medicines','href="/products/nutraxin/"','href="/products/esco/"','href="/products/strategic-portfolio/"','Regulated wholesale supply has not commenced'];
if (required.some(x=>!html.includes(x)) || (html.match(/<h1\b/g)||[]).length!==1 || (html.match(/<main\b/g)||[]).length!==1) throw new Error("Approved Products copy, routes, headings or regulated footer failed validation.");
writeFileSync(pagePath,html,"utf8");
console.log("Applied approved Products design, genuine images, three collection routes and preserved regulated footer.");
