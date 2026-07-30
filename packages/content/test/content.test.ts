import assert from "node:assert/strict";
import test from "node:test";
import { novapharmOrganisation, people, personBySlug } from "../src/index.ts";

test("organisation identifiers are canonical and stable", () => {
  assert.equal(novapharmOrganisation.publicName, "NovaPharm Healthcare");
  assert.equal(novapharmOrganisation.legalName, "NOVAPHARM HEALTHCARE LTD");
  assert.equal(novapharmOrganisation.companyNumber, "16716501");
  assert.equal(novapharmOrganisation.id, "https://novapharmhealthcare.com/#organization");
});

test("people have unique persistent identities", () => {
  assert.equal(new Set(people.map((person) => person.id)).size, people.length);
  assert.equal(new Set(people.map((person) => person.slug)).size, people.length);
  const vishal = personBySlug("vishal-chakravarty");
  assert.equal(vishal.publicTitle, "Chief Executive Officer");
  assert.equal(vishal.id, "https://vishal.novapharmhealthcare.com/#person");
  assert.equal(vishal.canonicalUrl, "https://vishal.novapharmhealthcare.com/about/");
});

test("regulated appointment and statutory governance remain separate", () => {
  const nishita = personBySlug("nishita-trivedi");
  assert.equal(nishita.statutoryDirector, false);
  assert.equal(nishita.regulatedAppointment?.requestedTitle, "Responsible Person");
  assert.equal(nishita.regulatedAppointment?.publicationDecision, "hold");
});
