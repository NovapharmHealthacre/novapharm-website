import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const sourcePath = resolve(process.argv[2] || "");
const outputRoot = resolve(process.argv[3] || "docs/programme/requirements");

if (!process.argv[2]) {
  throw new Error("Usage: node scripts/programme/generate-requirements-matrix.mjs <normalized-source.txt> [output-directory]");
}

const sectionState = {
  "1": {
    status: "adopted",
    implementation: "The programme is being executed as a cross-disciplinary repository and production audit before implementation.",
    gap: "Execution evidence must continue to be linked to each requirement.",
    action: "Maintain the traceability ledger and record tested evidence as each delivery increment closes.",
    target: "programme governance",
    validation: "Requirements traceability review and delivery-gate sign-off."
  },
  "2": {
    status: "partial",
    implementation: "All three estates have deliberate visual systems, but quality and consistency vary materially between properties and viewports.",
    gap: "No shared, governed quality bar or cross-estate design review currently exists.",
    action: "Create three reviewed creative directions, adopt one shared design foundation and retain distinct property art direction.",
    target: "all public applications and design-system package",
    validation: "Chromium/WebKit visual acceptance, design critique, accessibility and performance budgets."
  },
  "3": {
    status: "not-met",
    implementation: "NIT uses TypeScript, Next.js 16 and React 19; the corporate and founder sources use separate custom JavaScript/static builders.",
    gap: "There is no strict TypeScript monorepo, shared package graph, unified lockfile or component governance environment.",
    action: "Migrate incrementally to a pnpm/Turborepo workspace using the current security-patched Next.js 16 Active LTS and shared packages.",
    target: "canonical orchestration repository",
    validation: "Strict typecheck, lint, package-boundary tests, clean build and migration parity tests."
  },
  "4": {
    status: "confirmed-blocker",
    implementation: "The corporate repository contains a capable Node backend, but GitHub Pages publishes only static files while still exposing login and account-form interfaces.",
    gap: "The deployed origin cannot execute the security controls or workflows represented by the visible interfaces.",
    action: "Separate public, portal and API applications; make public-only output omit secure controls and retain Pages solely as an honest fallback until cutover.",
    target: "corporate, portal, API and deployment pipelines",
    validation: "Mode-contract tests, public-artifact inspection, live health checks and protected-route tests."
  },
  "5": {
    status: "partial",
    implementation: "The corporate, NIT and founder public domains resolve; www redirects to the corporate apex. Portal, API and status subdomains do not resolve.",
    gap: "Target service boundaries, origin validation, dedicated secure origins and monitoring are not live.",
    action: "Implement explicit origin configuration and isolated applications before an approved DNS cutover.",
    target: "all applications, DNS and Azure edge",
    validation: "Configuration-schema tests, redirect crawl, DNS/certificate monitoring and CORS/host tests."
  },
  "6": {
    status: "code-present-not-deployed",
    implementation: "The corporate repository contains Bicep for App Service, Azure SQL, Blob Storage, Key Vault, Application Insights and managed identities.",
    gap: "No live Azure production estate or verified Front Door Premium/WAF boundary exists.",
    action: "Reconcile infrastructure as code with the unified app topology and deploy only after owner-controlled Azure, billing and DNS approval.",
    target: "Azure infrastructure",
    validation: "Bicep lint/what-if, policy checks, private staging acceptance, production smoke tests and rollback drill."
  },
  "7": {
    status: "not-met",
    implementation: "Preview/public-state flags exist in parts of the corporate backend, but the four required estate-wide operating modes are not a shared contract.",
    gap: "Static output can expose interfaces that the selected runtime mode cannot support.",
    action: "Add a typed deployment-mode package and route/capability manifests enforced at build and runtime.",
    target: "all applications and deployment pipelines",
    validation: "Contract tests for PUBLIC_ONLY, FULL_PLATFORM, MAINTENANCE and INCIDENT artifacts."
  },
  "8": {
    status: "not-met",
    implementation: "Local corporate tests exercise real backend workflows, but the live static site exposes non-operational login, contact and account-application controls.",
    gap: "Public controls do not consistently have a server-confirmed outcome or deliberate absence.",
    action: "Bind every control to a capability manifest; remove or replace unavailable workflows with an explicit, tested handoff.",
    target: "all public applications, portal and API",
    validation: "Control inventory, interaction tests, dead-control scan and live synthetic monitoring."
  },
  "9": {
    status: "local-only",
    implementation: "The corporate Node application implements local/federated authentication, sessions, CSRF, lockout and four role scopes in local tests.",
    gap: "No deployed portal origin, production Entra configuration, MFA acceptance or live role isolation exists.",
    action: "Move identity into the dedicated portal/API boundary and activate workforce and approved external identity flows through owner-controlled Entra configuration.",
    target: "portal, API and Microsoft Entra",
    validation: "OIDC validation, role matrix, IDOR tests, MFA evidence, session tests and production cookie inspection."
  },
  "10": {
    status: "local-only",
    implementation: "The corporate backend implements contact and account-application endpoints with validation, CSRF, persistence and tests; public NIT/founder contact is email handoff only.",
    gap: "The production corporate origin returns 404 for the API and cannot complete the displayed forms.",
    action: "Centralise typed form contracts in the API, add per-site journeys and publish forms only when the API health contract passes.",
    target: "corporate, NIT, founder and API",
    validation: "Unit/integration/E2E tests, provider-failure tests, accessibility checks and live synthetic submissions."
  },
  "11": {
    status: "partial-local",
    implementation: "Adapters exist for Microsoft Graph/SharePoint, email, Azure Blob, Azure SQL and logistics events with retry/audit behaviour.",
    gap: "They are not production-configured or end-to-end verified; SharePoint support is document-drive focused and lacks the full hybrid list/field-authority model.",
    action: "Define typed integration contracts, least-privilege permissions, idempotent outbox processing, health states and production acceptance suites.",
    target: "API, integration workers, Microsoft 365 and Azure",
    validation: "Sandbox contract tests, throttling/outage tests, reconciliation, audit evidence and owner-approved production smoke tests."
  },
  "12": {
    status: "partial",
    implementation: "Corporate public copy generally uses conservative pre-authorisation caveats and avoids identified prohibited supply claims.",
    gap: "Regulatory wording and leadership-role evidence are not governed from one cross-site source; several current titles conflict with the master specification.",
    action: "Create evidence-bound claims and people records with publication states and legal/regulatory review gates.",
    target: "claims/content packages and all public applications",
    validation: "Claims lint, evidence review, visible/schema parity and pharmaceutical-compliance sign-off."
  },
  "13": {
    status: "partial",
    implementation: "The corporate site has claim-audit scripts and content data, while the NIT and founder properties maintain separate facts.",
    gap: "There is no single typed claims registry consumed by all properties.",
    action: "Create a versioned claims package with evidence state, owner, scope, review date and publication rules.",
    target: "shared claims and content packages",
    validation: "Schema validation, cross-site consistency tests and prohibited-claim CI gate."
  },
  "14": {
    status: "partial",
    implementation: "The corporate website has 36 indexable routes, strong product imagery, six Insights articles and a refined responsive visual system.",
    gap: "The narrative remains tied to a static generator, some copy overstates operational cohesion, and unavailable secure journeys are visible.",
    action: "Migrate content into the unified corporate app while preserving URLs, approved media and search equity.",
    target: "corporate application",
    validation: "Route parity, content diff, claims scan, responsive visual review and SEO regression tests."
  },
  "15": {
    status: "partial-with-defects",
    implementation: "NIT is a TypeScript/Next.js static export with a distinctive advisory experience and 12 public sitemap URLs.",
    gap: "The latest tree has high dependency advisories, lint scans generated output, mobile hero text clips, naming is inconsistent, the contact flow is mailto-only and the legal relationship remains unverified.",
    action: "Upgrade dependencies, fix source/output boundaries, migrate to shared packages and publish only evidence-approved entity relationships.",
    target: "NIT application",
    validation: "Clean lint/typecheck/audit/build, mobile/WebKit screenshots, entity review and contact workflow tests."
  },
  "16": {
    status: "partial-with-conflicts",
    implementation: "Corporate and founder properties publish leadership profiles and portraits, but title wording is inconsistent across sites and schema.",
    gap: "Four leadership designations conflict with the master source; the NIT relationship and some role evidence remain owner-controlled.",
    action: "Create canonical people records, preserve approved portraits, separate executive title from founder/governance facts and hold unverified regulated titles from publication.",
    target: "shared content/claims, corporate and founder applications",
    validation: "Entity consistency tests, visible/schema parity, portrait provenance and owner evidence review."
  },
  "17": {
    status: "partial",
    implementation: "Each property has a coherent local design system, but tokens and components are isolated.",
    gap: "No shared accessible component package or three-direction design gate exists.",
    action: "Create a governed token/component foundation and approve one of three original estate-wide creative directions.",
    target: "design-system and brand packages; all applications",
    validation: "Storybook/component tests, visual regression, WCAG review and design critique."
  },
  "18": {
    status: "partial",
    implementation: "Corporate and founder properties include approved/registered imagery; media provenance is uneven across the complete estate.",
    gap: "There is no one rights, provenance, optimisation and misleading-imagery gate for every asset.",
    action: "Centralise asset records and enforce licence, metadata, responsive derivative and claims checks.",
    target: "brand/media package and all applications",
    validation: "Asset-register validation, image decode tests, responsive crops and human art-direction review."
  },
  "19": {
    status: "partial-boundary-failure",
    implementation: "The corporate Node backend includes meaningful security controls and passes local security integration tests.",
    gap: "Those controls do not protect GitHub Pages output; independent penetration testing and live edge controls are absent.",
    action: "Adopt shared security middleware, split trust boundaries, add SAST/DAST and commission independent testing before production approval.",
    target: "public apps, portal, API, Azure edge and CI",
    validation: "OWASP test suite, headers/CSP, authz/IDOR, upload, rate-limit and independent penetration-test evidence."
  },
  "20": {
    status: "partial",
    implementation: "All three public domains currently return content over HTTPS; the corporate and founder Pages settings enforce HTTPS.",
    gap: "NIT Pages reports HTTPS enforcement disabled, the secure service subdomains are absent and no unified domain/certificate monitoring exists.",
    action: "Create a domain inventory, edge compatibility policy, monitoring and controlled cutover/rollback runbook.",
    target: "DNS, Azure edge and all applications",
    validation: "DNS snapshot, TLS scan, redirect matrix, corporate-filter testing and expiry alerts."
  },
  "21": {
    status: "partial",
    implementation: "The corporate site has consent controls and legal pages; the other properties have simpler privacy/terms coverage and no production analytics was observed in the audited public builds.",
    gap: "There is no unified data map, consent ledger or cross-estate privacy configuration tied to actual production services.",
    action: "Create shared privacy/consent contracts, per-purpose data maps and deploy trackers only after valid consent and legal review.",
    target: "all applications, API and legal governance",
    validation: "Cookie/storage audit, pre-consent network tests, withdrawal tests and policy-to-system reconciliation."
  },
  "22": {
    status: "partial",
    implementation: "The three sites have canonical URLs, sitemaps and structured data; corporate has IndexNow and entity-authority tooling.",
    gap: "Entity identifiers, titles and relationships are inconsistent and discovery governance is not shared.",
    action: "Implement one canonical entity/metadata system while preserving distinct domains and approved URLs.",
    target: "SEO/content packages and all public applications",
    validation: "Crawl, sitemap/robots/schema tests, entity linkage, rendered HTML and search-platform owner acceptance."
  },
  "23": {
    status: "partial",
    implementation: "Corporate and founder automated accessibility checks pass; NIT includes semantic source patterns but its clean lint gate currently fails.",
    gap: "No complete manual keyboard/screen-reader audit or cross-browser WCAG 2.2 AA acceptance exists for the unified estate.",
    action: "Adopt accessible shared components and execute automated plus manual testing at every defined viewport.",
    target: "all applications and design-system package",
    validation: "axe, semantic lint, keyboard, screen-reader spot checks, contrast and focus review."
  },
  "24": {
    status: "partial-unverified-field-data",
    implementation: "Performance scripts and historical reports exist, but current production field measurements were not established in this audit.",
    gap: "No unified budgets, real-user monitoring or current three-property Core Web Vitals baseline exists.",
    action: "Set enforceable asset/JS/CSS budgets and add privacy-safe RUM after consent and owner approval.",
    target: "all applications, CI and observability",
    validation: "Lighthouse/Lab runs, bundle budgets and 75th-percentile field monitoring when data exists."
  },
  "25": {
    status: "partial",
    implementation: "The estates contain substantial approved public content, especially corporate Insights and founder essays.",
    gap: "Terminology, titles, entity facts and editorial review states are not centrally governed.",
    action: "Migrate content into typed records with sources, authorship, review state, jurisdiction and claims linkage.",
    target: "content/claims packages and all public applications",
    validation: "Editorial lint, source-link tests, content review and cross-site consistency checks."
  },
  "26": {
    status: "not-met",
    implementation: "Secret scanning and push protection are enabled and tracked current/history scans pass; repositories are public and have no main-branch protection, Dependabot updates or CodeQL analysis.",
    gap: "Required supply-chain controls and private ownership are not configured; historical GitHub pull refs still need Support-level remediation for the retired credential incident.",
    action: "Add locked CI permissions, dependency updates, CodeQL/SAST, branch rules and an owner-controlled private-repository decision.",
    target: "all GitHub repositories and organisation settings",
    validation: "Repository-settings export, CI policy tests, all-ref secret scan and GitHub Support confirmation."
  },
  "27": {
    status: "mixed",
    implementation: "Corporate and founder clean local checks pass; NIT builds and typechecks but lint and production dependency audit fail. Corporate live-backend activation fails because the deployed API returns 404.",
    gap: "No one clean-checkout, cross-estate acceptance pipeline validates the actual deployed architecture.",
    action: "Create staged monorepo CI with unit, integration, E2E, security, accessibility, visual and live smoke gates.",
    target: "all repositories/applications and CI",
    validation: "Required checks on immutable candidate SHAs and deployment-environment smoke evidence."
  },
  "28": {
    status: "not-started",
    implementation: "The three repositories and production sites remain independent; no controlled source migration has occurred.",
    gap: "Shared history, content, routes, redirects, data and rollback have not been reconciled into the target topology.",
    action: "Execute a staged strangler migration with content/route parity, preserved histories and independent rollback.",
    target: "all repositories, applications, data and deployment",
    validation: "Migration rehearsal, count reconciliation, URL diff, rollback drill and owner acceptance."
  },
  "29": {
    status: "partial",
    implementation: "The corporate repository has extensive historical audit, deployment, security and runbook documentation.",
    gap: "There is no current unified-estate source of truth or line-level traceability to this master specification.",
    action: "Create the programme documentation set and keep status language evidence-bound.",
    target: "programme documentation",
    validation: "Documentation inventory, link checks, owner-gate review and evidence freshness checks."
  },
  "30": {
    status: "in-progress",
    implementation: "A new foundation branch is created from the latest corporate main; no pull request or merge has occurred.",
    gap: "The branch has not yet delivered a reviewable architecture increment.",
    action: "Commit coherent increments and open draft pull requests only after their checks pass.",
    target: "GitHub repositories",
    validation: "PR checks, review state, merge-base and expected-head verification."
  },
  "31": {
    status: "not-met",
    implementation: "Several existing components are strong, but the secure runtime, unified governance and deployment acceptance conditions are not met.",
    gap: "The definition of done remains materially open.",
    action: "Close each requirement only with linked code, test and deployment evidence.",
    target: "entire digital estate",
    validation: "Final requirements-led acceptance review."
  },
  "32": {
    status: "pending",
    implementation: "An evidence-backed baseline is being produced.",
    gap: "Final response evidence cannot be supplied before implementation and production acceptance.",
    action: "Maintain interim reports and issue the required completion report only after all applicable gates pass.",
    target: "programme governance",
    validation: "Final A-L response reconciled to the completed matrix and deployment evidence."
  }
};

