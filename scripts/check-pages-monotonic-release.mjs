// A verified Pages artifact may deploy after main advances only when doing so
// cannot roll back an already-successful published artifact. Fail closed if
// ancestry or GitHub Pages deployment evidence cannot be established.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditPublishedBrand, LIVE_ORIGIN, PUBLIC_ROUTES } from "./verify-public-brand-source-live.mjs";

const SHA = /^[a-f0-9]{40}$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;
const COMPARE_OK = new Set(["identical", "ahead"]);

export function canShip({publishedSha, candidateSha, mainSha, publishedToCandidate, candidateToMain}) {
  if (![publishedSha, candidateSha, mainSha].every(s => typeof s === "string" && SHA.test(s))) return false;
  return COMPARE_OK.has(publishedToCandidate) && COMPARE_OK.has(candidateToMain);
}


// A generated gh-pages deployment commit may have unrelated ancestry.
// In that case only independently verified LIVE source provenance can serve
// as the monotonic baseline; the candidate must still be on current main.
export function canShipFromLiveReceipts({
  lastDeploymentSha, liveSourceSha, candidateSha, mainSha,
  liveSourceToCandidate, candidateToMain, audit
}) {
  if (![lastDeploymentSha,liveSourceSha].every(value=>SHA.test(value||""))) return false;
  if (!audit || audit.sourceSha!==liveSourceSha || audit.origin!==LIVE_ORIGIN ||
      audit.total!==PUBLIC_ROUTES.length || audit.passed!==PUBLIC_ROUTES.length ||
      !Array.isArray(audit.results) || audit.results.length!==PUBLIC_ROUTES.length) return false;
  const unique=new Set();
  for (const record of audit.results) {
    if (!PUBLIC_ROUTES.includes(record.route) || unique.has(record.route) ||
        record.status!==200 || record.passed!==true ||
        !Array.isArray(record.errors) || record.errors.length) return false;
    unique.add(record.route);
  }
  return canShip({publishedSha:liveSourceSha,candidateSha,mainSha,
    publishedToCandidate:liveSourceToCandidate,candidateToMain});
}
export function extractLiveSourceReceipt(html) {
  if (typeof html!=="string" || html.length>1600000) return "";
  // The later full six-route audit removes comments and validates the
  // active source receipt, official browser colours and managed Contact.
  const matches=[...html.matchAll(/<meta\s+name=(["'])novapharm-source-sha\1\s+content=(["'])([a-f0-9]{40})\2\s*\/?>/g)];
  return matches.length===1?matches[0][3]:"";
}
function isDisconnectedPagesHistory(error) {
  const detail=String(error?.stderr||"")+" "+String(error?.message||"");
  return detail.includes("No common ancestor") && detail.includes("404");
}
async function inspectExistingLiveSource(candidateSha) {
  const response=await fetch(LIVE_ORIGIN+"/?pages-lineage="+candidateSha,{
    method:"GET",redirect:"manual",
    headers:{Accept:"text/html","Cache-Control":"no-cache, no-store, max-age=0"},
    signal:AbortSignal.timeout(20000)
  });
  if(response.status!==200 ||
     !(response.headers.get("content-type")||"").toLowerCase().includes("text/html") ||
     Number(response.headers.get("content-length")||0)>1600000) {
    throw Error("Legacy Pages proof denied: trustworthy live HTML unavailable");
  }
  const sourceSha=extractLiveSourceReceipt(await response.text());
  if(!sourceSha) throw Error("Legacy Pages proof denied: no unique exact live source receipt; separately reviewed first-migration approval required");
  return {sourceSha,audit:await auditPublishedBrand({sourceSha})};
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
  const candidateToMain=github("repos/"+repo+"/compare/"+candidateSha+"..."+mainSha)?.status;
  if(!COMPARE_OK.has(candidateToMain)) throw Error("Pages candidate is not a verified ancestor of current main");
  let publishedToCandidate;
  try {
    publishedToCandidate=github("repos/"+repo+"/compare/"+publishedSha+"..."+candidateSha)?.status;
  } catch (error) {
    // Only GitHub's specific HTTP 404 no-common-ancestor may enter this path.
    // Auth, network, 5xx and genuinely diverged histories remain denied.
    if(!isDisconnectedPagesHistory(error)) throw error;
    const live=await inspectExistingLiveSource(candidateSha);
    const liveSourceToCandidate=github("repos/"+repo+"/compare/"+live.sourceSha+"..."+candidateSha)?.status;
    if(!canShipFromLiveReceipts({
      lastDeploymentSha:publishedSha,liveSourceSha:live.sourceSha,
      candidateSha,mainSha,liveSourceToCandidate,candidateToMain,audit:live.audit
    })) throw Error("Legacy Pages proof denied: live source receipts, browser branding, Contact or forward ancestry unverified");
    console.log("Forward-only live provenance verified across six routes: deployment="+publishedSha+
      " liveSource="+live.sourceSha+" candidate="+candidateSha+" main="+mainSha);
    return;
  }
  if(!canShip({publishedSha,candidateSha,mainSha,publishedToCandidate,candidateToMain})) {
    throw Error("Unsafe Pages lineage: published="+publishedSha+" candidate="+candidateSha+
      " main="+mainSha+" comparisons="+JSON.stringify({publishedToCandidate,candidateToMain}));
  }
  console.log("Forward-only Pages release approved. Last published: "+publishedSha+
    "; approved candidate: "+candidateSha+"; current main: "+mainSha);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(String(error)); process.exitCode=1; });
}
