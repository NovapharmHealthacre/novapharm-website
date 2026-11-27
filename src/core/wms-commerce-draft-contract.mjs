import {validGtin} from './multibrand-retail.mjs';
const fail=(code,message)=>{throw Object.assign(new Error(message),{statusCode:code});};
const suppliers=new Set(['nutraxin','connective','esco','s1','other']);
const plain=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n&&!/[<>\x00-\x1f\x7f]/.test(v);
export function canEditCommerceDraft(context,env=process.env){
 return env.WMS_COMMERCE_DRAFTS_ENABLED==='true'&&['employee','admin'].includes(context?.accessType)&&context.accessScopes?.some(s=>s==='employee'||s==='admin')&&typeof context.username==='string'&&(env.WMS_COMMERCE_EDITOR_ALLOWLIST||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(context.username.toLowerCase());
}
export function assertCommerceReader(context){
 if(!['employee','admin'].includes(context?.accessType)||!context.accessScopes?.some(s=>s==='employee'||s==='admin'))fail(403,'Employee identity required.');
}
export function validateCommerceDraft(input,existing){
 if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'A product draft is required.');
 const fields=['sku','supplier','name','brand','pack','gtin','grossPriceMinor','vatBasisPoints','proposedQuantity','websiteVisible','expectedRevision'];
 if(Object.keys(input).some(k=>!fields.includes(k)))fail(400,'Unexpected draft field.');
 const {sku,supplier,name,brand,pack,gtin,grossPriceMinor,vatBasisPoints,proposedQuantity,websiteVisible,expectedRevision}=input;
 if(typeof sku!=='string'||!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(sku)||!suppliers.has(supplier)||!plain(name,160)||!plain(brand,100)||!plain(pack,100))fail(400,'Check product identity.');
 if(existing&&(existing.supplier!==supplier||(existing.gtin!==null&&existing.gtin!==gtin)))fail(400,'Existing SKU identity cannot change.');
 if(!existing&&!/^NP-NEW-[A-Z0-9-]+$/.test(sku))fail(400,'New products require an NP-NEW- SKU.');
 if(gtin!==null&&!validGtin(gtin))fail(400,'Invalid GTIN.');
 if(supplier==='connective'&&sku.startsWith('NP-CP-')&&sku!=='NP-CP-'+gtin)fail(400,'SKU and GTIN mismatch.');
 if(grossPriceMinor!==null&&(!Number.isSafeInteger(grossPriceMinor)||grossPriceMinor<1||grossPriceMinor>100000000))fail(400,'Invalid gross price.');
 if(vatBasisPoints!==null&&![0,500,2000].includes(vatBasisPoints))fail(400,'Invalid VAT rate.');
 if(proposedQuantity!==null&&(!Number.isSafeInteger(proposedQuantity)||proposedQuantity<0||proposedQuantity>10000000))fail(400,'Invalid proposed quantity.');
 if(typeof websiteVisible!=='boolean'||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>=2147483647)fail(400,'Invalid draft revision.');
 return {sku,supplier,name:name.trim(),brand:brand.trim(),pack:pack.trim(),gtin,grossPriceMinor,vatBasisPoints,proposedQuantity,websiteVisible,expectedRevision};
}
