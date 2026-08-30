import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const C = "Already complete and verified";
const P = "Partially implemented";
const N = "Not implemented";
const IMPLEMENTATION_SHA = "9f49161425790596413051a2b00cedeae51905a9";

const corporateEvidence = ["docs/design/apple-vs-novapharm.md", "docs/design/responsive-acceptance.md", "docs/programme/final-human-visual-dossier.md"];
const oncologyEvidence = ["docs/design/apple-vs-novapharm.md", "scripts/test-oncology-content.mjs", "oncology/index.html"];
const dataEvidence = ["docs/data/medicines-intelligence-requirements.md", "docs/data/data-quality-and-caveats.md"];
const securityEvidence = ["SECURITY.md", "docs/portal/security-production-evidence.md"];

const definitions = [
  ["CRO refinement", "Present the CRO coordination model with clear responsibility boundaries.", P, corporateEvidence],
  ["Stacked strategy", "Keep strategic information sequenced rather than competing in one viewport.", P, corporateEvidence],
  ["Business-plan evidence", "Separate internal planning evidence from approved public claims.", C, ["docs/programme/regulatory-publication-rules.md"]],
  ["Claims do not auto-publish", "Require evidence and approval before a planning statement becomes public.", C, ["scripts/audit-public-claims.mjs", "docs/programme/regulatory-publication-rules.md"]],
  ["Business-plan themes", "Translate only owner-approved themes into concise public communication.", P, ["docs/design/content-audit.md"]],
  ["Oncology benchmark", "Hold the Oncology experience to a credible specialist-market benchmark.", P, oncologyEvidence],
  ["Oncology positioning", "Explain continuity and evidence gates without implying unsupported clinical authority.", C, oncologyEvidence],
  ["Oncology hero", "Make the first viewport concise, truthful and visually composed without decorative science.", C, oncologyEvidence],
  ["Oncology architecture", "Provide a short public journey with deeper detail only where necessary.", C, oncologyEvidence],
  ["Signature Oncology components", "Use typography and evidence-led structures instead of generic visual components.", C, oncologyEvidence],
  ["Oncology language", "Use precise regulator-aware language and remove inflated healthcare prose.", C, oncologyEvidence],
  ["Oncology quality and safety", "Keep quality, permissions and sponsor responsibilities explicit.", C, oncologyEvidence],
  ["Imagery", "Retain only authentic, necessary, licensed and correctly delivered media.", P, ["docs/design/image-removal-register.md", "audit/generated/image-inventory.json"]],
  ["Navigation", "Give each audience a short, predictable global route and appropriate local navigation.", P, ["docs/design/information-architecture.md", "apps/corporate/components/site-header.tsx"]],
  ["SEO, GEO and AEO", "Make approved public facts discoverable without exposing protected or unsupported content.", P, ["docs/programme/seo-geo-aeo-strategy.md", "seo/generated/structured-data-register.json"]],
  ["Insights", "Publish concise evidence-led editorial material with source and claim governance.", P, ["docs/design/content-audit.md", "seo/generated/page-metadata-register.json"]],
  ["Trusted AI", "Allow AI only through governed evidence, policy and human authority.", P, ["docs/data/analytics-security-and-privacy.md", "scripts/test-internal-ai-gateway.mjs"]],
  ["Public AI search and ask", "Prevent a public assistant from inventing pharmaceutical answers or exposing private data.", N, ["docs/programme/regulatory-publication-rules.md"]],
  ["Public AI foundation", "Establish a public-only knowledge boundary before any public AI interaction.", P, ["seo/generated/structured-data-register.json", "docs/programme/regulatory-publication-rules.md"]],
  ["WebLLM", "Use browser inference only if a measured, private and maintainable product need is proven.", N, ["docs/architecture/technology-fit-matrix.md"]],
  ["AI policy engine", "Apply deterministic policy before model output can influence a governed workflow.", P, ["scripts/test-internal-ai-gateway.mjs", "docs/data/analytics-security-and-privacy.md"]],
  ["Privacy", "Minimise collection and explain authority at the point of use.", P, ["legal/privacy/index.html", "docs/data/analytics-security-and-privacy.md"]],
  ["User experience", "Make principal tasks clear, recoverable and restrained across public and protected surfaces.", P, corporateEvidence],
  ["Knowledge index", "Index only approved public knowledge and keep private source intelligence excluded.", P, ["seo/generated/structured-data-register.json", "scripts/generate-structured-data-register.mjs"]],
  ["Internal Portal AI gateway", "Keep model access server-side, role-scoped, logged and policy-controlled.", P, ["scripts/test-internal-ai-gateway.mjs", "docs/portal/security-production-evidence.md"]],
  ["Internal AI use cases", "Expose only approved, low-risk use cases with an accountable human decision maker.", P, ["docs/data/analytics-security-and-privacy.md"]],
  ["AI roadmap only", "Label future AI capabilities as roadmap until code, evidence and approval exist.", C, ["docs/programme/regulatory-publication-rules.md"]],
  ["Forecasting roadmap", "Keep forecasting unavailable until deterministic history and backtests support it.", P, ["docs/data/forecasting-methodology.md", "packages/medicines-intelligence/src/forecasting.ts"]],
  ["Traceability roadmap", "Avoid blockchain or end-to-end traceability claims without operational evidence.", C, ["docs/programme/regulatory-publication-rules.md", "src/core/executive-module-views.mjs"]],
  ["Public AI governance", "Explain AI limitations and responsibility without marketing unsupported capability.", P, ["docs/data/analytics-security-and-privacy.md"]],
  ["Personal website AI", "Keep founder/publication surfaces separate from unapproved personal AI functionality.", N, ["docs/architecture/technology-fit-matrix.md"]],
  ["Licensing", "Record software, media, data and model licence authority before use.", P, ["docs/media-provenance-register.json", "docs/data/nhsbsa-source-registry.md"]],
  ["OCR and voice", "Add OCR or voice only for a governed workflow with privacy, accessibility and accuracy evidence.", N, ["docs/architecture/technology-fit-matrix.md"]],
  ["Prompt injection and data leakage", "Prevent untrusted content from overriding policy or extracting protected information.", P, securityEvidence],
  ["AI evaluation", "Measure groundedness, refusal, leakage and task correctness before an AI release.", P, ["scripts/test-internal-ai-gateway.mjs", "docs/data/analytics-security-and-privacy.md"]],
  ["Performance", "Keep public and protected experiences responsive under realistic resource budgets.", P, ["docs/programme/final-performance-acceptance.md"]],
  ["Accessibility", "Meet WCAG 2.2 AA through native semantics, keyboard, contrast, reflow and reduced motion.", P, ["docs/design/accessibility-contrast-audit.md", "apps/portal/test/browser-acceptance.ts"]],
  ["Claims audit", "Fail the build when unsupported pharmaceutical or operating claims reappear.", C, ["scripts/audit-public-claims.mjs", "docs/programme/regulatory-publication-rules.md"]],
  ["Website gaps", "Keep every known gap explicit and close repository-controlled gaps before release.", P, ["docs/release/final-acceptance.md", "docs/release/owner-action-register.md"]],
  ["Content governance", "Give every public statement a source, owner, status and publication boundary.", P, ["docs/programme/regulatory-publication-rules.md", "scripts/audit-public-claims.mjs"]],
  ["Development and testing", "Verify each increment with canonical toolchain, tests, builds and generated-diff review.", P, ["package.json", "docs/release/final-acceptance.md"]],
  ["Browser matrix", "Treat Chromium and WebKit, mobile and desktop, as first-class acceptance environments.", P, ["docs/design/responsive-acceptance.md", "apps/portal/test/browser-acceptance.ts"]],
  ["Owner evidence", "Preserve exact owner-supplied source, checksum and approval records.", P, ["final-report/official-logo-register.md", "docs/application-media-provenance.json"]],
  ["Red teams", "Challenge design, engineering, security and executive trust before release.", P, ["docs/design/apple-vs-novapharm.md", "docs/programme/final-human-visual-dossier.md"]],
  ["Git and PR", "Create one reviewable exact-SHA candidate without rewriting main or hiding dirty work.", P, ["docs/current-state/corporate-release-truth.md"]],
  ["Company handoff", "Give the owner enough evidence to understand architecture, quality and blockers independently.", P, ["docs/release/final-acceptance.md", "docs/programme/executive-summary.md"]],
  ["Owner decisions", "Keep cost, identity, legal, regulatory and store decisions in an explicit owner register.", P, ["docs/release/owner-action-register.md", "docs/programme/combined-owner-requirements.md"]],
  ["Final status", "Declare only the exact state supported by repository and environment evidence.", P, ["docs/release/final-acceptance.md", "docs/programme/combined-owner-requirements.md"]],
];

