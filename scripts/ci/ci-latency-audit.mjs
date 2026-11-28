import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A read-only sampler of recent completed PR jobs. It never modifies workflows,
// branches, branch protection, deployments, production, or external services.
export function percentile(values, fraction) {
  if (!values.length) return null;
  assert.ok(fraction > 0 && fraction <= 1, "Percentile must be in (0,1]");
  const sorted = values.toSorted((a, b) => a - b);
  return Number(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)].toFixed(2));
}

function differenceMinutes(first, second) {
  const a = Date.parse(first ?? "");
  const b = Date.parse(second ?? "");
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Number(((b - a) / 60000).toFixed(2));
}

export function jobObservation(job, workflow) {
  // GitHub job creation -> runner start is job scheduling latency, not an
  // independently proven runner-capacity shortage.
  const queueMinutes = differenceMinutes(job.created_at, job.started_at);
  const executionMinutes = differenceMinutes(job.started_at, job.completed_at);
  if (queueMinutes === null || executionMinutes === null) return null;
  return {
    workflow,
    job: String(job.name ?? "unnamed"),
    queueMinutes,
    executionMinutes,
    conclusion: String(job.conclusion ?? "unknown"),
  };
}

export function summarizeRuns(samples) {
  const observations = samples.flatMap(sample =>
    sample.jobs.map(job => jobObservation(job, sample.name)).filter(Boolean));
  const queue = observations.map(row => row.queueMinutes);
  const execution = observations.map(row => row.executionMinutes);
  const grouped = new Map();
  const groupedJobs = new Map();
  for (const row of observations) {
    const arr = grouped.get(row.workflow) ?? [];
    arr.push(row);
    grouped.set(row.workflow, arr);
    // A stable JSON tuple avoids collisions between workflow/job names.
    const key = JSON.stringify([row.workflow, row.job]);
    const jobArr = groupedJobs.get(key) ?? [];
    jobArr.push(row);
    groupedJobs.set(key, jobArr);
  }
  const slowestQueues = [...observations].sort((a, b) => b.queueMinutes - a.queueMinutes).slice(0, 10);
  const slowestExecution = [...observations].sort((a, b) => b.executionMinutes - a.executionMinutes).slice(0, 10);
  const byWorkflow = [...grouped].map(([workflow, jobs]) => ({
    workflow,
    jobs: jobs.length,
    queueP50Minutes: percentile(jobs.map(row => row.queueMinutes), 0.5),
    queueP95Minutes: percentile(jobs.map(row => row.queueMinutes), 0.95),
    executionP95Minutes: percentile(jobs.map(row => row.executionMinutes), 0.95),
  })).sort((a, b) => b.queueP95Minutes - a.queueP95Minutes);
  const byJob = [...groupedJobs].map(([key, jobs]) => {
    const [workflow, job] = JSON.parse(key);
    return {
      workflow, job, samples: jobs.length,
      queueP50Minutes: percentile(jobs.map(row => row.queueMinutes), 0.5),
      queueP95Minutes: percentile(jobs.map(row => row.queueMinutes), 0.95),
      executionP50Minutes: percentile(jobs.map(row => row.executionMinutes), 0.5),
      executionP95Minutes: percentile(jobs.map(row => row.executionMinutes), 0.95),
      failedOrTimedOut: jobs.filter(row => ["failure", "timed_out"].includes(row.conclusion)).length,
    };
  }).sort((a, b) => b.executionP95Minutes - a.executionP95Minutes);
  return {
    sampledCompletedPrRuns: samples.length,
    timedJobs: observations.length,
    queueP50Minutes: percentile(queue, 0.5),
    queueP95Minutes: percentile(queue, 0.95),
    executionP50Minutes: percentile(execution, 0.5),
    executionP95Minutes: percentile(execution, 0.95),
    byWorkflow,
    byJob,
    slowestQueues,
    slowestExecution,
    limitations: [
      "Completed pull_request runs only; live queued runs are not sampled.",
      "Job scheduling latency does not by itself prove runner-capacity constraints.",
      "Samples are recent-run observations, not a representative long-term merge-time baseline.",
      "Individual jobs may have dependencies; queue and execution timings are not additive across parallel jobs.",
      "Review, approval and deployment waiting times are outside this sampler.",
    ],
  };
}

function nonNegativeInteger(value, minimum, maximum) {
  const n = Number(value);
  assert.ok(Number.isInteger(n) && n >= minimum && n <= maximum,
    "CI_AUDIT_LIMIT must be an integer from 1 to 50");
  return n;
}

