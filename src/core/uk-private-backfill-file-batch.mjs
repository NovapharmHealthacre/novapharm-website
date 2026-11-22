import {constants} from 'node:fs';
import {open,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {validateUkNationalArchiveManifest,verifyUkNationalArchiveBytes} from './uk-national-source-archive-preflight.mjs';
import {assessUkBackfillCandidateCoverage} from './uk-four-nation-backfill-candidate.mjs';

/** Re-hash actual private quarantine files before generating a backfill candidate coverage report.
 * Never downloads, extracts medicine data, writes to cloud, asserts publisher authenticity or grants rights.
 */
const deny=why=>{throw new Error('UK private backfill batch refused: '+why);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function requireKeys(value,keys){
 if(!plain(value)||Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(value,k)))
  deny('missing or unexpected fields');
}
function safeName(value,extension){
 if(typeof value!=='string'||value.length>160||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value)||
    value.includes('..')||(extension&&!value.toLowerCase().endsWith(extension)))deny('unsafe private filename');
 return value;
}
export async function readPrivateBackfillPlan(root,name){
 const file=safeName(name,'.json');
 const h=await open(join(await realpath(resolve(root)),file),constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const s=await h.stat();
  if(!s.isFile()||s.size<2||s.size>64000)deny('plan size or file type');
  return JSON.parse(await h.readFile({encoding:'utf8'}));
 }finally{await h.close();}
}
export async function verifyUkPrivateBackfillBatch({plan,quarantineRoot}={}){
 requireKeys(plan,['contract','sourceId','startPeriod','endPeriod','entries']);
 if(plan.contract!=='novapharm.uk.private-backfill-file-batch.v1'||
    !Array.isArray(plan.entries)||plan.entries.length>24)deny('invalid bounded batch contract');
 if(typeof quarantineRoot!=='string'||!quarantineRoot)deny('private quarantine root required');
 const root=await realpath(resolve(quarantineRoot));
 // Validate the entire requested window and manifest batch before
 // streaming any potentially enormous official archive. This prevents
 // malformed later entries from triggering avoidable earlier disk I/O.
 const baseline=assessUkBackfillCandidateCoverage({
  sourceId:plan.sourceId,startPeriod:plan.startPeriod,endPeriod:plan.endPeriod,receipts:[]});
 const maxBatchBytes=16*1024**3;
 const periodPattern=baseline.periodPrecision==='month' ?
  /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/ :
  /^(?:19|20)\d{2}-Q[1-4]$/;
 const prepared=[];
 let expectedBytes=0;
 for(const entry of plan.entries){
  requireKeys(entry,['period','manifestFile','archiveFile']);
  if(typeof entry.period!=='string'||!periodPattern.test(entry.period)||
     entry.period<plan.startPeriod||entry.period>plan.endPeriod)
   deny('source partition outside requested historical window');
  const manifestFile=safeName(entry.manifestFile,'.json');
  const archiveFile=safeName(entry.archiveFile);
  const ext=archiveFile.toLowerCase().split('.').at(-1);
  if(!['csv','zip','xls','xlsx'].includes(ext))deny('unsupported archive format');
  const h=await open(join(root,manifestFile),constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  let manifest;
  try{
   const s=await h.stat();
   if(!s.isFile()||s.size<2||s.size>20000)deny('manifest size or type');
   manifest=JSON.parse(await h.readFile({encoding:'utf8'}));
  }finally{await h.close();}
  const m=validateUkNationalArchiveManifest(manifest);
  if(m.sourceId!==plan.sourceId||m.reportingPeriod!==entry.period||m.fileFormat.toLowerCase()!==ext)
   deny('source, period or format mismatch');
  if(m.expectedBytes>maxBatchBytes-expectedBytes)
   deny('aggregate private batch byte budget exceeded');
  expectedBytes+=m.expectedBytes;
  prepared.push({manifest,archiveFile});
 }
 const receipts=[];let verifiedBytes=0;
 for(const {manifest,archiveFile} of prepared){
  const receipt=await verifyUkNationalArchiveBytes(manifest,{
   archivePath:join(root,archiveFile),quarantineRoot:root});
  if(receipt.archiveIntegrityVerified!==true||receipt.canIngest!==false||
     receipt.admittedMedicineRows!==0)deny('invalid private archive receipt');
  receipts.push(receipt);verifiedBytes+=receipt.byteCount;
 }
 const coverage=assessUkBackfillCandidateCoverage({
  sourceId:plan.sourceId,startPeriod:plan.startPeriod,endPeriod:plan.endPeriod,receipts});
 return Object.freeze({...coverage,privateArchiveFilesRechecked:receipts.length,
  privateArchiveBytesRechecked:verifiedBytes,publisherHashProvenanceIndependent:false,
  customerCountryLive:false,canIngest:false,canPublish:false});
}
