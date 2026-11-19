import assert from "node:assert/strict";
import test from "node:test";
import { checkIntelligenceReleaseParity, FUNCTION } from "./check-intelligence-alias-parity.mjs";

const uri = alias => `arn:aws:lambda:eu-north-1:250675045172:function:${FUNCTION}:${alias}`;
function fixture() {
  const routes = [
    ["GET /", "customer-identity-candidate", "NONE"],
    ["GET /_next/static/{proxy+}", "customer-identity-candidate", "NONE"],
    ["GET /assets/{proxy+}", "customer-identity-candidate", "NONE"],
    ["GET /auth/customer/start", "customer-identity-candidate", "NONE"],
    ["GET /auth/callback", "customer-identity-candidate", "NONE"],
    ["GET /healthz", "private-acceptance", "NONE"],
    ["ANY /{proxy+}", "private-acceptance", "AWS_IAM"]
  ];
  return {
    expectedVersion: "44",
    aliases: { Aliases: [
      { Name: "customer-identity-candidate", FunctionVersion: "44" },
      { Name: "private-acceptance", FunctionVersion: "44" },
      { Name: "private-acceptance-recovery-20261113", FunctionVersion: "35" }
    ] },
    routes: { Items: routes.map(([RouteKey,, AuthorizationType], i) =>
      ({ RouteKey, AuthorizationType, Target: `integrations/id${i}` })) },
    integrations: { Items: routes.map(([, alias], i) =>
      ({ IntegrationId: `id${i}`, IntegrationUri: uri(alias) })) }
  };
}

test("allows only same-version coherent public asset and protected route mappings", () => {
  assert.deepEqual(checkIntelligenceReleaseParity(fixture()), { ok: true, expectedVersion: "44", errors: [] });
});
test("rejects staggered alias rollout that risks mismatched Next.js assets", () => {
  const f = fixture(); f.aliases.Aliases[0].FunctionVersion = "43";
  assert.equal(checkIntelligenceReleaseParity(f).ok, false);
});
test("rejects weakening protected catch-all authorisation", () => {
  const f = fixture(); f.routes.Items.find(x => x.RouteKey === "ANY /{proxy+}").AuthorizationType = "NONE";
  assert.equal(checkIntelligenceReleaseParity(f).ok, false);
});
test("rejects swapping a public asset route to the wrong application alias", () => {
  const f = fixture(); f.integrations.Items[1].IntegrationUri = uri("private-acceptance");
  assert.equal(checkIntelligenceReleaseParity(f).ok, false);
});
test("rejects missing route or missing alias", () => {
  const f = fixture(); f.routes.Items.pop(); f.aliases.Aliases.shift();
  assert.equal(checkIntelligenceReleaseParity(f).ok, false);
});
test("requires immutable published version, not $LATEST", () => {
  assert.throws(() => checkIntelligenceReleaseParity({ ...fixture(), expectedVersion: "$LATEST" }));
});
