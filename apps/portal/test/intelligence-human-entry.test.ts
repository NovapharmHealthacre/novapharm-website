import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = (name: string) => readFileSync(path.join(process.cwd(), name), "utf8");

test("approved human secure entry uses the exact Intelligence brand and owner copy", () => {
  const view = source("components/intelligence-sign-in.tsx");
  const styles = source("components/intelligence-sign-in.module.css");
  assert.match(view, /novapharm-intelligence-approved\.svg/);
  assert.match(view, /A more human/);
  assert.match(view, /intelligence for/);
  assert.match(view, /medicine\./);
  assert.match(view, /SECURE PORTAL/);
  assert.match(styles, /npi-human-portrait-approved\.webp/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /max-width:760px/);
  assert.ok(existsSync("../../assets/media/portal/npi-human-portrait-approved.webp"));
  const image = readFileSync("../../assets/media/portal/npi-human-portrait-approved.webp");
  assert.equal(image.length, 86844, "exact approved full-size photographic crop must ship");
  assert.equal(createHash("sha256").update(image).digest("hex"), "7f895e0b7c4ef21314b2555d972e4147cf675b98cc5b6272c708b6726e0b0950");
  assert.match(styles, /background-size:100% 100%/);
  assert.doesNotMatch(styles, /background-size:cover/);
});

test("visual redesign preserves Cognito and customer security boundaries", () => {
  const view = source("components/intelligence-sign-in.tsx");
  const sync = source("scripts/sync-public-assets.mjs");
  assert.match(view, /href="\/auth\/customer\/start"/);
  assert.match(view, /href="\/auth\/customer\/start\?mode=reset"/);
  assert.match(view, /href="\/auth\/customer\/register"/);
  assert.match(view, /fetch\("\/customer\/session"/);
  assert.match(view, /fetch\("\/customer\/logout"/);
  assert.match(view, /response\.ok/);
  assert.match(view, /autoComplete="current-password"/);
  assert.match(view, /completeCognitoCardSignIn/);
  assert.match(view, /beginCognitoCardSignIn/);
  assert.doesNotMatch(view, /localStorage|sessionStorage/);
  assert.doesNotMatch(view, /fetch\("\/auth\/customer\/login"|bypass|mock-user/);
  assert.match(sync, /assets\/media\/portal\/npi-human-portrait-approved\.webp/);
});
