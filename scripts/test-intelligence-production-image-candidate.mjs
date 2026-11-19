import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(new URL("../deployment/aws/Dockerfile.intelligence", import.meta.url), "utf8");
const lines = dockerfile.split("\n");
const image = readFileSync(new URL("../deployment/aws/intelligence_public_official_research.py", import.meta.url), "utf8");

test("production candidate uses a non-root, standalone Next.js runtime with exact source revision", () => {
  assert.match(dockerfile, /^FROM node:24-alpine3\.23 AS builder/m);
  assert.match(dockerfile, /^FROM node:24-alpine3\.23 AS runtime/m);
  assert.equal((dockerfile.match(/^RUN apk upgrade --no-cache$/gm) ?? []).length, 2,
    "Both stages must apply supported Alpine security updates");
  assert.doesNotMatch(dockerfile, /FROM node:24-(?:bookworm|trixie)/,
    "The approved test candidate must not reintroduce the unpatched Debian glibc base");
  assert.match(dockerfile, /^ARG SOURCE_SHA$/m);
  assert.match(dockerfile, /org\.opencontainers\.image\.revision="\$\{SOURCE_SHA\}"/);
  assert.match(dockerfile, /npm ci --ignore-scripts/);
  assert.match(dockerfile, /npm run build --workspace=@novapharm\/portal/);
  assert.match(dockerfile, /COPY --from=builder --chown=node:node/);
  assert.match(dockerfile, /\/workspace\/apps\/portal\/\.next\/static\/\s+\/app\/apps\/portal\/\.next\/static\//,
    "Production candidate must ship hashed JS/CSS alongside standalone server");
  const stagingDockerfile = readFileSync(new URL("../deployment/aws/Dockerfile.portal", import.meta.url), "utf8");
  assert.match(stagingDockerfile, /\/workspace\/apps\/portal\/\.next\/static\/\s+\/app\/apps\/portal\/\.next\/static\//,
    "Staging image must not pass health checks while missing app JS/CSS assets");
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /CMD \["node", "apps\/portal\/server\.js"\]/);
});

test("image does not carry credentials or activate protected runtime and payments", () => {
  const forbidden = [
    /^(?:ARG|ENV)\s+(?:OPENAI_API_KEY|STRIPE_SECRET_KEY|MONGO_URI|MONGODB_URI|AWS_SECRET_ACCESS_KEY|OIDC_SIGNING_KEY)=/m,
    /(?:aws\s+secretsmanager|aws\s+ssm\s+get-parameter|stripe\s+customers)/i,
    /(?:novapharm\/staging\/portal|novapharm-staging-portal-smoke)/,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(dockerfile, pattern);
  assert.match(dockerfile, /novapharm\.release-gate="production-candidate-not-approved"/);
  assert.match(dockerfile, /\/healthz\//);
  assert.match(dockerfile, /^EXPOSE 4303$/m);
  assert.ok(lines.every((line) => !line.includes("http://0.0.0.0:")), "Never rely on wildcard HTTP ingress");
});

test("production image has only liveness, not synthetic-readiness, as its container health signal", () => {
  assert.doesNotMatch(dockerfile, /\/gateway\/v1\/intelligence\/readiness|\/gateway\/portal\/session/);
  assert.match(image, /public/i, "The existing public official-source service is independent of the private candidate");
});

test("Lambda Web Adapter canary uses the same supported musl base without activating customers", () => {
  const lambda = readFileSync(new URL("../deployment/aws/Dockerfile.intelligence-lambda", import.meta.url), "utf8");
  assert.match(lambda, /^FROM node:24-alpine3\.23 AS builder$/m);
  assert.match(lambda, /^FROM node:24-alpine3\.23 AS runtime$/m);
  assert.equal((lambda.match(/^RUN apk upgrade --no-cache$/gm) ?? []).length, 2);
  assert.doesNotMatch(lambda, /node:24-trixie-slim|node:24-bookworm-slim/);
  assert.match(lambda, /aws-lambda-adapter:1\.1\.0/);
  assert.match(lambda, /AWS_LWA_READINESS_CHECK_PATH=\/healthz\//);
  assert.match(lambda, /\/workspace\/apps\/portal\/\.next\/static\/\s+\/app\/apps\/portal\/\.next\/static\//);
  assert.match(lambda, /^USER node$/m);
  assert.match(lambda, /novapharm\.release-gate="private-no-customer-acceptance"/);
  assert.match(lambda, /org\.opencontainers\.image\.revision="\$\{SOURCE_SHA\}"/);
  assert.doesNotMatch(lambda, /ENV\s+(?:OPENAI_API_KEY|STRIPE_SECRET_KEY|MONGODB_URI)=/);
});

test("Docker build context excludes nested credentials and environment files", () => {
  const ignore = readFileSync(new URL("../.dockerignore", import.meta.url), "utf8").split("\n");
  for (const expression of [".env", ".env.*", "**/.env", "**/.env.*", "**/.aws", "**/.ssh", "node_modules", "*.sqlite*"]) {
    assert.ok(ignore.includes(expression), `Sensitive Docker exclusion missing: ${expression}`);
  }
});
