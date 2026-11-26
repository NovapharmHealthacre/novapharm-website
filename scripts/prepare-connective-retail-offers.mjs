// Private, fail-closed retail offer admission. Never commit the evidence intake.
// Dry-run is the default; writes require explicit --commit and exact AWS account.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {existsSync,readFileSync,realpathSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {resolve,join,sep} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {validGtin} from "../src/core/multibrand-retail.mjs";

const classes=new Set(["food_supplement","cosmetic","consumer_non_medicinal"]);
const approvalKeys=["retailAuthority","retailPrice","vat","stock","fulfilment","sellerDelivery","ordering"];
const text=(v,max=200)=>typeof v==="string"&&v.trim()&&v.length<=max;
const time=(v)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v)?Date.parse(v):NaN;
const safeInteger=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const confirmed=(e,now,limitMs)=>{
 if(!e||e.confirmed!==true||!text(e.reference,200)||!text(e.reviewedBy,120))return false;
 const t=time(e.observedAt);
 return Number.isFinite(t)&&t<=now+5*60_000&&now-t<=limitMs;
};
function localPackImage(root,product,record){
 try{
  const re=new RegExp("^/assets/media/products/connective/"+record.gtin+"/front-(480|800|1600)\\.webp$");
  if(!re.test(product.image)||record.image!==product.image||!/^[a-f0-9]{64}$/.test(record.imageSha256||""))return false;
  const base=realpathSync(root),file=realpathSync(resolve(base,product.image.slice(1)));
  if(!file.startsWith(base+sep))return false;
  const raw=readFileSync(file);
  return raw.length>12&&raw.toString("ascii",0,4)==="RIFF"&&raw.toString("ascii",8,12)==="WEBP"&&createHash("sha256").update(raw).digest("hex")===record.imageSha256;
 }catch{return false;}
}
export function prepareOffers(intake,publicCatalogue,root,now=Date.now(),verifyImage=localPackImage){
 assert(Array.isArray(intake)&&Array.isArray(publicCatalogue),"Expected product arrays");
 const publicByGtin=new Map();
 for(const p of publicCatalogue){
  assert(p&&validGtin(p.ean)&&!publicByGtin.has(p.ean),"Invalid approved public catalogue");
  publicByGtin.set(p.ean,p);
 }
 const offers=[],blocked=[],seen=new Set();
 for(const r of intake){
  assert(r&&validGtin(r.gtin)&&!seen.has(r.gtin),"Duplicate or invalid GTIN");
  seen.add(r.gtin);
  const p=publicByGtin.get(r.gtin),reasons=[];
  if(!p||p.identityConfirmed!==true||p.imageRightsConfirmed!==true||p.publicListingApproved!==true)reasons.push("approved public listing");
  if(r.sku!=="NP-CP-"+r.gtin)reasons.push("SKU identity");
  if(!p||!classes.has(p.productClass)||p.productClass!==r.productClass)reasons.push("eligible product class");
  if(!p||!["name","brand","category","pack"].every(k=>text(p[k],90)&&p[k]===r[k]))reasons.push("exact pack identity");
  if(!p||!verifyImage(root,p,r))reasons.push("approved pack image checksum");
  // Supplier-backed capacity is distinct from checked warehouse stock.
  const supplierBacked=r.supplyModel==="supplier_backed";
  if(r.supplyModel!==undefined&&!["supplier_backed","stock_verified"].includes(r.supplyModel))reasons.push("supply model");
  for(const key of approvalKeys){
   const evidence=r.evidence?.[key];
   if(key==="stock"&&supplierBacked){
    // No invented 48-hour physical stock snapshot for supplier-assisted orders.
    // A named owner/supplier-backed ordering attestation remains mandatory.
    if(evidence?.confirmed!==true||!text(evidence.reference,200)||!text(evidence.reviewedBy,120))
     reasons.push("supplier-backed supply attestation");
   } else if(!confirmed(evidence,now,key==="stock"?48*3600_000:30*86400_000)){
    reasons.push(key+" evidence");
   }
  }
  if(!safeInteger(r.availableQuantity,1,10000))reasons.push("bounded stock quantity");
  if(!safeInteger(r.vatBasisPoints,0,2000)||![0,500,2000].includes(r.vatBasisPoints))reasons.push("VAT rate");
  if(!safeInteger(r.netMinor,1,99999999))reasons.push("verified net price");
  const expected=safeInteger(r.netMinor,1,99999999)&&[0,500,2000].includes(r.vatBasisPoints)
   ?r.netMinor+Math.floor((r.netMinor*r.vatBasisPoints+5000)/10000):null;
  if(!safeInteger(r.grossMinor,1,99999999)||r.grossMinor!==expected)reasons.push("VAT-inclusive price reconciliation");
  if(!safeInteger(r.expiresAt,Math.floor(now/1000)+1,Math.floor(now/1000)+31*86400))reasons.push("time-bounded offer expiry");
  if(!supplierBacked){
   const stockObserved=time(r.evidence?.stock?.observedAt);
   if(!Number.isFinite(stockObserved)||!Number.isSafeInteger(r.expiresAt)||
      r.expiresAt*1000>stockObserved+48*3600_000)reasons.push("offer outlives stock evidence");
  }
  if(reasons.length){blocked.push({sku:"NP-CP-"+r.gtin,reasons});continue;}
  // Only projected, customer-safe fields are written. Supplier costs and evidence are never exposed.
  const offer={sku:r.sku,gtin:r.gtin,name:p.name,brand:p.brand,category:p.category,pack:p.pack,
   image:p.image,productClass:p.productClass,netMinor:r.netMinor,vatBasisPoints:r.vatBasisPoints,
   grossMinor:r.grossMinor,availableQuantity:r.availableQuantity,expiresAt:r.expiresAt,
   identityConfirmed:true,imageRightsConfirmed:true,ukRetailApproved:true,priceApproved:true,
   vatTreatmentVerified:true,stockVerified:!supplierBacked,fulfilmentVerified:true,orderingEnabled:true,
   sellerDeliveryCommitment:true,labelInformationVerified:true,
   supplyModel:supplierBacked?"supplier_backed":"stock_verified",
   orderingCapacityOnly:supplierBacked,supplierBackedOrdering:supplierBacked};
  offers.push({pk:{S:"RETAIL#APPROVED"},sk:{S:r.sku},offerJson:{S:JSON.stringify(offer)}});
 }
 return {offers,blocked,requested:intake.length};
}
function run(args){
 const result=spawnSync("aws",args,{encoding:"utf8",maxBuffer:2*1024*1024,timeout:45000,env:process.env});
 if(result.error||result.status!==0)throw new Error("AWS CLI operation failed; check credentials and region");
 return result.stdout;
}
function selfTest(){
 const n=Date.parse("2026-11-26T08:00:00Z"),stamp="2026-11-26T07:00:00Z",g="5010058089785";
 const evidence=Object.fromEntries(approvalKeys.map(k=>[k,{confirmed:true,reference:"synthetic_"+k,reviewedBy:"Test reviewer",observedAt:stamp}]));
 const p={ean:g,name:"Fixture supplement",brand:"Fixture",category:"Vitamins",pack:"30 tablets",productClass:"food_supplement",identityConfirmed:true,imageRightsConfirmed:true,publicListingApproved:true,image:"/assets/media/products/connective/"+g+"/front-800.webp"};
 const rec={gtin:g,sku:"NP-CP-"+g,name:p.name,brand:p.brand,category:p.category,pack:p.pack,productClass:p.productClass,image:p.image,imageSha256:"a".repeat(64),availableQuantity:4,vatBasisPoints:2000,netMinor:500,grossMinor:600,expiresAt:Math.floor(n/1000)+3600,evidence,privateSupplierCostPence:100};
 // A supplier-backed offer requires an identified supplier arrangement, but
 // does not require a warehouse snapshot within 48 hours.
 const backed={...rec,supplyModel:"supplier_backed",expiresAt:Math.floor(n/1000)+72*3600,
  evidence:{...evidence,stock:{confirmed:true,reference:"supplier-backed-attestation",reviewedBy:"Test reviewer"}}};
 const supplierResult=prepareOffers([backed],[p],".",n,()=>true);
 assert.equal(supplierResult.offers.length,1);
 const supplierOffer=JSON.parse(supplierResult.offers[0].offerJson.S);
 assert.equal(supplierOffer.supplyModel,"supplier_backed");
 assert.equal(supplierOffer.stockVerified,false);
 assert.equal(supplierOffer.orderingCapacityOnly,true);
 assert.equal(prepareOffers([{...backed,evidence:{...backed.evidence,stock:{confirmed:false,reference:"unverified",reviewedBy:"Test reviewer"}}}],[p],".",n,()=>true).offers.length,0);
 const good=prepareOffers([rec],[p],".",n,()=>true);
 assert.equal(good.offers.length,1);assert.equal(good.blocked.length,0);
 const projection=JSON.parse(good.offers[0].offerJson.S);
 assert.equal(projection.sku,rec.sku);assert(!("privateSupplierCostPence" in projection));
 for(const change of [{availableQuantity:0},{expiresAt:Math.floor(n/1000)+72*3600},{grossMinor:601},{vatBasisPoints:1500},{productClass:"medicine"},{evidence:{...evidence,stock:{...evidence.stock,confirmed:false}}},{imageSha256:"bad"}]){
  const test=prepareOffers([{...rec,...change}],[p],".",n,(root,prod,row)=>/^[a-f0-9]{64}$/.test(row.imageSha256));
  assert.equal(test.offers.length,0);
 }
 assert.equal(prepareOffers([rec],[], ".",n,()=>true).offers.length,0);
 assert.throws(()=>prepareOffers([rec,rec],[p],".",n,()=>true));
 console.log("Connective private offer admission self-test passed");
}
if(process.argv[1]&&import.meta.url===new URL("file://"+resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(args.includes("--self-test"))selfTest();
 else{
  const value=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
  assert(value("--input")&&value("--catalogue")&&value("--root"),"Usage: --input /private/offers.json --catalogue src/content/approved-consumer-catalogue.json --root . [--commit --expected-account 12digit]");
  const root=realpathSync(value("--root")),input=realpathSync(value("--input"));
  assert(!input.startsWith(root+sep),"Private intake must be outside the repository");
  const catalogue=JSON.parse(readFileSync(value("--catalogue"),"utf8"));
  const parsed=JSON.parse(readFileSync(input,"utf8"));
  const {offers,blocked,requested}=prepareOffers(parsed.records,catalogue,root);
  console.log(JSON.stringify({mode:args.includes("--commit")?"preflight":"dry-run",requested,approved:offers.length,blocked},null,2));
  if(args.includes("--commit")){
   assert(blocked.length===0&&offers.length>0&&offers.length<=25,"Only fully approved batches of 1–25 products may be committed atomically");
   assert(value("--expected-account")&&/^\d{12}$/.test(value("--expected-account")),"Expected AWS account ID is required");
   assert(value("--table")==="novapharm-production-nutraxin-payment-ledger","Unexpected DynamoDB table");
   const account=JSON.parse(run(["sts","get-caller-identity","--output","json"])).Account;
   assert(account===value("--expected-account"),"AWS account mismatch");
   const region="eu-north-1";
   const params=offers.map(item=>({Put:{TableName:value("--table"),Item:item,ConditionExpression:"attribute_not_exists(pk) AND attribute_not_exists(sk)"}}));
   const dir=mkdtempSync(join(tmpdir(),"np-retail-admission-"));
   try{
    const target=join(dir,"transact.json");writeFileSync(target,JSON.stringify(params),{mode:0o600});
    run(["dynamodb","transact-write-items","--region",region,"--transact-items","file://"+target]);
    console.log(JSON.stringify({committed:offers.length,region,table:value("--table"),featureFlagModified:false}));
   }finally{rmSync(dir,{recursive:true,force:true});}
  }
 }
}
