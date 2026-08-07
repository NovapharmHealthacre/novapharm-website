import assert from "node:assert/strict";
import test from "node:test";
import { personBySlug } from "@novapharm/content";
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
  assert.equal(organisation.founder?.["@id"], personBySlug("vishal-chakravarty").id);
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

test("the Trust Centre is canonical, substantive and evidence bounded", () => {
  const trustCentre = corporatePages.find((page) => page.slug === "trust-centre");
  assert.ok(trustCentre);
  assert.equal(trustCentre.heroTitle, "Trust is a verified operating condition.");
  assert.ok((trustCentre.sections?.length ?? 0) >= 6);
  assert.match(trustCentre.sections?.[1]?.paragraphs.join(" ") ?? "", /Repository controls.*do not by themselves prove Azure activation/i);
  assert.equal(metadataForPage(trustCentre).alternates?.canonical, "/trust-centre/");
});

test("leadership entities retain approved roles and portrait boundaries", () => {
  for (const person of leadership) {
    const schema = personSchema(person.slug) as { "@graph": Array<Record<string, unknown>> };
    const entity = schema["@graph"].find((item) => item["@type"] === "Person");
    const canonical = personBySlug(person.slug);
    assert.equal(entity?.name, person.displayName);
    assert.equal(entity?.jobTitle, canonical.publicTitle);
    assert.equal(entity?.["@id"], canonical.id);
  }
  assert.equal(leadership.find((person) => person.slug === "nishita-trivedi")?.companiesHouseUrl, null);
  assert.equal(leadership.find((person) => person.slug === "nishita-trivedi")?.title, "Chief Technology Officer and Responsible Person");
  assert.equal(leadership.find((person) => person.slug === "prabhakar-lahare")?.title, "Chief Operating Officer");
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
