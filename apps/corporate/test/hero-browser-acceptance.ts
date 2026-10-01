import assert from "node:assert/strict";
import path from "node:path";
import { chromium, webkit } from "playwright";
import { verifyHeroExperience } from "./hero-acceptance";

const baseUrl = process.env.CORPORATE_BASE_URL ?? "http://127.0.0.1:4310";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(baseUrl).hostname), "Hero acceptance must use an isolated loopback preview");
const artifactRoot = path.resolve(process.env.CORPORATE_BROWSER_ARTIFACT_ROOT ?? "../../artifacts/corporate-hero");
for (const [engine, driver] of [["chromium", chromium], ["webkit", webkit]] as const) {
  const report = await verifyHeroExperience(engine, driver, baseUrl, artifactRoot);
  console.log(`${engine}: ${report.screenshots} hero screenshots, ${report.accessibilityRuns} accessibility checks, motion, keyboard, reduced motion, offscreen suspension, print and scriptless navigation passed.`);
}