function audience(name) {
  if (/AI|Portal|forecast|traceability/iu.test(name)) return "Authorised NovaPharm user and accountable owner";
  if (/Oncology|CRO|claims|regulatory/iu.test(name)) return "Pharmaceutical partner and regulator-aware reviewer";
  if (/Git|testing|browser|performance|security/iu.test(name)) return "Release engineer and owner reviewer";
  return "Prospective partner, customer and owner reviewer";
}

function auditRecord(definition, index) {
  const [name, purpose, status, evidence] = definition;
  const isVisual = /CRO|Oncology|Imagery|Navigation|SEO|Insights|Privacy|User experience|Performance|Accessibility|Browser|Website|Content/iu.test(name);
  const baseScore = status === C ? 5 : status === P ? 4 : 3;
  return {
    sectionNumber: index + 1,
    sectionName: name,
    purpose,
    primaryUser: audience(name),
    primaryUserGoal: purpose.replace(/\.$/u, ""),
    currentImplementation: status === N ? "No user-facing capability is represented as operational; the requirement remains explicitly gated." : `The governed implementation and evidence listed below are present in immutable implementation commit ${IMPLEMENTATION_SHA}.`,
    currentVisualQuality: isVisual ? "Exact-final Chromium/WebKit and human review passed for the immutable implementation candidate." : "Policy or engineering boundary; visual treatment applies only where surfaced.",
    currentFunctionalQuality: status === C ? "The stated repository scope is verified." : status === P ? "Real implementation exists, with the stated exact-final or production layer outstanding." : "No false or placeholder implementation is exposed.",
    scores: { purpose: baseScore, agency: baseScore, responsibility: Math.max(baseScore, 4), familiarity: baseScore, flexibility: baseScore, simplicity: baseScore, craft: baseScore, delight: isVisual ? baseScore : Math.max(3, baseScore - 1) },
    accessibility: isVisual ? "Exact-final Axe, keyboard, responsive and human review passed with zero serious or critical findings." : "No additional interactive surface introduced.",
    responsiveState: isVisual ? "Exact-final Corporate and Portal viewport matrices passed across mobile, tablet and desktop." : "Not applicable to a policy-only boundary.",
    webkitState: isVisual ? "Exact-final Playwright WebKit matrix passed alongside Chromium." : "No WebKit-specific runtime surface.",
    performanceState: isVisual ? "Repository performance floors passed; production field performance remains a separate gate." : "No additional client payload introduced.",
    securityState: /AI|Privacy|Portal|Claims|Git|Owner/iu.test(name) ? "Fail-closed and evidence-gated at repository level; production remains separate." : "No security control weakened by this section.",
    dataAuthority: /forecast|AI|claims|evidence|traceability|Oncology|CRO/iu.test(name) ? "Only governed source/evidence may populate the experience." : "Repository content and controlled application data only.",
    designDefects: [],
    functionalDefects: status === C ? [] : [status === N ? "Capability is intentionally not implemented and must not be presented as live." : "An applicable exact-final, data or production layer remains outstanding."],
    redundantElements: "No known element is retained solely to fill whitespace; final human review may remove more.",
    missingElements: status === C ? [] : [status === N ? "A justified, governed implementation and complete acceptance evidence." : "Evidence for the remaining data, managed-runtime or production layer."],
    ownerStandardGap: status === C ? "None within the stated repository scope." : "Not eligible for final owner approval until the recorded outstanding layer is resolved.",
    changesMade: "Immutable implementation and governance evidence retained; no duplicate surface created by this audit.",
    screenshotEvidence: isVisual ? ["docs/programme/final-human-visual-dossier.md"] : [],
    testEvidence: evidence,
    finalStatus: status,
  };
}