const appendixState = {
  "17": sectionState["22"],
  "18": sectionState["17"]
};

const targetRules = [
  [/(sharepoint|microsoft graph|onedrive|document librar|retention label)/i, "API integrations and Microsoft 365"],
  [/(entra|identity|authentication|authori[sz]ation|session|mfa|password|login|portal)/i, "portal, API and Microsoft Entra"],
  [/(database|azure sql|postgres|transaction|schema migration|record|foreign key)/i, "API and database package"],
  [/(blob|upload|malware|quarantine|file storage|document storage)/i, "API, storage package and Azure Blob Storage"],
  [/(front door|waf|azure|key vault|app service|container apps|infrastructure)/i, "Azure infrastructure and deployment"],
  [/(search|seo|geo|aeo|schema|structured data|sitemap|robots|crawler|indexnow|canonical|knowledge panel)/i, "SEO/content packages and public applications"],
  [/(cookie|privacy|consent|analytics|gdpr|data protection|retention)/i, "privacy/analytics packages and all applications"],
  [/(accessib|wcag|keyboard|screen reader|focus|contrast|aria)/i, "design system and all applications"],
  [/(image|photo|portrait|video|audio|media|favicon|logo|typography|colour|motion|animation|visual|design)/i, "brand/design-system packages and public applications"],
  [/(leadership|executive|vishal|prabhakar|girish|helly|nishita|founder)/i, "shared people/claims data, corporate and founder apps"],
  [/(\bNIT\b|innovation technology)/i, "NIT application and shared packages"],
  [/(contact|account application|form|enquiry|workflow|notification|email)/i, "public applications, API and workflow services"],
  [/(github|branch|pull request|ci\/cd|workflow|dependency|supply chain|secret)/i, "all GitHub repositories and CI"],
  [/(test|validation|quality assurance|lighthouse|playwright|vitest|axe)/i, "testing package, CI and all applications"]
];

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function normaliseLine(value) {
  return value.replaceAll("\u00a0", " ").replace(/\s+/g, " ").trim();
}

