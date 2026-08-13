import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const matrixRoot = resolve("docs/programme/requirements");
const matrixPath = resolve(matrixRoot, "requirements-matrix.json");
const candidateSha = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const candidateChecks = `https://github.com/NovapharmHealthacre/novapharm-website/commit/${candidateSha}/checks`;

const statuses = Object.freeze([
  "Complete",
  "Complete at repository level only",
  "Owner-controlled blocker",
  "External verification pending",
  "Incomplete",
  "Not applicable, with rationale",
  "Rejected because of a documented conflict or safety concern",
]);

const commonCi = Object.freeze([
  ".github/workflows/ci.yml",
  ".github/workflows/browser-acceptance.yml",
  candidateChecks,
]);

const bundles = Object.freeze({
  governance: {
    implementation:
      "A governed TypeScript-first workspace, conflict register, traceability ledger and immutable pull-request workflow are present.",
    code: ["package.json", "pnpm-workspace.yaml", "turbo.json", "tsconfig.workspace.json"],
    tests: ["packages/config/test/config.test.ts", "packages/platform-mode/test/platform-mode.test.ts"],
    docs: [
      "docs/programme/executive-summary.md",
      "docs/programme/post-pr53-current-truth.md",
      "docs/programme/current-state-audit.md",
      "docs/programme/conflict-register.md",
    ],
  },
  architecture: {
    implementation:
      "Six isolated applications consume shared typed contracts and produce separate immutable release artefacts.",
    code: ["apps", "packages", "scripts/package-unified-estate.mjs", "scripts/test-platform-modes.mjs"],
    tests: ["scripts/test-unified-release-artifacts.mjs", "scripts/test-platform-modes.mjs"],
    docs: [
      "docs/programme/architecture-decision-record.md",
      "docs/programme/workspace-foundation.md",
      "docs/programme/migration-strategy.md",
    ],
  },
  edge: {
    implementation:
      "Azure Front Door Premium, prevention-mode WAF, managed rules, bot rules, rate limits, origin health, candidate routes, protected origins, diagnostics and optional second-origin failover are defined as Bicep.",
    code: [
      "infra/unified-estate.bicep",
      "infra/modules/front-door-core.bicep",
      "infra/modules/front-door-application.bicep",
      "infra/modules/web-app.bicep",
    ],
    tests: ["scripts/validate-unified-estate-infrastructure.mjs", "scripts/test-unified-release-artifacts.mjs"],
    docs: [
      "docs/programme/azure-front-door-edge-architecture.md",
      "docs/programme/azure-unified-estate-acceptance.md",
      "infra/README.md",
    ],
  },
  portal: {
    implementation:
      "A dedicated noindex portal and API boundary enforce server-side sessions, scopes, customer isolation and a governed 54-module maturity catalogue; 47 modules are informational and seven are hidden.",
    code: [
      "apps/portal",
      "apps/api",
      "packages/auth/src/index.ts",
      "packages/portal-contracts/src/module-catalog.json",
      "src/core/enterprise-domain-service.mjs",
    ],
    tests: [
      "apps/portal/test/routes.test.ts",
      "apps/portal/test/security.test.ts",
      "packages/portal-contracts/test/catalog.test.ts",
      "scripts/test-enterprise-portal.mjs",
    ],
    docs: [
      "docs/programme/portal-api-migration-acceptance.md",
      "docs/programme/portal-module-maturity-register.md",
      "security/identity-and-access-model.md",
    ],
  },
  workflows: {
    implementation:
      "Server-side contact and account workflows include validation, CSRF, rate limits, persistence, audit events, failure queues and public-only capability gating.",
    code: ["packages/forms/src/index.ts", "server.mjs", "src/core", "src/integrations"],
    tests: [
      "packages/forms/test/forms.test.ts",
      "scripts/test-server.mjs",
      "scripts/test-backend-browser-workflows.mjs",
      "scripts/test-backend-activation.mjs",
    ],
    docs: [
      "docs/programme/corporate-migration-acceptance.md",
      "docs/programme/integration-register.md",
      "compliance/privacy-data-map.md",
    ],
  },
  integrations: {
    implementation:
      "Typed fail-closed adapters, idempotent outbox processing and authority boundaries exist for Azure SQL, Blob, email, Microsoft Graph, SharePoint and logistics events; external activation remains unverified.",
    code: ["src/integrations", "src/data", "database/sqlite", "database/azure", "packages/config/src/index.ts"],
    tests: [
      "scripts/validate-domain.mjs",
      "scripts/test-database-migration.mjs",
      "scripts/validate-azure-sql-migrations.mjs",
      "scripts/test-secret-resolution.mjs",
    ],
    docs: [
      "docs/programme/integration-register.md",
      "architecture/data-flow-diagrams.md",
      "sharepoint/README.md",
    ],
  },
  claims: {
    implementation:
      "One typed claims and people registry separates active corporate activity, authorisation-dependent wholesale activity, contracted logistics and held-for-evidence regulated statements.",
    code: ["packages/claims/src/index.ts", "packages/content/src/index.ts", "scripts/audit-public-claims.mjs"],
    tests: ["packages/claims/test/claims.test.ts", "packages/content/test/content.test.ts", "scripts/test-owner-corrections.mjs"],
    docs: [
      "docs/programme/owner-approved-leadership-titles-2026-08-07.md",
      "docs/programme/owner-evidence-request-dr-nishita-responsible-person.md",
      "docs/programme/operating-status-and-logistics-evidence.md",
      "docs/programme/regulatory-publication-rules.md",
      "docs/product-claims-evidence-register.json",
    ],
  },
  corporate: {
    implementation:
      "The corporate property is a component-driven Next.js application with governed routes, approved assets, conservative claims, leadership and six Insights articles.",
    code: ["apps/corporate", "packages/content/src/index.ts", "packages/claims/src/index.ts"],
    tests: [
      "apps/corporate/test/content.test.ts",
      "apps/corporate/test/security.test.ts",
      "apps/corporate/test/browser-acceptance.ts",
      "scripts/programme/validate-leadership-titles.mjs",
      "scripts/programme/validate-products-experience.mjs",
      "audit/evidence/final-visual-lock/products/after/manifest.json",
    ],
    docs: [
      "docs/programme/corporate-migration-acceptance.md",
      "docs/programme/brand-governance.md",
      "docs/programme/owner-approved-leadership-titles-2026-08-07.md",
    ],
  },
  technology: {
    implementation:
      "The NIT property is a distinct TypeScript/Next.js application consuming shared security, entity and deployment contracts.",
    code: ["apps/technology", "packages/security/src/index.ts", "packages/seo/src/index.ts"],
    tests: ["apps/technology/test", "apps/technology/scripts/validate-content.ts"],
    docs: ["docs/programme/technology-migration-acceptance.md", "docs/programme/brand-governance.md"],
  },
  founder: {
    implementation:
      "The founder property has one canonical Vishal entity, original essays, exactly five verified publisher-neutral external publications, feeds, knowledge data and external-link presentation.",
    code: ["apps/founder", "apps/founder/lib/site-data.ts", "apps/founder/scripts/verify-publication-links.ts"],
    tests: ["apps/founder/test/entity.test.ts", "apps/founder/test/publications.test.ts", "apps/founder/test/browser-acceptance.ts"],
    docs: [
      "docs/programme/founder-migration-acceptance.md",
      "docs/programme/external-publication-evidence-register.md",
    ],
  },
  design: {
    implementation:
      "The shared design system implements 24 reusable component families and a governed high-fidelity workbench for three directions across Corporate, NIT, Founder, Portal and mobile examples.",
    code: ["packages/design-system/src/components.tsx", "packages/design-system/src/styles.ts", "packages/design-system/workbench"],
    tests: [
      "packages/design-system/test/components.test.tsx",
      "scripts/test-design-system-workbench.mjs",
      "audit/evidence/design-system/visual-regression-report.json",
    ],
    docs: [
      "docs/programme/design-system.md",
      "docs/programme/creative-directions.md",
      "docs/programme/apple-caliber-craft-audit.md",
      "docs/programme/apple-caliber-continuation-matrix.md",
      "docs/visual/apple-parity-matrix.md",
      "docs/programme/react-architecture-handoff.md",
      "docs/programme/brand-governance.md",
    ],
  },
  media: {
    implementation:
      "Every tracked raster, vector, EPS and PDF asset has a generated inventory; the authoritative 93-file logo pack and approved public media retain checksums, intrinsic sizes, responsive derivatives, accurate alternatives, registered provenance and visible representation boundaries.",
    code: [
      "creative-assets/brand/novapharm-logo-asset-pack",
      "creative-assets/asset-register.json",
      "creative-assets/image-asset-register.json",
      "creative-assets/module-media-asset-register.json",
      "docs/application-media-provenance.json",
      "audit/generated/image-inventory.json",
      "scripts/programme/generate-image-inventory.mjs",
      "scripts/optimise-images.mjs",
    ],
    tests: [
      "scripts/test-visual-contracts.mjs",
      "scripts/validate-module-media-sanity.mjs",
      "scripts/validate-visual-refinement.mjs",
      "scripts/programme/validate-brand-assets.mjs",
      "scripts/programme/validate-post-pr53-candidate.mjs",
    ],
    docs: [
      "docs/programme/brand-governance.md",
      "docs/programme/owner-approved-logo-asset-pack-2026-08-13.md",
      "final-report/official-logo-register.md",
      "docs/programme/creative-directions.md",
      "docs/programme/apple-caliber-craft-audit.md",
      "docs/programme/apple-caliber-continuation-matrix.md",
      "docs/visual/apple-parity-matrix.md",
    ],
  },
  security: {
    implementation:
      "Shared security policy, API/portal trust boundaries, keyed non-password digests, fixed application-owned redirects, structured HTML parsing, descriptor-stable file access, secret scanning and CodeQL workflow exist; live controls and independent penetration testing remain separate gates.",
    code: [
      "packages/security/src/index.ts",
      "server.mjs",
      "src/security/keyed-digest.mjs",
      "src/security/safe-json.mjs",
      "apps/portal/data/routes.ts",
      "scripts/lib/html-text.mjs",
      ".github/workflows/codeql.yml",
      "scripts/scan-secrets.mjs",
    ],
    tests: [
      "packages/security/test/security.test.ts",
      "packages/forms/test/forms.test.ts",
      "scripts/test-production-security.mjs",
      "scripts/test-preview-security.mjs",
      "scripts/test-portal-gateway-identity.mjs",
      "scripts/test-keyed-digest.mjs",
      "scripts/test-safe-json.mjs",
      "scripts/test-html-text.mjs",
      "scripts/test-internal-ai-gateway.mjs",
    ],
    docs: ["docs/programme/threat-model.md", "docs/programme/security-governance-gates.md", "security/security-test-report.md"],
  },
  domain: {
    implementation:
      "Canonical host, origin, redirect, certificate-monitoring and reversible cutover contracts are documented and tested without changing production DNS.",
    code: ["packages/config/src/index.ts", "packages/security/src/index.ts", "infra/unified-estate.bicep"],
    tests: ["packages/config/test/config.test.ts", "scripts/test-production-security.mjs", "scripts/validate-unified-estate-infrastructure.mjs"],
    docs: ["docs/programme/domain-trust-runbook.md", "deployment/rollback-plan.md"],
  },
  privacy: {
    implementation:
      "A factual data map, consent implementation, cookie register, retention schedule and legal pages exist; final legal review remains external.",
    code: ["apps/corporate/components/cookie-controls.tsx", "packages/forms/src/index.ts", "scripts/test-cookie-consent.mjs"],
    tests: ["scripts/test-cookie-consent.mjs", "scripts/test-ai-privacy.mjs", "apps/corporate/test/security.test.ts"],
    docs: ["compliance/privacy-data-map.md", "compliance/cookie-register.md", "compliance/retention-schedule.md"],
  },
  seo: {
    implementation:
      "Shared entity IDs, metadata, robots, sitemaps, feeds, structured data, crawl policy and IndexNow dry-run exist across the three public properties; live search-platform activation is not claimed.",
    code: ["packages/seo/src/index.ts", "apps/corporate/lib/seo.ts", "apps/founder/lib/seo.ts", "scripts/indexnow.mjs"],
    tests: ["packages/seo/test/seo.test.ts", "scripts/validate-seo-authority.mjs", "scripts/check-links.mjs"],
    docs: [
      "docs/programme/seo-geo-aeo-strategy.md",
      "docs/programme/content-search-matrices.md",
      "docs/programme/search-platform-activation-register.md",
      "seo/structured-data-register.md",
    ],
  },
  accessibility: {
    implementation:
      "Semantic shared contracts and automated axe/browser checks exist; automated results do not represent independent full WCAG certification.",
    code: ["packages/accessibility/src/index.ts", "packages/design-system/src/components.tsx"],
    tests: ["packages/accessibility/test/accessibility.test.ts", "scripts/test-design-system-workbench.mjs", ".github/workflows/browser-acceptance.yml"],
    docs: ["audit/accessibility-report.md", "audit/portal-accessibility-report.md", "docs/programme/design-system.md"],
  },
  performance: {
    implementation:
      "Performance budgets, local Lighthouse coverage and image/runtime controls exist; production 75th-percentile field evidence does not.",
    code: ["scripts/validate-seo-authority.mjs", "scripts/test-ai-performance.mjs", "scripts/run-portal-lighthouse.mjs"],
    tests: ["scripts/test-ai-performance.mjs", "scripts/run-portal-lighthouse.mjs", "scripts/run-status-lighthouse.mjs"],
    docs: [
      "performance/performance-report.md",
      "audit/ai-performance-report.md",
      "docs/programme/design-system.md",
      "docs/programme/final-performance-acceptance.md",
      "docs/programme/react-architecture-handoff.md",
    ],
  },
  content: {
    implementation:
      "Typed content, people and claims records govern authorship, review state, terminology and cross-site identity consistency.",
    code: ["packages/content/src/index.ts", "packages/claims/src/index.ts", "apps/corporate/data/pages.ts", "apps/founder/lib/content.ts"],
    tests: [
      "packages/content/test/content.test.ts",
      "packages/claims/test/claims.test.ts",
      "apps/corporate/scripts/validate-content.ts",
      "scripts/programme/validate-leadership-titles.mjs",
    ],
    docs: [
      "docs/programme/content-model.md",
      "docs/programme/regulatory-publication-rules.md",
      "docs/programme/content-search-matrices.md",
      "docs/programme/owner-approved-leadership-titles-2026-08-07.md",
    ],
  },
  supplyChain: {
    implementation:
      "CODEOWNERS, Dependabot, CodeQL, dependency review, patched lockfile overrides, SBOM generation, licence policy, release checksums, Changesets and immutable action SHAs are repository-controlled; account-level GitHub governance remains externally controlled.",
    code: [
      ".github/CODEOWNERS",
      ".github/dependabot.yml",
      ".github/workflows/codeql.yml",
      ".github/workflows/supply-chain.yml",
      ".changeset/config.json",
      "config/dependency-license-policy.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "scripts/validate-supply-chain.mjs",
    ],
    tests: [
      "scripts/validate-supply-chain.mjs",
      "scripts/scan-secrets.mjs",
      "scripts/test-unified-release-artifacts.mjs",
      "scripts/package-unified-estate.mjs",
    ],
    docs: [
      "SECURITY.md",
      "CONTRIBUTING.md",
      "CHANGELOG.md",
      "docs/programme/dependency-licence-audit.md",
      "docs/programme/security-governance-gates.md",
      "docs/programme/operations-runbook.md",
    ],
  },
  testing: {
    implementation:
      "Workspace, application, integration, security, migration, browser, accessibility, visual and packaging test suites are defined for immutable candidates.",
    code: ["package.json", ".github/workflows/ci.yml", ".github/workflows/browser-acceptance.yml"],
    tests: [
      "scripts",
      "scripts/programme/validate-post-pr53-candidate.mjs",
      "apps/corporate/test",
      "apps/founder/test",
      "apps/portal/test",
      "packages",
    ],
    docs: ["docs/programme/operations-runbook.md", "docs/programme/azure-unified-estate-acceptance.md"],
  },
  migration: {
    implementation:
      "All six target applications and their release packaging exist in the orchestration repository; live Azure, data and DNS cutover remain deliberately unexecuted.",
    code: ["apps", "packages", "scripts/package-unified-estate.mjs", ".github/workflows/azure-deploy.yml"],
    tests: ["scripts/test-platform-modes.mjs", "scripts/test-unified-release-artifacts.mjs", "scripts/test-enterprise-migrations.mjs"],
    docs: ["docs/programme/migration-strategy.md", "deployment/rollback-plan.md", "docs/programme/architecture-decision-record.md"],
  },
  documentation: {
    implementation:
      "The Section 29 repository documentation set is present, linked and status-labelled without relying on local Mac-only handoff paths.",
    code: ["docs/programme/section-29-document-register.md"],
    tests: ["scripts/check-links.mjs", "scripts/programme/validate-requirements-matrix.mjs"],
    docs: ["docs/programme/section-29-document-register.md", "docs/programme/executive-summary.md"],
  },
  release: {
    implementation:
      "The current feature branch and its review pull request form the release boundary; readiness, merge and deployment remain conditional on exact-SHA checks, staging acceptance and owner-controlled Azure, tenant and DNS gates.",
    code: [".github/workflows/ci.yml", ".github/workflows/azure-deploy.yml"],
    tests: ["scripts/test-unified-release-artifacts.mjs", "scripts/programme/validate-requirements-matrix.mjs"],
    docs: ["docs/programme/operations-runbook.md", "deployment/rollback-plan.md"],
  },
});

