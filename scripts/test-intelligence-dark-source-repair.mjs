import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, realpathSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve, dirname, sep} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const receipt = JSON.parse(readFileSync(resolve(root, 'audit/brand/intelligence-dark-webp-source-repair-20261123.json'), 'utf8'));
const sha256 = input => createHash('sha256').update(input).digest('hex');
const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;

function auditedAsset() {
  const rel = receipt.member.gitPath;
  assert.match(rel, /^creative-assets\/brand\/intelligence-regal-ultramarine\/02_web_transparent\/dark\/[\w-]+\.webp$/);
  const absolute = resolve(root, rel);
  assert.ok(absolute.startsWith(root + sep), 'Asset cannot escape source root');
  assert.equal(realpathSync(absolute), absolute, 'Source asset cannot be a symlink');
  const bytes = readFileSync(absolute);
  assert.equal(statSync(absolute).size, receipt.member.sizeBytes);
  assert.equal(bytes.length, 38922);
  assert.equal(sha256(bytes), receipt.member.sha256);
  const gitPayload = Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]);
  assert.equal(createHash('sha1').update(gitPayload).digest('hex'), receipt.member.gitBlobSha1);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.readUInt32LE(4), bytes.length - 8, 'RIFF length cannot be spoofed');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.toString('ascii', 12, 16), 'VP8L', 'Must remain lossless WebP');
  assert.equal(bytes.readUInt32LE(16), bytes.length - 20, 'Reject truncated/extra WebP chunks');
  assert.equal(bytes[20], 0x2f, 'Lossless WebP signature');
  const dims = bytes.readUInt32LE(21);
  assert.equal((dims & 0x3fff) + 1, receipt.member.width);
  assert.equal(((dims >>> 14) & 0x3fff) + 1, receipt.member.height);
  return bytes;
}

test('approved original remains documented and replacement is source-only', () => {
  assert.equal(receipt.sourceArchive.members, 195);
  assert.equal(receipt.sourceArchive.unchangedMembers, 194);
  assert.equal(receipt.sourceArchive.changedMembers, 1);
  assert.equal(receipt.member.originalBytes, 0);
  for (const hash of [receipt.sourceArchive.originalSha256, receipt.sourceArchive.repairedSha256,
    receipt.member.sha256, receipt.member.approvedDecodedRgbaSha256, receipt.member.approvedReferencePngSha256]) {
    assert.match(hash, sha64);
  }
  assert.match(receipt.member.gitBlobSha1, sha40);
  assert.equal(receipt.brand.canonicalHex, '#2546D8');
  assert.equal(receipt.guardrails.publicAssetPath, null);
  assert.equal(receipt.guardrails.noPagesOrAwsDeployment, true);
  assert.equal(receipt.guardrails.doNotReplaceProductionLogos, true);
  assert.equal(receipt.guardrails.independentVisualAndNativeAcceptanceStillRequired, true);
});

test('restored 4096w source has exact approved binary checksum and WebP dimensions', () => {
  auditedAsset();
});

test('lossless decoded RGBA pixels equal approved user-source PNG fingerprint', async () => {
  const require = createRequire(import.meta.url);
  const sharp = require('sharp');
  const {data, info} = await sharp(auditedAsset(), {failOn: 'error'}).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  assert.equal(info.width, 4096);
  assert.equal(info.height, 708);
  assert.equal(info.channels, 4);
  assert.equal(info.format, 'raw');
  assert.equal(sha256(data), receipt.member.approvedDecodedRgbaSha256);
  let min = 255, max = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  assert.equal(min, receipt.member.alphaMin);
  assert.equal(max, receipt.member.alphaMax);
});

test('archival master is excluded from both the Pages and unified application release packages', () => {
  const pages = readFileSync(resolve(root, 'scripts/stage-pages-artifact.mjs'), 'utf8');
  const roots = pages.match(/const allowedTopLevelDirectories = new Set\(\[([\s\S]*?)\]\);/)?.[1];
  assert.ok(roots, 'Pages staging must retain a literal directory allowlist');
  assert.doesNotMatch(roots, /["']creative-assets["']/, 'Never publish approved source masters');
  assert.match(pages, /allowedTopLevelDirectories\.has\(entry\.name\)/,
    'Pages staging must use the explicit public directory allowlist');
  const united = readFileSync(resolve(root, 'scripts/package-unified-estate.mjs'), 'utf8');
  assert.doesNotMatch(united, /copyTree\(\s*path\.join\(root,\s*["']creative-assets["']/,
    'Do not bundle non-public source masters in native/protected app artifacts');
});

test('canonical image inventory recognizes the repaired master as governed non-public owner source', () => {
  const registry = JSON.parse(readFileSync(resolve(root, 'creative-assets/asset-register.json'), 'utf8'));
  const entries = registry.assets.filter(asset => asset.path === receipt.member.gitPath);
  assert.equal(entries.length, 1, 'One unique asset provenance record is required');
  const record = entries[0];
  assert.equal(record.pageUsage?.length, 0, 'Source masters must not claim published page usage');
  assert.equal(record.optimisedVariants?.length, 0, 'An unreviewed derivative is not registered');
  assert.ok(record.source.includes(receipt.sourceArchive.originalSha256));
  assert.ok(record.technicalStatus.includes(receipt.member.sha256));
  assert.equal(record.provenanceRecord, 'audit/brand/intelligence-dark-webp-source-repair-20261123.json');
  assert.match(record.ownerApproval, /pending/i, 'Source repair is not a completed release approval');
});
