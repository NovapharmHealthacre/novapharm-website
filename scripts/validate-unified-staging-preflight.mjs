import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const stagingParameters = await readFile(resolve("infra/environments/unified-staging.bicepparam"), "utf8");
const productionParameters = await readFile(resolve("infra/environments/unified-production.bicepparam"), "utf8");
const deployWorkflow = await readFile(resolve(".github/workflows/azure-deploy.yml"), "utf8");
const acceptance = await readFile(resolve("docs/programme/azure-unified-estate-acceptance.md"), "utf8");

function requires(source, pattern, message) {
  assert.match(source, pattern, message);
}

function forbids(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

requires(stagingParameters, /^using '\.\.\/unified-estate\.bicep'$/mu, "Staging must use the governed unified estate template.");
requires(stagingParameters, /^param environmentCode = 'stg'$/mu, "Staging must use the isolated stg environment code.");
requires(stagingParameters, /^param sqlAutoPauseDelay = 60$/mu, "Staging SQL must retain cost-bounded auto-pause.");
requires(stagingParameters, /^param deployCandidateSlots = false$/mu, "Staging must not create production-style candidate slots.");
requires(stagingParameters, /^param enablePrivateNetworking = true$/mu, "Staging must keep the private data plane enabled.");
requires(stagingParameters, /^param enableEntraAuthentication = bool\(readEnvironmentVariable\('NOVAPHARM_ENABLE_ENTRA_AUTH', 'false'\)\)$/mu, "Staging Entra activation must remain an explicit environment/owner decision.");
requires(stagingParameters, /^param enableDefenderForStorage = bool\(readEnvironmentVariable\('NOVAPHARM_ENABLE_DEFENDER_FOR_STORAGE', 'false'\)\)$/mu, "Defender activation must remain an explicit managed-staging decision.");
requires(stagingParameters, /^param enableBootstrapAdmin = bool\(readEnvironmentVariable\('NOVAPHARM_ENABLE_BOOTSTRAP_ADMIN', 'false'\)\)$/mu, "Bootstrap administration must default off.");
requires(stagingParameters, /^param entraTenantId = readEnvironmentVariable\('AZURE_TENANT_ID'\)$/mu, "Staging must obtain the tenant identifier from the protected environment.");
requires(stagingParameters, /^param sqlEntraAdminObjectId = readEnvironmentVariable\('AZURE_SQL_ENTRA_ADMIN_OBJECT_ID'\)$/mu, "Staging SQL administrator authority must be owner/environment supplied.");
requires(stagingParameters, /^param sqlEntraAdminLogin = readEnvironmentVariable\('AZURE_SQL_ENTRA_ADMIN_LOGIN'\)$/mu, "Staging SQL administrator identity must be owner/environment supplied.");

forbids(stagingParameters, /^param .*Origin = 'https:\/\/(?:novapharmhealthcare\.com|[^']+\.novapharmhealthcare\.com)'$/gmu, "Staging must not bind production canonical origins in its parameter file.");
forbids(stagingParameters, /^param enableEdgeCustomDomains = true$/mu, "Staging must not silently enable production custom-domain cutover.");
forbids(stagingParameters, /^param enableRegionalFailover = true$/mu, "Staging must not claim unaccepted regional failover.");
forbids(stagingParameters, /(?:SESSION_SECRET|PORTAL_GATEWAY_SECRET|ENTRA_CLIENT_SECRET|RESEND_API_KEY)\s*=\s*'[^']+'/u, "Staging parameters must never contain literal application secrets.");

requires(productionParameters, /^param environmentCode = 'prod'$/mu, "Production parameter profile must remain separately identifiable.");
requires(productionParameters, /^param sqlAutoPauseDelay = -1$/mu, "Production SQL must retain its distinct non-auto-pause setting.");
requires(productionParameters, /^param deployCandidateSlots = true$/mu, "Production must retain candidate-slot isolation.");
requires(productionParameters, /^param enableEdgeCustomDomains = true$/mu, "Production custom domains must remain a production-only parameter decision.");

