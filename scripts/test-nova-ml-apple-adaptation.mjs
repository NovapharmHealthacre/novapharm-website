import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("four unique Nova ML extensions do not modify the canonical 22 research workspaces", () => {
  const catalogue = source("apps/portal/data/nova-ml-modules.ts");
  const original = source("apps/portal/data/intelligence-workspaces.ts");
  const slugs = [...catalogue.matchAll(/slug: "(nova-[a-z-]+)"/g)].map((match) => match[1]);
  assert.deepEqual(slugs, [
    "nova-ml-studio",
    "nova-core-runtime",
    "nova-device-intelligence",
    "nova-generative-assist"
  ]);
  assert.equal(new Set(slugs).size, 4);
  assert.equal([...original.matchAll(/slug: "/g)].length, 22);
  assert.match(catalogue, /isNovaMlWorkspaceSlug/);
  assert.match(catalogue, /novaMlExperienceGuidance/);
  for (const pattern of [/feedback:/, /calibration:/, /correction:/, /attribution:/, /confidence:/, /limitation:/, /fallback:/]) assert.match(catalogue, pattern);
  assert.doesNotMatch(catalogue, /productionApproved: true|state: "live"/);
});

test("four extensions use existing verified SSR portal routing, not public bypasses", () => {
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
  assert.match(view, /<NovaMlWorkspace kind=\{current\}/);
  assert.match(view, /Nova ML · Apple companion/);
  assert.match(view, /!isNovaMlWorkspaceSlug\(key\)/);
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
  assert.match(doc, /not production deployed/i);
  assert.match(doc, /Xcode/);
  assert.match(doc, /in-memory transcript/);
  assert.match(doc, /Core ML provenance gate/);
  assert.match(doc, /on-device-only recognition/);
  assert.match(doc, /video\/action classification/i);
});
