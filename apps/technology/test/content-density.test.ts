import assert from "node:assert/strict";
import test from "node:test";
import { approach, capabilities, decisions, sectors, site } from "../data/site";

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

test("NIT positioning stays concise", () => {
  assert.ok(words(site.description) <= 24, "site description exceeds 24 words");
  for (const decision of decisions) assert.ok(words(decision) <= 14, `decision is too long: ${decision}`);
});

test("capability records stay scannable", () => {
  for (const capability of capabilities) {
    assert.ok(words(capability.short) <= 12, `${capability.id} short proposition exceeds 12 words`);
    assert.ok(words(capability.statement) <= 30, `${capability.id} statement exceeds 30 words`);
    for (const question of capability.questions) assert.ok(words(question) <= 20, `${capability.id} question exceeds 20 words`);
    for (const deliverable of capability.deliverables) assert.ok(words(deliverable) <= 8, `${capability.id} deliverable exceeds 8 words`);
  }
});

test("sector and approach records avoid paragraph-heavy cards", () => {
  for (const sector of sectors) assert.ok(words(sector.description) <= 32, `${sector.title} description exceeds 32 words`);
  for (const step of approach) assert.ok(words(step.text) <= 36, `${step.title} explanation exceeds 36 words`);
});
