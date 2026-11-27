import {createHash} from 'node:crypto';
import {canEditCommerceDraft} from './wms-commerce-draft-contract.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{statusCode:code});};
export function canPublishPrice(context,env=process.env){
 return canEditCommerceDraft(context,env)&&env.WMS_COMMERCE_PRICE_PUBLISH_ENABLED==='true'&&((env.WMS_COMMERCE_PRICE_PUBLISH_SCOPE==='aws-private'&&env.WMS_COMMERCE_DATA_MODE!=='synthetic')||(env.WMS_COMMERCE_PRICE_PUBLISH_SCOPE==='aws-isolated-staging'&&env.WMS_COMMERCE_DATA_MODE==='synthetic'));
}
export function validatePriceRequest(input,confirmation=false){
 const fields=confirmation?['sku','revision','expectedHash']:['sku','revision'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==fields.length||Object.keys(input).some(k=>!fields.includes(k))||typeof input.sku!=='string'||!/^NP-CP-[0-9]{8,14}$/.test(input.sku)||!Number.isSafeInteger(input.revision)||input.revision<1||input.revision>2147483647||confirmation&&(typeof input.expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(input.expectedHash)))fail(400,'Choose an existing Connective product and saved revision.');
 return input;
}
export function savedPrice(draft,request){
 if(!draft||draft.sku!==request.sku||draft.revision!==request.revision)fail(409,'Draft changed. Save and review again.');
 if(draft.supplier!=='connective'||draft.gtin!==draft.sku.slice(6)||!Number.isSafeInteger(draft.grossPriceMinor)||draft.grossPriceMinor<1||draft.grossPriceMinor>99999999||![0,500,2000].includes(draft.vatBasisPoints))fail(400,'The saved draft requires a valid price and VAT rate.');
 return draft;
}
export function validateOfferPreview(offer,draft){
 if(offer?.status!=='eligible_existing_offer'||offer.sku!==draft.sku||!Number.isSafeInteger(offer.grossMinor)||offer.grossMinor<1||typeof offer.expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(offer.expectedHash))fail(409,'No current eligible AWS offer.');
 if(offer.vatBasisPoints!==draft.vatBasisPoints)fail(409,'VAT differs from the verified offer. Price-only publication cannot change VAT.');
 return {sku:draft.sku,revision:draft.revision,currentGrossMinor:offer.grossMinor,proposedGrossMinor:draft.grossPriceMinor,vatBasisPoints:offer.vatBasisPoints,expectedHash:offer.expectedHash};
}
export function priceCommand(context,draft,request){
 const seed=JSON.stringify([context.username,draft.sku,draft.revision,draft.grossPriceMinor,request.expectedHash]);
 const hex=createHash('sha256').update(seed).digest('hex').slice(0,32).split('');
 hex[12]='4';hex[16]='8';
 const h=hex.join(''),id=h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
 return {action:'publish_price',sku:draft.sku,grossMinor:draft.grossPriceMinor,expectedHash:request.expectedHash,requestId:id,actor:context.username,draftRevision:draft.revision};
}
