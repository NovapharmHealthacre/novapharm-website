import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyUkPrivateBackfillBatch,readPrivateBackfillPlan} from '../src/core/uk-private-backfill-file-batch.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const data='a,b\n1,2\n';
const manifest=(period,overrides={})=>({
 contract:'novapharm.uk.source-archive-candidate.v1',sourceId:'nhsbsa.epd',
 jurisdiction:'GB-ENG',reportingPeriod:period,format:'CSV',
 publisherUrl:'https://opendata.nhsbsa.net/dataset/official',
 publisherResourceId:'official-resource-202609',publisherFileName:'source.csv',
 sha256:hash(data),byteSize:Buffer.byteLength(data),
 sourceVersion:'publisher-2026-09',discoveredAt:'2026-11-22T01:00:00Z',...overrides
});
const plan=(entries,overrides={})=>({
 contract:'novapharm.uk.private-backfill-file-batch.v1',
 sourceId:'nhsbsa.epd',startPeriod:'2026-07',endPeriod:'2026-09',
 entries,...overrides
});
async function fixture(callback){
 const root=await mkdtemp(join(tmpdir(),'uk-file-batch-'));
 try{return await callback(root);}
 finally{await rm(root,{recursive:true,force:true});}
}
async function add(root,period,prefix=period.replace('-','')){
 const a=prefix+'.csv',m=prefix+'.json';
 const payload=data+period+'\n';
 await writeFile(join(root,a),payload);
 await writeFile(join(root,m),JSON.stringify(manifest(period,{sha256:hash(payload),byteSize:Buffer.byteLength(payload)})));
 return {period,manifestFile:m,archiveFile:a};
}
test('verified archive bytes reveal missing months, never source rights',async()=>fixture(async root=>{
 const entries=[await add(root,'2026-07'),await add(root,'2026-09')];
 const x=await verifyUkPrivateBackfillBatch({plan:plan(entries),quarantineRoot:root});
 assert.equal(x.privateArchiveFilesRechecked,2);
 assert.equal(x.privateArchiveBytesRechecked,32);
 assert.deepEqual(x.missingPeriods,['2026-08']);
 assert.equal(x.candidateCoverageComplete,false);
 assert.equal(x.sourceRightsIndependentlyApproved,false);
 assert.equal(x.publisherHashProvenanceIndependent,false);
 assert.equal(x.canIngest,false);assert.equal(x.canPublish,false);
}));
test('complete local archive months do not constitute clinical ingestion',async()=>fixture(async root=>{
 const entries=[];
 for(const p of ['2026-07','2026-08','2026-09'])entries.push(await add(root,p));
 const x=await verifyUkPrivateBackfillBatch({plan:plan(entries),quarantineRoot:root});
 assert.equal(x.candidateCoverageComplete,true);
 assert.equal(x.candidateIntegrityVerifiedPeriods,3);
 assert.equal(x.clinicalRowsReconciled,0);
 assert.equal(x.admittedMedicineRows,0);
 assert.equal(x.customerCountryLive,false);
}));
test('same-month candidate versions are not double counted',async()=>fixture(async root=>{
 const a=await add(root,'2026-09','one');
 const b=await add(root,'2026-09','two');
 const x=await verifyUkPrivateBackfillBatch({plan:plan([a,b],{
   startPeriod:'2026-09',endPeriod:'2026-09'}),quarantineRoot:root});
 assert.deepEqual(x.conflictingVersionPeriods,['2026-09']);
 assert.equal(x.candidateCoverageComplete,false);
}));
test('file tampering, date mismatch, traversal and scope mismatch fail closed',async()=>fixture(async root=>{
 const row=await add(root,'2026-09');
 const good=plan([row],{startPeriod:'2026-09',endPeriod:'2026-09'});
 await writeFile(join(root,row.archiveFile),'modified contents');
 await assert.rejects(verifyUkPrivateBackfillBatch({plan:good,quarantineRoot:root}),/mismatch/);
 await writeFile(join(root,row.archiveFile),data+'2026-09\n');
 await assert.rejects(verifyUkPrivateBackfillBatch({
   plan:plan([{...row,period:'2026-08'}]),quarantineRoot:root}),/mismatch/);
 for(const field of ['manifestFile','archiveFile']){
  await assert.rejects(verifyUkPrivateBackfillBatch({
    plan:plan([{...row,[field]:'../escape.json'}]),quarantineRoot:root}),/filename/);
 }
 await assert.rejects(verifyUkPrivateBackfillBatch({
   plan:plan([row],{sourceId:'bso.gp-prescribing'}),quarantineRoot:root}),/mismatch/);
}));
test('symlinked manifests refuse and offline CLI output excludes private paths',async()=>fixture(async root=>{
 const row=await add(root,'2026-09');
 await symlink(row.manifestFile,join(root,'linked.json'));
 await assert.rejects(verifyUkPrivateBackfillBatch({
   plan:plan([{...row,manifestFile:'linked.json'}]),quarantineRoot:root}));
 const cfg='batch-plan.json';
 await writeFile(join(root,cfg),JSON.stringify(plan([row],{startPeriod:'2026-09',endPeriod:'2026-09'})));
 assert.equal((await readPrivateBackfillPlan(root,cfg)).entries.length,1);
 const command=new URL('./data/verify-uk-private-backfill-file-batch.mjs',import.meta.url).pathname;
 const result=spawnSync(process.execPath,[command,'--root',root,'--plan',cfg],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).privateArchiveFilesRechecked,1);
 assert.equal(JSON.parse(result.stdout).canPublish,false);
 assert.equal(result.stdout.includes(root),false);
 await symlink(cfg,join(root,'linked-plan.json'));
 const rejected=spawnSync(process.execPath,[command,'--root',root,'--plan','linked-plan.json'],{encoding:'utf8'});
 assert.equal(rejected.status,1);
 assert.equal(rejected.stdout,'');
 assert.match(rejected.stderr,/verification refused/);
}));


