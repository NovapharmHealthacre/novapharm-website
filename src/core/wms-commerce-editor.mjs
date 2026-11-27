import {readFileSync} from 'node:fs';
import {all,one,run,insertIgnore,transaction,audit,nowIso} from '../data/database.mjs';
import {buildProductMaster} from './wms-commerce-product-master.mjs';
import {assertCommerceReader,canEditCommerceDraft,validateCommerceDraft} from './wms-commerce-draft-contract.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
let cached;
function catalogue(){return cached??=buildProductMaster({nutraxin:read('assets/data/nutraxin-retail-catalogue.json'),esco:read('assets/data/esco-catalogue.json'),connective:read('src/content/connective-consumer-research.json'),approvedConnective:read('src/content/approved-consumer-catalogue.json')});}
const fail=(code,message)=>{throw Object.assign(new Error(message),{statusCode:code});};
function decode(r){return {...JSON.parse(r.draft_json),revision:Number(r.revision),updatedAt:r.updated_at};}
export async function listCommerceProducts(context,query){
 assertCommerceReader(context);
 const source=catalogue(),canEdit=canEditCommerceDraft(context);
 const drafts=canEdit?(await all('SELECT sku,revision,draft_json,updated_at FROM wms_commerce_drafts')).map(decode):[];
 const bySku=new Map(drafts.map(d=>[d.sku,d]));
 const seen=new Set(source.map(p=>p.sku));
 const records=[...source.map(p=>({...p,draft:bySku.get(p.sku)??null})),...drafts.filter(d=>!seen.has(d.sku)).map(d=>({sku:d.sku,supplier:d.supplier,name:d.name,brand:d.brand,pack:d.pack,gtin:d.gtin,sourcePriceMinor:null,image:null,stockQuantity:null,checkoutStatus:'unverified_runtime',catalogueAdmission:'draft_only',draft:d}))];
 const q=(query.get('q')||'').trim().toLowerCase().slice(0,120),supplier=query.get('supplier')||'';
 const offset=Number(query.get('offset')||0);
 if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)fail(400,'Invalid offset.');
 const filtered=records.filter(r=>(!supplier||r.supplier===supplier)&&(!q||[r.sku,r.name,r.brand,r.gtin,r.draft?.name].some(v=>String(v??'').toLowerCase().includes(q))));
 return {total:records.length,matching:filtered.length,offset,limit:40,canEdit,publicationEnabled:false,records:filtered.slice(offset,offset+40)};
}
export async function saveCommerceDraft(context,input){
 assertCommerceReader(context);
 if(!canEditCommerceDraft(context))fail(403,'Catalogue editor permission required.');
 const existing=catalogue().find(p=>p.sku===input?.sku);
 const validated=validateCommerceDraft(input,existing);
 const {expectedRevision,...draft}=validated;
 return transaction(async()=>{
  const previous=await one('SELECT sku,revision,draft_json,updated_at FROM wms_commerce_drafts WHERE sku = ?',draft.sku);
  if(previous&&Number(previous.revision)!==expectedRevision||!previous&&expectedRevision!==0)fail(409,'Product draft changed. Reload before saving.');
  if(previous){const prior=decode(previous);if(prior.supplier!==draft.supplier||prior.gtin!==null&&prior.gtin!==draft.gtin)fail(400,'Existing draft identity cannot change.');}
  if(draft.gtin&&catalogue().some(p=>p.sku!==draft.sku&&p.gtin===draft.gtin))fail(409,'GTIN already exists.');
  const updatedAt=nowIso(),revision=expectedRevision+1,draft_json=JSON.stringify(draft);
  const result=previous?await run('UPDATE wms_commerce_drafts SET revision=?, draft_json=?, updated_by=?, updated_at=?, gtin=? WHERE sku=? AND revision=?',revision,draft_json,context.username,updatedAt,draft.gtin,draft.sku,expectedRevision):await insertIgnore('wms_commerce_drafts',{sku:draft.sku,revision,draft_json,updated_by:context.username,updated_at:updatedAt,gtin:draft.gtin},['sku']);
  if(result.changes!==1)fail(409,'Product draft changed. Reload before saving.');
  await audit({actor:context.username,action:'wms.commerce.draft.saved',entityType:'wms_commerce_draft',entityId:draft.sku,before:previous?decode(previous):null,after:{...draft,revision},details:{revision,publicationEnabled:false}});
  return {draft:{...draft,revision,updatedAt},status:'draft_saved',publicationEnabled:false};
 });
}
