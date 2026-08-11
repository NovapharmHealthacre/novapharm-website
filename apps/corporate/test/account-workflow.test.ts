import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pageBySlug } from "../data/pages";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("account application route is explicit and remains truth-bounded", () => {
  const page = pageBySlug.get("account-application");
  assert.ok(page);
  assert.equal(page.kind, "account");

  const route = read("app/account-application/page.tsx");
  assert.match(route, /AccountInterestWorkflow/);
  assert.match(route, /No automatic account creation/);
  assert.match(route, /No private evidence here/);
  assert.match(route, /controlled application should be invited/i);
  assert.doesNotMatch(route, /href="\/contact\/\?enquiry=/);
});

test("account pathway renders only real governed stages", () => {
  const route = read("app/account-application/page.tsx");
  assert.match(route, /<ol className="journey-track account-journey" style=\{\{ background: "transparent" \}\}>/);
  assert.match(route, /<li key=\{step\} style=\{\{ border: "1px solid var\(--line\)" \}\}>/);
  assert.equal((route.match(/^  "/gmu) ?? []).length >= 8, true, "The account pathway must retain its governed stages.");
  assert.doesNotMatch(route, /placeholder|coming soon|future stage/i, "Unused pathway tracks must remain whitespace, not invented stages.");
});

test("public account interest uses the existing controlled lead authority", () => {
  const workflow = read("components/account-interest-workflow.tsx");
  assert.match(workflow, /platformEndpoint\("\/security\/csrf"\)/);
  assert.match(workflow, /platformEndpoint\("\/contact"\)/);
  assert.match(workflow, /"X-CSRF-Token"/);
  assert.match(workflow, /enquiryType: "Pharmacy or wholesaler account"/);
  assert.match(workflow, /No customer account, approval or portal identity is created automatically/i);
  assert.match(workflow, /Do not upload or paste licences, bank details, patient information/i);
  assert.match(workflow, /privacyAcknowledgement/);
  assert.match(workflow, /safetyConfirmation/);
});

test("specialist contact topics are translated to server-authorised categories", () => {
  const workflow = read("components/contact-workflow.tsx");
  assert.match(workflow, /Clinical development & CRO support/);
  assert.match(workflow, /Oncology & specialist medicines/);
  assert.match(workflow, /selected === "Clinical development & CRO support"\) return "Regulatory services"/);
  assert.match(workflow, /selected === "Oncology & specialist medicines"\) return "Product opportunity"/);
  assert.match(workflow, /Topic: \$\{selectedType\}/);
});