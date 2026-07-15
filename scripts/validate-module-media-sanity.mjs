import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const read = (path) => readFileSync(join(root, path), "utf8");
const register = JSON.parse(read("docs/module-media-register.json"));

assert.equal(register.modules.length, 16, "exactly sixteen public modules must be registered");
assert.equal(new Set(register.modules.map((entry) => entry.id)).size, 16, "module IDs must be unique");
assert.equal(new Set(register.modules.map((entry) => entry.path)).size, 16, "module paths must be unique");

for (const module of register.modules) {
  const html = read(module.path);
  if (module.id === "home") {
    assert.match(html, /hero-cinematic-layer/, "homepage cinematic hero must remain present");
    assert.match(html, /data-module-media="partner-ecosystem"/, "homepage partner ecosystem must use the tailored cinematic composition");
    continue;
  }
  assert.match(html, new RegExp(`data-module-media="${module.id}"`), `${module.id} must have a module-specific hero`);
  assert.match(html, /module-signal/, `${module.id} must have a subject-specific signal layer`);
  assert.doesNotMatch(html, /assets\/media\/editorial\/[^\"]+\.svg/, `${module.id} must not retain editorial illustration assets`);
}

for (const path of ["services/index.html", "regulatory-services/index.html", "partner-with-us/index.html", "technology/index.html"]) {
  assert.match(read(path), /module-signal/, `${path} must include tailored operational motion`);
}
assert.match(read("regulatory-services/index.html"), /regulatory-control-stage/, "Regulatory must use the dedicated control sequence");
assert.doesNotMatch(read("regulatory-services/index.html"), /class="regulatory-stage-media"/, "Regulatory must not repeat the laboratory photograph in the control stage");
assert.match(read("leadership/index.html"), /module-portrait-composition/, "Leadership must use the approved portrait composition");
assert.match(read("product-portfolio/index.html"), /portfolio-media/, "Product Portfolio must retain category-specific product media");
assert.doesNotMatch(read("index.html"), /partner-ecosystem-grid/, "Homepage must not duplicate the product-style eight-image grid");

const css = read("assets/css/module-media-sanity.css");
assert.match(css, /page-hero-cinematic/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /modulePhotoDrift/);

console.log("Sixteen-module media sanity passed: tailored photography, distinct motion language, no editorial SVG fallbacks, preserved product media and reduced-motion support.");
