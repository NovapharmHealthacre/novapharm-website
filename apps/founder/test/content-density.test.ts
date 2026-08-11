import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageLimits = Object.freeze({
  "about.md": 360,
  "ventures.md": 320,
  "facts.md": 260,
  "media.md": 220,
  "speaking-partnerships.md": 260,
});

const wordCount = (value: string) => value.match(/[\p{L}\p{N}][\p{L}\p{N}’'&/–—-]*/gu)?.length ?? 0;

test("high-traffic founder pages stay concise", () => {
  for (const [filename, limit] of Object.entries(pageLimits)) {
    const content = readFileSync(new URL(`../content/pages/${filename}`, import.meta.url), "utf8");
    assert.ok(wordCount(content) <= limit, `${filename} exceeds ${limit} words`);
  }
});
