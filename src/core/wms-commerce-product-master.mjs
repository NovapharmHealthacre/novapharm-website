// Read-only canonical catalogue import. No payment, stock or publication authority.
import {validGtin} from './multibrand-retail.mjs';
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const minor=v=>Number.isSafeInteger(v)&&v>0?v:null;
const image=v=>typeof v==='string'&&/^\/assets\/media\/products\/[a-zA-Z0-9/_-]+\.(avif|webp|png|jpg|jpeg)$/.test(v)?v:null;
export function buildProductMaster({nutraxin,esco,connective,approvedConnective=[]}) {
 const records=new Map(),approved=new Map();
 const add=r=>{if(!nonempty(r.sku)||!nonempty(r.name)||records.has(r.sku))throw Error('Invalid or duplicate SKU: '+r.sku);records.set(r.sku,Object.freeze(r));};
 for(const p of approvedConnective){
  if(!validGtin(p.ean)||approved.has(p.ean))throw Error('Invalid or duplicate approved GTIN');
  approved.set(p.ean,p);
 }
 for(const p of nutraxin.products){
  if(!/^NUT-UK-[A-Z0-9-]+$/.test(p.sku))throw Error('Invalid Nutraxin SKU');
  add({sku:p.sku,supplier:'nutraxin',name:p.name,brand:'Nutraxin',pack:p.pack??null,gtin:null,category:p.range??null,sourceRef:p.slug,sourcePriceMinor:minor(p.retail_price_pence),sourcePriceBasis:'repository_retail_gross',image:image(p.image),catalogueAdmission:'existing_catalogue',currency:'GBP',stockQuantity:null,checkoutStatus:'unverified_runtime'});
 }
 for(const group of esco.categories)for(const p of group.entries){
  if(!/^ESCO-CAT-\d{4}$/.test(p.id))throw Error('Invalid ESCO reference');
  add({sku:'NP-ESCO-'+p.id.slice(-4),supplier:'esco',name:p.name,brand:'ESCO',pack:null,gtin:null,category:group.name,sourceRef:p.id,sourcePriceMinor:null,sourcePriceBasis:null,image:null,catalogueAdmission:'catalogue_reference',currency:'GBP',stockQuantity:null,checkoutStatus:'unverified_runtime'});
 }
 const matched=new Set();
 for(const p of connective.products){
  if(!validGtin(p.ean)||p.sku!=='NP-CP-'+p.ean)throw Error('Invalid Connective identity');
  const a=approved.get(p.ean);
  if(a)matched.add(p.ean);
  const admitted=a?.identityConfirmed===true&&a?.imageRightsConfirmed===true&&a?.publicListingApproved===true&&nonempty(a.name)&&nonempty(a.pack)&&image(a.image);
  add({sku:p.sku,supplier:'connective',name:admitted?a.name:p.name,brand:admitted?a.brand:p.brand,pack:admitted?a.pack:p.pack??null,gtin:p.ean,category:admitted?a.category:null,sourceRef:p.ean,sourcePriceMinor:null,sourcePriceBasis:null,image:admitted?image(a.image):null,catalogueAdmission:admitted?'existing_approved_content':'catalogue_reference',currency:'GBP',stockQuantity:null,checkoutStatus:'unverified_runtime'});
 }
 if(matched.size!==approved.size)throw Error('Approved Connective GTIN absent from source catalogue');
 return [...records.values()].sort((a,b)=>a.sku.localeCompare(b.sku));
}
export function summariseProductMaster(records){
 const suppliers={};
 for(const r of records) suppliers[r.supplier]=(suppliers[r.supplier]??0)+1;
 return {total:records.length,suppliers,repositoryPriceCount:records.filter(r=>r.sourcePriceMinor!==null).length,approvedConnectiveContent:records.filter(r=>r.supplier==='connective'&&r.catalogueAdmission==='existing_approved_content').length,liveOfferCount:null,liveInventoryCount:null};
}
