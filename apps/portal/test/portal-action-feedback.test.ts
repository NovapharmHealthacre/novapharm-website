import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/dashboard.tsx", import.meta.url), "utf8");
const actionStart = source.indexOf("function ActionPanel(");
const actionEnd = source.indexOf("export function Dashboard(", actionStart);
const actions = source.slice(actionStart, actionEnd);

test("all three customer transaction forms preserve draft inputs if the server rejects a request", () => {
  assert.ok(actionStart >= 0 && actionEnd > actionStart);
  for (const flow of ["Support ticket created.", "Return request created.", "Quality complaint opened."]) {
    const index = actions.indexOf(flow);
    assert.ok(index >= 0, `${flow} action missing`);
    const next = actions.slice(index, index + 250);
    assert.match(next, /\.then\(\(accepted\) => \{ if \(accepted\) form\.reset\(\); \}\)/);
  }
  assert.doesNotMatch(actions, /void submit\([^;]+; form\.reset\(\)/);
});

test("controlled actions prevent same-tick duplicate submissions and distinguish uncertain refresh", () => {
  assert.match(actions, /requestInFlight\.current/);
  assert.match(actions, /if \(requestInFlight\.current\) return false/);
  assert.match(actions, /await protectedMutation/);
  assert.match(actions, /const refreshed = await onComplete\(\)/);
  assert.match(actions, /updated records could not be verified/);
  assert.match(actions, /requestInFlight\.current = false/);
  assert.match(actions, /aria-busy=\{sending\}/);
  assert.match(actions, /disabled=\{sending\}/);
});

test("the protected snapshot refresh reports success or failure explicitly", () => {
  const load = source.slice(source.indexOf("const load = useCallback("), source.indexOf("useEffect(() => { void load();"));
  assert.match(load, /setSnapshot\(moduleSnapshot\);\s*return true;/);
  assert.match(load, /setSnapshot\(null\);\s*return false;/);
  assert.match(load, /return false;\s*\} finally/);
});

test("protected search never reports zero records when the service failed", () => {
  assert.match(source, /const \[searchFailure, setSearchFailure\] = useState<string \| null>\(null\)/);
  assert.match(source, /setSearchFailure\(failure\)/);
  assert.match(source, /setSearchFailure\(null\)/);
  assert.match(source, /searchFailure \? <div role="alert">/);
  assert.match(source, /Search could not be completed/);
  assert.match(source, /Retry authorised search/);
  assert.match(source, /No authorised records found in this scope/);
  assert.ok(source.indexOf("searchFailure ? <div role=\"alert\">") < source.indexOf("No authorised records found in this scope."));
});
