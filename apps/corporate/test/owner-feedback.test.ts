import assert from "node:assert/strict";
import test from "node:test";
import { personBySlug } from "@novapharm/content";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NutraxinKnowMore } from "../components/nutraxin-know-more";
import catalogue from "../data/nutraxin-product-register.json";
import links from "../data/nutraxin-uk-links.json";
import { leadership } from "../data/site";

test("all 19 catalogue references have distinct verified UK product-information destinations", () => {
  assert.equal(catalogue.products.length, 19);
  assert.deepEqual(Object.keys(links.products).sort(), catalogue.products.map((product) => product.slug).sort());
  assert.equal(new Set(Object.values(links.products)).size, 19);
  assert.equal(links.publisher, "Nutraxin UK");
  assert.equal(links.verifiedOn, "2026-10-01");
  for (const product of catalogue.products) {
    const href = links.products[product.slug as keyof typeof links.products];
    const url = new URL(href);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "nutraxin.uk.com");
    assert.match(url.pathname, /^\/product\/[^/]+\/$/);
    const html = renderToStaticMarkup(createElement(NutraxinKnowMore, { slug: product.slug, name: product.name }));
    assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes("Know more about"));
    assert.ok(html.includes("Nutraxin UK"));
    assert.ok(!html.includes("Buy now"));
  }
});

test("UK product URL spellings are pinned to publisher content, not inferred from slugs", () => {
  assert.equal(links.products["vitamin-d3-120-tablets"], "https://nutraxin.uk.com/product/vitamin-d3-k2-tablet/");
  assert.equal(links.products["vitamin-d3-k2-120-tablets"], "https://nutraxin.uk.com/product/vitamin-d3-k2-tablet-2/");
  assert.equal(links.products["vitamin-d3-spray-30ml"], "https://nutraxin.uk.com/product/vitamin-d3-k2-sprayy/");
  assert.equal(links.products["collagen-gold-30-sachets"], "https://nutraxin.uk.com/product/collagen-gold-quality-sachet/");
  assert.throws(() => renderToStaticMarkup(createElement(NutraxinKnowMore, { slug: "unverified-product", name: "Unknown product" })), /Unverified Nutraxin UK destination/);
});

test("owner-approved biographies and roles retain the 1 October narrative hierarchy", () => {
  const summaries = [
    "Building the route from pharmaceutical opportunity to regulated market access.",
    "Turning strategy into controlled, reliable pharmaceutical operations.",
    "Bringing scientific depth to the decisions behind every product.",
    "Looking at product opportunities through a scientific and development lens.",
    "Connecting pharmaceutical quality with controlled technology."
  ];
  assert.deepEqual(leadership.map((person) => person.summary), summaries);
  assert.deepEqual(leadership.map((person) => person.biography.length), [4, 3, 3, 2, 3]);
  for (const person of leadership) assert.equal(person.title, personBySlug(person.slug).publicTitle);
  assert.equal(personBySlug("helly-panchal").publicTitle, "Director, Scientific & Product Strategy");
  assert.equal(personBySlug("nishita-trivedi").publicTitle, "Chief Technology Officer");
  assert.equal(personBySlug("nishita-trivedi").regulatedAppointment?.documentaryEvidenceState, "pending_evidence");
  const nishita = leadership.find((person) => person.slug === "nishita-trivedi");
  assert.match(nishita?.biography.at(-1) ?? "", /governed separately from any regulated Responsible Person responsibilities/);
  assert.equal(nishita?.companiesHouseUrl, null);
});
