import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareB2BAssistedOrderRequest,customerSafeAssistedRequestView}
  from '../src/commerce/b2b-assisted-order.mjs';

const actor={sessionAuthority:'verified-server-session',mfaVerified:true,role:'employee',
  actorId:'staff-001',assignedAccountIds:['account-A']};
const account={accountId:'account-A',status:'active',qualificationStatus:'approved',
  legalEntityVerified:true};
const caller={verificationStatus:'verified',method:'registered-contact-challenge',proofRef:'proof-001'};
const serverCatalogue=[{sku:'NUT-UK-VD3-T120',type:'supplement',discoverable:true,
  eligibleAccountIds:['account-A'],stockEvidence:'owner-declared',availableToPromise:10000},
  {sku:'RX-UK-TEST',type:'regulated-medicine',discoverable:true,
    eligibleAccountIds:['account-A'],stockEvidence:'warehouse-reconciled',
    lotReleased:true,availableToPromise:200}];
const input={actor,account,caller,channel:'telephone',requestId:'req-001',
  requestedLines:[{sku:'NUT-UK-VD3-T120',quantity:2}],serverCatalogue};
const make=(changes={})=>prepareB2BAssistedOrderRequest({...input,...changes});

test('verified telesales drafts are non-binding and do not allocate or charge',()=>{
  const request=make();
  assert.equal(request.status,'commercial_and_regulatory_review_required');
  for(const key of ['orderCreated','stockReserved','paymentCollected','dispatchAuthorised','customerCommunicationSent'])
    assert.equal(request[key],false);
  assert.equal(request.lines[0].availability,'availability_unverified');
  assert.equal(request.lines[0].orderReleaseAllowed,false);
});
test('no anonymous, unverified, non-MFA or customer-impersonating staff',()=>{
  assert.throws(()=>make({actor:{...actor,mfaVerified:false}}),/MFA/);
  assert.throws(()=>make({actor:{...actor,role:'customer'}}),/role/);
  assert.throws(()=>make({actor:{...actor,assignedAccountIds:['account-B']}}),/assignment/);
  assert.throws(()=>make({caller:{...caller,verificationStatus:'pending'}}),/Caller/);
  assert.throws(()=>make({account:{...account,qualificationStatus:'pending'}}),/Qualified/);
});
test('customer isolation and server-authoritative product eligibility',()=>{
  assert.throws(()=>make({requestedLines:[{sku:'UNKNOWN-100',quantity:1}]}),/eligible/);
  assert.throws(()=>make({serverCatalogue:[{...serverCatalogue[0],eligibleAccountIds:['account-B']}]}),/eligible/);
  assert.throws(()=>make({requestedLines:[{sku:'NUT-UK-VD3-T120',quantity:1},{sku:'NUT-UK-VD3-T120',quantity:2}]}),/Duplicate/);
});
test('a verified stock indication never becomes regulated wholesale release',()=>{
  const request=make({requestedLines:[{sku:'RX-UK-TEST',quantity:1}]});
  assert.equal(request.lines[0].availability,'verified_stock_subject_to_order_approval');
  assert.equal(request.lines[0].regulatedMedicineReleaseAllowed,false);
  assert.equal(request.lines[0].orderReleaseAllowed,false);
  assert.equal(request.orderCreated,false);
});
test('browser fields cannot set price, stock, VAT, payment or account',()=>{
  const request=make({requestedLines:[{sku:'NUT-UK-VD3-T120',quantity:1,
    priceMinor:1,stockEvidence:'warehouse-reconciled',accountId:'account-B',paymentApproved:true}]});
  assert.deepEqual(Object.keys(request.lines[0]).sort(),
    ['sku','quantityRequested','productType','availability','commercialApproval','orderReleaseAllowed','regulatedMedicineReleaseAllowed'].sort());
  assert.equal(request.accountId,'account-A');
  assert.equal(request.paymentCollected,false);
});
test('invalid quantities and idempotency identifiers are rejected',()=>{
  for (const quantity of [-1,0,1.5,10001,'1',Infinity])
    assert.throws(()=>make({requestedLines:[{sku:'NUT-UK-VD3-T120',quantity}]}),/quantity/);
  assert.throws(()=>make({requestId:'bad'}),/idempotency/);
  assert.throws(()=>make({requestedLines:Array.from({length:51},(_,i)=>({sku:'NUT-UK-VD3-T120',quantity:i+1}))}),/1 to 50/);
});
test('customer projection redacts staff and caller identifiers and private pricing',()=>{
  const request=make();
  const view=customerSafeAssistedRequestView(request);
  assert.equal(view.kind,'non_binding_b2b_assisted_request');
  assert.equal(view.bindingOrder,false);
  assert.equal(JSON.stringify(view).includes('staff-001'),false);
  assert.equal(JSON.stringify(view).includes('proof-001'),false);
});
