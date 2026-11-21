import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UK_SOURCE_ARCHIVE_CONTRACTS, validateUkNationalArchiveManifest, verifyUkNationalArchiveBytes, verifyNationalComparisonBoundary } from '../src/core/uk-national-source-archive-preflight.mjs';
const h = value => createHash('sha256').update(value).digest('hex');
const fixture = (sourceId, overrides={}) => {
  const x=UK_SOURCE_ARCHIVE_CONTRACTS.find(v=>v.sourceId===sourceId);
  return {contract:'novapharm.uk.source-archive-candidate.v1',sourceId, jurisdiction:x.jurisdiction,
    reportingPeriod:x.periodPrecision==='quarter'?'2026-Q2':'2026-09',format:x.formats[0],
    publisherUrl:`https://${x.publisherHosts[0]}/datasets/verified`,publisherResourceId:'official-resource-202609',
    publisherFileName:'source.'+x.formats[0].toLowerCase(),sha256:h('a,b\n1,2\n'),byteSize:8,
    sourceVersion:'publisher-2026-09',discoveredAt:'2026-11-21T12:00:00.000Z',...overrides};
};
test('all eight nation/source/file contracts are explicit and correctly partitioned',()=>{
  assert.equal(UK_SOURCE_ARCHIVE_CONTRACTS.length,8);
  assert.deepEqual(new Set(UK_SOURCE_ARCHIVE_CONTRACTS.map(x=>x.jurisdiction)),new Set(['GB-ENG','GB-SCT','GB-WLS','GB-NIR']));
  assert.equal(new Set(UK_SOURCE_ARCHIVE_CONTRACTS.map(x=>x.sourceId)).size,8);
  for(const c of UK_SOURCE_ARCHIVE_CONTRACTS){
    const plan=validateUkNationalArchiveManifest(fixture(c.sourceId));
    assert.equal(plan.status,'quarantine_candidate');assert.equal(plan.canIngest,false);assert.equal(plan.canPublish,false);
    assert.equal(plan.admittedMedicineRows,0);assert.equal(plan.datasetRecordsRead,0);
    assert.equal(plan.nation,c.nation);
  }
});
test('cannot forge rights or customer publication in a manifest',()=>{
  for(const key of ['rightsApproved','canPublish','customerCountryLive','rightsStatus','admittedMedicineRows'])
    assert.throws(()=>validateUkNationalArchiveManifest(fixture('nhsbsa.epd',{[key]:true})),/unrecognised field/);
});
test('strictly enforces nation, source file type and precise month or quarter',()=>{
  assert.throws(()=>validateUkNationalArchiveManifest(fixture('phs.prescribed-dispensed',{reportingPeriod:'2026-06'})),/reporting period/);
  assert.throws(()=>validateUkNationalArchiveManifest(fixture('bso.gp-prescribing',{reportingPeriod:'2026-Q2'})),/reporting period/);
  assert.throws(()=>validateUkNationalArchiveManifest(fixture('nwssp.gp-prescribing',{format:'CSV'})),/format/);
  assert.throws(()=>validateUkNationalArchiveManifest(fixture('phs.prescriptions-community',{jurisdiction:'GB-ENG'})),/jurisdiction/);
  assert.throws(()=>validateUkNationalArchiveManifest(fixture('nhsbsa.epd',{reportingPeriod:'2026-13'})),/reporting period/);
});
test('publisher allow-list excludes HTTP, credentials, ports and unrelated hosts',()=>{
  for(const url of ['http://opendata.nhsbsa.net/file','https://evil.example/file','https://user:pass@opendata.nhsbsa.net/file','https://opendata.nhsbsa.net:8443/file'])
    assert.throws(()=>validateUkNationalArchiveManifest(fixture('nhsbsa.epd',{publisherUrl:url})),/origin/);
});
test('read-only integrity proof succeeds but does not permit medicine admission',async()=>{
  const root=await mkdtemp(join(tmpdir(),'uk-candidate-'));const src='a,b\n1,2\n';
  try{
    const filename=join(root,'input.csv');await writeFile(filename,src);
    const receipt=await verifyUkNationalArchiveBytes(fixture('bso.gp-prescribing'),{archivePath:filename,quarantineRoot:root});
    assert.equal(receipt.archiveIntegrityVerified,true);
    assert.equal(receipt.byteCount,8);
    assert.equal(receipt.canIngest,false);
    assert.equal(receipt.canPublish,false);
    assert.equal(receipt.datasetRecordsRead,0);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('wrong hash, size, path and symbolic link all fail closed',async()=>{
  const root=await mkdtemp(join(tmpdir(),'uk-candidate-')); const outside=await mkdtemp(join(tmpdir(),'uk-external-'));
  try{
    const filename=join(root,'input.csv');await writeFile(filename,'a,b\n1,2\n');
    await assert.rejects(verifyUkNationalArchiveBytes(fixture('nhsbsa.epd',{sha256:'f'.repeat(64)}),{archivePath:filename,quarantineRoot:root}),/hash or size/);
    await assert.rejects(verifyUkNationalArchiveBytes(fixture('nhsbsa.epd',{byteSize:7}),{archivePath:filename,quarantineRoot:root}),/byte size/);
    const external=join(outside,'external.csv');await writeFile(external,'a,b\n1,2\n');
    await assert.rejects(verifyUkNationalArchiveBytes(fixture('nhsbsa.epd'),{archivePath:external,quarantineRoot:root}),/outside/);
    const link=join(root,'linked.csv');await symlink(external,link);
    await assert.rejects(verifyUkNationalArchiveBytes(fixture('nhsbsa.epd'),{archivePath:link,quarantineRoot:root}),/symbolic|ordinary file/);
  }finally{await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}
});
test('no cross-nation, cross-grain or cross-period metric summation',()=>{
  const a={sourceId:'nhsbsa.epd',reportingPeriod:'2026-09',sourceVersion:'A'};
  const b={sourceId:'bso.gp-prescribing',reportingPeriod:'2026-09',sourceVersion:'B'};
  assert.throws(()=>verifyNationalComparisonBoundary(a,b),/cross-nation/);
  assert.throws(()=>verifyNationalComparisonBoundary(a,{...a,reportingPeriod:'2026-08'}),/time periods/);
  assert.throws(()=>verifyNationalComparisonBoundary(a,{...a,sourceId:'nhsbsa.pca'}),/measure definitions/);
  assert.throws(()=>verifyNationalComparisonBoundary(a,a),/double counted/);
  const result=verifyNationalComparisonBoundary(a,{...a,sourceVersion:'B'});
  assert.equal(result.canSumMetrics,false);
  assert.equal(result.permittedOperation,'version_reconciliation_only');
});

test('CLI validates quarantined publisher fixture without disclosing source paths',async()=>{
  const {execFileSync}=await import('node:child_process');
  const root=await mkdtemp(join(tmpdir(),'uk-cli-'));
  try{
    const archive=join(root,'test.csv');const manifest=join(root,'test.json');
    await writeFile(archive,'a,b\n1,2\n');
    await writeFile(manifest,JSON.stringify(fixture('nhsbsa.epd')));
    const output=execFileSync(process.execPath,[new URL('./data/verify-uk-national-source-archive.mjs',import.meta.url).pathname,'--manifest',manifest,'--archive',archive,'--root',root],{encoding:'utf8'});
    const receipt=JSON.parse(output);
    assert.equal(receipt.archiveIntegrityVerified,true);
    assert.equal(receipt.canIngest,false);
    assert.equal(output.includes(root),false);
    assert.equal(output.includes('1,2'),false);
  }finally{await rm(root,{recursive:true,force:true});}
});


test('CLI refuses symlinked manifests instead of stat-then-reopen races',async()=>{
  const {spawnSync}=await import('node:child_process');
  const root=await mkdtemp(join(tmpdir(),'uk-cli-link-'));
  try{
    const archive=join(root,'source.csv');const manifest=join(root,'source.json');
    const link=join(root,'linked.json');
    await writeFile(archive,'a,b\n1,2\n');
    await writeFile(manifest,JSON.stringify(fixture('nhsbsa.epd')));
    await symlink(manifest,link);
    const result=spawnSync(process.execPath,[new URL('./data/verify-uk-national-source-archive.mjs',import.meta.url).pathname,'--manifest',link,'--archive',archive,'--root',root],{encoding:'utf8'});
    assert.equal(result.status,1);
    assert.match(result.stderr,/preflight refused/);
    assert.equal(result.stdout,'');
  }finally{await rm(root,{recursive:true,force:true});}
});
