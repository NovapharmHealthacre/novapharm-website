import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse } from 'parse5';

const root = resolve(process.argv[2] || '.');
const skip = new Set(['.git', 'node_modules', 'apps', 'src', 'scripts', 'docs', 'audit', 'seo', 'packages', '_secure', '_site', 'artifacts']);
const pages = [];
const forbiddenAssets = [];
function visit(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const file = join(path, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(entry.name) && !entry.name.startsWith('.')) visit(file);
    } else if (entry.name.endsWith('.html')) pages.push(file);
    else if (/\.(?:dmg|otf|ttf|woff2?)$/i.test(entry.name)) forbiddenAssets.push(relative(root, file));
  }
}
visit(root);
const results = [];
for (const file of pages.sort()) {
  const nodes = [];
  const walk = node => { nodes.push(node); for (const child of node.childNodes ?? []) walk(child); };
  walk(parse(readFileSync(file, 'utf8')));
  const attr = (node, key) => node?.attrs?.find(x => x.name === key)?.value;
  const html = nodes.find(x => x.tagName === 'html');
  const viewport = attr(nodes.find(x => x.tagName === 'meta' && attr(x, 'name') === 'viewport'), 'content') || '';
  const problems = [];
  if (!attr(html, 'lang')) problems.push('Missing document language');
  if (!viewport) problems.push('Missing viewport');
  if (/user-scalable\s*=\s*(?:no|0)|maximum-scale\s*=\s*1(?:\D|$)/i.test(viewport)) problems.push('Viewport restricts user zoom');
  const h1 = nodes.filter(x => x.tagName === 'h1').length;
  const main = nodes.filter(x => x.tagName === 'main').length;
  const redirectMeta = nodes.find(x => x.tagName === 'meta' && attr(x, 'http-equiv')?.toLowerCase() === 'refresh');
  const redirect = Boolean(redirectMeta);
  if (redirect) {
    // Legacy route aliases are not content pages. Admit only self-domain,
    // immediate, noindex redirects with a readable, matching fallback link.
    const content = attr(redirectMeta, 'content') ?? '';
    const match = /^0;\s*url=(\/(?!\/)[a-z0-9_\/-]*[a-z0-9_\/-])$/i.exec(content);
    const target = match?.[1];
    const canonical = attr(nodes.find(x => x.tagName === 'link' && (attr(x, 'rel') ?? '').split(/\s+/).includes('canonical')), 'href');
    const robots = attr(nodes.find(x => x.tagName === 'meta' && attr(x, 'name')?.toLowerCase() === 'robots'), 'content') ?? '';
    const fallback = nodes.some(x => x.tagName === 'a' && attr(x, 'href') === target);
    const script = nodes.some(x => x.tagName === 'script');
    if (!target || target.includes('..')) problems.push('Unsafe or invalid legacy redirect target');
    if (!target || canonical !== 'https://novapharmhealthcare.com' + target) problems.push('Redirect canonical mismatch');
    if (!/\bnoindex\b/i.test(robots)) problems.push('Redirect must be noindex');
    if (!target || !fallback) problems.push('Redirect requires a matching fallback link');
    if (script) problems.push('Redirect alias must not execute scripts');
    if (h1 !== 0 || main !== 0) problems.push('Redirect alias unexpectedly contains content landmarks; review alias');
  } else {
    if (h1 !== 1) problems.push('Expected one page h1; found ' + h1);
    if (main !== 1) problems.push('Expected one main landmark; found ' + main);
  }
  const missingAlt = nodes.filter(x => x.tagName === 'img' && attr(x, 'alt') === undefined).map(x => attr(x, 'src'));
  if (missingAlt.length) problems.push('Image alternatives missing');
  const stylesheets = nodes.filter(x => x.tagName === 'link' && attr(x, 'rel') === 'stylesheet').map(x => attr(x, 'href'));
  const missingStylesheets = stylesheets.filter(href => href?.startsWith('/') && !existsSync(join(root, new URL(href, 'https://novapharmhealthcare.com').pathname)));
  if (missingStylesheets.length) problems.push('Local stylesheet missing');
  results.push({ file: relative(root, file), kind: redirect ? 'legacy-redirect' : 'content', h1, main, viewport, missingAlt, missingStylesheets, problems });
}
const report = { scope: 'Static HTML and public-asset census only; not rendered, assistive-technology, backend or production acceptance', pages: results.length, forbiddenAssets, failures: results.filter(x => x.problems.length).length, results };
console.log(JSON.stringify(report, null, 2));
if (!results.length || report.failures || forbiddenAssets.length) process.exitCode = 1;
