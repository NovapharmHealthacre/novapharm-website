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
test('all twelve nation/source/file contracts are explicit and correctly partitioned',()=>{
  assert.equal(UK_SOURCE_ARCHIVE_CONTRACTS.length,12);
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


function syntheticWalesGpZip(names) {
  const locals = [], centers = [];
  let cursor = 0;
  for (const name of names) {
    const label = Buffer.from(name, 'ascii');
    const local = Buffer.alloc(31 + label.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(1, 18);
    local.writeUInt32LE(1, 22);
    local.writeUInt16LE(label.length, 26);
    label.copy(local, 30);
    const center = Buffer.alloc(46 + label.length);
    center.writeUInt32LE(0x02014b50, 0);
    center.writeUInt16LE(20, 4);
    center.writeUInt16LE(20, 6);
    center.writeUInt32LE(1, 20);
    center.writeUInt32LE(1, 24);
    center.writeUInt16LE(label.length, 28);
    center.writeUInt32LE(cursor, 42);
    label.copy(center, 46);
    locals.push(local);
    centers.push(center);
    cursor += local.length;
  }
  const directory = Buffer.concat(centers);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(cursor, 16);
  return Buffer.concat([...locals, directory, end]);
}

test('Wales ZIP integrated preflight verifies the exact same file as the archive hash', async () => {
  const root = await mkdtemp(join(tmpdir(), 'uk-wales-integrated-'));
  try {
    const archive = join(root, 'official.zip');
    const bytes = syntheticWalesGpZip(['GPDataFile202609.txt','ChemSubstance.txt','Address.txt']);
    await writeFile(archive, bytes);
    const manifest = fixture('nwssp.gp-prescribing', {sha256:h(bytes), byteSize:bytes.length});
    const receipt = await verifyUkNationalArchiveBytes(manifest, {archivePath:archive,quarantineRoot:root});
    assert.equal(receipt.archiveIntegrityVerified,true);
    assert.deepEqual(receipt.walesGpZipDirectory.memberRoles,
      ['chemical_substance','gp_presentation','practice_address']);
    assert.equal(receipt.walesGpZipDirectory.canExtract,false);
    assert.equal(receipt.walesGpZipDirectory.sourceRowsRead,0);
    assert.equal(receipt.canIngest,false);
    const {spawnSync} = await import('node:child_process');
    const manifestPath=join(root,'official.json');
    await writeFile(manifestPath,JSON.stringify(manifest));
    const run=spawnSync(process.execPath,[
      new URL('./data/verify-uk-national-source-archive.mjs',import.meta.url).pathname,
      '--manifest',manifestPath,'--archive',archive,'--root',root
    ],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    assert.equal(JSON.parse(run.stdout).walesGpZipDirectory.directoryEntries,3);
    assert.equal(run.stdout.includes(root),false);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('Wales ZIP structural errors are rejected even if caller-provided SHA matches', async()=>{
  const root=await mkdtemp(join(tmpdir(),'uk-wales-bad-'));
  try{
    const archive=join(root,'source.zip');
    for(const names of [
      ['GPDataFile202608.txt','ChemSubstance.txt','Address.txt'],
      ['GPDataFile202609.txt','ChemSubstance.txt'],
      ['GPDataFile202609.txt','ChemSubstance.txt','../Address.txt'],
    ]){
      const bytes=syntheticWalesGpZip(names);
      await writeFile(archive,bytes);
      await assert.rejects(verifyUkNationalArchiveBytes(fixture('nwssp.gp-prescribing',
        {sha256:h(bytes),byteSize:bytes.length}),{archivePath:archive,quarantineRoot:root}),
        /Wales GP ZIP inventory refused/);
    }
    const bytes=syntheticWalesGpZip(['GPDataFile202609.txt','ChemSubstance.txt','Address.txt']);
    await writeFile(archive,bytes);
    await assert.rejects(verifyUkNationalArchiveBytes(fixture('nwssp.gp-prescribing',
      {sha256:'f'.repeat(64),byteSize:bytes.length}),{archivePath:archive,quarantineRoot:root}),
      /hash or size mismatch/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('four additional archive contracts distinguish reference mapping and three Welsh prescriber families',()=>{
 const get=id=>UK_SOURCE_ARCHIVE_CONTRACTS.find(s=>s.sourceId===id);
 const crosswalk=get('nhsbsa.bnf-snomed-map');
 assert.equal(crosswalk.jurisdiction,'GB-ENG');
 assert.deepEqual(crosswalk.formats,['CSV']);
 assert.notEqual(crosswalk.factGrain,get('nhsbsa.epd').factGrain);
 for(const id of ['nwssp.hospital-prescribing','nwssp.dental-prescribing',
                  'nwssp.independent-pharmacist-prescribing']){
  assert.equal(get(id).jurisdiction,'GB-WLS');
  assert.deepEqual(get(id).formats,['ZIP']);
  assert.equal(get(id).periodPrecision,'month');
  assert.equal(validateUkNationalArchiveManifest(fixture(id)).canIngest,false);
 }
 assert.throws(()=>validateUkNationalArchiveManifest(fixture('nwssp.hospital-prescribing',
  {sourceId:'nwssp.hospital-prescribing',format:'CSV',publisherFileName:'source.csv'})),/format/);
});

test('hospital and dental three-file and pharmacist four-CSV Welsh archive profiles are checked in same verified FD',async()=>{
 const cases=[
  ['nwssp.hospital-prescribing',['HospitalDataFile202609.txt','ChemSubstance.txt','Address.txt'],3],
  ['nwssp.dental-prescribing',['DentalDataFile202609.csv','ChemSubstance.csv','Address.csv'],3],
  ['nwssp.independent-pharmacist-prescribing',['IPData202609.csv','ChemSubstance.csv','Address.csv','BNF.csv'],4],
 ];
 const root=await mkdtemp(join(tmpdir(),'uk-wales-extended-'));
 try{
  for(let i=0;i<cases.length;i++){
   const [sourceId,names,count]=cases[i];
   const bytes=syntheticWalesGpZip(names);
   const path=join(root,'source'+i+'.zip');
   await writeFile(path,bytes);
   const result=await verifyUkNationalArchiveBytes(fixture(sourceId,{
    sha256:h(bytes),byteSize:bytes.length
   }),{archivePath:path,quarantineRoot:root});
   assert.equal(result.walesPublisherZipDirectory.directoryEntries,count);
   assert.equal(result.walesPublisherZipDirectory.memberRoles.length,count);
   assert.equal(result.walesPublisherZipDirectory.sourceRowsRead,0);
   assert.equal(result.walesPublisherZipDirectory.canExtract,false);
   assert.equal(result.canIngest,false);assert.equal(result.canPublish,false);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Welsh pharmacist ZIP fails closed for wrong month, missing BNF, non-CSV or GP masquerade',async()=>{
 const root=await mkdtemp(join(tmpdir(),'uk-wales-pharmacist-negative-'));
 const p=join(root,'source.zip');
 const base=['IPData202609.csv','ChemSubstance.csv','Address.csv','BNF.csv'];
 try{
  for(const names of [
   base.slice(0,3),
   ['IPData202608.csv',...base.slice(1)],
   ['IPData202609.csv','ChemSubstance.csv','Address.csv','Other.csv'],
   ['IPData202609.csv','ChemSubstance.txt','Address.csv','BNF.csv'],
   ['GPDataFile202609.csv',...base.slice(1)],
   ['IPData202609.csv','ChemSubstance.csv','BNF.csv','BNF.csv']
  ]){
   const bytes=syntheticWalesGpZip(names);
   await writeFile(p,bytes);
   await assert.rejects(verifyUkNationalArchiveBytes(
    fixture('nwssp.independent-pharmacist-prescribing',{sha256:h(bytes),byteSize:bytes.length}),
    {archivePath:p,quarantineRoot:root}),/ZIP inventory refused/);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

test('unverified Welsh dispensing files cannot masquerade as supported archive contracts',()=>{
 const supported=new Set(UK_SOURCE_ARCHIVE_CONTRACTS.map(x=>x.sourceId));
 for(const sourceId of ['nwssp.gp-dispensing','nwssp.english-dispensing']){
  assert.equal(supported.has(sourceId),false);
  assert.throws(()=>validateUkNationalArchiveManifest({
    ...fixture('nwssp.gp-prescribing'),sourceId
  }),/unregistered source/);
 }
 // A terminology reference file is never additive with national prescribing facts.
 const base={sourceId:'nhsbsa.epd',reportingPeriod:'2026-09',sourceVersion:'A'};
 assert.throws(()=>verifyNationalComparisonBoundary(base,{
  ...base,sourceId:'nhsbsa.bnf-snomed-map',sourceVersion:'B'
 }),/measure definitions/);
});
