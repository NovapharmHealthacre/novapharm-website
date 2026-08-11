import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = async (path) => readFile(resolve(path), "utf8");
const readme = await read("README.md");
const mandate = JSON.parse(await read("docs/programme/absolute-mandate-register.json"));
const amendments = JSON.parse(await read("docs/programme/binding-mandate-amendments.json"));
const catalog = JSON.parse(await read("packages/portal-contracts/src/module-catalog.json"));
const deploymentGuide = await read("deployment/deployment-guide.md");
const environmentRegister = await read("deployment/environment-variables.md");
const ci = await read(".github/workflows/ci.yml");
const packageJson = JSON.parse(await read("package.json"));
const packageLock = JSON.parse(await read("package-lock.json"));
const pnpmWorkspace = await read("pnpm-workspace.yaml");

assert.equal(mandate.metadata.governed_section_count, 122);
assert.equal(mandate.metadata.current_release_state, "R1 PUBLIC RELEASE VERIFIED");
assert.equal(mandate.metadata.production_complete, false);
assert.equal(amendments.metadata.current_release_state, mandate.metadata.current_release_state);
assert.equal(amendments.metadata.production_complete, false);
assert.equal(catalog.length, 54);

for (const required of [
  /R1 PUBLIC RELEASE VERIFIED/u,
  /GitHub Pages remains the verified public fallback/u,
  /six independently packaged applications/u,
  /47 modules currently have visible repository-authored runtime paths/u,
  /7 Executive modules remain deliberately \*\*hidden for safety \/ dependency-gated\*\*/u,
  /Azure SQL using managed identity/u,
  /private Azure Blob storage/u,
  /SharePoint is a separately gated integration/u,
  /infra\/unified-estate\.bicep/u,
  /Production slot promotion, Front Door\/custom-domain activation, DNS changes and GitHub Pages retirement remain separate owner-controlled actions/u,
  /Sections 0 through 121 \(122 numbered obligations\)/u,
  /5,900 source requirements/u,
  /Repository implementation and green CI do \*\*not\*\* mean managed staging or production has been accepted/u,
]) {
  assert.match(readme, required, `README is missing current-estate truth: ${required}`);
}

for (const obsolete of [
  /canonical database uses Node's built-in SQLite module/iu,
  /`render\.yaml` defines the initial single-instance Node deployment/iu,
  /public site and API must share `https:\/\/novapharmhealthcare\.com`/iu,
  /sync-secure-content\.mjs` hydrates them from SharePoint into `SECURE_CONTENT_ROOT` at startup/iu,
  /Executive Platform files are never committed/iu,
]) {
  assert.doesNotMatch(readme, obsolete, `README reintroduced obsolete architecture: ${obsolete}`);
}

assert.match(deploymentGuide, /Azure is the accepted target/iu);
assert.match(deploymentGuide, /former Render\/SQLite deployment path is retired/iu);
assert.match(environmentRegister, /infra\/unified-estate\.bicep/u);
assert.match(environmentRegister, /DATABASE_PROVIDER` \| `azure-sql`/u);
assert.match(environmentRegister, /DOCUMENT_STORAGE_PROVIDER` \| `azure-blob`/u);
assert.match(environmentRegister, /Sites\.Selected/u);

assert.equal(packageJson.packageManager, "pnpm@11.9.0", "README package-manager wording must reflect the declared developer/workspace tool");
assert.equal(packageLock.lockfileVersion, 3);
assert.match(ci, /cache: npm/u);
assert.match(ci, /npm ci --ignore-scripts/u);
assert.match(ci, /npm audit --omit=dev --audit-level=high/u);
assert.match(pnpmWorkspace, /linkWorkspacePackages: true/u);
assert.match(pnpmWorkspace, /minimumReleaseAge:/u);
assert.match(pnpmWorkspace, /onlyBuiltDependencies:/u);
assert.match(readme, /release\/CI dependency authority is npm and `package-lock\.json`/u);
assert.match(readme, /retains `pnpm-lock\.yaml` and `pnpm-workspace\.yaml` for workspace-linking and dependency-policy controls/u);

const referencedAuthorities = [
  "docs/programme/absolute-mandate-register.json",
  "docs/programme/binding-mandate-amendments.json",
  "docs/programme/requirements/requirements-matrix.json",
  "docs/programme/azure-unified-estate-acceptance.md",
  "docs/programme/sops/README.md",
  "docs/programme/sops/sop-register.json",
  "docs/programme/sops/evidence-contract.json",
  "packages/portal-contracts/src/module-catalog.json",
  "packages/portal-contracts/src/activation.ts",
  "packages/portal-contracts/src/database-authority.ts",
  "deployment/deployment-guide.md",
  "deployment/deployment-runbook.md",
  "deployment/rollback-guide.md",
  "deployment/backup-and-restore-runbook.md",
  "deployment/environment-variables.md",
  "infra/unified-estate.bicep",
  "package-lock.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
];
for (const authority of referencedAuthorities) await access(resolve(authority));

console.log(JSON.stringify({
  currentReleaseState: mandate.metadata.current_release_state,
  governedSections: mandate.metadata.governed_section_count,
  governedPortalModules: catalog.length,
  managedProductionClaimed: false,
  canonicalManagedDatabase: "Azure SQL",
  canonicalManagedDocuments: "private Azure Blob",
  ciPackageAuthority: "npm/package-lock.json",
  workspacePolicySurface: "pnpm/pnpm-lock.yaml/pnpm-workspace.yaml",
  referencedAuthorities: referencedAuthorities.length,
}, null, 2));