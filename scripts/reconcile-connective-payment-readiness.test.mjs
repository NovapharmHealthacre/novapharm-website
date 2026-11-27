import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcile} from './reconcile-connective-payment-readiness.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('src/content/connective-source-references.json');
const manifest=read('config/retail/approved-connective-checkout-release-20261126.json');
const catalogue=read('src/content/approved-consumer-catalogue.json');
const discovery={schema:'novapharm.connective.bulk-evidence-review.v1',records:source.products.map(p=>({
  gtin:p.ean,review:p.classificationReview==='medicine_class_review'?'REGULATED_HOLD':'MANUFACTURER_LINK_REVIEW'
}))};
test('entire 395-product register reconciles without falsely claiming AWS payment',()=>{
  const m=reconcile(source,manifest,catalogue,discovery);
  assert.equal(m.total,395);assert.equal(m.ownerCommerciallyAuthorised,385);
  assert.equal(m.regulatedHold,10);assert.equal(m.manifestApproved,manifest.approvedGtins.length);
  assert.equal(m.awsPaymentAdmitted,null);assert.equal(m.awsLedgerChecked,false);
  assert.equal(m.rows.filter(x=>x.awsPaymentAdmitted===null).length,395);
});
test('read-only AWS snapshot distinguishes admitted, staged, missing and regulated',()=>{
  const g1=manifest.approvedGtins[0],g2=manifest.approvedGtins[1];
  const ledger={schema:'novapharm.connective.readonly-payment-snapshot.v1',approvedGtins:[g1],stagedGtins:[g2]};
  const m=reconcile(source,manifest,catalogue,discovery,ledger);
  assert.equal(m.awsPaymentAdmitted,1);assert.equal(m.awsStaged,1);
  assert.equal(m.rows.find(x=>x.gtin===g1).status,'AWS_PAYMENT_ADMITTED');
  assert.equal(m.rows.find(x=>x.gtin===g2).status,'STAGED_NOT_PAYMENT_ADMITTED');
  assert.equal(m.rows.filter(x=>x.status==='REGULATED_HOLD').length,10);
  assert.equal(m.rows.filter(x=>x.status==='MANIFEST_APPROVED_AWS_NOT_ADMITTED').length,manifest.approvedGtins.length-2);
});
test('invalid, duplicate or unknown payment admissions fail closed',()=>{
  const snap={schema:'novapharm.connective.readonly-payment-snapshot.v1',approvedGtins:[],stagedGtins:[]};
  const g=manifest.approvedGtins[0];
  assert.throws(()=>reconcile(source,manifest,catalogue,discovery,{...snap,approvedGtins:[g,g]}));
  assert.throws(()=>reconcile(source,manifest,catalogue,discovery,{...snap,approvedGtins:[g],stagedGtins:[g]}));
  const outside=source.products.find(p=>!manifest.approvedGtins.includes(p.ean)).ean;
  assert.throws(()=>reconcile(source,manifest,catalogue,discovery,{...snap,approvedGtins:[outside]}));
  assert.throws(()=>reconcile(source,manifest,catalogue,{...discovery,records:discovery.records.slice(1)}));
});
