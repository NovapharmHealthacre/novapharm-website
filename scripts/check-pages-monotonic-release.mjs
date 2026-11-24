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
// the reviewed Nutraxin Privileges and Klarna publications (#1193, #1196).
// Do not inherit this exception for any future gh-pages commit.
const PREVIOUS_REVIEWED_LEGACY_PAGES_SHA = "f942eafabfd18161da10835c49a1b1cf93e9b72f";
export const REVIEWED_LEGACY_PAGES_SHA = "4c641e6c4277224014626e25bbf0bef060ba9706";
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
export function compareStatus(repo, older, newer, run = execFileSync) {
  try {
    // GitHub compare can include hundreds of commits and full file patches.
    // Only the status is required; filter in gh before stdout reaches Node.
    const status = run("gh", ["api", "repos/" + repo + "/compare/" + older + "..." + newer, "--jq", ".status"], {
      encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "pipe"]
    }).trim();
    if (!["identical", "ahead", "behind", "diverged"].includes(status)) throw new Error("Invalid GitHub comparison status");
    return status;
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
  const legacyLineage = compareStatus(repo, PREVIOUS_REVIEWED_LEGACY_PAGES_SHA, publishedSha);
  if (legacyLineage !== "ahead") return false;

  // The latest legacy release fixed the direct checkout policy link (#1172).
  // Do not migrate an artifact built from a source which would undo that fix.
  const bag = readFileSync(resolve("products/nutraxin/bag/index.html"), "utf8");
  const bagGenerator = readFileSync(resolve("scripts/apply-corporate-product-discipline.mjs"), "utf8");
  const reviewedPolicyLink = '<span>I accept the <a href="/legal/returns/">Nutraxin delivery, returns and refunds policy</a> and understand';
  if (![bag, bagGenerator].every(source => source.includes(reviewedPolicyLink))) return false;

  // #1193 and #1196 published the reviewed retail assets now on main.
  // Require the exact already-published retail blobs, including gated
  // account privileges, so this Contact release cannot undo that release.
  const retailAnchor = "8c947fd708137ea72e6de4820d0eb27e07fb1f45";
  if (!COMPARE_OK.has(compareStatus(repo, retailAnchor, candidateSha))) return false;
  const reviewedRetail = {
    "assets/css/nutraxin-retail-store.css": "10f56efb33df28b82645874c7e383049bf5d8a20",
    "assets/js/nutraxin-retail-store.js": "7507458a4a76bec98318304337873a11f2034b31"
  };
  for (const [path, expected] of Object.entries(reviewedRetail)) {
    if (gitBlobSha(readFileSync(resolve(path))) !== expected) return false;
  }

  // The source must be the reviewed owner-scoped approval or its descendant.
  const approvalLineage = compareStatus(repo, BRAND_ONLY_AUTHORIZATION_ANCHOR, candidateSha);
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
    candidateToMain:compareStatus(repo, candidateSha, mainSha),
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