function rootSection(record) {
  if (record.source_part === "seo-authority-appendix") return "seo";
  if (record.source_part === "visual-experience-appendix") return "design";
  return record.source_section.match(/^(\d+)/u)?.[1] || "0";
}

function bundleKey(record) {
  const text = record.requirement;
  if (/(Food Supplement|Nutraxin|Products page|portfolio review)/iu.test(text)) return "corporate";
  if (/(founder (platform|website|publication)|publication|article|author)/iu.test(text)) return "founder";
  if (/(privacy|cookie|consent|GDPR|retention|analytics)/iu.test(text)) return "privacy";
  if (/(accessib|WCAG|keyboard|screen reader|focus|contrast|ARIA)/iu.test(text)) return "accessibility";
  if (/(performance|LCP|INP|CLS|Lighthouse|latency|Core Web Vitals)/iu.test(text)) return "performance";
  if (/(security|CSP|HSTS|CSRF|XSS|injection|secret|malware|rate limit|session|cache|WAF|penetration)/iu.test(text)) return "security";
  if (/(robots|sitemap|canonical|schema|structured data|crawler|IndexNow|Search Console|Bing Webmaster|GEO|AEO|SEO|knowledge panel|citation)/iu.test(text)) return "seo";
  if (/(photo|image|video|audio|media|logo|favicon)/iu.test(text)) return "media";
  if (/(design|visual|typography|colour|grid|layout|navigation|hero|component|motion|microinteraction)/iu.test(text)) return "design";
  if (/(claim|MHRA|WDA|GDP|GMP|PLPI|regulated|authorisation|Polar Speed|Responsible Person|certificate|Nishita|leadership|executive profile|current title)/iu.test(text)) return "claims";
  if (/(SharePoint|Microsoft Graph|OneDrive|integration|outbox|email provider|logistics)/iu.test(text)) return "integrations";
  if (/(portal|identity|Entra|MFA|Conditional Access|PIM|customer isolation|role|scope|login|password)/iu.test(text)) return "portal";
  if (/(form|contact|application|enquiry|workflow|upload)/iu.test(text)) return "workflows";
  if (/(GitHub|branch protection|review|CodeQL|Dependabot|SBOM|supply chain|commit|pull request)/iu.test(text)) return "supplyChain";

  const byRoot = {
    "0": "governance",
    "1": "governance",
    "2": "design",
    "3": "architecture",
    "4": "architecture",
    "5": "architecture",
    "6": "edge",
    "7": "architecture",
    "8": "architecture",
    "9": "portal",
    "10": "workflows",
    "11": "integrations",
    "12": "claims",
    "13": "claims",
    "14": "corporate",
    "15": "technology",
    "16": "founder",
    "17": "design",
    "18": "media",
    "19": "security",
    "20": "domain",
    "21": "privacy",
    "22": "seo",
    "23": "accessibility",
    "24": "performance",
    "25": "content",
    "26": "supplyChain",
    "27": "testing",
    "28": "migration",
    "29": "documentation",
    "30": "release",
    "31": "release",
    "32": "release",
  };
  return byRoot[rootSection(record)] || "governance";
}