function requirementType(text) {
  if (/^(\d+\.)?\d*\.?\s*[A-Z][A-Z0-9 &,/()\-–—]+$/.test(text)) return "section";
  if (/^(do not|never|no |must not|avoid|prohibit)/i.test(text)) return "prohibition";
  if (/^(must|required|require|implement|create|add|use|ensure|validate|test|provide|prepare|publish|configure|record|retain|support|allow|block|remove|preserve|separate|build|establish|define|include|apply|review|audit|monitor|track|map|route|design|centralise|centralize|migrate|replace|correct|eliminate|detect|restrict|reject|protect|verify|enforce|generate|optimise|optimize|document|deploy|run|commit|open)/i.test(text)) return "action";
  if (/^(the completed|the final|the experience|the work is complete|definition of done|success criteria)/i.test(text)) return "acceptance-criterion";
  return "requirement";
}

function targetFor(text, fallback) {
  return targetRules.find(([pattern]) => pattern.test(text))?.[1] || fallback;
}

function riskFor(text, status) {
  if (/(secret|password|authentication|authori[sz]ation|private|confidential|patient|adverse event|regulatory claim|licen[cs]e|malware|sql injection|xss|csrf|waf|data leak)/i.test(text)) return "critical-or-high";
  if (["confirmed-blocker", "not-met", "partial-boundary-failure"].includes(status)) return "high";
  if (/(accessib|performance|canonical|sitemap|legal|privacy|cookie|identity|integration|database|form|portal)/i.test(text)) return "medium";
  return "normal";
}

