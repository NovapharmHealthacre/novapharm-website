import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const edits = [];

function updateManifest(relativePath, mutate) {
  const path = resolve(root, relativePath);
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const before = JSON.stringify(manifest);
  mutate(manifest);
  if (JSON.stringify(manifest) !== before) {
    writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
    edits.push(relativePath);
  }
}

updateManifest("package.json", (pkg) => {
  if (pkg.dependencies?.["@azure/identity"] !== "4.13.1") throw Error("Unexpected Azure Identity baseline, abort");
  pkg.dependencies["@azure/identity"] = "4.14.1";
  pkg.dependencies["@azure/monitor-opentelemetry"] = "1.21.0";
  pkg.devDependencies["js-yaml"] = "3.15.2";
  if (pkg.dependencies?.mssql === "12.6.0") pkg.dependencies.mssql = "12.7.0";
  if (pkg.devDependencies?.sharp === "0.35.3") pkg.devDependencies.sharp = "0.35.5";
  if (pkg.overrides?.["next@16.2.12"] && !pkg.overrides?.["next@16.4.5"]) {
    pkg.overrides["next@16.4.5"] = pkg.overrides["next@16.2.12"];
    delete pkg.overrides["next@16.2.12"];
  }
  pkg.overrides["sharp"] = "0.35.5";
  pkg.overrides["js-yaml"] = "3.15.2";
  pkg.overrides["source-map-js"] = "1.2.2";
  pkg.overrides["@grpc/grpc-js"] = "1.14.6";
});

for (const app of ["corporate", "portal", "technology", "founder", "status"]) {
  updateManifest(`apps/${app}/package.json`, (pkg) => {
    if (pkg.dependencies?.next !== "16.2.12") throw Error(`Unexpected Next.js baseline in ${app}, abort`);
    pkg.dependencies.next = "16.4.5";
    if (pkg.dependencies?.sharp === "0.35.3") pkg.dependencies.sharp = "0.35.5";
  });
}
console.log(JSON.stringify({ securityCandidate: true, updated: edits, productionApproved: false }, null, 2));