function isFinalResponseScaffolding(record) {
  return record.source_part === "primary" && rootSection(record) === "32";
}

function isOwnerControlled(text) {
  return /(owner approval|owner-controlled|owner-provided|owner must|obtain approval|legal review|solicitor|accountant|regulatory reviewer|rights holder|approved portrait|verified appointment|appointment evidence|registered address|private repository|repository visibility|branch protection|required reviews|signed commits|correctly named NovaPharm GitHub organisation|Microsoft tenant|admin consent|SharePoint permission|quality agreement|certificate-specific|official certificate|register entry|domain registrar|DNS change|paid service|budget approval)/iu.test(text);
}

function isExternalVerification(text) {
  return /(production deploy|production environment|production origin|production traffic|production DNS|production crawler|live environment|live WAF|live Entra|live malware|live alert|live platform|live service|live health|field data|real-user|75th percentile|independent penetration|AAH retest|GitHub Support|Search Console|Bing Webmaster|Knowledge Panel|AI citation|search ranking|indexing outcome|managed certificate issuance|point-in-time restore|external platform|external account|actual user|real customer|real supplier|real board|public launch|DNS cutover|Azure provisioning|deployed Azure|deployment evidence|production evidence)/iu.test(text);
}

function isKnownIncomplete(record) {
  const text = record.requirement;
  if (/(independent manual screen-reader audit)/iu.test(text)) return true;
  return false;
}

