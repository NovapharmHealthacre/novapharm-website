import assert from "node:assert/strict";
import { extractVisibleBlocks, textContentFromFragment, visibleTextFromHtml } from "./lib/html-text.mjs";

const html = `<!doctype html><html><body><main>
  <h1>Evidence &amp; governance</h1>
  <script>unsupported claim</script>
  <style>.hidden { display:none }</style>
  <nav><p>Navigation copy</p></nav>
  <p>Visible <strong>regulated-market</strong> context.</p>
  <form><p>Private form value</p></form>
  <ul><li>Controlled release</li></ul>
</main></body></html>`;

assert.equal(
  visibleTextFromHtml(html, { rootTag: "main" }),
  "Evidence & governance Navigation copy Visible regulated-market context. Private form value Controlled release",
);
assert.equal(textContentFromFragment("Author &amp; reviewer <span>record</span>"), "Author & reviewer record");
assert.deepEqual(extractVisibleBlocks(html), [
  { type: "heading", text: "Evidence & governance" },
  { type: "paragraph", text: "Visible regulated-market context." },
  { type: "paragraph", text: "Controlled release" },
]);

console.log("Structured HTML text parsing passed: entities decode once and non-public script, style, navigation and form content is excluded from governed AI blocks.");
