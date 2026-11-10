// A verified Pages artifact may deploy after main advances only when doing so
// cannot roll back an already-successful published artifact. Fail closed if
// ancestry or GitHub Pages deployment evidence cannot be established.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[a-f0-9]{40}$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;
const COMPARE_OK = new Set(["identical", "ahead"]);

export function canShip({publishedSha, candidateSha, mainSha, publishedToCandidate, candidateToMain}) {
  if (![publishedSha, candidateSha, mainSha].every(s => typeof s === "string" && SHA.test(s))) return false;
  return COMPARE_OK.has(publishedToCandidate) && COMPARE_OK.has(candidateToMain);
}

function github(path) {
  const output = execFileSync("gh", ["api", path], { encoding:"utf8", timeout:15000, stdio:["ignore","pipe","pipe"] });
  return JSON.parse(output);
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY || "";
  const candidateSha = process.env.EXPECTED_SHA || "";
  if (!REPO.test(repo) || !SHA.test(candidateSha)) throw new Error("Missing trusted repository or exact release SHA");
  const ref = github("repos/" + repo + "/git/ref/heads/main");
  const mainSha = ref?.object?.sha || "";
  if (!SHA.test(mainSha)) throw new Error("Cannot resolve current main SHA");

  const deployments = github("repos/" + repo + "/deployments?environment=github-pages&per_page=100");
  if (!Array.isArray(deployments) || !deployments.length) throw new Error("No successful Pages history to prove non-rollback");

  let publishedSha = "";
  for (const deployment of deployments) {
    if (!SHA.test(deployment.sha || "") || !Number.isSafeInteger(deployment.id)) continue;
    const statuses = github("repos/" + repo + "/deployments/" + deployment.id + "/statuses?per_page=20");
    if (Array.isArray(statuses) && statuses.some(s => s.state === "success")) {
      publishedSha = deployment.sha;
      break;
    }
  }
  if (!publishedSha) throw new Error("No verified successful Pages deployment found; manual release review required");
  const statuses = {
    publishedToCandidate:github("repos/" + repo + "/compare/" + publishedSha + "..." + candidateSha)?.status,
    candidateToMain:github("repos/" + repo + "/compare/" + candidateSha + "..." + mainSha)?.status
  };
  if (!canShip({publishedSha, candidateSha, mainSha, ...statuses})) {
    throw new Error("Unsafe Pages lineage: published=" + publishedSha + " candidate=" + candidateSha +
      " main=" + mainSha + " comparisons=" + JSON.stringify(statuses));
  }
  console.log("Forward-only Pages release approved. Last published: " + publishedSha +
    "; approved candidate: " + candidateSha + "; current main: " + mainSha);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(String(error)); process.exitCode=1; });
}
