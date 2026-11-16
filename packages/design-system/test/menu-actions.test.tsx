import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ActionToolbar, BinaryToggle, ChoicePicker, CommandMenu, SegmentedChoice, SharePublicLink,
} from "../src/index.ts";

test("pull-down renders an accessible native disclosure with a clear action hierarchy", () => {
  const html = renderToStaticMarkup(<CommandMenu label="Document Actions" actions={[
    { id: "open", label: "Open Document", href: "/documents/1" },
    { id: "export", label: "Export…", onSelect: () => {}, dividerBefore: true },
    { id: "empty", label: "Unavailable" },
  ]} />);
  assert.match(html, /<details[^>]*class="np-command-menu/);
  assert.match(html, /<summary[^>]*>Document Actions/);
  assert.match(html, /href="\/documents\/1"/);
  assert.match(html, /np-command-menu__separated/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Unavailable<\/button>/);
  assert.doesNotMatch(html, /role="menu"/);
});

test("destructive actions fail closed without explicit confirmation and handlers", () => {
  const html = renderToStaticMarkup(<CommandMenu label="Record Actions" actions={[
    { id: "unsafe", label: "Delete Record", href: "/delete", destructive: true },
    { id: "mixed", label: "Delete Document", href: "/delete", onSelect: () => {}, destructive: true, confirmationMessage: "Delete?" },
    { id: "unconfirmed", label: "Remove", onSelect: () => {}, destructive: true },
    { id: "confirmed", label: "Delete Draft", onSelect: () => {}, destructive: true,
      confirmationMessage: "Permanently delete this draft?" },
  ]} />);
  assert.doesNotMatch(html, /href="\/delete"/);
  assert.match(html, /disabled=""[^>]*>Delete Record<\/button>/);
  assert.match(html, /disabled=""[^>]*>Remove<\/button>/);
  assert.match(html, />Delete Document<\/button>/);
  assert.match(html, /np-command-action--destructive/);
  assert.match(html, />Delete Draft<\/button>/);
});

test("toolbar keeps primary actions visible and secondary commands in disclosure", () => {
  const html = renderToStaticMarkup(<ActionToolbar label="Invoice Controls"
    primary={[{ id: "view", label: "View Invoice", href: "/invoice/1" }]}
    more={[{ id: "download", label: "Download", onSelect: () => {} }]} />);
  assert.match(html, /role="toolbar" aria-label="Invoice Controls"/);
  assert.match(html, /View Invoice/);
  assert.match(html, /More Actions/);
  assert.match(html, /Download/);
});

test("mutually exclusive and binary choices use native input states", () => {
  const html = renderToStaticMarkup(<>
    <ChoicePicker id="status" label="Status" value="all"
      options={[{ value: "all", label: "All" }, { value: "open", label: "Open" }]}
      onChange={() => {}} />
    <BinaryToggle label="Include archived" checked onChange={() => {}} />
  </>);
  assert.match(html, /<label for="status">Status<\/label>/);
  assert.match(html, /<select[^>]*id="status"/);
  assert.match(html, /<option value="all" selected=""/);
  assert.match(html, /type="checkbox" checked=""/);
  assert.match(html, /Include archived/);
});

test("sharing fails closed when the URL is not a public HTTPS URL", () => {
  const html = renderToStaticMarkup(<>
    <SharePublicLink title="Public catalogue" url="https://novapharmhealthcare.com/products/" />
    <SharePublicLink title="Private document" url="http://private.example/docs" />
    <SharePublicLink title="Signed URL" url="https://novapharmhealthcare.com/?token=secret" />
    <SharePublicLink title="Credential URL" url="https://user:pass@novapharmhealthcare.com/products/" />
  </>);
  assert.match(html, /<button[^>]*>Share<\/button>/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
  assert.match(html, /aria-live="polite"/);
});


test("segmented priority filtering uses native mutually exclusive radio inputs", () => {
  const html = renderToStaticMarkup(<SegmentedChoice name="priority" label="Recorded exception priority"
    value="high" options={[
      { value: "all", label: "All" }, { value: "high", label: "High" },
      { value: "standard", label: "Standard" },
    ]} onChange={() => {}} />);
  assert.match(html, /<fieldset[^>]*class="np-segmented-choice"/);
  assert.match(html, /<legend[^>]*>Recorded exception priority<\/legend>/);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
  assert.match(html, /type="radio"[^>]*value="high" checked=""/);
  assert.equal((html.match(/checked=""/g) ?? []).length, 1);
  assert.doesNotMatch(html, /aria-pressed|role="menu"/);
});
