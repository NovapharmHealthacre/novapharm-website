import assert from 'node:assert/strict';
import test from 'node:test';
import {
 BNF_SNOMED_REFERENCE_HEADERS,validateUkBnfSnomedReferenceSample
} from '../src/core/uk-bnf-snomed-reference-quality.mjs';
const source='nhsbsa.bnf-snomed-map';
const month='2026-09';
const make=(overrides={})=>{
 const fields=Object.fromEntries(BNF_SNOMED_REFERENCE_HEADERS.map(h=>[h,'']));
 Object.assign(fields,{
  PRESENTATION_PACK_LEVEL:'Presentation',
  VMP_VMPP_AMP_AMPP:'VMP',
  BNF_CODE:'0101010A0AAAAAA',
  BNF_NAME:'Synthetic medicine label',
  SNOMED_CODE:'000000000123456789',
  DMD_PRODUCT_DESC:'Synthetic dm+d label',
  STRENGTH:'10',
  VTM:'000001234',
  VTM_NAME:'Synthetic VTM'
 },overrides);
 return BNF_SNOMED_REFERENCE_HEADERS.map(x=>fields[x]);
};
const args=(rows,extra={})=>({
 sourceId:source,reportingPeriod:month,
 headers:[...BNF_SNOMED_REFERENCE_HEADERS],rows,...extra
});
test('NHSBSA dictionary 13-column schema preserves all four distinct identity levels',()=>{
 assert.equal(BNF_SNOMED_REFERENCE_HEADERS.length,13);
 const x=validateUkBnfSnomedReferenceSample(args([
  make(),make({VMP_VMPP_AMP_AMPP:'AMP'}),
  make({PRESENTATION_PACK_LEVEL:'Pack',VMP_VMPP_AMP_AMPP:'VMPP',
    UNIT_OF_MEASURE:'tablet',PACK:'30'}),
  make({PRESENTATION_PACK_LEVEL:'Pack',VMP_VMPP_AMP_AMPP:'AMPP',
    UNIT_OF_MEASURE:'tablet',PACK:'28'})
 ]));
 assert.equal(x.sampleRowsInspected,4);
 assert.equal(x.presentationRows,2);assert.equal(x.packRows,2);
 assert.equal(x.preservesMedicineCodesAsStrings,true);
 assert.equal(x.admittedMedicineRows,0);
 assert.equal(x.canIngest,false);assert.equal(x.canPublish,false);
 assert.equal(x.mappingOneToOneAssumed,false);
 assert.equal(x.sourceFileAuthenticityIndependentlyVerified,false);
});
test('one-to-many BNF to SNOMED and missing codes are reported, never guessed or exposed',()=>{
 const x=validateUkBnfSnomedReferenceSample(args([
  make(),make({SNOMED_CODE:'000000000223456789'}),
  make({SNOMED_CODE:'',VTM:'',BNF_CODE:''})
 ]));
 assert.equal(x.bnfCodesWithMultipleSnomedConceptsInSample,1);
 assert.equal(x.missingOrUnresolvedBnfCodeRows,1);
 assert.equal(x.missingOrUnresolvedSnomedRows,1);
 assert.equal(x.missingOrUnresolvedVtmRows,1);
 assert.equal(x.fullSourcePeriodReconciled,false);
 assert.equal(x.sourceRightsIndependentlyApproved,false);
 assert.equal(JSON.stringify(x).includes('Synthetic'),false);
 assert.equal(JSON.stringify(x).includes('000000000223456789'),false);
});
test('cross-level medicine identities and unrecognised classes fail closed',()=>{
 for(const change of [
  {PRESENTATION_PACK_LEVEL:'Presentation',VMP_VMPP_AMP_AMPP:'AMPP'},
  {PRESENTATION_PACK_LEVEL:'Pack',VMP_VMPP_AMP_AMPP:'AMP'},
  {PRESENTATION_PACK_LEVEL:'Pack',VMP_VMPP_AMP_AMPP:'XYZ'},
  {PRESENTATION_PACK_LEVEL:'unknown',VMP_VMPP_AMP_AMPP:'VMP'}
 ]) assert.throws(()=>validateUkBnfSnomedReferenceSample(args([make(change)])),
                    /identity level|level conflict/);
});
test('invalid BNF, numeric SNOMED/VTM and strength not silently coerced',()=>{
 for(const change of [
  {BNF_CODE:'0101010A0AAAAAA-extra'},
  {SNOMED_CODE:'1e+15'},
  {SNOMED_CODE:'123.5'},
  {SNOMED_CODE:'1234567890123456789'},
  {VTM:'-12'},
  {STRENGTH:'2.5'}
 ]) assert.throws(()=>validateUkBnfSnomedReferenceSample(args([make(change)])),/invalid|non-decimal/);
});
test('wrong source, period, missing/duplicated official columns and oversized samples fail',()=>{
 assert.throws(()=>validateUkBnfSnomedReferenceSample(args([],{sourceId:'nhsbsa.epd'})),/unregistered/);
 assert.throws(()=>validateUkBnfSnomedReferenceSample(args([],{reportingPeriod:'2026-Q3'})),/monthly/);
 assert.throws(()=>validateUkBnfSnomedReferenceSample(args([],{headers:BNF_SNOMED_REFERENCE_HEADERS.slice(1)})),/invalid CSV headers/);
 assert.throws(()=>validateUkBnfSnomedReferenceSample(args([],{headers:[...BNF_SNOMED_REFERENCE_HEADERS,'BNF_CODE']})),/duplicate/);
 assert.throws(()=>validateUkBnfSnomedReferenceSample(args(Array(1001).fill(make()))),/read-only bound/);
 assert.throws(()=>validateUkBnfSnomedReferenceSample(args([['short']])),/width/);
});
test('pack-only annotations in presentation samples remain unresolved diagnostics',()=>{
 const x=validateUkBnfSnomedReferenceSample(args([
  make({UNIT_OF_MEASURE:'tab'}),make()
 ]));
 assert.equal(x.presentationRowsWithUnexpectedPackFields,1);
 assert.equal(x.canPublish,false);
});