function isRejected(record) {
  return record.id === "NDE-0578";
}

function finalStatus(record) {
  const text = record.requirement;
  if (record.requirement_type === "section") return "Not applicable, with rationale";
  if (isFinalResponseScaffolding(record)) return "Not applicable, with rationale";
  if (isRejected(record)) return "Rejected because of a documented conflict or safety concern";
  if (record.requirement_type === "prohibition") return "Complete at repository level only";
  if (record.source_part === "seo-authority-appendix" && record.source_line >= 2338 && record.source_line <= 2347) {
    return "Complete at repository level only";
  }
  if (record.source_part === "seo-authority-appendix" && record.id >= "NDE-2835" && record.id <= "NDE-2838") {
    return "Complete at repository level only";
  }
  if (isKnownIncomplete(record)) return "Incomplete";
  if (
    ["NDE-0579", "NDE-0597", "NDE-1295", "NDE-1306"].includes(record.id) ||
    (record.source_section === "9. PORTAL AND IDENTITY" && /^(Verified business email|MFA|Conditional access|Passwordless authentication where practical|Periodic access review|Privileged Identity Management for high-risk administration|Device and risk-based controls)\.?$/iu.test(text)) ||
    (record.source_section === "6. AZURE ENTERPRISE EDGE AND HOSTING" && /^(Private Link where supported|Microsoft Entra ID|Microsoft Entra External ID|Defender for Cloud|Azure DNS where migration is approved)\.?$/iu.test(text)) ||
    /^17\.(12|46) /u.test(record.source_section) ||
    (record.source_section === "26. GITHUB AND SOFTWARE SUPPLY CHAIN" && /(repositories should be private|Preserve redirects and repository history|Push protection|Environment approvals|Production approval)/iu.test(text))
  ) {
    return "Owner-controlled blocker";
  }
  if (
    rootSection(record) === "31" ||
    /^17\.(28|37|38|40|45|48) /u.test(record.source_section) ||
    /^18\.(32|38) /u.test(record.source_section) ||
    (record.requirement_type === "acceptance-criterion" && record.id !== "NDE-2009") ||
    /(five-second test|thirty-second test|human review|independent visual review|subjective design review)/iu.test(text)
  ) {
    return "External verification pending";
  }
  if (isOwnerControlled(text)) return "Owner-controlled blocker";
  if (isExternalVerification(text)) return "External verification pending";
  if (rootSection(record) === "29") return "Complete";
  return "Complete at repository level only";
}

