import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const audit = resolve('scripts/audit-website-hig-source.mjs');
const head = '<!doctype html><html lang="en-GB"><head><meta name="viewport" content="width=device-width,initial-scale=1">';
function verify(html, files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'np-hig-census-'));
  try {
    writeFileSync(join(dir, 'index.html'), html);
    for (const [name, value] of Object.entries(files)) writeFileSync(join(dir, name), value);
    const result = spawnSync(process.execPath, [audit, dir], { encoding: 'utf8', timeout: 15000 });
    assert.equal(result.error, undefined, result.stderr);
    return { status: result.status, report: JSON.parse(result.stdout) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const content = head + '<title>NovaPharm</title></head><body><main><h1>Medicine</h1></main></body></html>';
const redirect = head + '<meta http-equiv="refresh" content="0; url=/services/"><link rel="canonical" href="https://novapharmhealthcare.com/services/"><meta name="robots" content="noindex,follow"><title>Redirect</title></head><body><p><a href="/services/">Continue to Services</a></p></body></html>';

test('full content page with a main landmark and h1 passes', () => {
  const r = verify(content);
  assert.equal(r.status, 0);
  assert.equal(r.report.results[0].kind, 'content');
});
test('exact same-domain noindex redirect with matching fallback passes', () => {
  const r = verify(redirect);
  assert.equal(r.status, 0);
  assert.equal(r.report.results[0].kind, 'legacy-redirect');
});
test('redirect with accessible heading and main fallback also passes', () => {
  const semantic = redirect.replace(
    '<body><p><a href="/services/">Continue to Services</a></p></body>',
    '<body><main><h1>Services</h1><p><a href="/services/">Continue to Services</a></p></main></body>'
  );
  const r = verify(semantic);
  assert.equal(r.status, 0);
  assert.equal(r.report.results[0].kind, 'legacy-redirect');
  assert.equal(r.report.results[0].h1, 1);
  assert.equal(r.report.results[0].main, 1);
});
test('external redirect fails closed', () => {
  const r = verify(redirect.replace('0; url=/services/', '0; url=https://example.com/'));
  assert.notEqual(r.status, 0);
  assert.ok(r.report.failures > 0);
});
test('redirect without matching fallback cannot bypass content-landmark checks', () => {
  const r = verify(redirect.replace('href="/services/"', 'href="/contact/"'));
  assert.notEqual(r.status, 0);
  assert.match(r.report.results[0].problems.join(' '), /fallback/);
});
test('real content missing main remains a release failure', () => {
  const r = verify(content.replace('<main><h1>Medicine</h1></main>', '<h1>Medicine</h1>'));
  assert.notEqual(r.status, 0);
  assert.match(r.report.results[0].problems.join(' '), /main landmark/);
});
test('binary web font accidentally placed in public assets is a release failure', () => {
  const r = verify(content, { 'apple-font.otf': 'not-a-real-font' });
  assert.notEqual(r.status, 0);
  assert.deepEqual(r.report.forbiddenAssets, ['apple-font.otf']);
});
