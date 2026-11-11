import test from 'node:test';
import assert from 'node:assert/strict';
import {stockSnapshot,validateOrderLines,reserveForCheckout,validateStockEvent,computeMarketplaceSettlement,serviceEarnings,buildNovaCommerceObservation} from '../src/commerce/marketplace-core.mjs';
const product={_id:'NUT-UK-TEST',sku:'NUT-UK-TEST',recordType:'sku',saleStatus:'active',sellable:true};
const position={warehouseId:'WH-UK01',verificationStatus:'verified',physicalQuantity:100,reservedQuantity:10,quarantineQuantity:5,damagedQuantity:0,ownerDeclaredQuantity:10000};
const compliance={approvedForCheckout:true};
const price={basePriceExVatMinor:1000,checkoutApproved:true,currency:'GBP'};
const lotRelease={releaseVerified:true,releasedQuantity:85};
const channelPolicy={checkoutEnabled:true};
const offer={_id:'NOVAPHARM:NUT-UK-TEST',productId:product._id,merchantId:'NOVAPHARM-OPERATOR',sellerStatus:'approved',verifiedMerchantAgreement:true,checkoutApproved:true};
const request={product,position,compliance,price,lotRelease,channelPolicy};
test('owner declaration does not override warehouse-verified available-to-promise',()=>{
 const s=stockSnapshot(request);assert.equal(s.ownerDeclaredUnits,10000);assert.equal(s.availableToPromise,85);assert.equal(s.checkoutEligible,true);
});
test('unverified physical stock is never represented as sellable',()=>{
 const s=stockSnapshot({...request,position:{...position,verificationStatus:'unverified',physicalQuantity:null}});
 assert.equal(s.availableToPromise,0);assert.equal(s.verifiedPhysicalUnits,null);assert.equal(s.checkoutEligible,false);
});
test('no lot release prevents checkout',()=>assert.equal(stockSnapshot({...request,lotRelease:{releaseVerified:false,releasedQuantity:0}}).availableToPromise,0));
test('reservation validates offer identity and exact verified units',()=>{
 const line=validateOrderLines([{productId:product._id,offerId:offer._id,quantity:3}])[0];
 const result=reserveForCheckout({...request,line,offer});
 assert.equal(result.quantity,3);assert.equal(result.stockCheck,'verified');
 assert.throws(()=>reserveForCheckout({...request,line:{...line,quantity:86},offer}),/Insufficient/);
 assert.throws(()=>reserveForCheckout({...request,line,offer:{...offer,checkoutApproved:false}}),/commercially approved/);
});
test('basket rejects duplicate offers and huge quantities',()=>{
 const item={productId:product._id,offerId:offer._id,quantity:1};
 assert.throws(()=>validateOrderLines([item,item]),/Duplicate/);
 assert.throws(()=>validateOrderLines([{...item,quantity:10001}]),/Invalid/);
});
test('stock movements require evidence, an order and separation of duties',()=>{
 const base={eventId:'ev000123',productId:product._id,actorId:'operator1',warehouseId:'wh001',evidenceId:'evidence123',quantity:2};
 assert.throws(()=>validateStockEvent({...base,type:'receive'}),/approver/);
 assert.throws(()=>validateStockEvent({...base,type:'receive',approvedBy:'operator1'}),/self-approve/);
 assert.equal(validateStockEvent({...base,type:'receive',approvedBy:'quality123'}).type,'receive');
 assert.throws(()=>validateStockEvent({...base,type:'dispatch'}),/order reference/);
});
test('commission and fulfillment settlement keeps integer minor units',()=>{
 const s=computeMarketplaceSettlement({grossMerchandiseMinor:12000,taxMinor:2000,shippingMinor:400,commissionBps:1000,fulfilmentFeeMinor:350,paymentProcessingMinor:150,sellerAgreementApproved:true});
 assert.equal(s.commissionMinor,1000);assert.equal(s.payoutMinor,8900);
 assert.throws(()=>computeMarketplaceSettlement({grossMerchandiseMinor:12000,taxMinor:2000,commissionBps:1500,sellerAgreementApproved:false}),/agreement/);
});
test('never treat draft advertising as settled revenue',()=>{
 const x=serviceEarnings([{kind:'advertising',amountMinor:1200,state:'draft'},{kind:'commission',amountMinor:800,state:'settled'},{kind:'fulfilment',amountMinor:600,state:'settled'}]);
 assert.equal(x.totals.advertising,0);assert.equal(x.totals.commission,800);assert.equal(x.settledEventCount,2);
});
test('NOVA commerce evidence separates observed facts from owner declarations',()=>{
 const o=buildNovaCommerceObservation({date:'2026-11-11',productId:product._id,sourceOrderCount:2,shippedUnits:4,grossSalesMinor:12000,verifiedAvailableUnits:null,ownerDeclaredUnits:10000});
 assert.equal(o.verifiedAvailableUnits,null);assert.equal(o.ownerDeclaredUnits,10000);assert.equal(o.evidenceLabels.stock,'commercial_declaration');assert.equal(o.decisionStatus,'provenance_required');
});
