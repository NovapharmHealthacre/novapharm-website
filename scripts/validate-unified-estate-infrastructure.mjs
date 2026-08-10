import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

let templatePath = process.argv[2];
let parameterPath = process.argv[3];
let temporaryRoot;

function compileBicep(command, input, output, environment) {
  const standaloneBicep = process.env.BICEP_CLI?.trim();
  const executable = standaloneBicep || "az";
  const args = standaloneBicep
    ? [command, input, "--outfile", output]
    : ["bicep", command, "--file", input, "--outfile", output];
  execFileSync(executable, args, { env: environment, stdio: "inherit" });
}

if (!templatePath) {
  temporaryRoot = mkdtempSync(join(tmpdir(), "novapharm-unified-iac-"));
  templatePath = join(temporaryRoot, "unified-estate.json");
  parameterPath = join(temporaryRoot, "unified-production.json");
  const validationEnvironment = {
    ...process.env,
    AZURE_SQL_ENTRA_ADMIN_OBJECT_ID: "11111111-1111-1111-1111-111111111111",
    AZURE_SQL_ENTRA_ADMIN_LOGIN: "novapharm-static-validation-admin",
    AZURE_TENANT_ID: "00000000-0000-0000-0000-000000000000",
  };
  compileBicep("build", resolve("infra/unified-estate.bicep"), templatePath, validationEnvironment);
  compileBicep("build-params", resolve("infra/environments/unified-production.bicepparam"), parameterPath, validationEnvironment);
  process.on("exit", () => rmSync(temporaryRoot, { recursive: true, force: true }));
}

const template = JSON.parse(await fs.readFile(templatePath, "utf8"));
const parameters = parameterPath ? JSON.parse(await fs.readFile(parameterPath, "utf8")) : null;
const resources = template.resources ?? [];

const resourceType = (type) => resources.filter((resource) => resource.type === type);
const deployments = new Map(resourceType("Microsoft.Resources/deployments").map((deployment) => [deployment.name, deployment]));
const expectedApplications = ["corporate", "technology", "founder", "portal", "api", "status"];
const expectedDeployments = [
  "data-platform",
  "front-door-core",
  ...expectedApplications.flatMap((name) => [`${name}-application`, `${name}-edge`]),
];

assert.equal(resourceType("Microsoft.Web/serverfarms").length, 2, "The estate must use separate public and secure App Service plans.");
assert.deepEqual(
  [...deployments.keys()].sort(),
  expectedDeployments.sort(),
  "The compiled estate must contain data, edge core, six isolated application modules and six isolated edge routes.",
);
assert.equal(resourceType("Microsoft.Authorization/roleAssignments").length, 6, "Only portal/API Key Vault and API Blob assignments are expected for production and candidate identities.");

const dataDeployment = deployments.get("data-platform");
assert.ok(dataDeployment, "The data-platform deployment is missing.");
const dataResources = dataDeployment.properties.template.resources;
const oneDataResource = (type) => {
  const matches = dataResources.filter((resource) => resource.type === type);
  assert.equal(matches.length, 1, `Expected one ${type} resource.`);
  return matches[0];
};

const storage = oneDataResource("Microsoft.Storage/storageAccounts");
assert.equal(storage.properties.allowBlobPublicAccess, false, "Public Blob access must be disabled.");
assert.equal(storage.properties.allowSharedKeyAccess, false, "Storage shared-key access must be disabled.");
assert.equal(storage.properties.defaultToOAuthAuthentication, true, "Storage must default to Microsoft Entra authentication.");
assert.equal(storage.properties.minimumTlsVersion, "TLS1_2", "Storage must require TLS 1.2.");

const sqlServer = oneDataResource("Microsoft.Sql/servers");
assert.equal(sqlServer.properties.administrators.azureADOnlyAuthentication, true, "Azure SQL must use Entra-only administration.");
assert.equal(sqlServer.properties.minimalTlsVersion, "1.2", "Azure SQL must require TLS 1.2.");

const vaults = dataResources.filter((resource) => resource.type === "Microsoft.KeyVault/vaults");
assert.equal(vaults.length, 2, "Portal and API secrets must use separate Key Vault boundaries.");
for (const vault of vaults) {
  assert.equal(vault.properties.enableRbacAuthorization, true, "Key Vault must use Azure RBAC.");
  assert.equal(vault.properties.enablePurgeProtection, true, "Key Vault purge protection must be enabled.");
  assert.equal(vault.properties.enableSoftDelete, true, "Key Vault soft deletion must be enabled.");
}

