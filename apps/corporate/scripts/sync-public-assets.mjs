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
  cp(path.join(sourceRoot, "vishalchakravarty.png"), path.join(publicRoot, "vishalchakravarty.png")),
  cp(path.join(sourceRoot, "prabhakarvitthallahare.png"), path.join(publicRoot, "prabhakarvitthallahare.png")),
  cp(path.join(sourceRoot, "girishshantilalachliya.png"), path.join(publicRoot, "girishshantilalachliya.png")),
]);

const logo = await readFile(path.join(publicRoot, "brand", "novapharm-healthcare-logo.svg"), "utf8");
assert.match(logo, /Novapharm|NovaPharm/i, "Official corporate logo was not copied");
console.log("Corporate public media synchronised from the approved repository asset register.");
