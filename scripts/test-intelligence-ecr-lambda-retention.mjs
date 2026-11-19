import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const path = new URL("../infra/aws/intelligence-ecr-protected-lifecycle-policy.json", import.meta.url);
const policy = JSON.parse(readFileSync(path, "utf8"));
const protectedTags = [
  "lambda-reset-ec828468e03f24413ef798609b9ac4961e01c6b7",
  "approved-hero-lwa-a15b88ac-v26",
  "candidate-2667caca57ac995625f260ab741c582269aeb8b3",
  "founder-merged-lambda-f364ac7dc0f0d809b41ac389e8b997eb8ad4f110"
];

test("release images are never captured by broad or untagged expiry", () => {
  assert.ok(Array.isArray(policy.rules) && policy.rules.length > 0);
  for (const rule of policy.rules) {
    assert.equal(rule.action?.type, "expire");
    assert.equal(rule.selection?.tagStatus, "tagged");
    assert.ok(Array.isArray(rule.selection.tagPrefixList));
    assert.ok(rule.selection.tagPrefixList.length > 0);
    assert.equal(rule.selection.tagPatternList, undefined);
    for (const prefix of rule.selection.tagPrefixList) {
      assert.equal(prefix, "ephemeral-build-");
      for (const tag of protectedTags) {
        assert.equal(tag.startsWith(prefix), false);
      }
    }
  }
});

test("ephemeral cleanup requires an explicit tag and bounded retention", () => {
  assert.equal(policy.rules.length, 1);
  const rule = policy.rules[0];
  assert.equal(rule.rulePriority, 1);
  assert.equal(rule.selection.countType, "sinceImagePushed");
  assert.equal(rule.selection.countUnit, "days");
  assert.equal(rule.selection.countNumber, 30);
  assert.equal("ephemeral-build-example".startsWith(rule.selection.tagPrefixList[0]), true);
});

test("no image-count retention rule may sweep accepted Lambda images", () => {
  assert.ok(policy.rules.every(rule => rule.selection.countType !== "imageCountMoreThan"));
});
