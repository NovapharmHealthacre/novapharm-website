import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());

function update(path, transformations) {
  const target = join(root, path);
  let html = readFileSync(target, "utf8");
  for (const [search, replacement, label] of transformations) {
    if (typeof search === "string" && html.includes(replacement)) continue;
    const next = html.replace(search, replacement);
    if (next === html) throw new Error(`Could not normalise ${label} in ${path}.`);
    html = next;
  }
  writeFileSync(target, html);
}

update("index.html", [
  ['<div class="batch-integrity-media">', '<figure class="batch-integrity-media">', "batch-integrity figure start"],
  ['</figcaption></div><div class="batch-integrity-copy">', '</figcaption></figure><div class="batch-integrity-copy">', "batch-integrity figure end"]
]);

for (const path of ["services/index.html", "regulatory-services/index.html", "partner-with-us/index.html"]) {
  update(path, [
    ['<div class="service-visual-media">', '<figure class="service-visual-media">', "service visual figure start"],
    ['</figcaption></div><div class="service-visual-copy">', '</figcaption></figure><div class="service-visual-copy">', "service visual figure end"]
  ]);
}

console.log("Visual media panels normalised to semantic figure and figcaption markup.");
