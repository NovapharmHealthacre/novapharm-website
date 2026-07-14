import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { leadership, pageMeta } from "../src/content/site-content.mjs";
import { SITE_URL } from "../src/seo/authority-config.mjs";

const root = resolve(process.cwd());
const articles = readdirSync(join(root, "src/content/insights"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(root, "src/content/insights", file), "utf8")));
const files = [
  ...Object.keys(pageMeta).map((slug) => slug ? `${slug}/index.html` : "index.html"),
  ...leadership.map((person) => `leadership/${person.slug}/index.html`),
  ...articles.map((article) => `news-insights/${article.slug}/index.html`),
  "account-application/index.html"
];

function routeFor(file) {
  return file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`;
}

const register = [];
for (const file of [...new Set(files)]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const html = readFileSync(path, "utf8");
  const entities = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    const schema = JSON.parse(match[1]);
    const types = Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]].filter(Boolean);
    entities.push({
      id: schema["@id"] || null,
      types,
      name: schema.name || schema.headline || null,
      mainEntity: schema.mainEntity?.["@id"] || schema.mainEntityOfPage?.["@id"] || null,
      publisher: schema.publisher?.["@id"] || null,
      author: schema.author?.["@id"] || schema.author?.name || null
    });
  }
  register.push({
    route: routeFor(file),
    canonical: `${SITE_URL}${routeFor(file)}`,
    file,
    entities
  });
}

writeFileSync(join(root, "seo/generated/structured-data-register.json"), `${JSON.stringify(register, null, 2)}\n`);
console.log(`Generated structured-data register for ${register.length} public pages.`);