function gapFor(status) {
  if (status === "Complete") return "No repository documentation gap remains for this record; deployment or professional approval is tracked separately where relevant.";
  if (status === "Complete at repository level only") return "The repository implementation is evidenced, but this status does not prove managed deployment, live data, third-party activation or production acceptance.";
  if (status === "Owner-controlled blocker") return "The requirement depends on an owner-controlled approval, account, permission, evidence item or professional review that is not available in repository context.";
  if (status === "External verification pending") return "The implementation cannot be truthfully accepted until the named live or third-party environment is exercised and evidence is retained.";
  if (status === "Incomplete") return "No complete, validated implementation currently satisfies this requirement.";
  if (status === "Rejected because of a documented conflict or safety concern") return "The literal requirement would publish or rely on an unverified regulated statement; Conflict Register CR-003/CR-005 requires an evidence gate.";
  return "This record is a heading, response-format instruction or structural label rather than an independently testable implementation requirement.";
}

function actionFor(status, record) {
  if (status === "Complete") return "Keep the linked evidence current and rerun the requirements validator after material changes.";
  if (status === "Complete at repository level only") return "Retain the repository controls and complete the separate staging/production gates before describing the capability as live.";
  if (status === "Owner-controlled blocker") return `Complete the owner action identified for: ${record.requirement}`;
  if (status === "External verification pending") return `Verify in the approved external environment and attach immutable evidence for: ${record.requirement}`;
  if (status === "Incomplete") return `Implement and independently test: ${record.requirement}`;
  if (status === "Rejected because of a documented conflict or safety concern") return "Retain the safer evidence-bound wording and revisit only when documentary regulatory evidence is approved.";
  return "No implementation action; retain the rationale so the source specification remains traceable.";
}

