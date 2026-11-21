/**
 * UK devolved publisher CSV quarantine quality checks. Synthetic rows and verified
 * private snapshots only; NO publisher download, medicine admission, storage,
 * commercial redistribution, AI training or customer publication.
 *
 * Source profiles are intentionally distinct: NI GP prescribing is medicine-level;
 * NI contractor flow is not; Scottish board/prescriber/dispenser views overlap.
 */
const gpNI = Object.freeze([
  'Practice', 'Year', 'Month', 'VTM_NM', 'VMP_NM', 'AMP_NM',
  'Presentation', 'Strength', 'Total Items', 'Total Quantity',
  'Gross Cost (£)', 'Actual Cost (£)', 'BNF Code', 'BNF Chapter',
  'BNF Section', 'BNF Paragraph', 'BNF Sub-Paragraph',
]);
const flowNI = Object.freeze([
  'Practice', 'Practice Name', 'Chemist', 'Year', 'Month', 'Number of Items',
]);
const flowScotland = Object.freeze([
  'PaidDateMonth', 'PrescriberLocation', 'PrescriberLocationPostcode',
  'PrescriberLocationType', 'PrescriberType', 'DispenserLocation',
  'DispenserLocationPostcode', 'DispenserLocationType', 'NumberOfPaidItems',
]);
const pitcScotland = Object.freeze(['BNFItemCode', 'PaidQuantity', 'GrossIngredientCost']);

export const UK_DEVOLVED_CSV_QUALITY_CONTRACTS = Object.freeze([
  Object.freeze({sourceId:'bso.gp-prescribing',jurisdiction:'GB-NIR',periodPrecision:'month',view:'gp-presentation',required:gpNI,metrics:Object.freeze([['Total Items','items'],['Total Quantity','quantity'],['Gross Cost (£)','gross_cost_gbp'],['Actual Cost (£)','actual_cost_gbp']]),monthFields:['Year','Month'],identityField:'BNF Code'}),
  Object.freeze({sourceId:'bso.dispensing-contractor',jurisdiction:'GB-NIR',periodPrecision:'month',view:'contractor-flow',required:flowNI,metrics:Object.freeze([['Number of Items','items']]),monthFields:['Year','Month'],identityField:null}),
  ...['board','prescriber','dispenser'].map(view=>Object.freeze({sourceId:'phs.prescriptions-community',jurisdiction:'GB-SCT',periodPrecision:'month',view,required:pitcScotland,metrics:Object.freeze([['PaidQuantity','quantity'],['GrossIngredientCost','gross_ingredient_cost_gbp']]),monthFields:null,identityField:'BNFItemCode'})),
  Object.freeze({sourceId:'phs.prescribed-dispensed',jurisdiction:'GB-SCT',periodPrecision:'quarter',view:'prescriber-to-dispenser-flow',required:flowScotland,metrics:Object.freeze([['NumberOfPaidItems','items']]),monthFields:null,identityField:null}),
]);

function deny(cause){throw new Error('UK devolved CSV quality gate refused: '+cause);}
const codePattern=/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/;
const quarterPattern=/^(?:19|20)\d{2}-Q[1-4]$/;
function decimal(input){
  if(typeof input !== 'string' || input.length>32 || !/^[+-]?(?:\d{1,15}(?:\.\d{0,7})?|\.\d{1,7})$/.test(input.trim())) deny('nonfinite, oversized or nonnumeric measure');
  const num=Number(input.trim());
  if(!Number.isFinite(num) || !Number.isSafeInteger(Math.trunc(num))) deny('unsafe numeric magnitude');
  return num;
}
function int(input){
  const number=decimal(input);
  if(!Number.isSafeInteger(number))deny('fractional item count');
  return number;
}
function requireMonth(year,month,period){
  if(!/^\d{4}$/.test(year) || !/^(?:[1-9]|0[1-9]|1[0-2])$/.test(month)) deny('invalid source date');
  if(`${year}-${String(Number(month)).padStart(2,'0')}`!==period) deny('source row outside declared month');
}
export function validateUkDevolvedCsvSample({sourceId,view,reportingPeriod,headers,rows}){
  const contract=UK_DEVOLVED_CSV_QUALITY_CONTRACTS.find(p=>p.sourceId===sourceId&&p.view===view);
  if(!contract) deny('unregistered source or unqualified publisher view');
  if(typeof reportingPeriod!=='string' || !(contract.periodPrecision==='quarter'?quarterPattern:codePattern).test(reportingPeriod)) deny('wrong reporting-period precision');
  if(!Array.isArray(headers)||headers.length<contract.required.length||headers.length>256 || headers.some(h=>typeof h!=='string'||h.length>160||h.trim()!==h||/[\u0000-\u001f]/.test(h)))deny('invalid CSV header');
  if(new Set(headers).size!==headers.length) deny('duplicate header names');
  const column=new Map(headers.map((s,i)=>[s,i]));
  for(const field of contract.required) if(!column.has(field))deny('missing publisher column '+field);
  if(!Array.isArray(rows)||rows.length>1_000)deny('invalid sample bound');
  let flaggedCorrectionRows=0,missingMedicineCodes=0;
  for(const [rowIndex,row] of rows.entries()){
    if(!Array.isArray(row)||row.length!==headers.length||row.some(v=>typeof v!=='string'||v.length>8_192))deny('row width or field bound exceeded');
    const get=field=>row[column.get(field)];
    if(contract.monthFields)requireMonth(get(contract.monthFields[0]),get(contract.monthFields[1]),reportingPeriod);
    if(contract.identityField){
      const id=get(contract.identityField).trim();
      if(!id || id==='-' )missingMedicineCodes++;
      else if(id.length>160 || /[\u0000-\u001f]/.test(id))deny('invalid medicine code representation');
    }
    // A negative number may be a source accounting correction; flag, never silently erase.
    let negative=false;
    for(const [field,kind] of contract.metrics){
      const v=kind==='items'?int(get(field)):decimal(get(field));
      if(v<0)negative=true;
    }
    if(negative)flaggedCorrectionRows++;
  }
  return Object.freeze({
    contract:'novapharm.uk.devolved-csv-quarantine-quality.v1',sourceId,view,
    jurisdiction:contract.jurisdiction,reportingPeriod,periodPrecision:contract.periodPrecision,
    sourceDataGrain:`${sourceId}:${view}`,validatedSampleRows:rows.length,
    requiredColumnsVerified:contract.required.length,requiredColumnsPresent:true,
    sourceRowPeriodVerified:!!contract.monthFields,
    publisherDatePartitionReconciliationRequired:!contract.monthFields,
    missingOrUnresolvedMedicineCodes:missingMedicineCodes,flaggedCorrectionRows,
    sourceFileAuthenticityIndependentlyVerified:false,
    officialPublisherRightsApproved:false,admittedMedicineRows:0,
    canIngest:false,canPublish:false,customerCountryLive:false,
  });
}

export function assertUkPublisherViewsNotAdditive(left,right){
  if(!left||!right || left.sourceId!==right.sourceId || left.view===right.view)deny('same-source different views required');
  if(left.sourceId!=='phs.prescriptions-community')deny('no overlapping source view contract');
  if(left.reportingPeriod!==right.reportingPeriod)deny('period mismatch');
  return Object.freeze({status:'overlapping_views',permittedOperation:'reconcile_only',canSumMeasures:false});
}
