import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

for (const name of ["novapharm-healthcare-logo.svg", "novapharm-healthcare-logo.png"]) {
  const source = fs.readFileSync(path.resolve(process.cwd(), "../../assets/brand", name));
  const deployed = fs.readFileSync(path.resolve(process.cwd(), "public/assets/brand", name));
  assert.equal(createHash("sha256").update(deployed).digest("hex"), createHash("sha256").update(source).digest("hex"), `${name} must match the approved master`);
}

const pageSource = fs.readFileSync(path.resolve(process.cwd(), "app/page.tsx"), "utf8");
assert.match(pageSource, /sanitised endpoint availability/i);
assert.doesNotMatch(pageSource, /connection string|tenant id|subscription id|stack trace/i);
console.log("Status validation passed: sanitised service contract and byte-identical official branding.");
