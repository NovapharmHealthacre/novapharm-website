import {canPublishPrice,validatePriceRequest,savedPrice,validateOfferPreview,priceCommand} from './wms-price-bridge-contract.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{statusCode:code});};
export function createWmsPriceBridge({loadDraft,invokePublisher,env=process.env}){
 async function resolveDraft(context,input,confirmation){
  if(!canPublishPrice(context,env))fail(403,'Private price publication is not enabled for this account.');
  const request=validatePriceRequest(input,confirmation);
  // An isolated fixture is not a saleable SKU; never cross synthetic/production modes.
  const synthetic=request.sku.startsWith('NP-CP-000000');
  if((env.WMS_COMMERCE_DATA_MODE==='synthetic')!==synthetic)fail(403,'Product does not belong to this publication environment.');
  const row=await loadDraft(request.sku);
  const draft=savedPrice(row?{...JSON.parse(row.draft_json),revision:Number(row.revision)}:null,request);
  return {request,draft};
 }
 async function invoke(command){
  try{return await invokePublisher(command);}catch{fail(503,'Private AWS publisher is unavailable. Retry the same revision.');}
 }
 return {
  async inspectWmsPrice(context,input){
   const {draft}=await resolveDraft(context,input,false);
   const offer=await invoke({action:'inspect',sku:draft.sku});
   return validateOfferPreview(offer,draft);
  },
  async publishWmsPrice(context,input){
   const {draft,request}=await resolveDraft(context,input,true);
   const offer=await invoke({action:'inspect',sku:draft.sku});
   validateOfferPreview(offer,draft);
   const result=await invoke(priceCommand(context,draft,request));
   if(result?.status==='rejected'||result?.status==='retry_or_reload')fail(409,'AWS rejected the revision or it is no longer current. Review the offer before retrying.');
   if(!['ledger_revision_confirmed','recorded_revision_not_current'].includes(result?.status)||result.sku!==draft.sku||result.grossMinor!==draft.grossPriceMinor)fail(503,'AWS publication outcome is not confirmed. Retry the same revision.');
   return {status:result.status,sku:result.sku,grossMinor:result.grossMinor,currentGrossMinor:result.currentGrossMinor,websiteVerified:false,stripeVerified:false};
  }
 };
}
