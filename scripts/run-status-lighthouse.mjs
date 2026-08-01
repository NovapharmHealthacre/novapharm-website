import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";

const repositoryRoot = resolve(process.cwd());
const statusRoot = join(
	repositoryRoot,
	"apps",
	"status",
	".next",
	"standalone",
	"apps",
	"status",
);
const artifactRoot = join(repositoryRoot, "artifacts", "status-lighthouse");
const origin = "http://127.0.0.1:4304";
let statusProcess;
let statusOutput = "";
let chrome;

function run(command, argumentsList, label) {
	const result = spawnSync(command, argumentsList, {
		cwd: repositoryRoot,
		stdio: "inherit",
	});
	if (result.status !== 0) throw new Error(`${label} failed.`);
}

async function waitForStatus() {
	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(`${origin}/api/health/live`, {
				signal: AbortSignal.timeout(1_000),
			});
			if (response.status === 200) return;
		} catch {
			// The isolated standalone process is still starting.
		}
		await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
	}
	throw new Error(`Status service did not start. ${statusOutput}`);
}

function score(category) {
	return Math.round((category?.score ?? 0) * 100);
}

function metric(lhr, id) {
	const audit = lhr.audits[id];
	return {
		numericValue: audit?.numericValue ?? null,
		displayValue: audit?.displayValue ?? null,
	};
}

async function audit(formFactor) {
	const result = await lighthouse(
		origin,
		{
			port: chrome.port,
			output: "json",
			logLevel: "error",
			onlyCategories: ["performance", "accessibility", "best-practices"],
			formFactor,
		},
		formFactor === "desktop" ? desktopConfig : undefined,
	);
	if (!result) throw new Error(`Lighthouse returned no ${formFactor} result.`);
	const lhr = result.lhr;
	if (lhr.runtimeError)
		throw new Error(`${formFactor}: ${lhr.runtimeError.message}`);
	const summary = {
		formFactor,
		scores: {
			performance: score(lhr.categories.performance),
			accessibility: score(lhr.categories.accessibility),
			bestPractices: score(lhr.categories["best-practices"]),
		},
		metrics: {
			firstContentfulPaint: metric(lhr, "first-contentful-paint"),
			largestContentfulPaint: metric(lhr, "largest-contentful-paint"),
			cumulativeLayoutShift: metric(lhr, "cumulative-layout-shift"),
			totalBlockingTime: metric(lhr, "total-blocking-time"),
			totalByteWeight: metric(lhr, "total-byte-weight"),
		},
	};
	assert.ok(
		summary.scores.performance >= 90,
		`${formFactor}: performance ${summary.scores.performance} is below 90.`,
	);
	assert.ok(
		summary.scores.accessibility >= 95,
		`${formFactor}: accessibility ${summary.scores.accessibility} is below 95.`,
	);
	assert.ok(
		summary.scores.bestPractices >= 95,
		`${formFactor}: best practices ${summary.scores.bestPractices} is below 95.`,
	);
	return summary;
}

rmSync(artifactRoot, { recursive: true, force: true });
mkdirSync(artifactRoot, { recursive: true });

try {
	run(
		"npm",
		["run", "build", "--workspace=@novapharm/status"],
		"Status production build",
	);
	statusProcess = spawn(process.execPath, ["server.js"], {
		cwd: statusRoot,
		env: {
			...process.env,
			HOSTNAME: "127.0.0.1",
			PORT: "4304",
			NODE_ENV: "production",
		},
		stdio: ["ignore", "pipe", "pipe"],
	});
	statusProcess.stdout?.on("data", (chunk) => {
		statusOutput += String(chunk);
	});
	statusProcess.stderr?.on("data", (chunk) => {
		statusOutput += String(chunk);
	});
	await waitForStatus();

	chrome = await launch({
		chromePath: chromium.executablePath(),
		chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
	});
	const results = [await audit("desktop"), await audit("mobile")];
	writeFileSync(
		join(artifactRoot, "summary.json"),
		`${JSON.stringify({ generatedAt: new Date().toISOString(), candidate: "local production standalone status service", results }, null, 2)}\n`,
	);
	writeFileSync(
		join(artifactRoot, "summary.md"),
		`# Status Lighthouse acceptance\n\n${results.map((entry) => `- ${entry.formFactor}: performance ${entry.scores.performance}, accessibility ${entry.scores.accessibility}, best practices ${entry.scores.bestPractices}; LCP ${entry.metrics.largestContentfulPaint.displayValue}; CLS ${entry.metrics.cumulativeLayoutShift.displayValue}; TBT ${entry.metrics.totalBlockingTime.displayValue}.`).join("\n")}\n\nSEO is intentionally excluded because the status service is noindex. These are local laboratory results rather than production field data.\n`,
	);
	console.log(
		"Status Lighthouse acceptance passed for desktop and mobile profiles.",
	);
} finally {
	if (chrome) await chrome.kill();
	if (statusProcess && statusProcess.exitCode === null) {
		const exited = new Promise((resolvePromise) =>
			statusProcess.once("exit", resolvePromise),
		);
		statusProcess.kill("SIGTERM");
		await Promise.race([
			exited,
			new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000)),
		]);
		if (statusProcess.exitCode === null) statusProcess.kill("SIGKILL");
	}
}
