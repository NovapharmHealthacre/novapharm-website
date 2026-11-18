import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("four Apple ML extensions and one gated model-research extension preserve the canonical 22 workspaces", () => {
  const catalogue = source("apps/portal/data/nova-ml-modules.ts");
  const original = source("apps/portal/data/intelligence-workspaces.ts");
  const slugs = [...catalogue.matchAll(/slug: "(nova-[a-z-]+)"/g)].map((match) => match[1]);
  assert.deepEqual(slugs, [
    "nova-ml-studio",
    "nova-core-runtime",
    "nova-device-intelligence",
    "nova-generative-assist",
    "nova-model-microscope"
  ]);
  assert.equal(new Set(slugs).size, 5);
  assert.equal([...original.matchAll(/slug: "/g)].length, 22);
  assert.match(catalogue, /isNovaMlWorkspaceSlug/);
  assert.match(catalogue, /novaMlExperienceGuidance/);
  for (const pattern of [/feedback:/, /calibration:/, /correction:/, /attribution:/, /confidence:/, /limitation:/, /fallback:/]) assert.match(catalogue, pattern);
  assert.doesNotMatch(catalogue, /productionApproved: true|state: "live"/);
});

test("all five extensions use existing verified SSR portal routing, not public bypasses", () => {
  const routes = source("apps/portal/data/routes.ts");
  const page = source("apps/portal/app/[[...slug]]/page.tsx");
  const view = source("apps/portal/components/medicines-intelligence.tsx");
  assert.match(routes, /\.\.\.novaMlWorkspaceSlugs/);
  assert.match(routes, /const novaMlPrefix = "\/portal\/executive-platform\/nova-ml\/"/);
  assert.match(routes, /if \(normalised === novaMlPrefix \|\| normalised.startsWith\(novaMlPrefix\)\)/);
  assert.match(routes, /portalModuleByCode\.get\("executive\.nhs-data"\)/);
  assert.match(page, /verifiedPortalSession/);
  assert.match(page, /sessionDecision\(view, session\)/);
  assert.match(page, /if \(decision !== "allow"\) redirect\("\/"\)/);
  assert.match(view, /isNovaMlWorkspaceSlug\(current\)/);
  assert.match(view, /<NovaMlWorkspace key=\{current\} kind=\{current\}/);
  assert.match(view, /Nova ML & interpretability/);
  assert.match(view, /!isNovaMlWorkspaceSlug\(key\)/);
  assert.match(view, /const isNovaMlView = isNovaMlWorkspaceSlug\(current\)/);
  assert.match(view, /if \(isNovaMlView\) return;/);
  assert.match(view, /isNovaMlView \? styles\.novaMlCanvas : styles\.workspaceGrid/);
  assert.match(view, /!isNovaMlView \? <aside id="medicines-context-panel"/);
  assert.match(view, /isNovaMlView \? <p className=\{styles\.novaMlToolbarTitle\}/);
});

test("Nova ML does not fetch the unrelated Medicines Intelligence module snapshot", () => {
  const dashboard = source("apps/portal/components/dashboard.tsx");
  const ml = source("apps/portal/components/medicines-intelligence.tsx");
  assert.match(dashboard, /isNovaMlWorkspaceSlug\(subview \?\? ""\)/);
  assert.match(dashboard, /const privateModelGovernance = module\.code === "executive\.nhs-data"/);
  assert.match(dashboard, /const moduleSnapshot: Snapshot = privateModelGovernance/);
  assert.match(dashboard, /\? \{/);
  assert.match(dashboard, /: await gatewayJson<Snapshot>\(/);
  assert.match(dashboard, /\[module, subview\]/);
  assert.match(ml, /<NovaMlWorkspace key=\{current\} kind=\{current\}/);
});

test("new web UI cannot imply native inference or capture personal data", () => {
  const panel = source("apps/portal/components/nova-ml-workspaces.tsx");
  const css = source("apps/portal/components/nova-ml-workspaces.module.css");
  assert.match(panel, /Integration candidate, not an active AI service/);
  assert.match(panel, /does not train models, invoke Core ML/);
  assert.match(panel, /selections stay in this tab and are not saved/);
  assert.match(panel, /source-first fallback/);
  assert.match(panel, /designRows\.map/);
  assert.match(panel, /Apple HIG machine-learning experience contract/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /type="checkbox"/);
  assert.match(panel, /Clear selections/);
  assert.doesNotMatch(panel, /\bfetch\(|localStorage|sessionStorage|indexedDB|navigator\.mediaDevices|geolocation|data:application\/json|model\.predict/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 680px/);
  assert.match(css, /contractGrid/);
});

test("native candidates fail closed and require trusted model/data permits", () => {
  const trainer = source("native/novapharm-intelligence-apple/NovaCreateMLTrainer.swift");
  const runtime = source("native/novapharm-intelligence-apple/NovaCoreMLRuntime.swift");
  const generator = source("native/novapharm-intelligence-apple/NovaFoundationModelsAssist.swift");
  assert.match(trainer, /import CreateML/);
  assert.match(trainer, /import TabularData/);
  assert.match(trainer, /independentHoldoutApproved/);
  assert.match(trainer, /MLModelMetadata/);
  assert.match(trainer, /MLTextClassifier/);
  assert.match(trainer, /productionApproved: Bool = false/);
  assert.match(runtime, /import CoreML/);
  assert.match(runtime, /approvedForNonClinicalUse/);
  assert.match(runtime, /MLDictionaryFeatureProvider/);
  assert.match(runtime, /inputSchemaMismatch/);
  assert.match(runtime, /metadata\[\.versionString\]/);
  assert.match(runtime, /metadata\[\.license\]/);
  assert.match(trainer, /metrics\.isValid/);
  assert.match(trainer, /MLSplitStrategy/);
  assert.match(trainer, /fixedValidationSeed/);
  assert.match(trainer, /fixedValidationRatio/);
  assert.match(trainer, /classBalanceAndLeakageReviewed/);
  assert.match(trainer, /translatedCreateMLError/);
  assert.match(generator, /import FoundationModels/);
  assert.match(generator, /SystemLanguageModel\.default\.isAvailable/);
  assert.match(generator, /explicitlyRequestedByUser/);
  assert.match(generator, /humanReviewRequired: Bool = true/);
  assert.match(generator, /publicationApproved: Bool = false/);
  assert.match(generator, /Foundation Models keeps a transcript|Apple maintains a transcript/);
  const language = source("native/novapharm-intelligence-apple/NovaLanguageIntelligence.swift");
  const speech = source("native/novapharm-intelligence-apple/NovaSpeechIntelligence.swift");
  assert.match(language, /import NaturalLanguage/);
  assert.match(language, /NLLanguageRecognizer/);
  assert.match(language, /NLTokenizer/);
  assert.match(language, /trustedSourceApproved/);
  assert.match(language, /containsPatientOrRestrictedContent/);
  assert.doesNotMatch(language, /URLSession|AVCaptureSession|SpeechRecognizer|localStorage/);
  assert.match(speech, /import Speech/);
  assert.match(speech, /SFSpeechURLRecognitionRequest/);
  assert.match(speech, /supportsOnDeviceRecognition/);
  assert.match(speech, /requiresOnDeviceRecognition = true/);
  assert.match(speech, /authorizationStatus\(\) == \.authorized/);
  assert.match(speech, /shouldReportPartialResults = false/);
  assert.doesNotMatch(speech, /AVCaptureSession|AVAudioEngine|URLSession|requestAuthorization/);
  const vision = source("native/novapharm-intelligence-apple/NovaDocumentIntelligence.swift");
  const intents = source("native/novapharm-intelligence-apple/NovaResearchAppIntent.swift");
  assert.match(vision, /import Vision/);
  assert.match(vision, /VNRecognizeTextRequest/);
  assert.match(vision, /userExplicitlySelectedImage/);
  assert.match(vision, /containsPatientOrSensitiveData/);
  assert.match(intents, /import AppIntents/);
  assert.match(intents, /openAppWhenRun: Bool = true/);
  assert.doesNotMatch(intents, /\bURLSession\b|\bfetch\(/);
  for (const swift of [trainer, runtime, generator]) {
    assert.doesNotMatch(swift, /\bURLSession\b|\bNSCameraUsageDescription\b|\bAVCaptureSession\b/);
  }
});

test("Nova ML-only GitHub pushes skip unrelated AWS contact publication", () => {
  const workflow = source(".github/workflows/dispatch-approved-aws-contact-release.yml");
  assert.match(workflow, /id: private_release/);
  assert.match(workflow, /private_only=true/);
  assert.match(workflow, /apps\/portal\/\*/);
  assert.match(workflow, /native\/novapharm-intelligence-apple\/\*/);
  assert.match(workflow, /scripts\/test-nova-ml-apple-adaptation\.mjs/);
  assert.match(workflow, /scripts\/aws\/contact-release-routing\.test\.mjs/);
  assert.match(workflow, /git diff --name-only/);
  assert.match(workflow, /changed_any/);
  assert.match(workflow, /if: steps\.private_release\.outputs\.skip != 'true'/);
  assert.match(workflow, /if: steps\.private_release\.outputs\.skip != 'true' && steps\.publisher\.outputs\.skip != 'true'/);
});

test("Apple guidance map and live release gates are documented", () => {
  const doc = source("docs/design/novapharm-apple-machine-learning-adaptation-20261116.md");
  assert.match(doc, /machine-learning/);
  assert.match(doc, /create-ml-utilties/);
  assert.match(doc, /mlsplitstrategy/);
  assert.match(doc, /mlmodelmetadata/);
  assert.match(doc, /mlcreateerror/);
  assert.match(doc, /live-video-feed/);
  assert.match(doc, /recording-or-choosing-training-videos/);
  assert.match(doc, /privacy/);
  assert.match(doc, /coreml/);
  assert.match(doc, /not independently verified deployed/i);
  assert.match(doc, /Xcode/);
  assert.match(doc, /in-memory transcript/);
  assert.match(doc, /Core ML provenance gate/);
  const packageManifest = source("native/novapharm-intelligence-apple/Package.swift");
  const nativeTests = source("native/novapharm-intelligence-apple/Tests/NovaMLAppleTests.swift");
  const nativeWorkflow = source(".github/workflows/nova-ml-native-apple.yml");
  const privacyChecklist = source("native/novapharm-intelligence-apple/APP_PRIVACY_CHECKLIST.md");
  assert.match(packageManifest, /\.library\(name: "NovaMLApple"/);
  assert.match(packageManifest, /NovaSpeechIntelligence\.swift/);
  assert.match(packageManifest, /NovaLanguageIntelligence\.swift/);
  assert.match(nativeTests, /testCoreMLRejectsMissingModelApproval/);
  assert.match(nativeTests, /testSpeechRejectsUnapprovedFile/);
  assert.match(nativeWorkflow, /macos-latest/);
  assert.match(nativeWorkflow, /swift test --package-path native\/novapharm-intelligence-apple/);
  assert.match(privacyChecklist, /NSSpeechRecognitionUsageDescription/);
  assert.match(doc, /Native package and CI acceptance/);
  assert.match(doc, /on-device-only recognition/);
  assert.match(doc, /video\/action classification/i);
});

test("every referenced Nova ML CSS module class has a declared type and a concrete stylesheet selector", () => {
  const panel = source("apps/portal/components/nova-ml-workspaces.tsx");
  const css = source("apps/portal/components/nova-ml-workspaces.module.css");
  const declaration = source("apps/portal/components/nova-ml-workspaces.module.css.d.ts");
  const used = new Set([...panel.matchAll(/\bstyles\.([A-Za-z][A-Za-z0-9]*)/g)].map(match => match[1]));
  assert.ok(used.size >= 20, "expected the complete Nova ML workspace style surface");
  for (const key of used) {
    assert.match(css, new RegExp("\\." + key + "(?![A-Za-z0-9_-])"), "missing stylesheet selector: " + key);
    assert.match(declaration, new RegExp("\\b" + key + ": string;"), "missing typed CSS-module class: " + key);
  }
});
