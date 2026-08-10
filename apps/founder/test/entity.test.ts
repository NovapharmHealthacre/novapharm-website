import assert from "node:assert/strict";
import test from "node:test";
import robots from "../app/robots";
import type { ArticleRecord } from "../lib/content";
import {
  absolute,
  articleSchema,
  externalPublicationSchema,
  founderOrganisationSchema,
  founderPersonSchema,
  webPageSchema,
} from "../lib/seo";
import { publications, vishal } from "../lib/site-data";

const articleFixture = Object.freeze({
  slug: "entity-test",
  title: "Entity test",
  description: "A controlled article fixture for linked-data validation.",
  summary: "A controlled article fixture.",
  author: "Vishal Chakravarty",
  published: "2026-01-01",
  modified: "2026-01-01",
  category: "Governance",
  canonicalPath: "/essays/entity-test/",
  legacyPaths: [],
  socialImage: "/images/social/vishal-chakravarty-social.jpg",
  sources: [],
  related: [],
  public: true,
  body: "Controlled fixture.",
  html: "<p>Controlled fixture.</p>",
  reading: Object.freeze({ words: 2, minutes: 1 }),
}) satisfies ArticleRecord;

test("Vishal has one canonical cross-estate identity", () => {
  assert.equal(vishal.id, "https://vishal.novapharmhealthcare.com/#person");
  assert.equal(vishal.canonicalUrl, "https://vishal.novapharmhealthcare.com/about/");
  assert.equal(vishal.publicTitle, "Chief Executive Officer");
});

test("person and organisation schemas share the canonical founder identifier", () => {
  const person = founderPersonSchema();
  const organisation = founderOrganisationSchema();
  assert.equal(person["@id"], vishal.id);
  assert.deepEqual(organisation["founder"], { "@id": vishal.id });
  assert.equal((person["@reverse"] as { author: readonly unknown[] }).author.length, 5);
});

test("external publication schema keeps publisher canonicals and the Vishal author entity connected", () => {
  const publication = publications[0];
  assert.ok(publication);
  const node = externalPublicationSchema(publication);
  assert.equal(node["url"], publication.canonicalUrl);
  assert.deepEqual(node["author"], { "@id": vishal.id, name: vishal.displayName, url: vishal.canonicalUrl });
  assert.equal((node["publisher"] as { name: string }).name, "Pharmaceutical Commerce");
});

test("article and page entity links are absolute and share one identifier", () => {
  const article = articleFixture;
  const expected = `${absolute(article.canonicalPath)}#article`;
  const articleNode = articleSchema(article);
  const pageNode = webPageSchema({
    path: article.canonicalPath,
    name: article.title,
    description: article.description,
    mainEntity: expected,
  });
  assert.equal(articleNode["@id"], expected);
  assert.deepEqual(pageNode["mainEntity"], { "@id": expected });
});

test("crawler policy keeps public rendering assets available", () => {
  const policy = robots();
  const serialized = JSON.stringify(policy.rules);
  assert.doesNotMatch(serialized, /_next/);
  assert.match(serialized, /OAI-SearchBot/);
  assert.match(serialized, /GPTBot/);
});
