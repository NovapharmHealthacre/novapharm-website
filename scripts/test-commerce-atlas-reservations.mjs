import test from 'node:test';
import assert from 'node:assert/strict';
import {createAtlasReservationRepository} from '../src/commerce/atlas-inventory-reservations.mjs';
const request={reservationId:'reserve-123456',orderId:'order-123456',productId:'NUT-UK-TEST',offerId:'NOVAPHARM:NUT-UK-TEST',actorId:'customer-123456',brand:'Nutraxin',quantity:2};
function fixture(records={}){
 const writes=[];
 const collection=name=>({
   async findOne(filter){return records[name]?.[filter._id]??null;},
   find:()=>({async toArray(){return records.lots??[];}}),
   async updateOne(){writes.push('update:'+name);return {modifiedCount:1};},
   async insertOne(){writes.push('insert:'+name);return {insertedId:'x'};}
 });
 const client={startSession:()=>({async withTransaction(fn){return fn();},async endSession(){}})};
 return {repo:createAtlasReservationRepository({client,database:{collection},clock:()=>new Date('2026-11-11T10:00:00Z')}),writes};
}
test('same idempotency key returns existing reservation without new stock movement',async()=>{
 const {repo,writes}=fixture({stock_reservations:{'reserve-123456':{_id:'reserve-123456',productId:request.productId,offerId:request.offerId,quantity:2,orderId:request.orderId,status:'reserved',expiresAt:'2026-11-11T10:15:00Z'}}});
 const result=await repo.reserve(request);assert.equal(result.alreadyExisted,true);assert.deepEqual(writes,[]);
});
test('reservation request with invalid product ID is rejected before db access',async()=>{
 const {repo,writes}=fixture();
 await assert.rejects(repo.reserve({...request,productId:'$invalid'}),/Invalid productId/);assert.deepEqual(writes,[]);
});
test('brand spoofing is blocked even before a checkout payment',async()=>{
 const {repo,writes}=fixture({
  products:{'NUT-UK-TEST':{_id:'NUT-UK-TEST',sku:'NUT-UK-TEST',brand:'Nutraxin'}},
  seller_offers:{'NOVAPHARM:NUT-UK-TEST':{_id:'NOVAPHARM:NUT-UK-TEST',brand:'Nutraxin'}},
  inventory_positions:{'NUT-UK-TEST':{_id:'NUT-UK-TEST',warehouseId:null,verificationStatus:'unverified',availableToPromise:0}}
 });
 await assert.rejects(repo.reserve({...request,brand:'ESCO'}),/brand or identity mismatch/);assert.deepEqual(writes,[]);
});
test('owner-reported stock alone cannot reserve unavailable product',async()=>{
 const {repo,writes}=fixture({
  products:{'NUT-UK-TEST':{_id:'NUT-UK-TEST',sku:'NUT-UK-TEST',brand:'Nutraxin',saleStatus:'active',recordType:'sku',sellable:true}},
  seller_offers:{'NOVAPHARM:NUT-UK-TEST':{_id:'NOVAPHARM:NUT-UK-TEST',brand:'Nutraxin',productId:'NUT-UK-TEST',merchantId:'NOVAPHARM-OPERATOR'}},
  inventory_positions:{'NUT-UK-TEST':{_id:'NUT-UK-TEST',warehouseId:null,verificationStatus:'unverified',ownerDeclaredQuantity:10000,availableToPromise:0}},
  prices:{'NUT-UK-TEST':{checkoutApproved:false,basePriceExVatMinor:1200}}
 });
 await assert.rejects(repo.reserve(request),/Seller has not been approved|Insufficient verified/);assert.deepEqual(writes,[]);
});
test('releasing a reservation twice makes no additional stock movements',async()=>{
 const {repo,writes}=fixture({stock_reservations:{'reserve-123456':{_id:'reserve-123456',productId:request.productId,orderId:request.orderId,quantity:2,status:'released'}}});
 const result=await repo.release({reservationId:request.reservationId,actorId:'warehouse-123',reason:'checkout_expired'});
 assert.equal(result.alreadyExisted,true);assert.deepEqual(writes,[]);
});
