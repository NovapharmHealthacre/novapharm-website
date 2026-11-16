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
  assert.match(route, /Eligible businesses may receive a private application invitation/i);
  assert.match(route, /Registering interest does not create an account or grant portal access/i);
  assert.doesNotMatch(route, /href="\/contact\/\?enquiry=/);
});

test("account pathway renders only real governed stages", () => {
  const route = read("app/account-application/page.tsx");
  assert.match(route, /<ol className="journey-track account-journey" style=\{\{ background: "transparent" \}\}>/);
  assert.match(route, /<li key=\{step\} style=\{\{ border: "1px solid var\(--line\)" \}\}>/);
  assert.equal((route.match(/^ {2}"/gmu) ?? []).length >= 8, true, "The account pathway must retain its governed stages.");
  assert.doesNotMatch(route, /placeholder|coming soon|future stage/i, "Unused pathway tracks must remain whitespace, not invented stages.");
});

test("public account interest uses the existing controlled lead authority", () => {
  const workflow = read("components/account-interest-workflow.tsx");
  assert.match(workflow, /platformEndpoint\("\/security\/csrf"\)/);
  assert.match(workflow, /platformEndpoint\("\/contact"\)/);
  assert.match(workflow, /"X-CSRF-Token"/);
  assert.match(workflow, /enquiryType: "Pharmacy or wholesaler account"/);
  assert.match(workflow, /No account or portal access has been created/i);
  assert.match(workflow, /does not approve an application, create an account or grant portal access/i);
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
test("public business account explains account purpose in optional, accessible steps", () => {
  const route = read("app/account-application/page.tsx");
  assert.match(route, /<details className="account-path-help">/);
  assert.match(route, /<summary>What happens after I register interest\?/);
  assert.match(route, /There is no password or portal account at this stage/);
  assert.match(route, /Browsing the public catalogue never requires account registration/);
  assert.match(route, /\/legal\/privacy\/#business-enquiries/);
  const styles = read("app/globals.css");
  assert.match(styles, /\.account-path-help summary:focus-visible/);
});

test("account-interest success requires verified server receipt and guards concurrent requests", () => {
  const workflow = read("components/account-interest-workflow.tsx");
  assert.match(workflow, /if \(inFlightRef\.current\) return;/);
  assert.match(workflow, /inFlightRef\.current = true;/);
  assert.match(workflow, /inFlightRef\.current = false;/);
  assert.match(workflow, /const receipt = await response\.json\(\)\.catch/);
  assert.match(workflow, /receipt\.ok !== true \|\| !receipt\.lead\?\.id/);
  assert.match(workflow, /status: 202/);
  assert.match(workflow, /aria-busy=\{state === "sending"\}/);
  assert.ok(workflow.indexOf("const data = new FormData(form);") < workflow.indexOf('fetch(platformEndpoint("/security/csrf")'));
  assert.ok(workflow.indexOf("form.reset()") > workflow.indexOf("receipt.ok !== true"));
});
