// Multi-brand retail admission and basket contract. No payment authority resides in the browser.
export const MAX_RETAIL_QUANTITY = 10000;
export const MULTIBRAND_SCHEMA = "novapharm-multibrand-retail-v1";
const eligibleClasses = new Set(["food_supplement","cosmetic","consumer_non_medicinal"]);
export const DEFAULT_UK_VAT_BASIS_POINTS = 2000;
const taxRates = new Set([0,500,DEFAULT_UK_VAT_BASIS_POINTS]);
// Draft prices use the owner-selected standard 20% assumption; this is not tax approval.
export function draftRetailPrice(netMinor, vatBasisPoints = DEFAULT_UK_VAT_BASIS_POINTS) {
 if (!Number.isSafeInteger(netMinor) || netMinor < 1 || !taxRates.has(vatBasisPoints)) return null;
 const vatMinor = Math.round(netMinor * vatBasisPoints / 10000);
 const grossMinor = netMinor + vatMinor;
 if (!Number.isSafeInteger(grossMinor)) return null;
 return {netMinor, vatBasisPoints, vatMinor, grossMinor};
}
const safeText = (v) => typeof v === "string" && v.trim().length > 0 && v.length <= 300;
const safeSku = (v) => typeof v === "string" && /^(?:NUT-UK-[A-Z0-9-]+|NP-CP-[0-9]{8,14})$/.test(v);
export function validGtin(value) {
 if(typeof value!=="string" || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
 let sum=0; for(let i=value.length-2, weight=3;i>=0;i--,weight=4-weight) sum+=Number(value[i])*weight;
 return (10-sum%10)%10===Number(value.at(-1));
}
export function releasedOffer(p) {
 return !!p && safeSku(p.sku) && safeText(p.name) && safeText(p.pack) &&
 eligibleClasses.has(p.productClass) && p.identityConfirmed===true && p.imageRightsConfirmed===true &&
 p.ukRetailApproved===true && p.priceApproved===true && p.fulfilmentVerified===true &&
 (p.supplyModel==="supplier_backed" ? (p.stockVerified===false && p.supplierBackedOrdering===true && p.orderingCapacityOnly===true) : p.stockVerified===true) &&
 p.orderingEnabled===true && Number.isSafeInteger(p.availableQuantity) && p.availableQuantity>0 &&
 p.vatTreatmentVerified===true && taxRates.has(p.vatBasisPoints) && Number.isSafeInteger(p.netMinor) && p.netMinor>0 &&
 Number.isSafeInteger(p.grossMinor) && p.grossMinor===p.netMinor+Math.round(p.netMinor*p.vatBasisPoints/10000) &&
 (p.sku.startsWith("NUT-UK-") || (validGtin(p.gtin)&&p.sku==="NP-CP-"+p.gtin));
}
// The manifest must be served by the authoritative checkout service, not a static supplier workbook.
export function validateRetailManifest(value, now=Date.now()) {
 if(!value || value.schema!==MULTIBRAND_SCHEMA || value.currency!=="GBP" ||
 value.origin!=="novapharmhealthcare.com" || value.checkoutReady!==true ||
 !safeText(value.version) || !Number.isSafeInteger(value.expiresAt) || value.expiresAt<=now ||
 value.expiresAt>now+15*60*1000 || !Array.isArray(value.products) || value.products.length===0) return null;
 const products=new Map();
 for(const item of value.products){
  if(!releasedOffer(item)||products.has(item.sku)) return null;
  products.set(item.sku,item);
 }
 return products;
}
export function quoteRetailBasket(lines, manifest, now=Date.now()) {
 const products=validateRetailManifest(manifest,now);
 if(!products || !Array.isArray(lines)||lines.length===0||lines.length>products.size) return null;
 const seen=new Set();let netMinor=0,vatMinor=0,grossMinor=0;
 for(const line of lines){
  const p=products.get(line?.sku);const q=line?.quantity;
  if(!p||seen.has(line.sku)||!Number.isSafeInteger(q)||q<1||q>MAX_RETAIL_QUANTITY||q>p.availableQuantity) return null;
  seen.add(line.sku);netMinor+=p.netMinor*q;grossMinor+=p.grossMinor*q;vatMinor+=(p.grossMinor-p.netMinor)*q;
  if(![netMinor,grossMinor,vatMinor].every(Number.isSafeInteger)) return null;
 }
 return {netMinor,vatMinor,grossMinor,version:manifest.version,currency:"GBP",lines:lines.map(({sku,quantity})=>({sku,quantity}))};
}
// Submission deliberately omits client totals, VAT, supplier costs, and stock assertions.
// The existing checkout API must independently admit the SKU and reprice every line.
export function checkoutLines(lines,manifest,now=Date.now()) {
 const quote=quoteRetailBasket(lines,manifest,now);
 return quote?quote.lines:null;
}
