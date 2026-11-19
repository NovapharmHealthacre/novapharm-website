import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = readFileSync(path.join(root, "components/concise-home.tsx"), "utf8");
const css = readFileSync(path.join(root, "app/homepage-editorial.css"), "utf8");
const layout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");

test("live Next.js homepage uses approved editorial architecture", () => {
  assert.match(source, /className="nph-editorial-home npd-apple-home"/);
  assert.match(source, /Medicine\. Where it needs to be\./);
  assert.match(source, /Three routes\. One evidence standard\./);
  assert.match(source, /className="npd-apple-oncology"/);
  assert.match(source, /className="npd-apple-nova-art"/);
  assert.match(source, /className="npd-apple-sourcing-grid"/);
  assert.match(source, /className="npd-apple-regulatory-notice"/);
  assert.equal((source.match(/<section\b/g) ?? []).length, 8, "retain eight focused editorial chapters");
  assert.match(layout, /import "\.\/homepage-editorial\.css"/);
  assert.match(css, /\.nph-editorial-home \.npd-apple-hero/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("live Next.js homepage is truthful and uses authentic product references", () => {
  assert.match(source, /Regulated wholesale supply has not commenced/);
  assert.match(source, /PLPI activity requires the relevant licence/);
  assert.match(source, /In development\. The adjacent graphic is an artistic concept/);
  assert.match(source, /nutraxinRegister\.products\.filter/);
  assert.match(source, /\[1, 5, 14\]/);
  assert.match(source, /product\.imageBase/);
  assert.match(source, /product\.altText/);
  assert.doesNotMatch(source, /lucide|<svg|<video|data-contact-form|data-login-form|Buy now|In stock/);
});

test("live homepage adopts responsive, accessible image views without rewriting approved artwork", () => {
  assert.match(source, /import \{ ContentImage \} from "@novapharm\/design-system"/);
  assert.equal((source.match(/<ContentImage\b/g) ?? []).length, 2, "retain one oncology image and one mapped Nutraxin view family");
  assert.match(source, /oncology-vial-handling-960\.avif 960w/);
  assert.match(source, /oncology-vial-handling\.webp 1600w/);
  assert.match(source, /Representative controlled pharmaceutical laboratory handling/);
  assert.match(source, /product\.altText/);
  assert.match(source, /fit="contain"/);
  assert.match(source, /fit="cover"/);
  assert.match(source, /In development\. The adjacent graphic is an artistic concept/);
});
