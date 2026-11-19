#!/usr/bin/env node
// Read-only release gate: never modifies aliases, routes or customer access.
// Generate snapshots using AWS CLI in eu-north-1:
// aws lambda list-aliases --function-name novapharm-intelligence-private-terminal-candidate > aliases.json
// aws apigatewayv2 get-routes --api-id q2e6ztf8ic > routes.json
// aws apigatewayv2 get-integrations --api-id q2e6ztf8ic > integrations.json
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const FUNCTION = "novapharm-intelligence-private-terminal-candidate";
export const API_ID = "q2e6ztf8ic";
const REQUIRED_ALIASES = ["customer-identity-candidate", "private-acceptance"];
const REQUIRED_PUBLIC_ROUTES = [
  "GET /", "GET /_next/static/{proxy+}", "GET /assets/{proxy+}",
  "GET /healthz", "GET /auth/customer/start", "GET /auth/callback"
];
const PRIVATE_ROUTE = "ANY /{proxy+}";

export function checkIntelligenceReleaseParity({ aliases, routes, integrations, expectedVersion }) {
  assert.match(String(expectedVersion), /^[1-9][0-9]*$/, "Expected published numeric Lambda version is required");
  assert.ok(Array.isArray(aliases?.Aliases) && Array.isArray(routes?.Items) && Array.isArray(integrations?.Items),
    "Complete AWS ListAliases/GetRoutes/GetIntegrations JSON snapshots are required");
  const selected = new Map(aliases.Aliases.map(x => [x.Name, x.FunctionVersion]));
  const errors = [];
  for (const alias of REQUIRED_ALIASES) {
    if (selected.get(alias) !== String(expectedVersion)) {
      errors.push(`${alias}: expected ${expectedVersion}, observed ${selected.get(alias) ?? "missing"}`);
    }
  }
  const integrationById = new Map(integrations.Items.map(x => [x.IntegrationId, x.IntegrationUri]));
  const routeByKey = new Map(routes.Items.map(x => [x.RouteKey, x]));
  for (const key of REQUIRED_PUBLIC_ROUTES) {
    const route = routeByKey.get(key);
    if (!route) { errors.push(`Missing required public route ${key}`); continue; }
    if (route.AuthorizationType !== "NONE") {
      errors.push(`${key}: expected public bootstrap/asset route authorization NONE`);
    }
    const uri = integrationById.get((route.Target ?? "").replace(/^integrations\//, ""));
    if (uri !== `arn:aws:lambda:eu-north-1:250675045172:function:${FUNCTION}:${key === "GET /healthz" ? "private-acceptance" : "customer-identity-candidate"}`) {
      errors.push(`${key}: unexpected Lambda alias integration`);
    }
  }
  const privateRoute = routeByKey.get(PRIVATE_ROUTE);
  if (!privateRoute || privateRoute.AuthorizationType !== "AWS_IAM") {
    errors.push("Protected ANY /{proxy+} must preserve AWS_IAM authorization");
  }
  const privateUri = integrationById.get((privateRoute?.Target ?? "").replace(/^integrations\//, ""));
  if (privateUri !== `arn:aws:lambda:eu-north-1:250675045172:function:${FUNCTION}:private-acceptance`) {
    errors.push("Protected catch-all must use the private-acceptance alias");
  }
  return { ok: errors.length === 0, expectedVersion: String(expectedVersion), errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(2).map(x => {
    const [key, value] = x.split("=", 2);
    return [key, value];
  }));
  for (const key of ["--aliases", "--routes", "--integrations", "--expected-version"]) {
    if (!args[key]) throw new Error(`Missing ${key}=... argument`);
  }
  const result = checkIntelligenceReleaseParity({
    aliases: JSON.parse(readFileSync(args["--aliases"], "utf8")),
    routes: JSON.parse(readFileSync(args["--routes"], "utf8")),
    integrations: JSON.parse(readFileSync(args["--integrations"], "utf8")),
    expectedVersion: args["--expected-version"]
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
