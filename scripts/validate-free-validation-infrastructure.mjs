import { readFileSync } from "node:fs";

const [dataPath, appPath] = process.argv.slice(2);
if (!dataPath || !appPath) {
  throw new Error("Usage: node scripts/validate-free-validation-infrastructure.mjs <data-template.json> <app-template.json>");
}

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const app = JSON.parse(readFileSync(appPath, "utf8"));
const resources = [...(data.resources || []), ...(app.resources || [])];

function resource(type) {
  const match = resources.find((entry) => entry.type === type);
  if (!match) throw new Error(`Required free-validation resource ${type} is missing.`);
  return match;
}

const database = resource("Microsoft.Sql/servers/databases");
if (database.properties?.useFreeLimit !== true) throw new Error("Azure SQL useFreeLimit must be true.");
if (database.properties?.freeLimitExhaustionBehavior !== "AutoPause") {
  throw new Error("Azure SQL must auto-pause when the monthly free limit is exhausted.");
}
if (Number(database.properties?.maxSizeBytes) > 34359738368) throw new Error("Azure SQL exceeds the 32 GB free-offer limit.");
if (database.sku?.tier !== "GeneralPurpose" || !String(database.sku?.name || "").startsWith("GP_S_")) {
  throw new Error("Azure SQL must use General Purpose serverless compute.");
}

const plan = resource("Microsoft.Web/serverfarms");
if (plan.sku?.name !== "F1" || plan.sku?.tier !== "Free" || Number(plan.sku?.capacity) !== 1) {
  throw new Error("Free validation must use exactly one App Service F1 worker.");
}

const webApp = resource("Microsoft.Web/sites");
if (webApp.properties?.siteConfig?.alwaysOn !== false) throw new Error("Always On must remain disabled on F1.");
if (webApp.properties?.siteConfig?.linuxFxVersion !== "NODE|24-lts") throw new Error("The free-validation app must target Node 24 LTS.");
if (webApp.properties?.httpsOnly !== true) throw new Error("The free-validation app must require HTTPS.");

const storage = resource("Microsoft.Storage/storageAccounts");
if (storage.sku?.name !== "Standard_LRS") throw new Error("Validation Blob storage must use Standard_LRS.");
if (storage.properties?.allowBlobPublicAccess !== false || storage.properties?.allowSharedKeyAccess !== false) {
  throw new Error("Validation Blob storage must disable public Blob access and shared-key authentication.");
}

const approvedTypes = new Set([
  "Microsoft.Authorization/roleAssignments",
  "Microsoft.Insights/actionGroups",
  "Microsoft.Insights/metricAlerts",
  "Microsoft.KeyVault/vaults",
  "Microsoft.Sql/servers",
  "Microsoft.Sql/servers/databases",
  "Microsoft.Sql/servers/firewallRules",
  "Microsoft.Storage/storageAccounts",
  "Microsoft.Storage/storageAccounts/blobServices",
  "Microsoft.Storage/storageAccounts/blobServices/containers",
  "Microsoft.Storage/storageAccounts/managementPolicies",
  "Microsoft.Web/serverfarms",
  "Microsoft.Web/sites",
  "Microsoft.Web/sites/config"
]);
const unapproved = resources.filter((entry) => !approvedTypes.has(entry.type));
if (unapproved.length) {
  throw new Error(`Unapproved free-validation resource types: ${[...new Set(unapproved.map((entry) => entry.type))].join(", ")}`);
}

if (app.parameters?.deployKeyVault?.defaultValue !== false) {
  throw new Error("Optional Key Vault deployment must remain disabled by default.");
}

const appSettings = app.variables?.baseAppSettings || {};
const compiledSettings = JSON.stringify(appSettings);
for (const forbiddenSetting of ["PORTAL_PASSWORD", "MICROSOFT_CLIENT_SECRET", "RESEND_API_KEY"]) {
  if (compiledSettings.includes(`\"${forbiddenSetting}\"`)) throw new Error(`${forbiddenSetting} must not be embedded in the free-validation template.`);
}
if (appSettings.PREVIEW_MODE !== "true") {
  throw new Error("The free-validation app must set PREVIEW_MODE=true.");
}

console.log("Free-validation infrastructure contract passed: F1, SQL free AutoPause, Standard_LRS private Blob and approved resource allowlist.");