requires(deployWorkflow, /^\s*workflow_dispatch:\s*$/mu, "Unified Azure deployment must remain manually dispatched.");
forbids(deployWorkflow, /^\s*(?:push|pull_request|schedule):\s*$/mu, "Unified Azure deployment must not gain automatic push/PR/schedule triggers.");
requires(deployWorkflow, /target:[\s\S]*?- staging[\s\S]*?- production-candidate/u, "Deployment target choices must remain staging or production-candidate only.");
requires(deployWorkflow, /action:[\s\S]*?- what-if[\s\S]*?- provision[\s\S]*?- deploy/u, "Deployment actions must keep what-if separate from provision/deploy.");
requires(deployWorkflow, /expected_sha:[\s\S]*?required:\s*true/u, "Every managed deployment must bind to an exact reviewed SHA.");
requires(deployWorkflow, /environment:\s*\$\{\{ inputs\.target == 'staging' && 'azure-staging' \|\| 'azure-production' \}\}/u, "Staging and production must use separate protected GitHub environments.");
requires(deployWorkflow, /id-token:\s*write/u, "Azure deployment must retain OIDC workload identity permission.");
requires(deployWorkflow, /uses:\s*azure\/login@[0-9a-f]{40}/u, "Azure login action must remain pinned by immutable commit SHA.");
requires(deployWorkflow, /PARAMETER_FILE:\s*\$\{\{ inputs\.target == 'staging' && 'infra\/environments\/unified-staging\.bicepparam' \|\| 'infra\/environments\/unified-production\.bicepparam' \}\}/u, "Staging deployment must use the governed staging parameter file.");
requires(deployWorkflow, /Azure deployment what-if/u, "Every controlled deployment path must retain an Azure what-if step.");
requires(deployWorkflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/u, "Deployment must enforce the reviewed immutable source SHA.");
requires(deployWorkflow, /No DNS, domain binding, slot swap, SharePoint permission or GitHub Pages change was performed\./u, "Deployment evidence must preserve the no-cutover truth boundary.");

requires(acceptance, /Status: repository contract accepted; authenticated Azure what-if reaches provider preflight; provisioning is blocked by App Service quota/iu, "The acceptance pack must state the verified OIDC/preflight boundary and current quota stop condition.");
requires(acceptance, /The following are not complete and must not be inferred from repository acceptance:/iu, "The acceptance pack must explicitly separate repository proof from unresolved managed-environment gates.");
requires(acceptance, /owner portal approval of four UK South App Service workers and successful exact-SHA what-if/iu, "Managed staging must retain the observed provider-capacity gate.");
requires(acceptance, /explicit review of the recurring staging and production cost before provisioning/iu, "Managed staging must remain cost/owner gated.");
requires(acceptance, /Deployment identity[^\n]*separate `azure-staging` and `azure-production` federated credentials/iu, "The acceptance pack must preserve verified OIDC environment separation.");
requires(acceptance, /Entra workforce and External ID registrations, groups, app roles and MFA evidence/iu, "Managed staging must retain real identity acceptance as a named gate.");
requires(acceptance, /Azure SQL contained users, migration, reconciliation, backup and isolated restore/iu, "Managed staging must retain isolated restore evidence as a gate.");
requires(acceptance, /Graph `Sites.Selected` consent and owner-approved SharePoint permissions/iu, "Managed staging must retain least-privilege Microsoft Graph acceptance.");
requires(acceptance, /managed staging visual, security, accessibility, performance and penetration acceptance/iu, "Managed staging must retain non-functional acceptance gates.");
requires(acceptance, /Existing GitHub Pages deployment remains the public rollback until owner-approved managed cutover acceptance/iu, "The acceptance pack must preserve the fail-closed public rollback until managed cutover is accepted.");
requires(acceptance, /Repository acceptance is not production completion\./iu, "Repository acceptance must never be represented as production completion.");

console.log(JSON.stringify({
  target: "managed-staging-repository-preflight",
  environmentCode: "stg",
  sqlAutoPauseDelayMinutes: 60,
  candidateSlots: false,
  privateNetworking: true,
  automaticDeploymentTriggers: false,
  exactShaRequired: true,
  oidcRequired: true,
  whatIfRequired: true,
  managedEnvironmentAcceptancePending: true,
  productionCutoverPerformed: false,
  currentReleaseState: "R1 PUBLIC RELEASE VERIFIED",
}, null, 2));