async function readGitHub(path, token) {
  const response = await fetch("https://api.github.com" + path, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "novapharm-readonly-ci-latency-audit",
    },
  });
  if (!response.ok) throw new Error("GitHub read-only request failed: HTTP " + response.status);
  return response.json();
}

function markdownReport(report) {
  const rows = report.byWorkflow.slice(0, 12).map(row =>
    "| " + row.workflow.replaceAll("|", "/") + " | " + row.jobs +
    " | " + row.queueP50Minutes + " | " + row.queueP95Minutes +
    " | " + row.executionP95Minutes + " |").join("\n");
  return [
    "## NovaPharm CI latency: read-only sample",
    "",
    "Recent completed PR workflow runs: **" + report.sampledCompletedPrRuns + "**; timed jobs: **" + report.timedJobs + "**.",
    "",
    "| Metric | Minutes |",
    "| --- | ---: |",
    "| Queue p50 | " + (report.queueP50Minutes ?? "n/a") + " |",
    "| Queue p95 | " + (report.queueP95Minutes ?? "n/a") + " |",
    "| Execution p50 | " + (report.executionP50Minutes ?? "n/a") + " |",
    "| Execution p95 | " + (report.executionP95Minutes ?? "n/a") + " |",
    "",
    "### Workflow-level queue and execution (minutes)",
    "",
    "| Workflow | Jobs | Queue p50 | Queue p95 | Execution p95 |",
    "| --- | ---: | ---: | ---: | ---: |",
    rows || "| No completed jobs sampled | 0 | n/a | n/a | n/a |",
    "",
    "### Slowest individual jobs (execution minutes)",
    "",
    "| Workflow | Job | Samples | Execute p50 | Execute p95 | Queue p95 | Failed/timed out |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...(report.byJob.slice(0, 15).map(row =>
      "| " + row.workflow.replaceAll("|", "/") +
      " | " + row.job.replaceAll("|", "/") + " | " + row.samples +
      " | " + row.executionP50Minutes + " | " + row.executionP95Minutes +
      " | " + row.queueP95Minutes + " | " + row.failedOrTimedOut + " |")),
    "",
    "### Important limitations",
    ...report.limitations.map(value => "- " + value),
    "",
    "No release gates, security checks, review policy or production settings were changed by this audit.",
    "",
  ].join("\n");
}

export async function main() {
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const token = process.env.GITHUB_TOKEN ?? "";
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Invalid repository");
  assert.ok(token, "Read-only GITHUB_TOKEN is required");
  const limit = nonNegativeInteger(process.env.CI_AUDIT_LIMIT ?? "25", 1, 50);
  const safeRepository = repository.split("/").map(encodeURIComponent).join("/");
  const runs = await readGitHub("/repos/" + safeRepository +
    "/actions/runs?event=pull_request&status=completed&per_page=100", token);
  const selected = (runs.workflow_runs ?? [])
    .filter(run => run.status === "completed" &&
      ["success", "failure", "timed_out"].includes(run.conclusion))
    .slice(0, limit);
  const samples = new Array(selected.length);
  let next = 0;
  async function worker() {
    while (next < selected.length) {
      const i = next++;
      const run = selected[i];
      const response = await readGitHub("/repos/" + safeRepository +
        "/actions/runs/" + run.id + "/jobs?filter=latest&per_page=100", token);
      assert.ok((response.total_count ?? 0) <= 100,
        "Job pagination required for run " + run.id + "; do not publish incomplete metrics");
      samples[i] = { name: String(run.name), jobs: response.jobs ?? [] };
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, selected.length) }, () => worker()));
  const report = summarizeRuns(samples);
  const outputRoot = resolve("artifacts/ci-performance");
  mkdirSync(outputRoot, { recursive: true });
  const markdown = markdownReport(report);
  writeFileSync(resolve(outputRoot, "report.md"), markdown);
  writeFileSync(resolve(outputRoot, "metrics.json"), JSON.stringify(report, null, 2) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    mkdirSync(dirname(process.env.GITHUB_STEP_SUMMARY), { recursive: true });
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: "a" });
  }
  process.stdout.write("CI latency audit completed: " +
    report.sampledCompletedPrRuns + " PR runs, " + report.timedJobs +
    " timed jobs; queue p95 = " + (report.queueP95Minutes ?? "n/a") + " min.\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error("::error::Read-only CI audit could not complete:", error.message);
    process.exitCode = 1;
  });
}
