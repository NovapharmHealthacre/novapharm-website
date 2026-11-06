import { readFileSync, writeFileSync } from "node:fs";

const workspaceFiles = [
  "apps/corporate/package.json",
  "apps/founder/package.json",
  "apps/portal/package.json",
  "apps/status/package.json",
  "apps/technology/package.json"
];
function edit(path, callback) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  callback(data);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
edit("package.json", (json) => {
  if (!json.dependencies?.["@azure/identity"] || !json.dependencies?.["@azure/monitor-opentelemetry"]) throw new Error("Azure migration dependencies differ from the recorded inventory");
  json.dependencies["@azure/identity"] = "4.14.1";
  json.dependencies["@azure/monitor-opentelemetry"] = "1.21.0";
  if (!json.overrides?.["next@16.2.12"] || !json.overrides?.sharp) throw new Error("Expected root overrides changed: inspect manually");
  json.overrides["next@16.4.5"] = json.overrides["next@16.2.12"];
  delete json.overrides["next@16.2.12"];
  json.overrides.sharp = "0.35.5";
  json.overrides["js-yaml"] = "3.15.2";
  json.overrides["@grpc/grpc-js"] = "1.14.6";
  json.overrides["source-map-js"] = "1.2.2";
  if (json.devDependencies?.sharp) json.devDependencies.sharp = "0.35.5";
});
for (const path of workspaceFiles) {
  edit(path, (json) => {
    if (json.dependencies?.next !== "16.2.12" || json.dependencies?.sharp !== "0.35.3") {
      throw new Error(path + ": Next or Sharp changed; review required before modifying dependency");
    }
    json.dependencies.next = "16.4.5";
    json.dependencies.sharp = "0.35.5";
  });
}
console.log("Updated package manifests; regenerate exact lockfile, audit and run regressions before merge.");
