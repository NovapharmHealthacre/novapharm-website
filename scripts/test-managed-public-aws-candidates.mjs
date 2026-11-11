import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const file = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const docker = file("deployment/aws/Dockerfile.managed-public");
const build = file("deployment/aws/buildspec-managed-public-candidates.yml");
const apps = ["corporate", "founder", "technology", "status"];

test("AWS candidate images admit only the four public Next.js applications", () => {
  assert.match(docker, /corporate\|founder\|technology\|status/);
  assert.match(docker, /npm run build --workspace="\@novapharm\/\$\{APP\}"/);
  for (const app of apps) {
    const pkg = JSON.parse(file("apps/" + app + "/package.json"));
    assert.equal(pkg.name, "@novapharm/" + app);
    assert.match(file("apps/" + app + "/next.config.ts"), /output:\s*"standalone"/);
  }
  assert.doesNotMatch(docker, /\bportal\b\|\bapi\b/);
});

test("runtime is non-root, keeps immutable provenance and remains a nonproduction candidate", () => {
  assert.match(docker, /COPY --from=builder --chown=node:node/);
  assert.match(docker, /RUN test -f "\/app\/apps\/\$\{APP\}\/server\.js"/);
  assert.match(docker, /USER node/);
  assert.match(docker, /novapharm\.release-gate="nonproduction-candidate-not-approved"/);
  assert.match(docker, /org\.opencontainers\.image\.revision="\$\{SOURCE_SHA\}"/);
  assert.match(docker, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(docker, /HEALTHCHECK/);
});

test("buildspec demands exact commit and pushes only immutable candidates to designated ECR repos", () => {
  assert.match(build, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(build, /for app in corporate founder technology status/);
  assert.match(build, /repository="novapharm\/staging\/\$app"/);
  assert.match(build, /candidate="candidate-\$EXPECTED_SHA"/);
  assert.match(build, /aws ecr describe-images/);
  assert.match(build, /docker push "\$image"/);
  assert.doesNotMatch(build, /update-service|change-resource-record-sets|create-deployment|start-task|ecs\s+run-task/);
});
