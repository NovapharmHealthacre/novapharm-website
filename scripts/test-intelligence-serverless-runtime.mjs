import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const docker = readFileSync(new URL("../deployment/aws/Dockerfile.intelligence-lambda", import.meta.url), "utf8");
const ignore = readFileSync(new URL("../.dockerignore", import.meta.url), "utf8");

test("serverless image is a fail-closed, source-labelled, non-root Next.js runtime", () => {
  assert.match(docker, /^FROM node:24-alpine3\.23 AS builder$/m);
  assert.match(docker, /^FROM node:24-alpine3\.23 AS runtime$/m);
  assert.equal((docker.match(/^RUN apk upgrade --no-cache$/gm) ?? []).length, 2,
    "Both builder and runtime must apply supported Alpine security updates");
  assert.doesNotMatch(docker, /FROM node:24-(?:bookworm|trixie)/,
    "Private Lambda canary must not reintroduce the vulnerable Debian glibc base");
  assert.match(docker, /COPY --from=public\.ecr\.aws\/awsguru\/aws-lambda-adapter:1\.1\.0/);
  assert.match(docker, /org\.opencontainers\.image\.revision="\$\{SOURCE_SHA\}"/);
  assert.match(docker, /novapharm\.release-gate="private-no-customer-acceptance"/);
  assert.match(docker, /AWS_LWA_PORT=4303/);
  assert.match(docker, /AWS_LWA_READINESS_CHECK_PATH=\/healthz\//);
  assert.match(docker, /COPY --from=builder --chown=node:node \/workspace\/apps\/portal\/\.next\/static\//);
  assert.match(docker, /^USER node$/m);
  assert.match(docker, /CMD \["node", "apps\/portal\/server\.js"\]/);
  assert.doesNotMatch(docker, /PORTAL_VALIDATION_MODE|BYPASS_AUTH|DISABLE_MFA|ALLOW_ANONYMOUS|STRIPE_SECRET_KEY|OPENAI_API_KEY|MONGODB_URI/);
});

test("sensitive local data and credentials cannot enter the Docker build context", () => {
  for (const rule of [".env", ".env.*", "**/.env", "**/.env.*", "**/.aws", "**/.ssh", "node_modules", "*.sqlite*"]) {
    assert.ok(ignore.split("\n").includes(rule), `Missing image context exclusion: ${rule}`);
  }
});

test("the container health path is liveness, never a user or payment acceptance claim", () => {
  assert.doesNotMatch(docker, /v1\/intelligence\/readiness|portal\/session|subscriptions\/checkout/);
  assert.match(docker, /private-no-customer-acceptance/);
});
