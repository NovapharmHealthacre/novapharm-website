import assert from "node:assert/strict";
import test from "node:test";
import { portalLink } from "../lib/portal-link";

test("missing or unsafe portal configuration stays on the access-status page", () => {
  for (const value of [undefined, "", "https://portal.example.invalid", "javascript:alert(1)", "http://portal.example.com", "https://user:password@portal.example.com", "not a URL"]) {
    assert.equal(portalLink(value), "/portal/");
  }
});

test("explicit HTTPS portal configuration retains its destination", () => {
  assert.equal(portalLink("https://portal.novapharmhealthcare.com"), "https://portal.novapharmhealthcare.com/");
});