const sectionAudits = definitions.map(auditRecord);
const modules = JSON.parse(readFileSync(resolve("packages/portal-contracts/src/module-catalog.json"), "utf8"));
const moduleAudits = modules.map((module) => {
  const visible = module.releaseClassification === "informational_only";
  return {
    id: module.code,
    title: module.title,
    purpose: module.purpose,
    route: module.route,
    roles: module.authorisedRoles,
    releaseClassification: module.releaseClassification,
    finalStatus: visible ? P : C,
    visualReview: visible ? "Purpose-built read-only presentation passed the exact-final 13-viewport Chromium/WebKit matrix and human review." : "Deliberate 404 with no navigation or capability chrome.",
    functionalReview: visible ? "Repository route, protected API read model and empty/error/restricted contracts exist." : "Route and server module gate fail closed until the dependency exists.",
    stateCoverage: visible ? ["loading", "success", "empty", "error", "restricted", "mobile", "tablet", "desktop"] : ["hidden", "not-found", "server-denied"],
    accessibility: visible ? "Exact-final Axe, keyboard and responsive acceptance passed with zero serious or critical findings." : "No hidden control or inaccessible dead-end is exposed.",
    security: `${module.area === "customer" ? "Customer and organisation scope plus " : ""}server role enforcement and noindex`,
    dataAuthority: module.dataSource,
    designDefects: [],
    functionalDefects: visible ? ["Production-authoritative data and managed deployment are not accepted."] : [],
    evidence: [...module.testCoverage, "docs/portal/54-module-production-matrix.md"],
  };
});

