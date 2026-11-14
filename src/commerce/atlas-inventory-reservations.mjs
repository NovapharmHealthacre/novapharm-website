// MongoDB Atlas transaction adapter. Server-only; do not import from a public bundle.
// A caller must obtain database/actor credentials from the private AWS runtime.
import {reserveForCheckout} from './marketplace-core.mjs';

const VALID_ID=/^[A-Za-z0-9][A-Za-z0-9:_-]{5,100}$/;
function checkId(x,name){if(typeof x!=='string'||!VALID_ID.test(x))throw new Error('Invalid '+name);}
function positive(x){return Number.isSafeInteger(x)&&x>0&&x<=10000;}
function equalRequest(existing,req){
 return existing.productId===req.productId&&existing.offerId===req.offerId&&existing.quantity===req.quantity&&existing.orderId===req.orderId;
}
export function createAtlasReservationRepository({client,database,clock=()=>new Date()}) {
 if(!client?.startSession||!database?.collection)throw new Error('Authenticated Atlas client and database required');
 const coll=name=>database.collection(name);
 async function reserve(req){
  for(const [name,id] of Object.entries({reservationId:req.reservationId,orderId:req.orderId,productId:req.productId,offerId:req.offerId,actorId:req.actorId}))checkId(id,name);
  if(!positive(req.quantity))throw new Error('Invalid reservation quantity');
  const now=clock();const expiry=new Date(now.getTime()+15*60*1000);
  const session=client.startSession();
  try {
   return await session.withTransaction(async()=>{
    const existing=await coll('stock_reservations').findOne({_id:req.reservationId},{session});
    if(existing){
      if(!equalRequest(existing,req))throw new Error('Idempotency key reused for different basket');
      // An expired hold cannot be resurrected by retrying a stale idempotency
      // key. The caller must use a new reservation after release/reassessment.
      if(existing.status==='reserved' && (!Number.isFinite(Date.parse(existing.expiresAt)) ||
          Date.parse(existing.expiresAt)<=now.getTime())){
        throw new Error('Expired reservation cannot be reused');
      }
      return {reservationId:existing._id,status:existing.status,expiresAt:existing.expiresAt,alreadyExisted:true};
    }
    // MongoDB forbids parallel operations on the same transaction session.
    // Keep all snapshot reads serial, including the subsequent lots cursor.
    const product=await coll('products').findOne({_id:req.productId},{session});
    const offer=await coll('seller_offers').findOne({_id:req.offerId},{session});
    const position=await coll('inventory_positions').findOne({_id:req.productId},{session});
    const compliance=await coll('product_compliance').findOne({_id:req.productId},{session});
    const price=await coll('prices').findOne({_id:req.productId},{session});
    const policy=await coll('checkout_rules').findOne({_id:req.brand},{session});
    // Release evidence is read from private data; browser-supplied claims are ignored.
    const releasedLots=await coll('inventory_lots').find({productId:req.productId,warehouseId:position?.warehouseId,status:'released',releaseVerified:true,expiryDate:{$gt:now.toISOString()}},{session}).toArray();
    const releasedQuantity=releasedLots.reduce((total,lot)=>{
      if(!Number.isSafeInteger(lot.availableUnits)||lot.availableUnits<0)throw new Error('Invalid lot quantity');
      const n=total+lot.availableUnits;
      if(!Number.isSafeInteger(n))throw new Error('Lot quantity overflow');
      return n;
    },0);
    if(!product || product.brand!==req.brand || !product.sku)throw new Error('Product brand or identity mismatch');
    if(!offer || offer.brand!==product.brand)throw new Error('Offer brand mismatch');
    const approved=reserveForCheckout({
      line:{productId:req.productId,offerId:req.offerId,quantity:req.quantity},
      product,offer,position,compliance,price,
      lotRelease:{releaseVerified:releasedLots.length>0,releasedQuantity},
      channelPolicy:policy
    });
    // The update is protected against concurrent purchases and is part of one Mongo transaction.
    const update=await coll('inventory_positions').updateOne({
      _id:req.productId,verificationStatus:'verified',availableToPromise:{$gte:req.quantity},
      reservedQuantity:{$gte:0}
    },{$inc:{reservedQuantity:req.quantity,availableToPromise:-req.quantity},$set:{lastUpdatedAt:now.toISOString()}},{session});
    if(update.modifiedCount!==1)throw new Error('Stock reservation conflict');
    await coll('stock_reservations').insertOne({
      _id:req.reservationId,orderId:req.orderId,productId:req.productId,offerId:req.offerId,
      merchantId:approved.merchantId,quantity:req.quantity,status:'reserved',
      unitPriceMinor:approved.priceMinor,currency:approved.currency,expiresAt:expiry.toISOString(),
      createdAt:now.toISOString(),actorId:req.actorId
    },{session});
    await coll('stock_movements').insertOne({
      _id:'movement:'+req.reservationId,productId:req.productId,orderId:req.orderId,
      reservationId:req.reservationId,type:'reserve',quantity:req.quantity,
      warehouseId:position.warehouseId,actorId:req.actorId,evidenceRef:'reservation:'+req.reservationId,
      createdAt:now.toISOString()
    },{session});
    await coll('integration_outbox').insertOne({
      _id:'reservation:'+req.reservationId,eventType:'commerce.inventory.reserved',
      aggregateId:req.orderId,payload:{reservationId:req.reservationId,productId:req.productId,offerId:req.offerId,quantity:req.quantity},
      state:'pending',createdAt:now.toISOString()
    },{session});
    return {reservationId:req.reservationId,status:'reserved',expiresAt:expiry.toISOString(),alreadyExisted:false};
   },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},readPreference:'primary'});
  } finally{await session.endSession();}
 }
 async function release({reservationId,actorId,reason}){
  checkId(reservationId,'reservationId');checkId(actorId,'actorId');
  if(!['payment_failed','checkout_expired','order_cancelled','manual_approved'].includes(reason))throw new Error('Unapproved release reason');
  const now=clock().toISOString(),session=client.startSession();
  try{
   return await session.withTransaction(async()=>{
    const rec=await coll('stock_reservations').findOne({_id:reservationId},{session});
    if(!rec)throw new Error('Reservation not found');
    if(rec.status==='released')return {reservationId,status:'released',alreadyExisted:true};
    if(rec.status!=='reserved')throw new Error('Reservation cannot be released');
    const claim=await coll('stock_reservations').updateOne({_id:reservationId,status:'reserved'},{$set:{status:'released',releasedAt:now,releaseReason:reason}},{session});
    if(claim.modifiedCount!==1)throw new Error('Concurrent reservation release');
    const position=await coll('inventory_positions').findOne({_id:rec.productId},{session});
    // A failed payment must not restore saleability after a recall or warehouse hold.
    const approvedToRestore=position?.verificationStatus==='verified' && position?.stockStatus==='released_for_sale';
    const movement=approvedToRestore?{reservedQuantity:-rec.quantity,availableToPromise:rec.quantity}:{reservedQuantity:-rec.quantity};
    const moved=await coll('inventory_positions').updateOne({_id:rec.productId,reservedQuantity:{$gte:rec.quantity}},{$inc:movement},{session});
    if(moved.modifiedCount!==1)throw new Error('Inconsistent inventory reservation');
    await coll('stock_movements').insertOne({_id:'movement:release:'+reservationId,productId:rec.productId,orderId:rec.orderId,reservationId,type:'release',quantity:rec.quantity,actorId,evidenceRef:reason,createdAt:now},{session});
    await coll('integration_outbox').insertOne({_id:'released:'+reservationId,eventType:'commerce.inventory.released',aggregateId:rec.orderId,payload:{reservationId,reason},state:'pending',createdAt:now},{session});
    return {reservationId,status:'released',alreadyExisted:false};
   },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},readPreference:'primary'});
  }finally{await session.endSession();}
 }
 return Object.freeze({reserve,release});
}
