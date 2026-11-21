/**
 * Prevent source-only HIG ledgers from claiming independent approval through a
 * plausible-looking GitHub issue/comment URL. This test does not approve any
 * topic; it only read-verifies claimed actual GitHub PR review events.
 * When nothing is accepted, no API call is performed or needed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const repo = "NovapharmHealthacre/novapharm-website";
const register = JSON.parse(readFileSync(
  "docs/design/apple-hig-172-topic-acceptance-register.json", "utf8"
));
const reviewPattern = /^https:\/\/github\.com\/NovapharmHealthacre\/novapharm-website\/pull\/([1-9]\d*)#pullrequestreview-([1-9]\d*)$/;
const shaPattern = /^[a-f0-9]{40}$/;

function parseReviewUrl(value) {
  if (typeof value !== "string") return null;
  const match = reviewPattern.exec(value);
  return match ? { pullNumber: Number(match[1]), reviewId: Number(match[2]) } : null;
}
function acceptedClaims(candidate = register) {
  assert.ok(Array.isArray(candidate?.topics), "HIG source must contain topic records");
  const claims = [];
  const claim = (topic, origin, record) => {
    assert.ok(record && typeof record === "object",
      topic + "/" + origin + ": independent review receipt object is missing");
    const ref = parseReviewUrl(record.independentReviewUrl);
    assert.ok(ref, topic + "/" + origin +
      ": a concrete GitHub pullrequestreview event is required; issues, workflow links and PR pages are not approvals");
    assert.match(record.reviewedSourceSha ?? "", shaPattern,
      topic + "/" + origin + ": the exact reviewed PR head SHA is required");
    claims.push({ ...ref, reviewedSourceSha: record.reviewedSourceSha, topic, origin });
  };
  for (const topic of candidate.topics) {
    assert.ok(typeof topic.title === "string" && topic.title.length > 0, "HIG topic title is missing");
    assert.ok(["not_verified", "verified", "not_applicable"].includes(topic.implementation),
      topic.title + ": unexpected implementation state cannot be silently ignored");
    if (topic.implementation === "not_verified") continue;

    // Whole-topic N/A and verified claims are two DIFFERENT dispositions.
    // Neither may silently bypass missing platform decisions or a platform
    // still requiring implementation. Source proposals alone are not approvals.
    const platforms = ["web", "ios", "android"];
    const states = Object.fromEntries(platforms.map(platform => {
      const state = topic.platformApplicability?.[platform]?.state;
      assert.ok(["applicable", "not_applicable"].includes(state),
        topic.title + "/" + platform + ": an accepted topic requires a reviewed applicability decision");
      return [platform, state];
    }));
    const applicable = platforms.filter(platform => states[platform] === "applicable");

    if (topic.implementation === "not_applicable") {
      assert.equal(applicable.length, 0,
        topic.title + ": whole-topic not_applicable cannot exclude any applicable platform");
      claim(topic.title, "approved-N/A", topic.notApplicableApproval);
      continue;
    }

    assert.ok(applicable.length > 0,
      topic.title + ": verified implementation requires at least one applicable platform");
    for (const platform of applicable) {
      const fullReceipts = (topic[platform + "Evidence"] || []).filter(r =>
        r?.platform === platform && r.verificationLevel === "full");
      assert.equal(fullReceipts.length, 1,
        topic.title + "/" + platform + ": expected exactly one current full production evidence receipt");
      const full = fullReceipts[0];
      assert.match(full.observedLiveSourceSha ?? "", shaPattern,
        topic.title + "/" + platform + ": full evidence must identify an actual observed deployed source commit");
      claim(topic.title, platform + "/live", full);

      const releases = (topic.releaseEvidence || []).filter(r =>
        r?.platform === platform && r.reviewDecision === "approved" &&
        r.observedLiveSourceSha === full.observedLiveSourceSha);
      assert.equal(releases.length, 1,
        topic.title + "/" + platform + ": expected exactly one matching approved production release");
      claim(topic.title, platform + "/release", releases[0]);
    }
  }
  return claims;
}

async function githubGet(path, token) {
  const response = await fetch("https://api.github.com" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "novapharm-hig-independent-approval-readback"
    },
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, 200,
    "GitHub read-only approval inspection returned HTTP " + response.status + " for " + path);
  return response.json();
}

test("HIG approval URLs must identify specific review events, never self-authored issues or CI", () => {
  assert.deepEqual(parseReviewUrl(
    "https://github.com/NovapharmHealthacre/novapharm-website/pull/883#pullrequestreview-123456"
  ), { pullNumber: 883, reviewId: 123456 });
  for (const url of [
    "https://github.com/NovapharmHealthacre/novapharm-website/issues/890",
    "https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44677599844",
    "https://github.com/NovapharmHealthacre/novapharm-website/pull/883",
    "https://github.com/NovapharmHealthacre/novapharm-website/pull/883#issuecomment-123",
    "https://github.com/another-org/novapharm-website/pull/883#pullrequestreview-123",
    "https://example.com/pull/883#pullrequestreview-123"
  ]) assert.equal(parseReviewUrl(url), null, url);
});

test("every accepted HIG receipt has a real independent APPROVED GitHub review on its exact source head", {
  timeout: 240000
}, async () => {
  const claims = acceptedClaims();
  if (claims.length === 0) {
    console.log("No accepted topic claims: 0 production-verification approvals; no remote review lookup or signoff claimed.");
    return;
  }
  const token = process.env.GITHUB_TOKEN;
  assert.ok(token, "Cannot verify accepted HIG claims without a read-only GitHub token");
  const cache = new Map();
  for (const c of claims) {
    const key = c.pullNumber + ":" + c.reviewId;
    let result = cache.get(key);
    if (!result) {
      const [pull, review] = await Promise.all([
        githubGet("/repos/" + repo + "/pulls/" + c.pullNumber, token),
        githubGet("/repos/" + repo + "/pulls/" + c.pullNumber + "/reviews/" + c.reviewId, token)
      ]);
      result = { pull, review };
      cache.set(key, result);
    }
    const { pull, review } = result;
    assert.equal(review.id, c.reviewId, c.topic + "/" + c.origin + ": mismatched GitHub review ID");
    assert.equal(review.state, "APPROVED", c.topic + "/" + c.origin + ": review not APPROVED or dismissed");
    assert.ok(review.submitted_at && !Number.isNaN(Date.parse(review.submitted_at)),
      c.topic + "/" + c.origin + ": submitted review timestamp missing");
    assert.ok(review.user?.login && pull.user?.login &&
      review.user.login.toLowerCase() !== pull.user.login.toLowerCase(),
      c.topic + "/" + c.origin + ": the PR author cannot self-approve HIG evidence");
    assert.equal(review.commit_id, c.reviewedSourceSha,
      c.topic + "/" + c.origin + ": review was not submitted for the claimed source commit");
    assert.equal(pull.head?.sha, c.reviewedSourceSha,
      c.topic + "/" + c.origin + ": PR head changed since independent approval; re-review required");
  }
});
