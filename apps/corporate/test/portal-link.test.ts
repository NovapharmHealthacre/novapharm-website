import assert from "node:assert/strict";
import test from "node:test";
import { portalLink, verifiedPortalUrl } from "../lib/portal-link";

test("the default desktop and mobile destination is the verified public sign-in page", () => {
  for (const value of [undefined, "", "https://portal.novapharmhealthcare.com", "https://portal.novapharmhealthcare.com/"]) {
    assert.equal(portalLink(value), verifiedPortalUrl);
  }
});

test("unsafe explicit portal configuration stays on the public access page", () => {
  for (const value of ["https://portal.example.invalid", "javascript:alert(1)", "http://portal.example.com", "https://user:password@portal.example.com", "not a URL"]) {
    assert.equal(portalLink(value), "/portal/");
  }
});

test("explicit HTTPS portal configuration retains its destination", () => {
  assert.equal(portalLink("https://portal.novapharmhealthcare.com/portal/"), verifiedPortalUrl);
  assert.equal(portalLink("https://approved-portal.example.com/access/"), "https://approved-portal.example.com/access/");
});
