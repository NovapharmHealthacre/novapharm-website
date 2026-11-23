// A verified Pages artifact may deploy after main advances only when doing so
// cannot roll back an already-successful published artifact. Fail closed if
// ancestry or GitHub Pages deployment evidence cannot be established.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[a-f0-9]{40}$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;
const COMPARE_OK = new Set(["identical", "ahead"]);
// The former branch-published website and the current main-built site have
// independent roots. Bootstrap only from this one reviewed legacy deployment,
// never from arbitrary unrelated history or a moving branch.
export const LEGACY_PAGES_DEPLOYMENT_SHA = "462fe8f33f8b09c007e61ef4908542d4e2bd0a7e";
export const OWNER_BRANDING_SIGNOFF_SHA = "26432d4ac2c53a8a39b6701fa77bccda487737ed";
export const REVIEWED_LEGACY_CONTACT_BLOB = "14591f43ff0ec6674b026a7bec629495f18fa50f";
const LIVE_CONTACT_URL = "https://novapharmhealthcare.com/contact/";

export function gitBlobSha(contents) {
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  return createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
}

export function canShip({
  publishedSha, candidateSha, mainSha,
  publishedToCandidate, candidateToMain, legacyProof = null
}) {
  if (![publishedSha, candidateSha, mainSha].every(s => typeof s === "string" && SHA.test(s))) return false;
  // Both the ordinary and the one-time legacy migration must publish a
  // verified ancestor of current protected main, never a rollback.
  if (!COMPARE_OK.has(candidateToMain)) return false;
  if (COMPARE_OK.has(publishedToCandidate)) return true;
  return publishedToCandidate === "no_common_ancestor" &&
    publishedSha === LEGACY_PAGES_DEPLOYMENT_SHA &&
    legacyProof !== null && typeof legacyProof === "object" &&
    legacyProof.currentLegacyBranchSha === LEGACY_PAGES_DEPLOYMENT_SHA &&
    legacyProof.mainProtected === true &&
    legacyProof.legacyBranchProtected === true &&
    legacyProof.liveContactBlob === REVIEWED_LEGACY_CONTACT_BLOB &&
    COMPARE_OK.has(legacyProof.signoffToCandidate);
}

function github(path) {
  const output = execFileSync("gh", ["api", path], { encoding:"utf8", timeout:15000, stdio:["ignore","pipe","pipe"] });
  return JSON.parse(output);
}

function compareStatus(repo, older, newer) {
  try {
    return github("repos/" + repo + "/compare/" + older + "..." + newer)?.status;
  } catch (error) {
    const details = String(error?.stderr || error?.message || error);
    // Only the known, independently anchored legacy Pages deployment may
    // enter the migration path. Timeouts, 403s and other API failures deny.
    if (older === LEGACY_PAGES_DEPLOYMENT_SHA &&
        /No common ancestor between/.test(details) && /HTTP 404/.test(details)) {
      return "no_common_ancestor";
    }
    throw error;
  }
}

async function verifyLegacyBridge(repo, candidateSha) {
  const main = github("repos/" + repo + "/branches/main");
  const pages = github("repos/" + repo + "/branches/gh-pages");
  const signoffToCandidate = compareStatus(repo, OWNER_BRANDING_SIGNOFF_SHA, candidateSha);
  if (main?.protected !== true || pages?.protected !== true ||
      pages?.commit?.sha !== LEGACY_PAGES_DEPLOYMENT_SHA ||
      !COMPARE_OK.has(signoffToCandidate)) {
    throw new Error("Legacy Pages bootstrap denied: branch protection, historical head or owner signoff lineage unproven");
  }

  // A successful deployment record alone does not prove what visitors see.
  // Read only the existing public Contact HTML; do not submit any enquiry,
  // authenticate, change AWS state or permit a replaced Contact backend.
  const response = await fetch(LIVE_CONTACT_URL + "?source_anchor=" + candidateSha, {
    method: "GET", redirect: "error",
    headers: { Accept: "text/html", "Cache-Control": "no-cache, no-store, max-age=0" },
    signal: AbortSignal.timeout(20000)
  });
  if (response.status !== 200 ||
      !(response.headers.get("content-type") || "").toLowerCase().includes("text/html") ||
      Number(response.headers.get("content-length") || 0) > 1600000) {
    throw new Error("Legacy Pages bootstrap denied: live Contact not a verified HTML 200 response");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 1600000) {
    throw new Error("Legacy Pages bootstrap denied: invalid live Contact byte size");
  }
  const liveContactBlob = gitBlobSha(bytes);
  if (liveContactBlob !== REVIEWED_LEGACY_CONTACT_BLOB) {
    throw new Error("Legacy Pages bootstrap denied: live Contact differs from the reviewed immutable form");
  }
  return {
    currentLegacyBranchSha: pages.commit.sha,
    mainProtected: main.protected,
    legacyBranchProtected: pages.protected,
    liveContactBlob,
    signoffToCandidate
  };
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
  const publishedToCandidate = compareStatus(repo, publishedSha, candidateSha);
  const candidateToMain = compareStatus(repo, candidateSha, mainSha);
  const legacyProof = publishedToCandidate === "no_common_ancestor"
    ? await verifyLegacyBridge(repo, candidateSha) : null;
  const statuses = { publishedToCandidate, candidateToMain };
  if (!canShip({ publishedSha, candidateSha, mainSha, ...statuses, legacyProof })) {
    throw new Error("Unsafe Pages lineage: published=" + publishedSha + " candidate=" + candidateSha +
      " main=" + mainSha + " comparisons=" + JSON.stringify(statuses));
  }
  console.log((legacyProof ? "Verified one-time protected legacy-Pages provenance bridge. " :
    "Forward-only Pages release approved. ") +
    "Last published: " + publishedSha + "; approved candidate: " + candidateSha +
    "; current main: " + mainSha);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(String(error)); process.exitCode=1; });
}