assert.equal(dataResources.filter((resource) => resource.type === "Microsoft.Network/privateEndpoints").length, 4, "Portal Key Vault, API Key Vault, Blob Storage and Azure SQL need separate private endpoints.");
assert.equal(dataResources.filter((resource) => resource.type === "Microsoft.Storage/storageAccounts/blobServices/containers").length, 4, "Production and candidate quarantine/private containers must be declared.");

const edgeCoreDeployment = deployments.get("front-door-core");
assert.ok(edgeCoreDeployment, "The Azure Front Door core deployment is missing.");
const edgeCoreResources = edgeCoreDeployment.properties.template.resources;
const edgeProfile = edgeCoreResources.find((resource) => resource.type === "Microsoft.Cdn/profiles");
const edgeWaf = edgeCoreResources.find((resource) => resource.type === "Microsoft.Network/FrontDoorWebApplicationFirewallPolicies");
const edgeDiagnostics = edgeCoreResources.find((resource) => resource.type === "Microsoft.Insights/diagnosticSettings");
const edgeAlerts = edgeCoreResources.filter((resource) => resource.type === "Microsoft.Insights/scheduledQueryRules");

assert.ok(edgeProfile, "The Front Door profile is missing.");
assert.equal(edgeProfile.sku.name, "Premium_AzureFrontDoor", "The edge must use Azure Front Door Premium.");
assert.equal(edgeProfile.identity.type, "SystemAssigned", "The Front Door profile must use a managed identity.");
assert.ok(edgeWaf, "The Front Door WAF policy is missing.");
assert.equal(edgeWaf.sku.name, "Premium_AzureFrontDoor", "The WAF policy must use the Premium SKU.");
assert.equal(edgeWaf.properties.policySettings.mode, "Prevention", "The WAF must block rather than only detect.");
assert.equal(edgeWaf.properties.policySettings.requestBodyCheck, "Enabled", "The WAF must inspect request bodies.");

const managedRuleSets = edgeWaf.properties.managedRules.managedRuleSets;
assert.ok(managedRuleSets.some((rule) => rule.ruleSetType === "Microsoft_DefaultRuleSet" && rule.ruleSetVersion === "2.2"), "Default Rule Set 2.2 is required.");
assert.ok(managedRuleSets.some((rule) => rule.ruleSetType === "Microsoft_BotManagerRuleSet" && rule.ruleSetVersion === "1.1"), "Bot Manager Rule Set 1.1 is required.");

const customRules = edgeWaf.properties.customRules.rules;
assert.deepEqual(customRules.map((rule) => rule.name).sort(), ["GlobalPerClientRateLimit", "SensitiveWorkflowRateLimit"], "Global and sensitive-workflow edge limits are required.");
assert.ok(customRules.every((rule) => rule.ruleType === "RateLimitRule" && rule.action === "Block"), "Every edge rate-limit rule must block when exceeded.");
const sensitiveRule = customRules.find((rule) => rule.name === "SensitiveWorkflowRateLimit");
assert.ok(sensitiveRule.matchConditions.some((condition) => condition.matchValue.includes("/api/auth/") && condition.matchValue.includes("/api/account-applications")), "The sensitive rule must cover authentication and account applications.");

assert.ok(edgeDiagnostics, "Front Door diagnostics are missing.");
assert.deepEqual(
  edgeDiagnostics.properties.logs.map((log) => log.category).sort(),
  ["FrontDoorAccessLog", "FrontDoorHealthProbeLog", "FrontDoorWebApplicationFirewallLog"].sort(),
  "Front Door access, health-probe and WAF logs must be retained.",
);
assert.equal(edgeAlerts.length, 2, "WAF block and origin-health alerts are required.");

function moduleParameters(name) {
  const deployment = deployments.get(`${name}-application`);
  assert.ok(deployment, `Missing ${name} application module.`);
  return deployment.properties.parameters;
}

function parameterValue(name, parameter) {
  const entry = moduleParameters(name)[parameter];
  assert.ok(entry, `${name} is missing ${parameter}.`);
  return entry.value;
}

