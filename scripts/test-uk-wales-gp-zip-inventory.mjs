import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,open,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectWalesGpZipDirectory} from '../src/core/uk-wales-gp-zip-inventory.mjs';
function zip(names,{flags=0,method=0,zipped=1,raw=1,trailing=0}={}){
 const parts=[],central=[];let pos=0;
 for(const n of names){
  const name=Buffer.from(n,'ascii'),local=Buffer.alloc(30+name.length+zipped);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(flags,6);
  local.writeUInt16LE(method,8);local.writeUInt32LE(zipped,18);local.writeUInt32LE(raw,22);
  local.writeUInt16LE(name.length,26);name.copy(local,30);
  parts.push(local);
  const cd=Buffer.alloc(46+name.length);
  cd.writeUInt32LE(0x02014b50,0);cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);
  cd.writeUInt16LE(flags,8);cd.writeUInt16LE(method,10);cd.writeUInt32LE(zipped,20);
  cd.writeUInt32LE(raw,24);cd.writeUInt16LE(name.length,28);cd.writeUInt32LE(pos,42);name.copy(cd,46);
  central.push(cd);pos+=local.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(names.length,8);
 end.writeUInt16LE(names.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(pos,16);
 return Buffer.concat([...parts,directory,end,Buffer.alloc(trailing)]);
}
const memberNames=['GPDataFile202609.txt','ChemSubstance.txt','Address.txt'];
async function scan(bytes,params={sourceId:'nwssp.gp-prescribing',reportingPeriod:'2026-09'}){
 const root=await mkdtemp(join(tmpdir(),'uk-wales-zip-'));
 try{
  const path=join(root,'candidate.zip');await writeFile(path,bytes);
  const h=await open(path,'r');try{return await inspectWalesGpZipDirectory(h,params);}
  finally{await h.close();}
 }finally{await rm(root,{recursive:true,force:true});}
}
test('three publisher roles are detected without reading or admitting records',async()=>{
 const x=await scan(zip(memberNames));
 assert.deepEqual(x.memberRoles,['chemical_substance','gp_presentation','practice_address']);
 for(const k of ['canExtract','canIngest','canPublish','officialPublisherRightsApproved'])assert.equal(x[k],false);
 assert.equal(x.sourceRowsRead,0);assert.equal(x.admittedMedicineRows,0);
});
test('source and month must be explicitly qualified',async()=>{
 for(const params of [{sourceId:'nhsbsa.epd',reportingPeriod:'2026-09'},
 {sourceId:'nwssp.gp-prescribing',reportingPeriod:'2026-Q3'},
 {sourceId:'nwssp.gp-prescribing',reportingPeriod:'2026-08'}])
 await assert.rejects(scan(zip(memberNames),params),/inventory refused/);
});
test('reject missing, extra, duplicate, wrong-month and path-traversal members',async()=>{
 for(const names of [
 [memberNames[0],memberNames[1]], [...memberNames,'extra.txt'],
 [memberNames[0],memberNames[1],'ChemSubstance.dat'],
 ['GPDataFile202608.txt',memberNames[1],memberNames[2]],
 [memberNames[0],memberNames[1],'../Address.txt']])
 await assert.rejects(scan(zip(names)),/inventory refused/);
});
test('reject encryption, unsafe algorithms, oversized inflation and trailing junk',async()=>{
 for(const options of [{flags:1},{method:12},{raw:1000,zipped:1},{trailing:4}])
 await assert.rejects(scan(zip(memberNames,options)),/inventory refused/);
});
test('reject malformed/truncated ZIP central directory',async()=>{
 await assert.rejects(scan(Buffer.from('not-a-zip')),/inventory refused/);
 const corrupted=zip(memberNames);
 const start=memberNames.reduce((sum,name)=>sum+30+Buffer.byteLength(name)+1,0);
 corrupted.writeUInt32LE(0,start);
 await assert.rejects(scan(corrupted),/inventory refused/);
});


test('reject forged central ZIP metadata, local filenames and overlapping payloads',async()=>{
 const invalidLocalSignature=zip(memberNames);
 invalidLocalSignature.writeUInt32LE(0,0);
 await assert.rejects(scan(invalidLocalSignature),/inventory refused/);

 const mismatchedLocalName=zip(memberNames);
 mismatchedLocalName.write('X',30,'ascii');
 await assert.rejects(scan(mismatchedLocalName),/inventory refused/);

 const zipBytes=zip(memberNames);
 const centralStart=memberNames.reduce((sum,name)=>sum+30+Buffer.byteLength(name)+1,0);
 // Tamper with the first member's local offset so two entries overlap.
 const secondCentral=centralStart+46+memberNames[0].length;
 zipBytes.writeUInt32LE(0,secondCentral+42);
 await assert.rejects(scan(zipBytes),/inventory refused/);
});