test('invalid historical bounds and out-of-range partitions are rejected before any archive read',async()=>fixture(async root=>{
 const row=await add(root,'2026-09');
 await assert.rejects(verifyUkPrivateBackfillBatch({
  plan:plan([{period:'2026-10',manifestFile:'nonexistent.json',archiveFile:'missing.csv'}]),
  quarantineRoot:root}),/outside requested historical window/);
 await assert.rejects(verifyUkPrivateBackfillBatch({
  plan:plan([row],{startPeriod:'2026-Q1'}),quarantineRoot:root}),/precision/);
}));

test('aggregate declared file size is bounded before streaming even the first archive',async()=>fixture(async root=>{
 const first=await add(root,'2026-08','first');
 const second=await add(root,'2026-09','second');
 const huge=9*1024**3;
 for(const record of [first,second]){
  await writeFile(join(root,record.manifestFile),
   JSON.stringify(manifest(record.period,{byteSize:huge,sha256:hash(data+record.period+'\n')})));
 }
 await assert.rejects(verifyUkPrivateBackfillBatch({
  plan:plan([first,second],{startPeriod:'2026-08',endPeriod:'2026-09'}),
  quarantineRoot:root}),/aggregate private batch byte budget exceeded/);
}));

test('same private manifest or archive filename cannot stand for two reporting months',async()=>fixture(async root=>{
 const jul=await add(root,'2026-07','july');
 const aug=await add(root,'2026-08','august');
 const base={startPeriod:'2026-07',endPeriod:'2026-08'};
 for(const field of ['manifestFile','archiveFile']){
  const reused={...aug,[field]:jul[field]};
  await assert.rejects(
   verifyUkPrivateBackfillBatch({plan:plan([jul,reused],base),quarantineRoot:root}),
   /source file reused across partition entries/);
 }
}));

test('identical source bytes claimed under separate months require manual publisher reconciliation',async()=>fixture(async root=>{
 const jul=await add(root,'2026-07','july');
 const aug=await add(root,'2026-08','august');
 const julyPayload=data+'2026-07\n';
 await writeFile(join(root,aug.archiveFile),julyPayload);
 await writeFile(join(root,aug.manifestFile),JSON.stringify(manifest('2026-08',{
  sha256:hash(julyPayload),byteSize:Buffer.byteLength(julyPayload)
 })));
 await assert.rejects(verifyUkPrivateBackfillBatch({
  plan:plan([jul,aug],{startPeriod:'2026-07',endPeriod:'2026-08'}),
  quarantineRoot:root
 }),/archive digest reused across distinct reporting periods/);
}));
