import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";

const repositoryRoot = resolve(process.cwd());
const applications = Object.freeze([
  {
    key: "corporate",
    name: "NovaPharm Healthcare",
    workspace: "@novapharm/corporate",
    port: 4300,
    environment: {
      PUBLIC_INDEXABLE: "true",
      PORTAL_ORIGIN: "https://portal.example.invalid",
      NEXT_PUBLIC_API_ORIGIN: "",
    },
  },
  {
    key: "technology",
    name: "NovaPharm Innovation & Technology",
    workspace: "@novapharm/technology",
    port: 4302,
    environment: { PUBLIC_INDEXABLE: "true" },
  },
  {
    key: "founder",
    name: "Vishal Chakravarty",
    workspace: "@novapharm/founder",
    port: 4301,
    environment: { PUBLIC_INDEXABLE: "true" },
  },
]);
const trialCount = 3;

let chrome;

function run(command, argumentsList, label) {
  const result = spawnSync(command, argumentsList, { cwd: repositoryRoot, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${label} failed.`);
}

async function waitFor(url, processOutput, processHandle) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) throw new Error(`Standalone process exited early. ${processOutput()}`);
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(1_000) });
      if (response.status === 200) return;
    } catch {
      // The isolated production standalone is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`Timed out waiting for ${url}. ${processOutput()}`);
}

async function stop(processHandle) {
  if (processHandle.exitCode !== null) return;
  const exited = new Promise((resolvePromise) => processHandle.once("exit", resolvePromise));
  processHandle.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000))]);
  if (processHandle.exitCode === null) processHandle.kill("SIGKILL");
}

function score(category) {
  return Math.round((category?.score ?? 0) * 100);
}

function metric(lhr, id) {
  const audit = lhr.audits[id];
  return { numericValue: audit?.numericValue ?? null, displayValue: audit?.displayValue ?? null };
}

function lcpElement(lhr) {
  const items = lhr.audits["lcp-breakdown-insight"]?.details?.items;
  const node = Array.isArray(items) ? items.find((item) => item?.type === "node") : null;
  return node ? { selector: node.selector ?? null, label: node.nodeLabel ?? null, snippet: node.snippet ?? null } : null;
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

async function auditTrial(application, formFactor) {
  const origin = `http://127.0.0.1:${application.port}`;
  const result = await lighthouse(
    origin,
    {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor,
    },
    formFactor === "desktop" ? desktopConfig : undefined,
  );
  if (!result) throw new Error(`${application.key} ${formFactor}: Lighthouse returned no result.`);
  const lhr = result.lhr;
  if (lhr.runtimeError) throw new Error(`${application.key} ${formFactor}: ${lhr.runtimeError.message}`);
  const summary = {
    formFactor,
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
    },
    lcpElement: lcpElement(lhr),
  };
  return summary;
}

async function audit(application, formFactor) {
  const trials = [];
  for (let trial = 1; trial <= trialCount; trial += 1) {
    trials.push(await auditTrial(application, formFactor));
  }
  const summary = {
    formFactor,
    runCount: trials.length,
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
    },
    lcpElement: trials.find((trial) => trial.lcpElement)?.lcpElement ?? null,
    trials,
  };
  assert.ok(summary.scores.performance >= 75, `${application.key} ${formFactor}: performance regression floor failed at ${summary.scores.performance}.`);
  assert.ok(summary.scores.accessibility >= 95, `${application.key} ${formFactor}: accessibility failed at ${summary.scores.accessibility}.`);
  assert.ok(summary.scores.bestPractices >= 95, `${application.key} ${formFactor}: best practices failed at ${summary.scores.bestPractices}.`);
  assert.ok(summary.scores.seo >= 95, `${application.key} ${formFactor}: SEO failed at ${summary.scores.seo}.`);
  assert.ok((summary.metrics.cumulativeLayoutShift.numericValue ?? 1) <= 0.1, `${application.key} ${formFactor}: CLS exceeded 0.1.`);
  return {
    ...summary,
    targets: {
      performance90: summary.scores.performance >= 90,
      accessibility95: summary.scores.accessibility >= 95,
      seo95: summary.scores.seo >= 95,
      lcp2500ms: (summary.metrics.largestContentfulPaint.numericValue ?? Number.POSITIVE_INFINITY) <= 2_500,
      cls01: (summary.metrics.cumulativeLayoutShift.numericValue ?? Number.POSITIVE_INFINITY) <= 0.1,
    },
  };
}

try {
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const application of applications) {
    run("npm", ["run", "build", `--workspace=${application.workspace}`], `${application.name} production build`);
    const standaloneRoot = join(repositoryRoot, "apps", application.key, ".next", "standalone", "apps", application.key);
    const origin = `http://127.0.0.1:${application.port}`;
    let output = "";
    const processHandle = spawn(process.execPath, ["server.js"], {
      cwd: standaloneRoot,
      env: {
        ...process.env,
        HOSTNAME: "127.0.0.1",
        PORT: String(application.port),
        NODE_ENV: "production",
        ...application.environment,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    processHandle.stdout?.on("data", (chunk) => { output += String(chunk); });
    processHandle.stderr?.on("data", (chunk) => { output += String(chunk); });
    try {
      await waitFor(origin, () => output, processHandle);
      const results = [await audit(application, "desktop"), await audit(application, "mobile")];
      const artifactRoot = join(repositoryRoot, "artifacts", `${application.key}-lighthouse`);
      rmSync(artifactRoot, { recursive: true, force: true });
      mkdirSync(artifactRoot, { recursive: true });
      const report = {
        generatedAt: new Date().toISOString(),
        candidate: `local production standalone ${application.key} application`,
        productionFieldData: false,
        results,
      };
      writeFileSync(join(artifactRoot, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
      writeFileSync(
        join(artifactRoot, "summary.md"),
        `# ${application.name} Lighthouse audit\n\n${results.map((entry) => `- ${entry.formFactor} (${entry.runCount}-run median): performance ${entry.scores.performance}, accessibility ${entry.scores.accessibility}, best practices ${entry.scores.bestPractices}, SEO ${entry.scores.seo}; LCP ${entry.metrics.largestContentfulPaint.displayValue}; CLS ${entry.metrics.cumulativeLayoutShift.displayValue}; TBT ${entry.metrics.totalBlockingTime.displayValue}.`).join("\n")}\n\nThese are local production-standalone laboratory medians, not production field data. Performance 90 and LCP 2.5 seconds are reported as targets rather than silently converted into pass claims.\n`,
      );
      console.log(`${application.name} Lighthouse audit completed for desktop and mobile.`);
    } finally {
      await stop(processHandle);
    }
  }
} finally {
  if (chrome) await chrome.kill();
}

console.log("Public Lighthouse audit completed and all temporary application processes were removed.");
