/**
 * NHS Wales GP prescribing ZIP directory safety gate.
 * Reads only bounded ZIP central-directory metadata through an already-open
 * private file handle; never extracts or reads medicine rows.
 */
const refuse=reason=>{throw new Error('UK Wales GP ZIP inventory refused: '+reason);};
async function readExact(handle,n,pos){
  const b=Buffer.alloc(n);let off=0;
  while(off<n){const r=await handle.read(b,off,n-off,pos+off);if(r.bytesRead<=0)refuse('truncated ZIP');off+=r.bytesRead;}
  return b;
}
const WALES_ZIP_PROFILES = Object.freeze({
  'nwssp.gp-prescribing': Object.freeze({members:3, main:'gpdatafile', mainRole:'gp_presentation', hasBnf:false}),
  'nwssp.hospital-prescribing': Object.freeze({members:3, main:'hospitaldatafile', mainRole:'hospital_presentation', hasBnf:false}),
  'nwssp.dental-prescribing': Object.freeze({members:3, main:'dentaldatafile', mainRole:'dental_presentation', hasBnf:false}),
  'nwssp.independent-pharmacist-prescribing': Object.freeze({members:4, main:'ipdata', mainRole:'independent_pharmacist_presentation', hasBnf:true}),
});
function roleFor(name,period,sourceId){
  if(name.length>120||!/^[A-Za-z0-9._-]+$/.test(name)||name.includes('..'))refuse('unsafe filename');
  const base=name.toLowerCase().replace(/\.(?:txt|csv|dat)$/,'');
  const profile=WALES_ZIP_PROFILES[sourceId];
  if(profile.hasBnf && !/\.csv$/i.test(name))refuse('independent pharmacist members must be CSV');
  if(base===profile.main+period.replace('-','')) {
    if(profile.hasBnf && !/\.csv$/i.test(name))refuse('independent pharmacist main member must be CSV');
    return profile.mainRole;
  }
  if(base==='bnf' && profile.hasBnf) {
    if(!/\.csv$/i.test(name))refuse('independent pharmacist BNF member must be CSV');
    return 'bnf_reference';
  }
  if(base==='chemsubstance')return 'chemical_substance';
  if(base==='address'||base==='addressfile')return 'publisher_address';
  refuse('wrong-period or unrecognised archive member');
}
export async function inspectWalesPublisherZipDirectory(handle,{sourceId,reportingPeriod}={}){
  const profile=WALES_ZIP_PROFILES[sourceId];
  if(!profile||typeof reportingPeriod!=='string'||
     !/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(reportingPeriod))
    refuse('invalid source or month');
  if(!handle||typeof handle.stat!=='function'||typeof handle.read!=='function')refuse('private file handle required');
  const st=await handle.stat();
  if(!st.isFile()||!Number.isSafeInteger(st.size)||st.size<22||st.size>12*1024**3)refuse('archive size or type');
  const tailSize=Math.min(st.size,65557),tail=await readExact(handle,tailSize,st.size-tailSize);
  let end=-1;
  for(let p=tail.length-22;p>=0;p--){
    if(tail.readUInt32LE(p)===0x06054b50&&p+22+tail.readUInt16LE(p+20)===tail.length){end=p;break;}
  }
  if(end<0)refuse('missing ZIP end directory');
  if(tail.readUInt16LE(end+4)!==0||tail.readUInt16LE(end+6)!==0||
     tail.readUInt16LE(end+8)!==profile.members||tail.readUInt16LE(end+10)!==profile.members)refuse('expected exact single-disk member count');
  const length=tail.readUInt32LE(end+12),start=tail.readUInt32LE(end+16);
  if(length<46*profile.members||length>524288||length===0xffffffff||start===0xffffffff||
     start+length!==st.size-tail.length+end)refuse('unsafe central directory boundaries');
  const dir=await readExact(handle,length,start);
  let pos=0;let packed=0;let unpacked=0;const roles=new Set();const localRanges=[];
  for(let i=0;i<profile.members;i++){
    if(pos+46>dir.length||dir.readUInt32LE(pos)!==0x02014b50)refuse('invalid entry signature');
    const flags=dir.readUInt16LE(pos+8),method=dir.readUInt16LE(pos+10);
    const compressed=dir.readUInt32LE(pos+20),plain=dir.readUInt32LE(pos+24);
    const n=dir.readUInt16LE(pos+28),extra=dir.readUInt16LE(pos+30),comment=dir.readUInt16LE(pos+32);
    const next=pos+46+n+extra+comment;
    const mode=(dir.readUInt32LE(pos+38)>>>16)&0xf000;
    if(n<1||n>120||next>dir.length||dir.readUInt16LE(pos+34)!==0||
       ![0,8].includes(method)||(flags&0x61)!==0||
       compressed===0||plain===0||compressed===0xffffffff||plain===0xffffffff||
       dir.readUInt32LE(pos+42)>=start||(mode!==0&&mode!==0x8000))refuse('unsupported or unsafe member');
    const label=dir.subarray(pos+46,pos+46+n);
    if(label.some(c=>c<0x21||c>0x7e))refuse('unsafe member encoding');
    const role=roleFor(label.toString('ascii'),reportingPeriod,sourceId);
    if(roles.has(role))refuse('duplicate member role');
    roles.add(role);
    if(method===0&&plain!==compressed)refuse('stored member size mismatch');
    if(plain/compressed>250)refuse('unsafe expansion ratio');
    // The central directory alone is untrusted: verify the corresponding
    // bounded local header and member interval without reading source rows.
    const localOffset=dir.readUInt32LE(pos+42);
    const localHeader=await readExact(handle,30,localOffset);
    const localNameLen=localHeader.readUInt16LE(26),localExtraLen=localHeader.readUInt16LE(28);
    if(localHeader.readUInt32LE(0)!==0x04034b50 ||
       localHeader.readUInt16LE(6)!==flags ||
       localHeader.readUInt16LE(8)!==method ||
       localHeader.readUInt32LE(18)!==compressed ||
       localHeader.readUInt32LE(22)!==plain ||
       localNameLen!==n || localExtraLen>2048 || (flags&0x08)!==0)
      refuse('local and central ZIP headers disagree');
    const localFilename=await readExact(handle,n,localOffset+30);
    if(!localFilename.equals(label))refuse('local ZIP filename does not match central directory');
    const localEnd=localOffset+30+n+localExtraLen+compressed;
    if(localEnd>start)refuse('local ZIP payload extends into central directory');
    localRanges.push({start:localOffset,end:localEnd});
    unpacked+=plain;packed+=compressed;pos=next;
  }
  localRanges.sort((a,b)=>a.start-b.start);
  if(localRanges.some((range,i)=>i>0&&range.start<localRanges[i-1].end))refuse('overlapping ZIP local entries');
  if(pos!==dir.length||roles.size!==profile.members||unpacked>12*1024**3)refuse('unbounded or incomplete directory');
  return Object.freeze({
    contract:sourceId==='nwssp.gp-prescribing'?'novapharm.uk.wales-gp-zip-directory.v1':'novapharm.uk.wales-publisher-zip-directory.v1',sourceId,jurisdiction:'GB-WLS',reportingPeriod,
    directoryEntries:profile.members,memberRoles:Object.freeze([...roles].sort()),declaredCompressedBytes:packed,
    declaredUncompressedBytes:unpacked,
    officialPublisherFileHashVerified:false,officialPublisherRightsApproved:false,
    sourceRowsRead:0,admittedMedicineRows:0,canExtract:false,canIngest:false,
    canPublish:false,customerCountryLive:false
  });
}

/** Backward-compatible GP wrapper; all Wales files stay private and non-admitted. */
export async function inspectWalesGpZipDirectory(handle, options={}) {
  if(options.sourceId!=='nwssp.gp-prescribing')refuse('GP archive source required');
  const result=await inspectWalesPublisherZipDirectory(handle,options);
  // Preserve the historical role label used in GP-only existing receipts.
  return Object.freeze({...result,
    memberRoles:Object.freeze(result.memberRoles.map(role=>role==='publisher_address'?'practice_address':role))});
}