function dependenciesFor(text) {
  const dependencies = [];
  if (/(azure|front door|waf|app service|container apps|azure sql|key vault|blob)/i.test(text)) dependencies.push("Owner-approved Azure subscription, budget and tenant permissions");
  if (/(entra|microsoft graph|sharepoint|onedrive|microsoft 365)/i.test(text)) dependencies.push("Microsoft tenant administration and least-privilege consent");
  if (/(dns|domain|certificate|registrar|www|subdomain)/i.test(text)) dependencies.push("Owner-approved registrar and DNS change window");
  if (/(licen[cs]e|certificate|regulatory|mhra|gdp|gmp|plpi|responsible person|pharmacovigilance)/i.test(text)) dependencies.push("Approved regulatory evidence and responsible reviewer");
  if (/(legal|privacy|terms|liability|cookie|gdpr|data protection)/i.test(text)) dependencies.push("UK legal/privacy review of final production wording and actual data map");
  if (/(image|photo|portrait|video|font|media|logo)/i.test(text)) dependencies.push("Approved, rights-cleared brand/media evidence where not already registered");
  if (/(\bNIT\b|innovation technology)/i.test(text)) dependencies.push("Owner evidence for the NIT legal and organisational relationship");
  return dependencies.length ? dependencies : ["Repository-controlled implementation and review"];
}