for (const app of expectedApplications) {
  const applicationDeployment = deployments.get(`${app}-application`);
  const nestedResources = applicationDeployment.properties.template.resources;
  const siteProperties = applicationDeployment.properties.template.variables.siteProperties;
  const originRestriction = applicationDeployment.properties.template.variables.frontDoorRestrictions;
  const site = nestedResources.find((resource) => resource.type === "Microsoft.Web/sites");
  assert.ok(site, `${app} App Service site is missing.`);
  assert.equal(site.identity.type, "SystemAssigned", `${app} must have its own managed identity.`);
  assert.equal(siteProperties.httpsOnly, true, `${app} must require HTTPS.`);
  assert.equal(siteProperties.siteConfig.linuxFxVersion, "NODE|24-lts", `${app} must run Node 24 LTS.`);
  assert.equal(siteProperties.siteConfig.ftpsState, "Disabled", `${app} must disable FTP/S.`);
  assert.equal(siteProperties.siteConfig.minTlsVersion, "1.2", `${app} must require TLS 1.2.`);
  assert.equal(parameterValue(app, "restrictOriginToFrontDoor"), true, `${app} must reject direct origin traffic.`);
  assert.equal(parameterValue(app, "frontDoorId").startsWith("["), true, `${app} must bind origin access to the deployed Front Door ID.`);
  assert.match(originRestriction, /AzureFrontDoor\.Backend/, `${app} must admit only the Azure Front Door backend service tag.`);
  assert.match(originRestriction, /x-azure-fdid/, `${app} must validate the X-Azure-FDID header.`);
  assert.match(siteProperties.siteConfig.ipSecurityRestrictionsDefaultAction, /'Deny'/, `${app} origin access must default to deny.`);
  assert.equal(siteProperties.siteConfig.scmIpSecurityRestrictionsUseMain, true, `${app} SCM traffic must inherit the origin restriction.`);
  assert.equal(parameterValue(app, "logAnalyticsWorkspaceId").startsWith("["), true, `${app} must send platform diagnostics to Log Analytics.`);
}

for (const app of expectedApplications) {
  const deployment = deployments.get(`${app}-edge`);
  assert.ok(deployment, `Missing ${app} Front Door route module.`);
  const edgeResources = deployment.properties.template.resources;
  const edgeParameters = deployment.properties.parameters;
  const types = (type) => edgeResources.filter((resource) => resource.type === type);
  const productionRoute = types("Microsoft.Cdn/profiles/afdEndpoints/routes").find((resource) => !resource.condition);
  const originGroup = types("Microsoft.Cdn/profiles/originGroups").find((resource) => !resource.condition);
  const securityPolicy = types("Microsoft.Cdn/profiles/securityPolicies")[0];

  assert.equal(edgeParameters.applicationCode.value, app, `${app} edge module has the wrong route code.`);
  assert.equal(edgeParameters.primaryHostName.value.startsWith("["), true, `${app} edge origin must use the generated App Service hostname.`);
  assert.equal(edgeParameters.deployCandidateEndpoint.value, "[parameters('deployCandidateSlots')]", `${app} candidate edge routing must follow slot isolation.`);
  assert.equal(edgeParameters.enableRegionalFailover.value, "[parameters('enableRegionalFailover')]", `${app} failover must remain an explicit deployment decision.`);
  assert.ok(productionRoute, `${app} production route is missing.`);
  assert.equal(productionRoute.properties.forwardingProtocol, "HttpsOnly", `${app} must use HTTPS to the origin.`);
  assert.equal(productionRoute.properties.httpsRedirect, "Enabled", `${app} must redirect edge HTTP traffic to HTTPS.`);
  assert.equal(originGroup.properties.healthProbeSettings.probeProtocol, "Https", `${app} health probes must use HTTPS.`);
  assert.ok(securityPolicy, `${app} WAF association is missing.`);
  assert.match(JSON.stringify(securityPolicy.properties), /WebApplicationFirewall/, `${app} must attach the WAF policy.`);
  assert.equal(types("Microsoft.Cdn/profiles/afdEndpoints").length, 2, `${app} must declare production and candidate endpoints.`);
  assert.equal(types("Microsoft.Cdn/profiles/originGroups/origins").length, 3, `${app} must declare primary, optional secondary and candidate origins.`);

  const managedDomains = types("Microsoft.Cdn/profiles/customDomains");
  assert.ok(managedDomains.length >= 1, `${app} must declare its managed custom domain.`);
  for (const domain of managedDomains) {
    assert.equal(domain.properties.tlsSettings.certificateType, "ManagedCertificate", `${app} must use an Azure-managed edge certificate.`);
    assert.equal(domain.properties.tlsSettings.minimumTlsVersion, "TLS12", `${app} edge TLS must require TLS 1.2.`);
  }
}

