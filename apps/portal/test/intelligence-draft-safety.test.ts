import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Intelligence local investigation drafts warn before leaving without persisting private notes", () => {
  const source = readFileSync(new URL("../components/professional-workspaces.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function DraftReport(");
  const end = source.indexOf("function AlertPreview(", start);
  assert.ok(start >= 0 && end > start);
  const draft = source.slice(start, end);
  assert.match(draft, /beforeunload/);
  assert.match(draft, /hasUnexportedNotes/);
  assert.match(draft, /downloadConfirmed/);
  assert.match(draft, /I have saved my draft copy/);
  assert.match(draft, /setDownloadConfirmed\(false\)/);
  assert.match(draft, /Download requested\. No report was published or submitted/);
  assert.doesNotMatch(draft, /localStorage|sessionStorage|fetch\(/);
  assert.match(draft, /sourceLicencesVerified: false/);
  assert.match(draft, /tenantExportPermissionVerified: false/);
  assert.match(draft, /decisionReady: false/);
});