const source = await readFile(sourcePath, "utf8");
const sourceHash = createHash("sha256").update(source).digest("hex");
const rawLines = source.split(/\r?\n/);

let primarySection = "0";
let sectionPath = "Preamble";
let appendix = "primary";
const records = [];

for (let index = 0; index < rawLines.length; index += 1) {
  const text = normaliseLine(rawLines[index]);
  if (!text || text.startsWith("=== ")) continue;

  const numbered = text.match(/^(\d+)\.\s+(.+)$/);
  const subsection = text.match(/^(\d+)\.(\d+)\s+(.+)$/);
  if (numbered) {
    primarySection = numbered[1];
    sectionPath = `${numbered[1]}. ${numbered[2]}`;
    appendix = index + 1 >= 2300 && primarySection === "17" ? "seo-authority-appendix" : index + 1 >= 4100 && primarySection === "18" ? "visual-experience-appendix" : "primary";
  } else if (subsection) {
    if (index + 1 >= 2300 && subsection[1] === "17") appendix = "seo-authority-appendix";
    if (index + 1 >= 4100 && subsection[1] === "18") appendix = "visual-experience-appendix";
    primarySection = subsection[1];
    sectionPath = `${subsection[1]}.${subsection[2]} ${subsection[3]}`;
  }

  const state = appendix === "primary" ? (sectionState[primarySection] || sectionState["32"]) : (appendixState[primarySection] || sectionState["32"]);
  const type = requirementType(text);
  const isPolicy = type === "section" || type === "acceptance-criterion";
  const finalStatus = isPolicy ? "open-governance-gate" : "pending-implementation-or-evidence";
  const requirementTarget = targetFor(text, state.target);
  const id = `NDE-${String(records.length + 1).padStart(4, "0")}`;

  records.push({
    id,
    source_line: index + 1,
    source_section: sectionPath,
    source_part: appendix,
    requirement_type: type,
    requirement: text,
    current_status: state.status,
    existing_implementation: state.implementation,
    identified_gap: state.gap,
    required_action: state.action,
    repository_or_service_affected: requirementTarget,
    dependencies: dependenciesFor(text),
    validation_method: state.validation,
    final_completion_status: finalStatus,
    risk: riskFor(text, state.status),
    evidence_state: "Baseline evidence recorded; implementation evidence pending"
  });
}

