// A verified Pages artifact may deploy after main advances only when doing so
// cannot roll back an already-successful published artifact. Fail closed if
// ancestry or GitHub Pages deployment evidence cannot be established.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { evaluateBrandingOnlyRelease, gitBlobSha, REVIEWED_CONTACT_BLOBS } from "./verify-public-branding-only-release.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[a-f0-9]{40}$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;
const COMPARE_OK = new Set(["identical", "ahead"]);
// One-time migration from the exact reviewed legacy publication, including
// the two reviewed Nutraxin customer-support releases (#1171 and #1172).
// Do not inherit this exception for any future gh-pages commit.
const PREVIOUS_REVIEWED_LEGACY_PAGES_SHA = "462fe8f33f8b09c007e61ef4908542d4e2bd0a7e";
export const REVIEWED_LEGACY_PAGES_SHA = "827fdf67341fe2f289e6d1a7810f847521b05dac";
export const BRAND_ONLY_AUTHORIZATION_ANCHOR = "26432d4ac2c53a8a39b6701fa77bccda487737ed";

export function canShip({publishedSha, candidateSha, mainSha, publishedToCandidate, candidateToMain, legacyBridgeVerified = false}) {
  if (![publishedSha, candidateSha, mainSha].every(s => typeof s === "string" && SHA.test(s))) return false;
  return COMPARE_OK.has(candidateToMain) &&
    (COMPARE_OK.has(publishedToCandidate) ||
     (publishedToCandidate === "unrelated" &&
      publishedSha === REVIEWED_LEGACY_PAGES_SHA &&
      legacyBridgeVerified === true));
}

function github(path) {
  const output = execFileSync("gh", ["api", path], { encoding:"utf8", timeout:15000, stdio:["ignore","pipe","pipe"] });
  return JSON.parse(output);
}

// Only translate GitHub's *exact* no-common-ancestor response to an
// unrelated comparison for the approved legacy branch. Any other failure
// (including authentication, missing object or rate limit) stays fatal.
function compareStatus(repo, older, newer) {
  try {
    return github("repos/" + repo + "/compare/" + older + "..." + newer)?.status;
  } catch (error) {
    const stderr = String(error?.stderr || "");
    if (older === REVIEWED_LEGACY_PAGES_SHA &&
        stderr.includes("No common ancestor between " + older + " and " + newer) &&
        /\(HTTP 404\)/.test(stderr)) return "unrelated";
    throw error;
  }
}

function independentlyVerifyLegacyBridge(repo, publishedSha, candidateSha) {
  if (publishedSha !== REVIEWED_LEGACY_PAGES_SHA) return false;

  // A later or rewritten Pages branch must never inherit this exception.
  const legacyHead = github("repos/" + repo + "/git/ref/heads/gh-pages")?.object?.sha;
  if (legacyHead !== REVIEWED_LEGACY_PAGES_SHA) return false;

  // Require forward ancestry from the previous reviewed legacy release.
  const legacyLineage = github("repos/" + repo + "/compare/" +
    PREVIOUS_REVIEWED_LEGACY_PAGES_SHA + "..." + publishedSha)?.status;
  if (legacyLineage !== "ahead") return false;

  // The latest legacy release fixed the direct checkout policy link (#1172).
  // Do not migrate an artifact built from a source which would undo that fix.
  const bag = readFileSync(resolve("products/nutraxin/bag/index.html"), "utf8");
  const bagGenerator = readFileSync(resolve("scripts/apply-corporate-product-discipline.mjs"), "utf8");
  const reviewedPolicyLink = '<span>I accept the <a href="/legal/returns/">Nutraxin delivery, returns and refunds policy</a> and understand';
  if (![bag, bagGenerator].every(source => source.includes(reviewedPolicyLink))) return false;

  // The source must be the reviewed owner-scoped approval or its descendant.
  const approvalLineage = github("repos/" + repo + "/compare/" +
    BRAND_ONLY_AUTHORIZATION_ANCHOR + "..." + candidateSha)?.status;
  if (!COMPARE_OK.has(approvalLineage)) return false;

  // Re-run full manual branding-only authorization, including the exact
  // checkout, eleven disabled customer permissions, and immutable Contact files.
  const config = JSON.parse(readFileSync(
    resolve("config/intelligence/owner-production-constraints.json"), "utf8"));
  const sourceBlobs = Object.fromEntries(
    Object.keys(REVIEWED_CONTACT_BLOBS).map(path => [
      path, gitBlobSha(readFileSync(resolve(path)))
    ])
  );
  const checkedOutSha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8", timeout: 15000
  }).trim();
  const decision = evaluateBrandingOnlyRelease({
    config, sourceBlobs, checkedOutSha, expectedSha: candidateSha,
    eventName: process.env.RELEASE_EVENT || "",
    brandingOnly: process.env.BRANDING_ONLY || "",
    contactApiOrigin: process.env.CONTACT_API_ORIGIN || ""
  });
  return decision.approved;
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
  const legacyBridgeVerified = publishedToCandidate === "unrelated" &&
    independentlyVerifyLegacyBridge(repo, publishedSha, candidateSha);
  const statuses = {
    publishedToCandidate,
    candidateToMain:github("repos/" + repo + "/compare/" + candidateSha + "..." + mainSha)?.status,
    legacyBridgeVerified
  };
  if (!canShip({publishedSha, candidateSha, mainSha, ...statuses})) {
    throw new Error("Unsafe Pages lineage: published=" + publishedSha + " candidate=" + candidateSha +
      " main=" + mainSha + " comparisons=" + JSON.stringify(statuses));
  }
  console.log((statuses.legacyBridgeVerified ? "Reviewed one-time legacy Pages migration" : "Forward-only Pages release") +
    " approved. Last published: " + publishedSha +
    "; approved candidate: " + candidateSha + "; current main: " + mainSha);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(String(error)); process.exitCode=1; });
}
