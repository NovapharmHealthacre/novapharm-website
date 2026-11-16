import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationPreferenceEditor } from "../src/index.ts";

const serverRecord = {
  verified: true,
  revision: "verified-revision-1",
  topics: [
    { id: "optional-product-news", label: "Optional product news", description: "Relevant product information", enabled: false, editable: true },
    { id: "regulated-required", label: "Mandatory service message", enabled: true, editable: false },
  ],
} as const;

test("notification preferences fail closed when server record is missing or unverified", () => {
  for (const record of [null, { ...serverRecord, verified: false }, { ...serverRecord, revision: "" }]) {
    const markup = renderToStaticMarkup(<NotificationPreferenceEditor record={record}
      onSave={async () => ({ ok: true, revision: "r2" })} />);
    assert.match(markup, /authorised preferences have not been loaded/);
    assert.doesNotMatch(markup, /Optional product news|Mandatory service message|Save notification choices/);
  }
});

test("authenticated notification choices are read-only until approved save service exists", () => {
  const markup = renderToStaticMarkup(<NotificationPreferenceEditor record={serverRecord} />);
  assert.match(markup, /Optional product news/);
  assert.match(markup, /Mandatory service message/);
  assert.match(markup, /These preferences are currently read-only/);
  assert.doesNotMatch(markup, /Save notification choices/);
  assert.match(markup, /<fieldset[^>]*disabled=""/);
});

test("enabled preference form keeps required topics immutable and never asserts a save on render", () => {
  const markup = renderToStaticMarkup(<NotificationPreferenceEditor record={serverRecord}
    onSave={async () => ({ ok: true, revision: "r2" })} />);
  assert.match(markup, /Save notification choices/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /<form[^>]*aria-busy="false"/);
  assert.match(markup, /No notification choices have been changed/);
  assert.doesNotMatch(markup, /choices were confirmed by the authorised account service/);
});