await mkdir(outputRoot, { recursive: true });

const metadata = {
  generated_at: new Date().toISOString(),
  source_file: basename(sourcePath),
  source_sha256: sourceHash,
  source_line_count: rawLines.length,
  requirement_record_count: records.length,
  status_language: {
    adopted: "The instruction is in active programme governance.",
    partial: "Material implementation exists but the full requirement is not met.",
    "not-met": "The audited estate does not satisfy the requirement.",
    "local-only": "Working code/tests exist locally, but no accepted production implementation exists.",
    "code-present-not-deployed": "Implementation or infrastructure code exists without verified deployment.",
    mixed: "Results differ by repository or environment."
  }
};

const json = [
  "{",
  `  \"metadata\": ${JSON.stringify(metadata)},`,
  '  "records": [',
  ...records.map((record, index) => `    ${JSON.stringify(record)}${index === records.length - 1 ? "" : ","}`),
  "  ]",
  "}"
].join("\n");
await writeFile(resolve(outputRoot, "requirements-matrix.json"), `${json}\n`);

const columns = [
  "id", "source_line", "source_section", "source_part", "requirement_type", "requirement", "current_status",
  "existing_implementation", "identified_gap", "required_action", "repository_or_service_affected", "dependencies",
  "validation_method", "final_completion_status", "risk", "evidence_state"
];
const csv = [columns.map(csvCell).join(","), ...records.map((record) => columns.map((column) => csvCell(record[column])).join(","))].join("\n");
await writeFile(resolve(outputRoot, "requirements-matrix.csv"), `${csv}\n`);

