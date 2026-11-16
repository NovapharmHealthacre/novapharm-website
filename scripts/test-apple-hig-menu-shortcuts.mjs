import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const staticManifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));
const corporateManifest = readFileSync("apps/corporate/app/manifest.ts", "utf8");

test("public site and Next.js corporate PWA shortcuts match", () => {
  const expected = [
    { name: "Browse Products", url: "/products/" },
    { name: "Contact NovaPharm", url: "/contact/" },
  ];
  assert.equal(staticManifest.scope, "/");
  assert.equal(staticManifest.shortcuts?.length, expected.length);
  for (const { name, url } of expected) {
    const shortcut = staticManifest.shortcuts.find((entry) => entry.url === url);
    assert.ok(shortcut, url + " is absent");
    assert.equal(shortcut.name, name);
    assert.equal(typeof shortcut.short_name, "string");
    assert.ok(shortcut.short_name.length > 0);
    assert.ok(shortcut.description.length > 0);
    assert.ok(corporateManifest.includes('name: "' + name + '"'));
    assert.ok(corporateManifest.includes('url: "' + url + '"'));
    assert.ok(readFileSync(url.slice(1) + "index.html", "utf8").includes('<link rel="canonical"'));
  }
});

test("shortcuts are relative, safe, and never point to protected workspaces", () => {
  const forbidden = /portal|intelligence|employee|customer|session|auth|invoice|medicine|stock|payment/i;
  for (const shortcut of staticManifest.shortcuts) {
    assert.match(shortcut.url, /^\/[a-z0-9-/]+\/$/);
    assert.doesNotMatch(shortcut.url, forbidden);
    assert.doesNotMatch(shortcut.url, /[?#]/);
    assert.doesNotMatch(shortcut.name + shortcut.short_name, /delete|approve|dispatch/i);
  }
});
