import assert from "node:assert/strict";
import test from "node:test";
import { novapharmOrganisation } from "@novapharm/content";
import robots from "../app/robots";
import { insights } from "../data/site";
import {
  articleSchema,
  technologyOrganisationId,
  technologyOrganisationSchema,
  technologyWebsiteId,
  technologyWebsiteSchema,
} from "../lib/seo";

test("technology entities have stable canonical identifiers", () => {
  assert.equal(technologyOrganisationId, "https://nit.novapharmhealthcare.com/#organization");
  assert.equal(technologyWebsiteId, "https://nit.novapharmhealthcare.com/#website");
  assert.deepEqual(technologyOrganisationSchema()["parentOrganization"], { "@id": novapharmOrganisation.id });
  assert.deepEqual(technologyWebsiteSchema()["publisher"], { "@id": technologyOrganisationId });
});

test("insight schema is linked to the canonical NIT entity", () => {
  const insight = insights[0];
  assert.ok(insight);
  const schema = articleSchema(insight);
  assert.equal(schema["@id"], `https://nit.novapharmhealthcare.com/insights/${insight.slug}/#article`);
  assert.deepEqual(schema["publisher"], { "@id": technologyOrganisationId });
  assert.equal(schema["datePublished"], insight.publishedIso);
});

test("crawler policy exposes public assets and separates model training", () => {
  const serialized = JSON.stringify(robots().rules);
  assert.doesNotMatch(serialized, /_next/);
  assert.match(serialized, /OAI-SearchBot/);
  assert.match(serialized, /GPTBot/);
});