const statusCounts = Object.entries(records.reduce((counts, record) => {
  counts[record.current_status] = (counts[record.current_status] || 0) + 1;
  return counts;
}, {})).sort((a, b) => b[1] - a[1]);

const sectionRows = [];
for (const [key, state] of Object.entries(sectionState)) {
  sectionRows.push(`| ${key} | ${state.status} | ${state.implementation} | ${state.gap} | ${state.action} | ${state.validation} |`);
}

const markdown = `# Master Requirements Traceability Matrix\n\n` +
  `Status: baseline established; implementation open  \n` +
  `Generated: ${metadata.generated_at}  \n` +
  `Source SHA-256: \`${sourceHash}\`  \n` +
  `Normalised source lines: ${metadata.source_line_count}  \n` +
  `Traceable records: ${metadata.requirement_record_count}\n\n` +
  `The complete line-level ledger is in \`requirements-matrix.json\` and \`requirements-matrix.csv\`. No row is marked complete merely because code exists; production, security, legal, regulatory and external-account gates remain explicit.\n\n` +
  `This file and its JSON/CSV companions preserve the audited baseline. Current repository increments and their evidence are recorded in \`implementation-evidence.json\`; that overlay does not convert owner-controlled Azure, Entra, SharePoint, DNS, legal, regulatory or production gates into completed requirements.\n\n` +
  `## Current status distribution\n\n` +
  statusCounts.map(([status, count]) => `- \`${status}\`: ${count}`).join("\n") +
  `\n\n## Primary section baseline\n\n` +
  `| Section | Current status | Existing implementation | Identified gap | Required action | Validation |\n` +
  `|---|---|---|---|---|---|\n` +
  `${sectionRows.join("\n")}\n\n` +
  `## Completion rule\n\n` +
  `A record may move to \`complete\` only when the named repository/service implementation and validation evidence are linked. Owner-controlled Azure, DNS, Microsoft, legal, regulatory and rights-clearance gates remain \`owner-controlled\`, not complete.\n`;

await writeFile(resolve(outputRoot, "requirements-matrix.md"), markdown);

console.log(JSON.stringify(metadata, null, 2));