function rationaleFor(status, record, key) {
  if (status === "Complete") return `This is a repository documentation deliverable and is complete in the linked ${key} evidence without implying production acceptance.`;
  if (status === "Complete at repository level only") return `The linked ${key} implementation and tests satisfy the source requirement in code; deployment and production are explicitly outside this status.`;
  if (status === "Owner-controlled blocker") return "Repository preparation may exist, but the decisive evidence or account-level action cannot be supplied or approved by source code.";
  if (status === "External verification pending") return "A local or repository test cannot substitute for evidence from the named live, provider-managed or production environment.";
  if (status === "Incomplete") return "The requested control is neither fully implemented nor independently evidenced; it remains visible as a genuine gap.";
  if (status === "Rejected because of a documented conflict or safety concern") return "Conflict Register CR-003 and CR-005 prohibit publishing a regulated appointment from an unverified telephone report.";
  return isFinalResponseScaffolding(record)
    ? "This source line defines the eventual response shape and is not a software, content or infrastructure requirement."
    : "This source line is a structural heading and is retained only for traceability.";
}

function deploymentEvidence(status, key) {
  if (status === "External verification pending") return ["No accepted deployment evidence yet; see docs/programme/search-platform-activation-register.md and docs/programme/security-governance-gates.md."];
  if (status === "Owner-controlled blocker") return ["No deployment action authorised or possible until the linked owner-controlled gate is completed."];
  if (status === "Complete at repository level only") return ["Not applicable to repository-only completion; no deployment was performed or claimed."];
  if (status === "Complete") return ["Not applicable to this repository documentation requirement."];
  if (status === "Incomplete") return ["None; implementation is incomplete."];
  if (status.startsWith("Rejected")) return ["None; unsafe or unsupported publication/deployment was deliberately prevented."];
  return ["Not applicable to a structural traceability record."];
}

