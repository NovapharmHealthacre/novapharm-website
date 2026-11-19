import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { parse } from 'parse5';

const root = resolve(process.env.PUBLIC_SITE_ROOT || '.');
const articles = readdirSync('src/content/insights').filter(x => x.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(join('src/content/insights', file), 'utf8')));
for (const article of articles) test('built Insights navigation uses the current shared header: ' + article.slug, () => {
  const nodes = [];
  const visit = node => { nodes.push(node); for (const child of node.childNodes ?? []) visit(child); };
  visit(parse(readFileSync(join(root, 'news-insights', article.slug, 'index.html'), 'utf8')));
  const attr = (n, key) => n?.attrs?.find(x => x.name === key)?.value;
  const header = nodes.find(x => x.tagName === 'header');
  const nav = nodes.find(x => x.tagName === 'nav' && attr(x, 'id') === 'primary-navigation');
  assert.ok(attr(header, 'class')?.split(/\s+/).includes('npd-header'));
  assert.ok(attr(nav, 'class')?.split(/\s+/).includes('npd-global-nav'));
  const footer = nodes.find(x => x.tagName === 'footer');
  const footerNodes = [];
  const visitFooter = node => { footerNodes.push(node); for (const child of node?.childNodes ?? []) visitFooter(child); };
  visitFooter(footer);
  assert.ok(footerNodes.some(x => x?.tagName === 'a' && attr(x, 'href') === '/about/company/'), 'Company profile remains discoverable without a desktop mega-menu or JavaScript');
  assert.equal(nodes.filter(x => x.tagName === 'main').length, 1);
  assert.equal(nodes.filter(x => x.tagName === 'h1').length, 1);
  assert.ok(nodes.some(x => x.tagName === 'a' && attr(x, 'href') === '/account-application/'), 'Account entry remains available');
});
