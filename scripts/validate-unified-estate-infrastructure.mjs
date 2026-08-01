import assert from "node:assert/strict";
import fs from "node:fs/promises";

const templatePath = process.argv[2];
assert.ok(templatePath, "Usage: node scripts/validate-unified-estate-infrastructure.mjs <compiled-template.json> [production-parameters.json]");

const template = JSON.parse(await fs.readFile(templatePath, "utf8"));
const parameters = process.argv[3] ? JSON.parse(await fs.readFile(process.argv[3], "utf8")) : null;
const resources = template.resources ?? [];

const resourceType = (type) => resources.filter((resource) => resource.type === type);
const deployments = new Map(resourceType("Microsoft.Resources/deployments").map((deployment) => [deployment.name, deployment]));
const expectedApplications = ["corporate", "technology", "founder", "portal", "api", "status"];

assert.equal(resourceType("Microsoft.Web/serverfarms").length, 2, "The estate must use separate public and secure App Service plans.");
assert.deepEqual(
  [...deployments.keys()].sort(),
  ["data-platform", ...expectedApplications.map((name) => `${name}-application`)].sort(),
  "The compiled estate must contain one data module and six isolated application modules.",
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
  const nestedResources = deployments.get(`${app}-application`).properties.template.resources;
  const siteProperties = deployments.get(`${app}-application`).properties.template.variables.siteProperties;
  const site = nestedResources.find((resource) => resource.type === "Microsoft.Web/sites");
  assert.ok(site, `${app} App Service site is missing.`);
  assert.equal(site.identity.type, "SystemAssigned", `${app} must have its own managed identity.`);
  assert.equal(siteProperties.httpsOnly, true, `${app} must require HTTPS.`);
  assert.equal(siteProperties.siteConfig.linuxFxVersion, "NODE|24-lts", `${app} must run Node 24 LTS.`);
  assert.equal(siteProperties.siteConfig.ftpsState, "Disabled", `${app} must disable FTP/S.`);
  assert.equal(siteProperties.siteConfig.minTlsVersion, "1.2", `${app} must require TLS 1.2.`);
  assert.equal(parameterValue(app, "logAnalyticsWorkspaceId").startsWith("["), true, `${app} must send platform diagnostics to Log Analytics.`);
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

if (parameters) {
  const values = parameters.parameters ?? {};
  assert.equal(values.environmentCode?.value, "prod", "The supplied production parameter artifact must target prod.");
  assert.equal(values.deployCandidateSlots?.value, true, "Production must deploy candidate slots.");
  assert.equal(values.enablePrivateNetworking?.value, true, "Production must retain private data-plane networking.");
  assert.equal(values.sqlAutoPauseDelay?.value, -1, "The paid production database must not auto-pause.");
  assert.equal(values.corporateOrigin?.value, "https://novapharmhealthcare.com", "The corporate canonical origin is incorrect.");
  assert.equal(values.portalOrigin?.value, "https://portal.novapharmhealthcare.com", "The portal production origin is incorrect.");
  assert.equal(values.apiOrigin?.value, "https://api.novapharmhealthcare.com", "The API production origin is incorrect.");
}

console.log("Unified Azure estate contract validated: six isolated apps, two plans, private data plane and least-privilege identities.");
