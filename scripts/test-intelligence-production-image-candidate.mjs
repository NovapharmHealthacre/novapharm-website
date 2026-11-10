import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(new URL("../deployment/aws/Dockerfile.intelligence", import.meta.url), "utf8");
const lines = dockerfile.split("\n");
const image = readFileSync(new URL("../deployment/aws/intelligence_public_official_research.py", import.meta.url), "utf8");

test("production candidate uses a non-root, standalone Next.js runtime with exact source revision", () => {
  assert.match(dockerfile, /^FROM node:24-bookworm-slim AS builder/m);
  assert.match(dockerfile, /^FROM node:24-bookworm-slim AS runtime/m);
  assert.match(dockerfile, /^ARG SOURCE_SHA$/m);
  assert.match(dockerfile, /org\.opencontainers\.image\.revision="\$\{SOURCE_SHA\}"/);
  assert.match(dockerfile, /npm ci --ignore-scripts/);
  assert.match(dockerfile, /npm run build --workspace=@novapharm\/portal/);
  assert.match(dockerfile, /COPY --from=builder --chown=node:node/);
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
