import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const source = readFileSync('assets/css/contact-premium.css', 'utf8');
const css = postcss.parse(source);
function value(selector, property, media = null) {
  const values = [];
  css.walkRules(rule => {
    if (rule.selector !== selector) return;
    const query = rule.parent.type === 'atrule' ? rule.parent.params : null;
    if (query !== media) return;
    rule.walkDecls(property, declaration => values.push(declaration.value));
  });
  return values.at(-1);
}
const field = '.np-contact-reference .np-contact-reference-field:focus-within';
const consent = '.np-contact-reference .np-contact-reference-confirmations .np-contact-reference-consent > input[type="checkbox"]:focus-visible';

test('contact field keyboard focus uses a real outline rather than a shadow alone', () => {
  assert.equal(value(field, 'outline'), '3px solid #005cbd');
  assert.equal(value(field, 'outline-offset'), '3px');
});
test('Windows forced colours retain a visible outer field focus indicator', () => {
  assert.equal(value(field, 'outline', '(forced-colors: active)'), '3px solid Highlight');
  assert.equal(value(field, 'outline-offset', '(forced-colors: active)'), '3px');
});
test('consent keyboard focus is opaque in normal and forced-colour modes', () => {
  assert.equal(value(consent, 'outline'), '3px solid #005cbd');
  assert.equal(value(consent, 'outline', '(forced-colors: active)'), '3px solid Highlight');
});
test('field captions use the existing readable caption role without viewport type scaling', () => {
  assert.equal(value('.np-contact-reference .np-contact-reference-field > span', 'font-size'), 'var(--np-type-caption-size, 0.875rem)');
});
test('managed and static contact share the corrected stylesheet, without a nested input outline', () => {
  assert.ok(readFileSync('apps/corporate/app/layout.tsx', 'utf8').includes('import "../../../assets/css/contact-premium.css";'));
  assert.ok(readFileSync('scripts/build-css-bundle.mjs', 'utf8').includes('["contact-premium.css", null]'));
  assert.equal(value('.np-contact-reference .contact-form .np-contact-reference-field :is(input, select, textarea):focus-visible', 'outline'), 'none');
});
