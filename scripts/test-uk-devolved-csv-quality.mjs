import assert from 'node:assert/strict';
import test from 'node:test';
import { UK_DEVOLVED_CSV_QUALITY_CONTRACTS,validateUkDevolvedCsvSample,assertUkPublisherViewsNotAdditive } from '../src/core/uk-devolved-csv-quality.mjs';

const niGp=UK_DEVOLVED_CSV_QUALITY_CONTRACTS.find(c=>c.sourceId==='bso.gp-prescribing');
const niData=(extra={})=>{
  const values=Object.fromEntries(niGp.required.map(f=>[f,'-']));
  Object.assign(values,{'Practice':'0001','Year':'2026','Month':'09','Total Items':'2','Total Quantity':'75','Gross Cost (£)':'9','Actual Cost (£)':'9','BNF Code':'0201000B0AAAEAE',...extra});
  return {sourceId:niGp.sourceId,view:niGp.view,reportingPeriod:'2026-09',headers:[...niGp.required],rows:[niGp.required.map(f=>values[f])]};
};

test('nation, period and non-additive view profiles are separate',()=>{
  assert.equal(UK_DEVOLVED_CSV_QUALITY_CONTRACTS.length,6);
  assert.equal(new Set(UK_DEVOLVED_CSV_QUALITY_CONTRACTS.map(c=>c.sourceId)).size,4);
  assert.equal(UK_DEVOLVED_CSV_QUALITY_CONTRACTS.filter(c=>c.sourceId==='phs.prescriptions-community').length,3);
});
test('NI exact publisher GP headers preserve presentation IDs, items, quantity and GBP semantics',()=>{
  const receipt=validateUkDevolvedCsvSample(niData());
  assert.equal(receipt.jurisdiction,'GB-NIR');
  assert.equal(receipt.validatedSampleRows,1);
  assert.equal(receipt.sourceRowPeriodVerified,true);
  assert.equal(receipt.missingOrUnresolvedMedicineCodes,0);
  assert.equal(receipt.admittedMedicineRows,0);
  assert.equal(receipt.canIngest,false);
  assert.equal(receipt.customerCountryLive,false);
});
test('NI month mismatch and fractional or unsafe items fail',()=>{
  for(const change of [{'Year':'2025'},{'Month':'08'},{'Total Items':'2.5'},{'Total Quantity':'infinite'},{'Gross Cost (£)':'NaN'},{'Actual Cost (£)':'1e100'}]) {
    assert.throws(()=>validateUkDevolvedCsvSample(niData(change)),/quality gate refused/);
  }
});
test('negative reimbursement adjustments flagged and missing BNF codes unresolved, never fabricated',()=>{
  const receipt=validateUkDevolvedCsvSample(niData({'Actual Cost (£)':'-2.0','BNF Code':'-'}));
  assert.equal(receipt.flaggedCorrectionRows,1);
  assert.equal(receipt.missingOrUnresolvedMedicineCodes,1);
  assert.equal(receipt.canPublish,false);
});
test('duplicate headers, missing columns and unbounded fields fail closed',()=>{
  const data=niData();
  assert.throws(()=>validateUkDevolvedCsvSample({...data,headers:[...data.headers, 'Year'],rows:[...data.rows.map(x=>[...x,'2026'])]}),/quality gate refused/);
  assert.throws(()=>validateUkDevolvedCsvSample({...data,headers:data.headers.filter(x=>x!=='BNF Code'),rows:[]}),/quality gate refused/);
  assert.throws(()=>validateUkDevolvedCsvSample({...data,rows:[[...data.rows[0], 'extra']]}),/quality gate refused/);
  assert.throws(()=>validateUkDevolvedCsvSample({...data,rows:[...data.rows, ...Array(1000).fill(data.rows[0])]}),/quality gate refused/);
});
test('Scottish three overlapping publication views cannot be summed',()=>{
  const c=UK_DEVOLVED_CSV_QUALITY_CONTRACTS.find(x=>x.sourceId==='phs.prescriptions-community');
  const base={sourceId:c.sourceId,reportingPeriod:'2026-08',headers:[...c.required],rows:[['0201000B0AAAEAE','75','9','202608']]};
  const board=validateUkDevolvedCsvSample({...base,view:'board'});
  const prescriber=validateUkDevolvedCsvSample({...base,view:'prescriber'});
  const dispenser=validateUkDevolvedCsvSample({...base,view:'dispenser'});
  for(const receipt of [board,prescriber,dispenser]){
    assert.equal(receipt.sourceRowPeriodVerified,true);
    assert.equal(receipt.publisherDatePartitionReconciliationRequired,false);
    assert.equal(receipt.fullSourcePartitionDateReconciled,false);
    assert.equal(receipt.admittedMedicineRows,0);
  }
  assert.equal(assertUkPublisherViewsNotAdditive(board,dispenser).canSumMeasures,false);
  assert.throws(()=>assertUkPublisherViewsNotAdditive(board,board),/quality gate refused/);
  assert.throws(()=>validateUkDevolvedCsvSample({...base,view:'unqualified'}),/quality gate refused/);
});
test('Scotland quarterly location flow and NI contractor flow require separate schema and periods',()=>{
  const scot=UK_DEVOLVED_CSV_QUALITY_CONTRACTS.find(x=>x.sourceId==='phs.prescribed-dispensed');
  const cols=Object.fromEntries(scot.required.map(c=>[c,'A']));cols.NumberOfPaidItems='2';cols.PaidDateMonth='202605';
  const receipt=validateUkDevolvedCsvSample({sourceId:scot.sourceId,view:scot.view,reportingPeriod:'2026-Q2',headers:[...scot.required],rows:[scot.required.map(c=>cols[c])]});
  assert.equal(receipt.periodPrecision,'quarter');
  assert.throws(()=>validateUkDevolvedCsvSample({sourceId:scot.sourceId,view:scot.view,reportingPeriod:'2026-06',headers:[...scot.required],rows:[]}),/quality gate refused/);
  const ni=UK_DEVOLVED_CSV_QUALITY_CONTRACTS.find(x=>x.sourceId==='bso.dispensing-contractor');
  const row=Object.fromEntries(ni.required.map(c=>[c,'A']));Object.assign(row,{Year:'2026',Month:'09','Number of Items':'20'});
  const n=validateUkDevolvedCsvSample({sourceId:ni.sourceId,view:ni.view,reportingPeriod:'2026-09',headers:[...ni.required],rows:[ni.required.map(c=>row[c])]});
  assert.equal(n.jurisdiction,'GB-NIR');
});
test('Wales workbook or ZIP is not misrepresented as accepted CSV schema',()=>{
  for(const sourceId of ['nwssp.gp-prescribing','nwssp.practice-pharmacy-flow']){
    assert.throws(()=>validateUkDevolvedCsvSample({sourceId,view:'workbook',reportingPeriod:'2026-09',headers:[],rows:[]}),/quality gate refused/);
  }
});


