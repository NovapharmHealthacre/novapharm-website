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
/**
 * Code-reviewed, public CKAN resource IDs; metadata identity ONLY.
 * Must never be interpreted as authenticated file bytes or source licence.
 * Live official resource pages checked 22 Nov 2026 show a consistent
 * 13-field dictionary across June–September: numeric strength/pack, VTM string.
 * Earlier indexed July field-type snippets were stale; do not accept them.
 */
export const BNF_SNOMED_PUBLIC_RESOURCE_RELEASES=Object.freeze({
 '2026-06':Object.freeze({resourceId:'aa0b2fef-ea4e-4f8f-9df1-269cecc7e293',
   sourceDataMonth:'2026-06',portalCreatedOn:'2026-09-18',
   strengthType:'number',packType:'number',vtmType:'string'}),
 '2026-07':Object.freeze({resourceId:'bafa30b6-4426-4578-a128-935d13b228e5',
   sourceDataMonth:'2026-07',portalCreatedOn:'2026-10-06',
   strengthType:'number',packType:'number',vtmType:'string'}),
 '2026-08':Object.freeze({resourceId:'624eadfc-5125-489d-b292-8bccbad6e657',
   sourceDataMonth:'2026-08',portalCreatedOn:'2026-10-19',
   strengthType:'number',packType:'number',vtmType:'string'}),
 '2026-09':Object.freeze({resourceId:'638b7dc9-1eac-4495-9fc5-423fc52483e2',
   sourceDataMonth:'2026-09',portalCreatedOn:'2026-11-19',
   strengthType:'number',packType:'number',vtmType:'string'})
});
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
// NHSBSA reports numeric STRENGTH/PACK in June–September 2026
// reference dictionaries. Keep decimal quantities as lexical values and never
// coerce them into the SNOMED/BNF/dm+d identifier namespace.
function optionalDecimalMeasure(v,label) {
  const value=boundedString(v).trim();
  if(value!=='' && !/^\d{1,15}(?:\.\d{1,8})?$/.test(value))
    refuse('invalid '+label+' numeric measure');
  return value;
}
export function validateUkBnfSnomedReferenceSample({
  sourceId:requestedSourceId,reportingPeriod,publisherResourceId,headers,rows
}={}){
  if(requestedSourceId!==SOURCE_ID)refuse('unregistered reference source');
  if(typeof reportingPeriod!=='string'||
     !/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(reportingPeriod))
    refuse('invalid monthly reference period');
  const release=BNF_SNOMED_PUBLIC_RESOURCE_RELEASES[reportingPeriod];
  if(!release||publisherResourceId!==release.resourceId)
    refuse('unverified publisher resource for reporting period');
  if(!Array.isArray(headers)||headers.length<BNF_SNOMED_REFERENCE_HEADERS.length||
     headers.length>128||headers.some(h=>typeof h!=='string'||h.length>160||
       h.trim()!==h||/[\u0000-\u001f]/.test(h)))refuse('invalid CSV headers');
  if(new Set(headers).size!==headers.length)refuse('duplicate CSV headers');
  if(headers.length!==BNF_SNOMED_REFERENCE_HEADERS.length)
    refuse('unexpected CSV schema column count');
  // A pinned official resource dictionary has thirteen ordered fields.
  // Unknown additions or rearrangements need a new reviewed schema version.
  for(let i=0;i<BNF_SNOMED_REFERENCE_HEADERS.length;i++)
    if(headers[i]!==BNF_SNOMED_REFERENCE_HEADERS[i])
      refuse('pinned publisher CSV column order changed');
  const positions=new Map(headers.map((h,i)=>[h,i]));
  if(!Array.isArray(rows)||rows.length>1000)refuse('sample exceeds read-only bound');
  let unresolvedBnf=0,unresolvedSnomed=0,unresolvedVtm=0;
  let presentationRows=0,packRows=0,packOnlyFieldOnPresentation=0;
  let decimalStrengthRows=0,decimalPackRows=0;
  let aggregateUtf8Bytes=0;
  const bnfToSnomed=new Map();
  for(const row of rows){
    if(!Array.isArray(row)||row.length!==headers.length)
      refuse('row and schema width mismatch');
    for(const v of row){
      boundedString(v);
      aggregateUtf8Bytes+=Buffer.byteLength(v,'utf8');
      if(aggregateUtf8Bytes>1024*1024)refuse('sample payload exceeds 1 MiB');
    }
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
    const strength=optionalDecimalMeasure(get('STRENGTH'),'strength');
    const pack=optionalDecimalMeasure(get('PACK'),'pack');
    if(strength.includes('.'))decimalStrengthRows++;
    if(pack.includes('.'))decimalPackRows++;
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
    sourceId:SOURCE_ID,reportingPeriod,publisherResourceId,
    sourceDataMonth:release.sourceDataMonth,
    portalResourceCreatedOn:release.portalCreatedOn,
    sourceMonthAndPublicationDateKeptSeparate:true,
    metadataPinnedToPublishedResource:true,
    exactSourceFileHashIndependentlyVerified:false,
    selectedResourceDeclaredTypes:Object.freeze({
      strength:release.strengthType,pack:release.packType,vtm:release.vtmType
    }),
    sampleRowsInspected:rows.length,requiredColumnsVerified:BNF_SNOMED_REFERENCE_HEADERS.length,
    presentationRows,packRows,missingOrUnresolvedBnfCodeRows:unresolvedBnf,
    missingOrUnresolvedSnomedRows:unresolvedSnomed,missingOrUnresolvedVtmRows:unresolvedVtm,
    bnfCodesWithMultipleSnomedConceptsInSample:
      [...bnfToSnomed.values()].filter(s=>s.size>1).length,
    presentationRowsWithUnexpectedPackFields:packOnlyFieldOnPresentation,
    decimalStrengthRows,decimalPackRows,
    numericQuantitiesPreservedAsStrings:true,
    preservesMedicineCodesAsStrings:true,
    mappingOneToOneAssumed:false,
    sourceFileAuthenticityIndependentlyVerified:false,
    fullSourcePeriodReconciled:false,sourceRightsIndependentlyApproved:false,
    admittedMedicineRows:0,canIngest:false,canPublish:false,customerCountryLive:false
  });
}
