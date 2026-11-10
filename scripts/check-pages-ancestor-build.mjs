// A queued, reviewed main commit may build while main advances. Only
// ancestors of current main are eligible; final deployment separately checks
// the last successful published SHA to prevent rollback.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[a-f0-9]{40}$/;
const REPO = /^[\\w.-]+\\/[\\w.-]+$/;
export function canBuild({ candidateSha, mainSha, candidateToMain }) {
  return SHA.test(candidateSha || "") && SHA.test(mainSha || "") &&
    (candidateSha === mainSha ? candidateToMain === "identical" :
      candidateToMain === "ahead");
}
function github(path) {
  return JSON.parse(execFileSync("gh", ["api", path], {
    encoding: "utf8", timeout: 15000, stdio: ["ignore","pipe","pipe"]
  }));
}
function main() {
  const repo = process.env.GITHUB_REPOSITORY || "";
  const candidateSha = process.env.EXPECTED_SHA || "";
  if (!REPO.test(repo) || !SHA.test(candidateSha)) {
    throw new Error("Trusted repository and immutable 40-character commit SHA required");
  }
  const latest = github("repos/" + repo + "/git/ref/heads/main")?.object?.sha;
  if (!SHA.test(latest || "")) throw new Error("Current main SHA unavailable");
  const status = github("repos/" + repo + "/compare/" + candidateSha + "..." + latest)?.status;
  if (!canBuild({ candidateSha, mainSha:latest, candidateToMain:status })) {
    throw new Error("Cannot build non-ancestor or divergent source: candidate="+candidateSha+" main="+latest+" compare="+status);
  }
  console.log("Verified reviewed main ancestor for build. Candidate="+candidateSha+" main="+latest);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { main(); } catch (error) { console.error(String(error)); process.exitCode=1; }
}
