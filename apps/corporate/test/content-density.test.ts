import assert from "node:assert/strict";
import test from "node:test";
import { corporatePages } from "../data/pages";
import { presentationPage } from "../data/presentation-copy";

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

const conciseKinds = new Set(["home", "narrative"]);

test("public presentation keeps hero copy concise", () => {
  for (const sourcePage of corporatePages) {
    if (!conciseKinds.has(sourcePage.kind)) continue;
    const page = presentationPage(sourcePage);
    assert.ok(words(page.heroTitle) <= 10, `${page.slug || "/"} hero exceeds 10 words`);
    assert.ok(words(page.intro) <= 20, `${page.slug || "/"} intro exceeds 20 words`);
  }
});

test("narrative presentation uses progressive information density", () => {
  for (const sourcePage of corporatePages) {
    if (sourcePage.kind !== "narrative") continue;
    const page = presentationPage(sourcePage);
    assert.ok((page.sections?.length ?? 0) <= 4, `${page.slug} exposes too many first-layer sections`);

    for (const section of page.sections ?? []) {
      assert.ok(words(section.title) <= 9, `${page.slug}: ${section.title} heading is too long`);
      assert.ok(section.paragraphs.length <= 1, `${page.slug}: ${section.title} repeats explanatory paragraphs`);
      for (const paragraph of section.paragraphs) {
        assert.ok(words(paragraph) <= 28, `${page.slug}: ${section.title} paragraph exceeds 28 words`);
      }
      assert.ok((section.bullets?.length ?? 0) <= 4, `${page.slug}: ${section.title} exposes too many bullets`);
    }
  }
});
