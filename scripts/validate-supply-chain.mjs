import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function validateWorkflowPins() {
  const workflowRoot = join(root, ".github", "workflows");
  const workflowFiles = readdirSync(workflowRoot)
    .filter((file) => /[.]ya?ml$/i.test(file))
    .sort();
  const mutable = [];
  let remoteActionCount = 0;

  for (const file of workflowFiles) {
    const source = readFileSync(join(workflowRoot, file), "utf8");
    for (const match of source.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/gmu)) {
      const reference = match[1];
      if (reference.startsWith("./") || reference.startsWith("docker://")) continue;
      remoteActionCount += 1;
      const separator = reference.lastIndexOf("@");
      const revision = separator >= 0 ? reference.slice(separator + 1) : "";
      if (!/^[a-f0-9]{40}$/u.test(revision)) mutable.push(`${file}:${reference}`);
    }
  }

  assert.ok(remoteActionCount > 0, "No third-party workflow actions were discovered.");
  assert.deepEqual(mutable, [], `Mutable GitHub Action references found: ${mutable.join(", ")}`);
  return { workflowFiles: workflowFiles.length, remoteActionCount };
}

function validateLicences() {
  const lock = readJson("package-lock.json");
  const policy = readJson("config/dependency-license-policy.json");
  const allowed = new Set(policy.allowedExpressions);
  const reviewed = [];
  const violations = [];

  for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
    if (!packagePath.startsWith("node_modules/") || packagePath.startsWith("node_modules/@novapharm/")) continue;
    const licence = String(metadata.license ?? "").trim();
    if (!licence || !allowed.has(licence)) violations.push(`${packagePath}:${licence || "missing"}`);
    else reviewed.push({ packagePath, licence });
  }

  assert.ok(reviewed.length > 0, "No third-party lockfile packages were reviewed.");
  assert.deepEqual(violations, [], `Unapproved or missing dependency licences: ${violations.join(", ")}`);
  return {
    packages: reviewed.length,
    expressions: [...new Set(reviewed.map((entry) => entry.licence))].sort(),
  };
}

function validateDependencyBuildScripts() {
  const policy = readJson("config/dependency-build-script-policy.json");
  assert.equal(policy.schemaVersion, "1.0.0", "Dependency build-script policy schema is unsupported.");
  assert.ok(Array.isArray(policy.approvedPackages), "Dependency build-script policy must contain approvedPackages.");

  const approved = policy.approvedPackages.map((entry) => {
    assert.match(entry.packageName, /^[a-z0-9@/._-]+$/u, "Approved build-script package name is invalid.");
    assert.match(entry.version, /^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/iu, `${entry.packageName} must have an exact approved version.`);
    assert.ok(String(entry.script).trim().length > 0, `${entry.packageName} must name the approved lifecycle script.`);
    assert.ok(String(entry.dependencyPath).trim().length >= 12, `${entry.packageName} must record its dependency path.`);
    assert.ok(String(entry.rationale).trim().length >= 40, `${entry.packageName} must record a substantive approval rationale.`);
    return { packageName: entry.packageName, version: entry.version };
  });
  const approvedNames = approved.map((entry) => entry.packageName);
  assert.equal(new Set(approvedNames).size, approvedNames.length, "Dependency build-script policy contains duplicate packages.");
  assert.deepEqual(approvedNames, [...approvedNames].sort(), "Dependency build-script approvals must remain alphabetically ordered.");

  const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  const block = workspace.match(/^onlyBuiltDependencies:\n((?:  - "[^"]+"\n?)+)/mu);
  assert.ok(block, "pnpm-workspace.yaml must contain a bounded onlyBuiltDependencies allowlist.");
  const workspaceNames = [...block[1].matchAll(/^  - "([^"]+)"$/gmu)].map((match) => match[1]);
  assert.deepEqual(workspaceNames, approvedNames, "pnpm lifecycle-script allowlist differs from the governed policy.");

  const lockfile = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
  for (const entry of approved) {
    assert.ok(
      lockfile.includes(`  ${entry.packageName}@${entry.version}:`),
      `${entry.packageName}@${entry.version} is approved for lifecycle scripts but absent from the pnpm lockfile.`,
    );
  }
  return { approvedPackages: approved.length };
}

function validateReleaseGovernance() {
  const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /^# Changelog$/mu);
  assert.match(changelog, /^## \[Unreleased\]$/mu);

  const config = readJson(".changeset/config.json");
  assert.equal(config.baseBranch, "main");
  assert.equal(config.commit, false);

  const workspaceNames = new Set();
  for (const family of ["apps", "packages"]) {
    for (const directory of readdirSync(join(root, family), { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const packagePath = join(root, family, directory.name, "package.json");
      try { workspaceNames.add(JSON.parse(readFileSync(packagePath, "utf8")).name); }
      catch { /* A non-package directory is outside changeset scope. */ }
    }
  }

  const changesets = readdirSync(join(root, ".changeset"))
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort();
  assert.ok(changesets.length > 0, "At least one reviewed changeset is required.");
  for (const file of changesets) {
    const source = readFileSync(join(root, ".changeset", file), "utf8");
    const frontmatter = source.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/u);
    assert.ok(frontmatter, `${file} must contain changeset frontmatter and release notes.`);
    const packages = [...frontmatter[1].matchAll(/^"([^"]+)":\s*(patch|minor|major)$/gmu)];
    assert.ok(packages.length > 0, `${file} does not identify an affected workspace package.`);
    for (const [, packageName] of packages) assert.ok(workspaceNames.has(packageName), `${file} names unknown package ${packageName}.`);
    assert.ok(frontmatter[2].trim().length >= 40, `${file} release note is too short to support review.`);
  }
  return { changesets: changesets.length, workspacePackages: workspaceNames.size };
}

const workflow = validateWorkflowPins();
const licences = validateLicences();
const buildScripts = validateDependencyBuildScripts();
const release = validateReleaseGovernance();
console.log(`Supply-chain governance validated: ${workflow.remoteActionCount} immutable action references across ${workflow.workflowFiles} workflows, ${licences.packages} dependency licence records (${licences.expressions.length} approved expressions), ${buildScripts.approvedPackages} approved dependency build scripts, and ${release.changesets} changeset across ${release.workspacePackages} workspace packages.`);