test('PHS monthly rows must match PaidDateMonth for every board, prescriber or dispenser view',()=>{
 const contracts=UK_DEVOLVED_CSV_QUALITY_CONTRACTS.filter(c=>c.sourceId==='phs.prescriptions-community');
 for(const c of contracts){
  const vals=Object.fromEntries(c.required.map(f=>[f,'X']));
  Object.assign(vals,{BNFItemCode:'0201000B0AAAEAE',PaidQuantity:'75',GrossIngredientCost:'9',PaidDateMonth:'202608'});
  const row=c.required.map(f=>vals[f]);
  const good={sourceId:c.sourceId,view:c.view,reportingPeriod:'2026-08',headers:[...c.required],rows:[row]};
  assert.equal(validateUkDevolvedCsvSample(good).sourceRowPeriodVerified,true);
  for(const bad of ['202607','202609','202600','202613','2026-08','202608x','not-a-month']){
   const invalid=c.required.map(f=>f==='PaidDateMonth'?bad:vals[f]);
   assert.throws(()=>validateUkDevolvedCsvSample({...good,rows:[row,invalid]}),/quality gate refused/);
  }
  assert.throws(()=>validateUkDevolvedCsvSample({
   ...good,headers:good.headers.filter(f=>f!=='PaidDateMonth'),rows:[]}),/invalid CSV header/);
 }
});
test('PHS quarterly location flow row dates must be months inside declared quarter',()=>{
 const c=UK_DEVOLVED_CSV_QUALITY_CONTRACTS.find(c=>c.sourceId==='phs.prescribed-dispensed');
 const rowFor=period=>{
  const vals=Object.fromEntries(c.required.map(f=>[f,'A']));
  vals.PaidDateMonth=period;vals.NumberOfPaidItems='2';
  return c.required.map(f=>vals[f]);
 };
 const good={sourceId:c.sourceId,view:c.view,reportingPeriod:'2026-Q2',
  headers:[...c.required],rows:['202604','202605','202606'].map(rowFor)};
 assert.equal(validateUkDevolvedCsvSample(good).sourceRowPeriodVerified,true);
 for(const bad of ['202603','202607','202600','202613','2026Q2','not-a-month']){
  assert.throws(()=>validateUkDevolvedCsvSample({...good,rows:[rowFor('202604'),rowFor(bad)]}),/quality gate refused/);
 }
 assert.throws(()=>validateUkDevolvedCsvSample({...good,reportingPeriod:'2026-Q1'}),/quality gate refused/);
});
