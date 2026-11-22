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
function roleFor(name,period){
  if(name.length>120||!/^[A-Za-z0-9._-]+$/.test(name)||name.includes('..'))refuse('unsafe filename');
  const base=name.toLowerCase().replace(/\.(?:txt|csv|dat)$/,'');
  if(base==='gpdatafile'+period.replace('-',''))return 'gp_presentation';
  if(base==='chemsubstance')return 'chemical_substance';
  if(base==='address'||base==='addressfile')return 'practice_address';
  refuse('wrong-period or unrecognised archive member');
}
export async function inspectWalesGpZipDirectory(handle,{sourceId,reportingPeriod}={}){
  if(sourceId!=='nwssp.gp-prescribing'||typeof reportingPeriod!=='string'||
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
     tail.readUInt16LE(end+8)!==3||tail.readUInt16LE(end+10)!==3)refuse('expected three single-disk members');
  const length=tail.readUInt32LE(end+12),start=tail.readUInt32LE(end+16);
  if(length<138||length>524288||length===0xffffffff||start===0xffffffff||
     start+length!==st.size-tail.length+end)refuse('unsafe central directory boundaries');
  const dir=await readExact(handle,length,start);
  let pos=0;let packed=0;let unpacked=0;const roles=new Set();
  for(let i=0;i<3;i++){
    if(pos+46>dir.length||dir.readUInt32LE(pos)!==0x02014b50)refuse('invalid entry signature');
    const flags=dir.readUInt16LE(pos+8),method=dir.readUInt16LE(pos+10);
    const compressed=dir.readUInt32LE(pos+20),plain=dir.readUInt32LE(pos+24);
    const n=dir.readUInt16LE(pos+28),extra=dir.readUInt16LE(pos+30),comment=dir.readUInt16LE(pos+32);
    const next=pos+46+n+extra+comment;
    const mode=(dir.readUInt32LE(pos+38)>>>16)&0xf000;
    if(n<1||n>120||next>dir.length||dir.readUInt16LE(pos+34)!==0||
       ![0,8].includes(method)||(flags&0x61)!==0||
       compressed===0||plain===0||compressed===0xffffffff||plain===0xffffffff||
       dir.readUInt32LE(pos+42)>=start||mode===0xa000)refuse('unsupported or unsafe member');
    const label=dir.subarray(pos+46,pos+46+n);
    if(label.some(c=>c<0x21||c>0x7e))refuse('unsafe member encoding');
    const role=roleFor(label.toString('ascii'),reportingPeriod);
    if(roles.has(role))refuse('duplicate member role');
    roles.add(role);
    if(method===0&&plain!==compressed)refuse('stored member size mismatch');
    if(plain/compressed>250)refuse('unsafe expansion ratio');
    unpacked+=plain;packed+=compressed;pos=next;
  }
  if(pos!==dir.length||roles.size!==3||unpacked>12*1024**3)refuse('unbounded or incomplete directory');
  return Object.freeze({
    contract:'novapharm.uk.wales-gp-zip-directory.v1',sourceId,jurisdiction:'GB-WLS',reportingPeriod,
    directoryEntries:3,memberRoles:Object.freeze([...roles].sort()),declaredCompressedBytes:packed,
    declaredUncompressedBytes:unpacked,
    officialPublisherFileHashVerified:false,officialPublisherRightsApproved:false,
    sourceRowsRead:0,admittedMedicineRows:0,canExtract:false,canIngest:false,
    canPublish:false,customerCountryLive:false
  });
}
