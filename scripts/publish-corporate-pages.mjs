import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const artifact = path.resolve(process.argv[2]);
const acceptance = path.resolve(process.argv[3]);
const evidence = path.resolve(process.argv[4]);
const repository = "NovapharmHealthacre/novapharm-website";
const remote = `https://github.com/${repository}.git`;
const release = JSON.parse(readFileSync(path.join(artifact, "release.json"), "utf8"));
const browser = JSON.parse(readFileSync(acceptance, "utf8"));
assert.equal(browser.passed, true, "Complete browser acceptance required");
assert(browser.routes >= 60 && browser.results.some((result) => result.engineName === "webkit" && result.check?.includes("motion-")), "Both browsers and interactions must complete");
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.violations, []);
assert.equal(release.profile, "PUBLIC_ONLY_GITHUB_PAGES");
assert.equal(browser.sourceRevision, release.sourceRevision, "Browser acceptance source mismatch");
assert.equal(browser.artifactFingerprint, release.artifactFingerprint, "Browser acceptance artifact mismatch");
assert.equal(release.sourceRevision, execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), "Source revision mismatch");
assert.equal(execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).trim(), "", "Tracked release source must be committed before publication");
const manifest = JSON.parse(readFileSync(`${artifact}.manifest.json`, "utf8"));
assert.equal(createHash("sha256").update(JSON.stringify(manifest.files)).digest("hex"), release.artifactFingerprint, "Artifact manifest identity mismatch");
for (const file of manifest.files) {
  assert.equal(createHash("sha256").update(readFileSync(path.join(artifact, file.path))).digest("hex"), file.sha256, `Changed artifact: ${file.path}`);
}
assert(!existsSync(path.join(artifact, ".git")), "Use a fresh, tested artifact; do not republish an existing checkout blindly");
const pages = JSON.parse(execFileSync("gh", ["api", `repos/${repository}/pages`], { encoding: "utf8" }));
assert.equal(pages.cname, "novapharmhealthcare.com");
assert.equal(pages.https_enforced, true);
writeFileSync(path.join(evidence, "pages-before.json"), `${JSON.stringify(pages, null, 2)}\n`);
const git = (args) => execFileSync("git", ["-C", artifact, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
git(["init", "--initial-branch=gh-pages"]);
git(["remote", "add", "origin", remote]);
const prior = execFileSync("git", ["ls-remote", "--heads", remote, "gh-pages"], { encoding: "utf8" }).trim();
if (prior) {
  assert.match(prior, /^[a-f0-9]{40}\s+refs\/heads\/gh-pages$/);
  git(["fetch", "--depth=1", "origin", "gh-pages"]);
  git(["update-ref", "refs/heads/gh-pages", prior.split(/\s+/)[0]]);
}
git(["config", "user.name", "NovaPharm Healthcare"]);
git(["config", "user.email", "251874889+NovapharmHealthacre@users.noreply.github.com"]);
git(["add", "--all"]);
git(["commit", "-m", `Publish approved Corporate public release ${release.sourceRevision}`]);
git(["push", "--set-upstream", "origin", "gh-pages"]);
const artifactRevision = git(["rev-parse", "HEAD"]).trim();
writeFileSync(path.join(evidence, "publication-submitted.json"), `${JSON.stringify({ sourceRevision: release.sourceRevision, artifactRevision, priorArtifactRevision: prior.split(/\s+/)[0] || null, domain: pages.cname, state: "SUBMITTED_NOT_YET_LIVE_VERIFIED", timestamp: new Date().toISOString() }, null, 2)}\n`);
const policies = JSON.parse(execFileSync("gh", ["api", `repos/${repository}/environments/github-pages/deployment-branch-policies`], { encoding: "utf8" }));
if (!policies.branch_policies.some((policy) => policy.name === "gh-pages" && policy.type === "branch")) {
  const policy = JSON.parse(execFileSync("gh", ["api", "--method", "POST", `repos/${repository}/environments/github-pages/deployment-branch-policies`, "--input", "-"], { encoding: "utf8", input: JSON.stringify({ name: "gh-pages", type: "branch" }) }));
  writeFileSync(path.join(evidence, "pages-release-branch-policy.json"), `${JSON.stringify(policy, null, 2)}\n`);
}
execFileSync("gh", ["api", "--method", "PUT", `repos/${repository}/pages`, "--input", "-"], { encoding: "utf8", input: JSON.stringify({ build_type: "legacy", source: { branch: "gh-pages", path: "/" }, cname: pages.cname, https_enforced: true }) });
console.log(`Publication submitted: ${artifactRevision}. Verify the public domain and exact release revision before claiming live acceptance.`);
