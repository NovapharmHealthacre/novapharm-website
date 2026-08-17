import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const roots = [
  "apps/corporate/data/site.ts",
  "packages/content/src/index.ts",
  "src/content/site-content.mjs",
  "scripts/apply-owner-corrections.mjs",
  "creative-assets/asset-register.json",
  "index.html",
  "about",
  "leadership",
  "cro",
  "seo/generated",
  "assets/ai",
];

const obsoleteTitles = [
  ["Quality and Regulatory", "Adviser"].join(" "),
  ["Quality & Regulatory", "Adviser"].join(" "),
  ["Managing Director and", "Chief Operating Officer"].join(" "),
  ["Managing Director &", "Chief Operating Officer"].join(" "),
  ["Director and", "Chief Operating Officer"].join(" "),
  ["Director &", "Chief Operating Officer"].join(" "),
  ["Founder and", "Director"].join(" "),
];

function filesUnder(target) {
  const absolute = path.join(root, target);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) return [absolute];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return [];
    const child = path.join(target, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [path.join(root, child)];
  });
}

const files = roots.flatMap(filesUnder).filter((file) => /\.(?:html|json|mjs|ts|tsx)$/i.test(file));
const violations = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const obsoleteTitle of obsoleteTitles) {
    if (source.includes(obsoleteTitle)) violations.push(`${path.relative(root, file)}: ${obsoleteTitle}`);
  }
}

if (violations.length) {
  throw new Error(`Obsolete current leadership title found:\n${violations.join("\n")}`);
}

const peopleSource = readFileSync(path.join(root, "packages/content/src/index.ts"), "utf8");
const required = [
  'publicTitle: "Chief Executive Officer"',
  'publicTitle: "Chief Operating Officer"',
  'publicTitle: "Chief Scientific Officer"',
  'publicTitle: "Chief Medical Director"',
  'publicTitle: "Chief Technology Officer and Responsible Person"',
  'executiveRole: "Chief Technology Officer"',
  'title: "Responsible Person"',
  'documentaryEvidenceState: "pending_evidence"',
];
for (const value of required) {
  if (!peopleSource.includes(value)) throw new Error(`Canonical people registry is missing ${value}`);
}

/* Canonical owner-approved leadership source must never regress before build. */
const canonicalLeadershipSources = [
  "packages/content/src/index.ts",
  "src/content/site-content.mjs",
  "apps/corporate/data/site.ts"
];
for (const relative of canonicalLeadershipSources) {
  const source = readFileSync(path.join(root, relative), "utf8");
  if (source.includes("Chief Technical Director")) {
    throw new Error(`${relative} contains Dr Girish's superseded Chief Technical Director title.`);
  }
  if (!source.includes("Chief Scientific Officer")) {
    throw new Error(`${relative} is missing Dr Girish's approved Chief Scientific Officer title.`);
  }
}

for (const [relative, portrait] of [
  ["src/content/site-content.mjs", "/assets/vishalchakravarty.png"],
  ["src/content/site-content.mjs", "/assets/prabhakarvitthallahare.png"],
  ["src/content/site-content.mjs", "/assets/girishshantilalachliya.png"],
  ["apps/corporate/data/site.ts", "/assets/vishalchakravarty.png"],
  ["apps/corporate/data/site.ts", "/assets/prabhakarvitthallahare.png"],
  ["apps/corporate/data/site.ts", "/assets/girishshantilalachliya.png"]
]) {
  const source = readFileSync(path.join(root, relative), "utf8");
  if (!source.includes(portrait)) throw new Error(`${relative} is missing approved portrait reference ${portrait}`);
}

const nishitaProfile = readFileSync(path.join(root, "leadership/nishita-trivedi/index.html"), "utf8");
if (!nishitaProfile.includes("Chief Technology Officer and Responsible Person")) throw new Error("Dr Nishita's canonical public title is missing from her profile.");
if (!/not a statutory director/i.test(nishitaProfile)) throw new Error("Dr Nishita's statutory-governance boundary is missing.");
if (!/does not imply|does not confer|does not state or imply/i.test(nishitaProfile)) throw new Error("Dr Nishita's regulated-authority boundary is missing.");

console.log(`Leadership-title validation passed across ${files.length} current public and source files.`);
