import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { leadership } from "../src/content/site-content.mjs";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID } from "../src/seo/authority-config.mjs";

const root = resolve(process.cwd());
const articleDirectory = join(root, "src/content/insights");
const EDITORIAL_TEAM_ID = `${SITE_URL}/#editorial-team`;

function schemaTypes(schema) {
  return Array.isArray(schema?.["@type"]) ? schema["@type"] : [schema?.["@type"]].filter(Boolean);
}

function cleanPrivateExtensions(value) {
  if (Array.isArray(value)) return value.map(cleanPrivateExtensions);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !key.startsWith("_"))
      .map(([key, item]) => [key, cleanPrivateExtensions(item)]));
  }
  return value;
}

function editorialAuthor(article) {
  const leader = leadership.find((person) => person.displayName === article.author || person.name === article.author);
  if (leader) {
    return {
      schema: { "@id": `${SITE_URL}/leadership/${leader.slug}/#person` },
      visibleName: leader.displayName,
      visibleUrl: `/leadership/${leader.slug}/`,
      canonicalUrl: `${SITE_URL}/leadership/${leader.slug}/`
    };
  }
  return {
    schema: {
      "@type": "Organization",
      "@id": EDITORIAL_TEAM_ID,
      name: article.author || "NovaPharm Healthcare Editorial Team",
      url: `${SITE_URL}/legal/#editorial-standards`,
      parentOrganization: { "@id": ORGANIZATION_ID }
    },
    visibleName: article.author || "NovaPharm Healthcare Editorial Team",
    visibleUrl: "/legal/#editorial-standards",
    canonicalUrl: `${SITE_URL}/legal/#editorial-standards`
  };
}

function articleTrustBlock(article, author) {
  const reviewer = article.reviewer ? ` Reviewed by ${article.reviewer}.` : "";
  return `<section class="section" data-editorial-trust><div class="container"><aside class="regulatory-notice" aria-label="Editorial standards"><strong>Editorial standards</strong><p>Written by <a href="${author.visibleUrl}">${author.visibleName}</a>.${reviewer} This corporate B2B analysis distinguishes verified facts, professional interpretation and future NovaPharm intentions. It is not medical advice. <a href="/legal/#editorial-standards">Read the editorial, sourcing and corrections standards</a>.</p></aside></div></section>`;
}

const articleFiles = readdirSync(articleDirectory).filter((name) => name.endsWith(".json"));
for (const file of articleFiles) {
  const article = JSON.parse(readFileSync(join(articleDirectory, file), "utf8"));
  const output = join(root, `news-insights/${article.slug}/index.html`);
  let html = readFileSync(output, "utf8");
  const schemas = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    schemas.push(cleanPrivateExtensions(JSON.parse(match[1])));
  }

  const articleCandidates = schemas.filter((schema) => schemaTypes(schema).some((type) => ["Article", "BlogPosting"].includes(type)));
  const nonArticleSchemas = schemas.filter((schema) => !schemaTypes(schema).some((type) => ["Article", "BlogPosting"].includes(type)));
  const candidate = articleCandidates.sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0];
  if (!candidate) throw new Error(`No Article schema found for ${article.slug}.`);

  const canonical = `${SITE_URL}/news-insights/${article.slug}/`;
  const author = editorialAuthor(article);
  const articleSchema = {
    ...candidate,
    "@context": "https://schema.org",
    "@type": ["Article", "BlogPosting"],
    "@id": `${canonical}#article`,
    headline: article.title,
    description: article.summary,
    url: canonical,
    mainEntityOfPage: { "@id": `${canonical}#webpage` },
    author: author.schema,
    publisher: { "@id": ORGANIZATION_ID },
    datePublished: article.published,
    dateModified: article.updated || article.published,
    inLanguage: "en-GB"
  };
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    name: article.title,
    url: canonical,
    description: article.summary,
    inLanguage: "en-GB",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
    mainEntity: { "@id": `${canonical}#article` },
    datePublished: article.published,
    dateModified: article.updated || article.published
  };

  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const allSchemas = [...nonArticleSchemas, pageSchema, articleSchema];
  const serialized = allSchemas.map((schema) => `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n");
  html = html.replace("</head>", `${serialized}\n</head>`);
  html = html.replace(/<link rel="author" href="[^"]+">/i, `<link rel="author" href="${author.canonicalUrl}">`);
  html = html.replace(/<section class="section" data-editorial-trust>[\s\S]*?<\/section>(?=<\/main>)/, articleTrustBlock(article, author));
  writeFileSync(output, html);
}

console.log(`Reconciled visible and structured authorship for ${articleFiles.length} Insights articles.`);
