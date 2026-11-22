/**
 * NHSBSA BNF–SNOMED mapping: bounded, non-admission schema/identity sample gate.
 * Exact field names from the NHSBSA official ODP data dictionary (2026).
 * A synthetic or privately authorised sample DOES NOT prove a complete source
 * period, rights to BNF/SNOMED/dm+d, or real publisher authenticity.
 */
export const BNF_SNOMED_REFERENCE_HEADERS=Object.freeze([
  'PRESENTATION_PACK_LEVEL','VMP_VMPP_AMP_AMPP','BNF_CODE','BNF_NAME',
  'SNOMED_CODE','DMD_PRODUCT_DESC','STRENGTH','UNIT_OF_MEASURE',
  'DMD_PRODUCT_PACK_DESC','PACK','SUB_PACK','VTM','VTM_NAME'
]);
const SOURCE_ID='nhsbsa.bnf-snomed-map';
const types=Object.freeze(['VMP','VMPP','AMP','AMPP']);
const refuse=reason=>{throw new Error('UK BNF SNOMED quarantine quality refused: '+reason);};
function boundedString(v) {
  if(typeof v!=='string'||v.length>8192||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))
    refuse('unsafe CSV field');
  return v;
}
function optionalNumericCode(v,label) {
  const value=boundedString(v).trim();
  if(value!==''&&!/^\d{1,18}$/.test(value))refuse('non-decimal '+label+' identifier');
  return value;
}
export function validateUkBnfSnomedReferenceSample({
  sourceId:requestedSourceId,reportingPeriod,headers,rows
}={}){
  if(requestedSourceId!==SOURCE_ID)refuse('unregistered reference source');
  if(typeof reportingPeriod!=='string'||
     !/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(reportingPeriod))
    refuse('invalid monthly reference period');
  if(!Array.isArray(headers)||headers.length<BNF_SNOMED_REFERENCE_HEADERS.length||
     headers.length>128||headers.some(h=>typeof h!=='string'||h.length>160||
       h.trim()!==h||/[\u0000-\u001f]/.test(h)))refuse('invalid CSV headers');
  if(new Set(headers).size!==headers.length)refuse('duplicate CSV headers');
  const positions=new Map(headers.map((h,i)=>[h,i]));
  for(const name of BNF_SNOMED_REFERENCE_HEADERS)
    if(!positions.has(name))refuse('missing official field '+name);
  if(!Array.isArray(rows)||rows.length>1000)refuse('sample exceeds read-only bound');
  let unresolvedBnf=0,unresolvedSnomed=0,unresolvedVtm=0;
  let presentationRows=0,packRows=0,packOnlyFieldOnPresentation=0;
  const bnfToSnomed=new Map();
  for(const row of rows){
    if(!Array.isArray(row)||row.length!==headers.length)
      refuse('row and schema width mismatch');
    for(const v of row)boundedString(v);
    const get=name=>row[positions.get(name)].trim();
    const level=get('PRESENTATION_PACK_LEVEL').toLowerCase();
    const kind=get('VMP_VMPP_AMP_AMPP').toUpperCase();
    if(!['presentation','pack'].includes(level)||!types.includes(kind))
      refuse('unrecognised medicine identity level');
    if((level==='presentation'&&!['VMP','AMP'].includes(kind))||
       (level==='pack'&&!['VMPP','AMPP'].includes(kind)))
      refuse('medicine presentation and pack level conflict');
    if(level==='pack')packRows++;else presentationRows++;
    const bnf=get('BNF_CODE');
    if(bnf && !/^[A-Za-z0-9]{1,15}$/.test(bnf))
      refuse('invalid BNF identifier representation');
    if(!bnf)unresolvedBnf++;
    const snomed=optionalNumericCode(get('SNOMED_CODE'),'SNOMED');
    if(!snomed)unresolvedSnomed++;
    const vtm=optionalNumericCode(get('VTM'),'VTM');
    if(!vtm)unresolvedVtm++;
    const strength=get('STRENGTH');
    if(strength&&!/^\d{1,15}$/.test(strength))
      refuse('invalid strength integer representation');
    if(level==='presentation'&&
       ['UNIT_OF_MEASURE','DMD_PRODUCT_PACK_DESC','PACK','SUB_PACK']
         .some(field=>get(field)!==''))
      packOnlyFieldOnPresentation++;
    if(bnf&&snomed){
      if(!bnfToSnomed.has(bnf))bnfToSnomed.set(bnf,new Set());
      bnfToSnomed.get(bnf).add(snomed);
    }
  }
  return Object.freeze({
    contract:'novapharm.uk.bnf-snomed-reference-quarantine-quality.v1',
    sourceId:SOURCE_ID,reportingPeriod,
    sampleRowsInspected:rows.length,requiredColumnsVerified:BNF_SNOMED_REFERENCE_HEADERS.length,
    presentationRows,packRows,missingOrUnresolvedBnfCodeRows:unresolvedBnf,
    missingOrUnresolvedSnomedRows:unresolvedSnomed,missingOrUnresolvedVtmRows:unresolvedVtm,
    bnfCodesWithMultipleSnomedConceptsInSample:
      [...bnfToSnomed.values()].filter(s=>s.size>1).length,
    presentationRowsWithUnexpectedPackFields:packOnlyFieldOnPresentation,
    preservesMedicineCodesAsStrings:true,
    mappingOneToOneAssumed:false,
    sourceFileAuthenticityIndependentlyVerified:false,
    fullSourcePeriodReconciled:false,sourceRightsIndependentlyApproved:false,
    admittedMedicineRows:0,canIngest:false,canPublish:false,customerCountryLive:false
  });
}
