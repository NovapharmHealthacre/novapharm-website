import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { inspectOpenFdaNdcQuarantine } from '../src/core/intelligence-openfda-ndc-quarantine-graph.mjs';
const at = '2026-11-12T09:30:00.000Z';
const source = {
  meta: { terms:'https://open.fda.gov/terms/',license:'https://open.fda.gov/license/',
    last_updated:'2026-10-08',results:{skip:0,limit:100,total:2}},
  results:[
    {product_ndc:'0003-0893',product_id:'0003-0893_test-a',generic_name:'Apixaban',
     dosage_form:'TABLET',labeler_name:'Synthetic Labeler',marketing_category:'NDA',
     packaging:[{package_ndc:'0003-0893-31',description:'Synthetic 10 tablet pack',sample:false}]},
    {product_ndc:'66174-0091',product_id:'66174-0091_test-b',generic_name:'APIXABAN',
     dosage_form:'POWDER',labeler_name:'Synthetic Labeler Two',marketing_category:'BULK INGREDIENT',packaging:[]}
  ]
};
const inspect = data => {
  const rawJson = JSON.stringify(data);
  return inspectOpenFdaNdcQuarantine({rawJson,
    recordedSha256:createHash('sha256').update(rawJson,'utf8').digest('hex'),inspectedAt:at});
};
test('quarantine graph preserves source-submitted product-pack edges without approval claims',()=>{
  const out=inspect(source);
  assert.equal(out.productCount,2);assert.equal(out.packCount,1);
  assert.equal(out.relationships.length,1);assert.equal(out.missingOrUnresolvedRelationships,1);
  assert.equal(out.unresolved[0].reason,'no_recorded_package');
  assert.equal(out.singleQueryPageComplete,true);
  for(const field of ['commercialRightsAccepted','fdaApprovalProven','customerPublishingApproved',
    'canonicalMedicineIdentityEstablished','independentSourceAuthenticityVerified','ingestionCommitted'])
    assert.equal(out[field],false);
  assert.equal(out.dataState,'quarantined_unapproved');
});
test('digest mismatch prevents false provenance',()=>{
  assert.throws(()=>inspectOpenFdaNdcQuarantine({rawJson:JSON.stringify(source),recordedSha256:'0'.repeat(64),inspectedAt:at}),
    e=>e.code==='copy_digest_mismatch');
});
test('publisher record mismatches, duplicate products and malicious fields reject',()=>{
  for(const item of [
    {...source,results:[source.results[0],source.results[0]]},
    {...source,results:[{...source.results[0],generic_name:'Rivaroxaban'},source.results[1]]},
    {...source,results:[{...source.results[0],product_ndc:'bad'},source.results[1]]},
    {...source,meta:{...source.meta,license:'https://evil.invalid/licence'}},
    {...source,meta:{...source.meta,last_updated:'2027-03-20'}}
  ]) assert.throws(()=>inspect(item));
});
test('invalid packs never become joined factual edges',()=>{
  const out=inspect({...source,results:[
    {...source.results[0],packaging:[{package_ndc:'0022-3333-11',description:'Wrong medicine package'}]},source.results[1]]});
  assert.equal(out.packCount,0);assert.equal(out.missingOrUnresolvedRelationships,2);
});
test('incomplete query snapshot is never labelled complete',()=>{
  const out=inspect({...source,meta:{...source.meta,results:{skip:0,limit:100,total:80}}});
  assert.equal(out.singleQueryPageComplete,false);
  assert.equal(out.productCount,2);
});
test('identical snapshots produce deterministic source graph digest',()=>{
  assert.equal(inspect(source).projectionSha256,inspect(source).projectionSha256);
  assert.match(inspect(source).projectionSha256,/^[0-9a-f]{64}$/);
});