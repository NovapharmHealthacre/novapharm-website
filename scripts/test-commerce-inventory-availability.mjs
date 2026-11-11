import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAvailableToPromise, catalogueAndStockGate, validateMovementRequest } from '../src/commerce/inventory-availability.mjs';
const position={warehouseId:'UK-WH-01',verificationStatus:'verified',physicalQuantity:100,reservedQuantity:8,quarantineQuantity:5,damagedQuantity:0};
const approvals={catalogueVariantVerified:true,complianceApproved:true,priceCheckoutApproved:true,checkoutEnabled:true};
const traceability={releaseVerified:true,releasedQuantity:85};
test('verified stock cannot exceed warehouse balance or released lot stock',()=>assert.equal(calculateAvailableToPromise(position,approvals,traceability),85));
test('unknown quarantine stock is not assumed to be zero',()=>assert.equal(calculateAvailableToPromise({...position,quarantineQuantity:null},approvals,traceability),0));
test('unverified seller claims never become available-to-promise',()=>assert.equal(calculateAvailableToPromise({...position,verificationStatus:'unverified',ownerDeclaredQuantity:10000},approvals,traceability),0));
test('unverified lot or serial release blocks checkout',()=>assert.equal(calculateAvailableToPromise(position,approvals,{releaseVerified:false,releasedQuantity:85}),0));
test('missing merchant price approval blocks checkout',()=>assert.equal(calculateAvailableToPromise(position,{...approvals,priceCheckoutApproved:false},traceability),0));
test('available stock is never negative',()=>assert.equal(calculateAvailableToPromise({...position,reservedQuantity:101},approvals,traceability),0));
test('catalogue references are not saleable variants',()=>{
 const x=catalogueAndStockGate({product:{_id:'ESCO-CAT-0001',recordType:'catalogue_reference',saleStatus:'quote_only',sellable:false},position,compliance:{approvedForCheckout:true},price:{basePriceExVatMinor:80000,checkoutApproved:true},traceability,channelPolicy:{checkoutEnabled:true}});
 assert.equal(x.canCheckout,false);assert.ok(x.reasons.includes('SALEABLE_VARIANT_UNCONFIRMED'));
});
test('fully released SKU and stock can pass domain gate',()=>{
 const x=catalogueAndStockGate({product:{_id:'NUT-UK-TEST',recordType:'sku',saleStatus:'active',sellable:true},position,compliance:{approvedForCheckout:true},price:{basePriceExVatMinor:2500,checkoutApproved:true},traceability,channelPolicy:{checkoutEnabled:true}});
 assert.deepEqual(x,{canCheckout:true,maxQuantity:85,reasons:[]});
});
test('movement requires evidence and human approval on receipts',()=>{
 const event={eventId:'evt-a12345',productId:'NUT-UK-TEST',warehouseId:'UK-WH-01',actorId:'admin',evidenceId:'lot-check-1',type:'RECEIVE',quantity:10};
 assert.throws(()=>validateMovementRequest(event),/Approved/);
 assert.equal(validateMovementRequest({...event,approvedBy:'quality-admin'}).quantity,10);
});
test('movement rejects invalid and zero quantities',()=>{
 assert.throws(()=>validateMovementRequest({eventId:'evt-a12345',productId:'NUT-UK-TEST',warehouseId:'UK-WH-01',actorId:'admin',evidenceId:'proof',type:'RESERVE',quantity:0}),/Positive/);
});
test('global channel off-switch fails closed even with otherwise approved stock',()=>{
 const x=catalogueAndStockGate({product:{_id:'NUT-UK-TEST',recordType:'sku',saleStatus:'active',sellable:true},position,compliance:{approvedForCheckout:true},price:{basePriceExVatMinor:2500,checkoutApproved:true},traceability,channelPolicy:{checkoutEnabled:false}});
 assert.equal(x.canCheckout,false);assert.ok(x.reasons.includes('CHANNEL_CHECKOUT_DISABLED'));
});
