import assert from "node:assert/strict";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const applicationRoot = process.cwd();
const repositoryRoot = path.resolve(applicationRoot, "../..");
const sourceRoot = path.join(repositoryRoot, "assets");
const publicRoot = path.join(applicationRoot, "public", "assets");

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });
await Promise.all([
  cp(path.join(sourceRoot, "brand"), path.join(publicRoot, "brand"), { recursive: true }),
  cp(path.join(sourceRoot, "media"), path.join(publicRoot, "media"), { recursive: true }),
  cp(path.join(sourceRoot, "vishalchakravarty.jpeg"), path.join(publicRoot, "vishalchakravarty.jpeg")),
  cp(path.join(sourceRoot, "prabhakarvitthallahare.jpeg"), path.join(publicRoot, "prabhakarvitthallahare.jpeg")),
  cp(path.join(sourceRoot, "girishshantilalachliya.jpeg"), path.join(publicRoot, "girishshantilalachliya.jpeg")),
]);

const logo = await readFile(path.join(publicRoot, "brand", "novapharm-healthcare-logo.svg"), "utf8");
assert.match(logo, /#E3120B/i, "Official corporate logo does not use the approved identity red");
assert.doesNotMatch(logo, /<text\b/i, "Official corporate logo must remain path-based");
console.log("Corporate public media synchronised from the approved repository asset register.");