const publicApps = ["corporate", "technology", "founder", "status"];
for (const app of publicApps) {
  const settings = JSON.stringify(parameterValue(app, "appSettings"));
  assert.doesNotMatch(settings, /SESSION_SECRET|PORTAL_GATEWAY_SECRET|ENTRA_CLIENT_SECRET|RESEND_API_KEY/, `${app} must not receive confidential application secrets.`);
  assert.equal(moduleParameters(app).virtualNetworkSubnetId, undefined, `${app} must not inherit secure data-plane network access.`);
}

const portalSettings = JSON.stringify(parameterValue("portal", "appSettings"));
assert.match(portalSettings, /PORTAL_GATEWAY_SECRET/, "The portal must receive the private gateway signing secret.");
assert.match(portalSettings, /portalKeyVaultName/, "The portal must resolve secrets only from its own vault.");
assert.doesNotMatch(portalSettings, /AZURE_SQL_|AZURE_STORAGE_/, "The portal must not receive database or Blob Storage access settings.");
assert.ok(moduleParameters("portal").enableEntraAuthentication, "The portal module must expose App Service Authentication configuration.");

const apiSettings = JSON.stringify(parameterValue("api", "appSettings"));
for (const setting of ["PORTAL_GATEWAY_SECRET", "SESSION_SECRET", "AZURE_SQL_SERVER", "AZURE_SQL_DATABASE", "AZURE_STORAGE_ACCOUNT_NAME", "DOCUMENT_STORAGE_PROVIDER", "NOVAPHARM_SERVER_MODE"]) {
  assert.match(apiSettings, new RegExp(setting), `The API deployment contract is missing ${setting}.`);
}
assert.match(apiSettings, /api-only/, "The API package must run in API-only mode.");
assert.match(apiSettings, /apiKeyVaultName/, "The API must resolve secrets only from its own vault.");
assert.equal(parameterValue("portal", "virtualNetworkSubnetId").startsWith("["), true, "The portal must use the secure integration subnet for Key Vault resolution.");
assert.equal(parameterValue("api", "virtualNetworkSubnetId").startsWith("["), true, "The API must use the secure data-plane integration subnet.");

const serialized = JSON.stringify(template);
for (const secretSetting of ["SESSION_SECRET", "PORTAL_GATEWAY_SECRET", "ENTRA_CLIENT_SECRET", "RESEND_API_KEY", "BOOTSTRAP_ADMIN_PASSWORD"]) {
  const literalPattern = new RegExp(`\\"${secretSetting}\\"\\s*:\\s*\\{?\\s*\\"value\\"\\s*:\\s*\\"(?!\\[|@Microsoft\\.KeyVault|\\")`, "i");
  assert.doesNotMatch(serialized, literalPattern, `${secretSetting} must never contain a literal secret value.`);
}
assert.doesNotMatch(serialized, /PORTAL_PASSWORD/, "Plaintext PORTAL_PASSWORD is prohibited.");

assert.deepEqual(Object.keys(template.outputs.applications.value).sort(), expectedApplications.sort(), "Application outputs must expose all six deployment targets.");
assert.deepEqual(Object.keys(template.outputs.edge.value.applications).sort(), expectedApplications.sort(), "Edge outputs must expose all six deployment targets.");

if (parameters) {
  const values = parameters.parameters ?? {};
  assert.equal(values.environmentCode?.value, "prod", "The supplied production parameter artifact must target prod.");
  assert.equal(values.deployCandidateSlots?.value, true, "Production must deploy candidate slots.");
  assert.equal(values.enableEdgeCustomDomains?.value, true, "Production must declare managed Front Door custom domains.");
  assert.equal(values.enableRegionalFailover?.value, false, "Regional failover must remain disabled until a second accepted region exists.");
  assert.equal(values.enablePrivateNetworking?.value, true, "Production must retain private data-plane networking.");
  assert.equal(values.sqlAutoPauseDelay?.value, -1, "The paid production database must not auto-pause.");
  assert.equal(values.corporateOrigin?.value, "https://novapharmhealthcare.com", "The corporate canonical origin is incorrect.");
  assert.equal(values.portalOrigin?.value, "https://portal.novapharmhealthcare.com", "The portal production origin is incorrect.");
  assert.equal(values.apiOrigin?.value, "https://api.novapharmhealthcare.com", "The API production origin is incorrect.");
}

console.log("Unified Azure estate contract validated: six isolated apps, Front Door Premium/WAF, origin lockdown, candidate routes, private data plane and least-privilege identities.");
