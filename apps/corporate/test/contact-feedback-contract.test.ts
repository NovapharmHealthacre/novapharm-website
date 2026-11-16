import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactExperience } from "../components/contact-experience";

test("managed contact exposes busy state and preserves explicit error/success feedback", () => {
  const html = renderToStaticMarkup(createElement(ContactExperience, { managedEnabled: true }));
  assert.match(html, /<form[^>]*aria-busy="false"/);
  assert.match(html, /name="privacyAcknowledgement"/);
  assert.match(html, /name="safetyConfirmation"/);
  assert.match(html, /Send enquiry/);
  assert.match(html, /role="status" aria-live="polite"/);
});

test("managed contact prevents duplicate concurrent POST and snapshots validated form before CSRF await", () => {
  const source = readFileSync(path.join(process.cwd(), "components/contact-workflow.tsx"), "utf8");
  const index = (value: string) => source.indexOf(value);
  assert.ok(index("if (inFlightRef.current) return;") > index("event.preventDefault();"));
  assert.ok(index("inFlightRef.current = true;") > index("if (!form.reportValidity()) return;"));
  assert.ok(index("const data = new FormData(form);") < index('fetch(platformEndpoint("/security/csrf")'));
  assert.ok(index("inFlightRef.current = false;") > index("} finally {"));
  assert.match(source, /receipt\.ok !== true \|\| !receipt\.lead\?\.id/);
  assert.match(source, /disabled=\{state === "sending"\}/);
  assert.match(source, /aria-busy=\{state === "sending"\}/);
  assert.match(source, /statusRef\.current\?\.focus\(\)/);
});