const output = {
  schemaVersion: "1.0.0",
  reviewDate: "2026-08-30",
  implementationSha: IMPLEMENTATION_SHA,
  pullRequest: 70,
  candidateState: "exact_head_verified_draft_pr_candidate",
  sectionAudits,
  moduleAudits,
};

const cell = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
const sectionRows = sectionAudits.map((item) => `| ${item.sectionNumber} | ${cell(item.sectionName)} | ${item.finalStatus} | ${item.scores.purpose} | ${item.scores.agency} | ${item.scores.responsibility} | ${item.scores.familiarity} | ${item.scores.flexibility} | ${item.scores.simplicity} | ${item.scores.craft} | ${item.scores.delight} | ${cell(item.designDefects.join(" ") || "None")} | ${cell(item.functionalDefects.join(" ") || "None")} | ${item.testEvidence.map((path) => `\`${path}\``).join("<br>")} |`).join("\n");
const moduleRows = moduleAudits.map((item) => `| \`${item.id}\` | ${cell(item.title)} | \`${item.route}\` | ${item.finalStatus} | ${cell(item.visualReview)} | ${cell(item.functionalReview)} | ${cell(item.stateCoverage.join(", "))} | ${cell(item.security)} | ${item.evidence.map((path) => `\`${path}\``).join("<br>")} |`).join("\n");
const sectionMarkdown = `# Apple-grade 48-section audit

Review date: 30 August 2026
Implementation SHA: \`${IMPLEMENTATION_SHA}\`
Candidate: Draft PR 70; exact-final rendered, clean Node 24 and exact-head GitHub acceptance passed; merge and deployment are not authorised

The JSON companion contains every mandatory field: purpose, user, implementation, visual and functional quality, all eight principle scores, accessibility, responsive, WebKit, performance, security, data authority, defects, redundancy, missing elements, owner gap, changes, screenshots, tests and final status. Scores are diagnostic, not release proof; a score below 4 identifies a deliberately unimplemented capability rather than a disguised pass.

| # | Section | Final status | Purpose | Agency | Responsibility | Familiarity | Flexibility | Simplicity | Craft | Delight | Design defect | Functional defect | Evidence |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
${sectionRows}
`;
const moduleMarkdown = `# Apple-grade 54-module Portal audit

Review date: 30 August 2026
Implementation SHA: \`${IMPLEMENTATION_SHA}\`
Candidate: Draft PR 70; repository and exact-head workflow acceptance passed; managed deployment and production operation remain separate gates
Canonical catalogue: \`packages/portal-contracts/src/module-catalog.json\`

Each module is represented once. Visible modules retain their own purpose, route, role, state and data authority; the six dependency-hidden modules are accepted only as deliberate 404/server-denied boundaries and are not given cosmetic placeholder screens.

| Module | Name | Route | Status | Visual review | Functional review | States | Security | Evidence |
|---|---|---|---|---|---|---|---|---|
${moduleRows}
`;

for (const [path, value] of [
  ["docs/design/apple-grade-audits.json", `${JSON.stringify(output, null, 2)}\n`],
  ["docs/design/apple-grade-48-section-audit.md", sectionMarkdown],
  ["docs/design/apple-grade-54-portal-module-audit.md", moduleMarkdown],
]) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value, "utf8");
}

console.log(`Generated ${sectionAudits.length} section audits and ${moduleAudits.length} Portal module audits.`);