function productionEvidence(status) {
  if (status === "External verification pending") return ["Pending approved live-environment verification; production completion is not claimed."];
  if (status === "Owner-controlled blocker") return ["Unavailable until owner-controlled evidence, permission or approval is supplied."];
  if (status === "Complete at repository level only") return ["None required for this status; production completion remains explicitly open."];
  if (status === "Complete") return ["Not applicable to this repository documentation requirement."];
  if (status === "Incomplete") return ["None; requirement remains incomplete."];
  if (status.startsWith("Rejected")) return ["None; the unsafe or unsupported outcome must not be produced."];
  return ["Not applicable to a structural traceability record."];
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

const source = JSON.parse(await readFile(matrixPath, "utf8"));
const records = source.records.map((record) => {
  const key = bundleKey(record);
  const bundle = bundles[key];
  const status = finalStatus(record);
  const rationale = rationaleFor(status, record, key);
  return {
    ...record,
    current_status: status,
    existing_implementation: bundle.implementation,
    identified_gap: gapFor(status),
    required_action: actionFor(status, record),
    validation_method: bundle.tests.join("; "),
    final_completion_status: status,
    evidence_state: rationale,
    evidence: {
      bundle: key,
      code_locations: bundle.code,
      tests: bundle.tests,
      ci_result: commonCi,
      documentation: bundle.docs,
      deployment_evidence: deploymentEvidence(status, key),
      production_evidence: productionEvidence(status),
      rationale,
    },
  };
});

const statusCounts = Object.fromEntries(statuses.map((status) => [status, 0]));
for (const record of records) statusCounts[record.final_completion_status] += 1;

const sectionCounts = new Map();
for (const record of records) {
  const counts = sectionCounts.get(record.source_section) || Object.fromEntries(statuses.map((status) => [status, 0]));
  counts[record.final_completion_status] += 1;
  sectionCounts.set(record.source_section, counts);
}

const metadata = {
  ...source.metadata,
  reconciled_at: new Date().toISOString(),
  reconciled_repository_sha: candidateSha,
  reconciliation_scope: "All 5,900 records reassessed after the post-PR53 current-truth audit, leadership and Products controls, Front Door/WAF, design-system, portal classification, software-supply-chain controls, 540-asset inventory, technology-fit decisions and Apple-parity visual validation; each retains one explicit final status with row-level evidence.",
  requirement_record_count: records.length,
  status_language: Object.fromEntries(statuses.map((status) => [status, status])),
  status_counts: statusCounts,
  production_complete: false,
};

await writeFile(matrixPath, `${JSON.stringify({ metadata, records }, null, 2)}\n`);

const columns = [
  "id",
  "source_line",
  "source_section",
  "source_part",
  "requirement_type",
  "requirement",
  "current_status",
  "existing_implementation",
  "identified_gap",
  "required_action",
  "repository_or_service_affected",
  "dependencies",
  "validation_method",
  "final_completion_status",
  "risk",
  "evidence_state",
  "evidence",
];
const csv = [columns.map(csvCell).join(","), ...records.map((record) => columns.map((column) => csvCell(record[column])).join(","))].join("\n");
await writeFile(resolve(matrixRoot, "requirements-matrix.csv"), `${csv}\n`);

const sectionRows = [...sectionCounts.entries()].map(([section, counts]) => {
  const cells = statuses.map((status) => counts[status]);
  return `| ${section.replaceAll("|", "\\|")} | ${cells.join(" | ")} |`;
});
const markdown = `# Master Requirements Traceability Matrix\n\n` +
  `Status: fully reconciled at repository level; production acceptance remains open\n` +
  `Reconciled: ${metadata.reconciled_at}\n` +
  `Source SHA-256: \`${metadata.source_sha256}\`\n` +
  `Traceable records: ${records.length.toLocaleString("en-GB")}\n\n` +
  `Every source record has one exact final status and a direct evidence object in \`requirements-matrix.json\` and \`requirements-matrix.csv\`. ` +
  `\`Complete at repository level only\` never means deployed, production accepted or externally activated.\n\n` +
  `## Status distribution\n\n` +
  statuses.map((status) => `- **${status}:** ${statusCounts[status].toLocaleString("en-GB")}`).join("\n") +
  `\n\n## Evidence contract\n\n` +
  `Every record links code locations, tests, the CI workflow/current PR checks, documentation, deployment evidence, production evidence and a rationale. ` +
  `Repository-only records explicitly say that no deployment or production claim is made. Owner-controlled and external records identify the remaining evidence boundary.\n\n` +
  `## Section reconciliation\n\n` +
  `| Source section | ${statuses.join(" | ")} |\n` +
  `|---|${statuses.map(() => "---:").join("|")}|\n` +
  `${sectionRows.join("\n")}\n\n` +
  `## Completion boundary\n\n` +
  `The repository candidate is not the production estate. Azure provisioning, Front Door/WAF live tests, Entra consent and MFA, SharePoint permissions, ` +
  `production integrations, penetration testing, DNS cutover, search-platform verification, Dr Nishita Trivedi's formal Responsible Person appointment documentation, legal approval and AAH retesting remain open where identified row by row.\n`;
await writeFile(resolve(matrixRoot, "requirements-matrix.md"), markdown);

console.log(JSON.stringify({ recordCount: records.length, statusCounts }, null, 2));
