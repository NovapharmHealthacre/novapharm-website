import assert from "node:assert/strict";
import test from "node:test";
import { articles, readingTime } from "../data/articles";
import { corporatePages } from "../data/pages";
import { leadership } from "../data/site";
import { articleSchema, metadataForPage, organisationId, organisationSchema, pageSchema, personSchema, websiteId } from "../lib/seo";

test("canonical entity graph uses stable identifiers", () => {
  const organisation = organisationSchema();
  assert.equal(organisation["@id"], organisationId);
  assert.equal(organisation.name, "NovaPharm Healthcare");
  assert.equal(organisation.legalName, "NOVAPHARM HEALTHCARE LTD");
  assert.equal(organisation.identifier.value, "16716501");
  assert.equal(organisation.founder?.["@id"], "https://novapharmhealthcare.com/leadership/vishal-chakravarty/#person");
  assert.equal(websiteId, "https://novapharmhealthcare.com/#website");
});

test("all public page metadata and schemas resolve to self-canonical URLs", () => {
  for (const page of corporatePages) {
    const expected = page.slug ? `/${page.slug}/` : "/";
    assert.equal(metadataForPage(page).alternates?.canonical, expected);
    const graph = pageSchema(page)["@graph"] as Array<Record<string, unknown>>;
    assert.match(String(graph[0]?.["@id"]), new RegExp(`${expected.replaceAll("/", "\\/")}#webpage$`));
  }
});

test("leadership entities retain approved roles and portrait boundaries", () => {
  for (const person of leadership) {
    const schema = personSchema(person.slug) as { "@graph": Array<Record<string, unknown>> };
    const entity = schema["@graph"].find((item) => item["@type"] === "Person");
    assert.equal(entity?.name, person.displayName);
    assert.equal(entity?.jobTitle, person.schemaTitle);
  }
  assert.equal(leadership.find((person) => person.slug === "nishita-trivedi")?.companiesHouseUrl, null);
});

test("articles are substantial, sourced and connected to the publisher", () => {
  for (const article of articles) {
    assert.ok(readingTime(article) >= 5);
    assert.ok(article.sections.length >= 6);
    const graph = articleSchema(article)["@graph"] as Array<Record<string, unknown>>;
    const entity = graph.find((item) => item["@type"] === "Article");
    assert.ok(entity);
    assert.equal((entity.publisher as { "@id": string })["@id"], organisationId);
    assert.equal(entity.dateModified, article.updated);
  }
});
