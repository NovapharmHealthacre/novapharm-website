import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { leadership } from "../src/content/site-content.mjs";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID } from "../src/seo/authority-config.mjs";

const root = resolve(process.cwd());

function types(schema) {
  return Array.isArray(schema?.["@type"]) ? schema["@type"] : [schema?.["@type"]].filter(Boolean);
}

for (const person of leadership) {
  const route = `/leadership/${person.slug}/`;
  const path = join(root, `leadership/${person.slug}/index.html`);
  let html = readFileSync(path, "utf8");
  const schemas = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    schemas.push(JSON.parse(match[1]));
  }

  const profileId = `${SITE_URL}${route}#webpage`;
  const personId = `${SITE_URL}${route}#person`;
  const reconciled = schemas.map((schema) => {
    if (types(schema).includes("ProfilePage")) {
      return {
        ...schema,
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": profileId,
        name: person.name,
        headline: `${person.displayName} — ${person.schemaTitle}`,
        url: `${SITE_URL}${route}`,
        inLanguage: "en-GB",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": personId },
        mainEntity: { "@id": personId }
      };
    }
    if (types(schema).includes("Person")) {
      return {
        ...schema,
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": personId,
        name: person.displayName,
        alternateName: person.name !== person.displayName ? person.name : undefined,
        jobTitle: person.schemaTitle,
        url: `${SITE_URL}${route}`,
        worksFor: { "@id": ORGANIZATION_ID },
        affiliation: { "@id": ORGANIZATION_ID },
        mainEntityOfPage: { "@id": profileId }
      };
    }
    return schema;
  }).map((schema) => Object.fromEntries(Object.entries(schema).filter(([, value]) => value !== undefined)));

  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const serialized = reconciled.map((schema) => `  <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join("\n");
  html = html.replace("</head>", `${serialized}\n</head>`);
  writeFileSync(path, html);
}

console.log(`Reconciled legal and public identity fields for ${leadership.length} leadership profiles.`);
