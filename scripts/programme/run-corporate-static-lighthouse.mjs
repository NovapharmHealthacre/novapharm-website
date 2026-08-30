import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";

const baseUrl = process.env.CORPORATE_LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:4178";
const artifactRoot = path.resolve(process.env.CORPORATE_LIGHTHOUSE_ARTIFACT_ROOT ?? "tmp/performance/corporate-static-lighthouse");
const trialCount = 3;
const routes = Object.freeze([
  ["homepage", "/"],
  ["products", "/products/"],
]);

function score(category) {
  return Math.round((category?.score ?? 0) * 100);
}

function metric(lhr, id) {
  const audit = lhr.audits[id];
  return { numericValue: audit?.numericValue ?? null, displayValue: audit?.displayValue ?? null };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function medianMetric(trials, name) {
  const numericValue = median(trials.map((trial) => trial.metrics[name].numericValue));
  const source = trials.find((trial) => trial.metrics[name].numericValue === numericValue);
  return { numericValue, displayValue: source?.metrics[name].displayValue ?? null };
}

async function auditTrial(chromePort, route, formFactor) {
  const result = await lighthouse(
    `${baseUrl}${route}`,
    {
      port: chromePort,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor,
    },
    formFactor === "desktop" ? desktopConfig : undefined,
  );
  if (!result) throw new Error(`${route} ${formFactor}: Lighthouse returned no result`);
  const { lhr } = result;
  if (lhr.runtimeError) throw new Error(`${route} ${formFactor}: ${lhr.runtimeError.message}`);
  return {
    scores: {
      performance: score(lhr.categories.performance),
      accessibility: score(lhr.categories.accessibility),
      bestPractices: score(lhr.categories["best-practices"]),
      seo: score(lhr.categories.seo),
    },
    metrics: {
      firstContentfulPaint: metric(lhr, "first-contentful-paint"),
      largestContentfulPaint: metric(lhr, "largest-contentful-paint"),
      cumulativeLayoutShift: metric(lhr, "cumulative-layout-shift"),
      totalBlockingTime: metric(lhr, "total-blocking-time"),
      totalByteWeight: metric(lhr, "total-byte-weight"),
      speedIndex: metric(lhr, "speed-index"),
    },
  };
}

async function auditRoute(chromePort, label, route, formFactor) {
  const trials = [];
  for (let index = 0; index < trialCount; index += 1) {
    trials.push(await auditTrial(chromePort, route, formFactor));
  }
  const result = {
    label,
    route,
    formFactor,
    runCount: trialCount,
    aggregation: "median",
    scores: {
      performance: median(trials.map((trial) => trial.scores.performance)),
      accessibility: median(trials.map((trial) => trial.scores.accessibility)),
      bestPractices: median(trials.map((trial) => trial.scores.bestPractices)),
      seo: median(trials.map((trial) => trial.scores.seo)),
    },
    metrics: {
      firstContentfulPaint: medianMetric(trials, "firstContentfulPaint"),
      largestContentfulPaint: medianMetric(trials, "largestContentfulPaint"),
      cumulativeLayoutShift: medianMetric(trials, "cumulativeLayoutShift"),
      totalBlockingTime: medianMetric(trials, "totalBlockingTime"),
      totalByteWeight: medianMetric(trials, "totalByteWeight"),
      speedIndex: medianMetric(trials, "speedIndex"),
    },
    trials,
  };

  return result;
}

function validateResult(result) {
  assert.ok(result.scores.performance >= 85, `${result.route} ${result.formFactor}: performance floor failed at ${result.scores.performance}`);
  assert.ok(result.scores.accessibility >= 95, `${result.route} ${result.formFactor}: accessibility failed at ${result.scores.accessibility}`);
  assert.ok(result.scores.bestPractices >= 95, `${result.route} ${result.formFactor}: best practices failed at ${result.scores.bestPractices}`);
  assert.ok(result.scores.seo >= 95, `${result.route} ${result.formFactor}: SEO failed at ${result.scores.seo}`);
  assert.ok((result.metrics.cumulativeLayoutShift.numericValue ?? 1) <= 0.1, `${result.route} ${result.formFactor}: CLS exceeded 0.1`);
}

const chrome = await launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const results = [];
  for (const [label, route] of routes) {
    for (const formFactor of ["desktop", "mobile"]) {
      results.push(await auditRoute(chrome.port, label, route, formFactor));
    }
  }

  await rm(artifactRoot, { recursive: true, force: true });
  await mkdir(artifactRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    baseUrl,
    productionFieldData: false,
    candidate: "local PUBLIC_ONLY static corporate output",
    results,
  };
  await writeFile(path.join(artifactRoot, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(
    path.join(artifactRoot, "summary.md"),
    `# Corporate static Lighthouse audit\n\nGenerated: ${generatedAt}\n\n| Route | Profile | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Transfer |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${results.map((entry) => `| \`${entry.route}\` | ${entry.formFactor} | ${entry.scores.performance} | ${entry.scores.accessibility} | ${entry.scores.bestPractices} | ${entry.scores.seo} | ${entry.metrics.largestContentfulPaint.displayValue} | ${entry.metrics.cumulativeLayoutShift.displayValue} | ${entry.metrics.totalBlockingTime.displayValue} | ${entry.metrics.totalByteWeight.displayValue} |`).join("\n")}\n\nEach result is the median of three first-visit laboratory runs against the same local PUBLIC_ONLY candidate. These are not production field Core Web Vitals.\n`,
  );
  for (const result of results) validateResult(result);
  console.log(`Corporate static Lighthouse acceptance passed. Evidence: ${artifactRoot}`);
} finally {
  await chrome.kill();
}
