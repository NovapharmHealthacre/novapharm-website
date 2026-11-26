import test from "node:test";
import assert from "node:assert/strict";
import {draftRetailPrice,validGtin,releasedOffer,validateRetailManifest,quoteRetailBasket,checkoutLines} from "../src/core/multibrand-retail.mjs";
const now=100000;
const base={sku:"NP-CP-4006381333931",gtin:"4006381333931",name:"Fixture supplement",pack:"30 tablets",productClass:"food_supplement",identityConfirmed:true,imageRightsConfirmed:true,ukRetailApproved:true,priceApproved:true,stockVerified:true,fulfilmentVerified:true,orderingEnabled:true,availableQuantity:5,vatTreatmentVerified:true,vatBasisPoints:2000,netMinor:1000,grossMinor:1200};
const nut={...base,sku:"NUT-UK-FIXTURE"};
const zero={...base,sku:"NP-CP-96385074",gtin:"96385074",vatBasisPoints:0,grossMinor:1000};
const manifest=(products=[base,nut])=>({schema:"novapharm-multibrand-retail-v1",currency:"GBP",origin:"novapharmhealthcare.com",checkoutReady:true,version:"fixture",expiresAt:now+60000,products});
test("GTIN checksum and identity",()=>{assert(validGtin(base.gtin));assert(!validGtin("4006381333932"));assert(!releasedOffer({...base,sku:"NP-CP-4006381333932"}));});
test("mixed brand and tax basket, exact integer amounts",()=>{const lines=[{sku:base.sku,quantity:2},{sku:nut.sku,quantity:3}];const q=quoteRetailBasket(lines,manifest(),now);assert.deepEqual([q.netMinor,q.vatMinor,q.grossMinor],[5000,1000,6000]);assert.deepEqual(checkoutLines(lines,manifest(),now),lines);});
test("reject medicines, missing release approvals, VAT inconsistency and unverified stock",()=>{for(const change of [{productClass:"medicine"},{priceApproved:false},{vatTreatmentVerified:false},{stockVerified:false},{imageRightsConfirmed:false},{ukRetailApproved:false},{fulfilmentVerified:false},{orderingEnabled:false},{grossMinor:1201},{availableQuantity:0}])assert.equal(validateRetailManifest(manifest([{...base,...change}]),now),null);});
test("reject unknown SKU, duplicate lines, excess stock, stale manifest",()=>{for(const lines of [[{sku:"NP-CP-unknown",quantity:1}],[{sku:base.sku,quantity:1},{sku:base.sku,quantity:1}],[{sku:base.sku,quantity:6}]])assert.equal(quoteRetailBasket(lines,manifest(),now),null);assert.equal(validateRetailManifest({...manifest(),expiresAt:now},now),null);});
test("client totals and private properties never become checkout lines",()=>{assert.deepEqual(checkoutLines([{sku:base.sku,quantity:1,grossMinor:1,supplierCost:1}],manifest(),now),[{sku:base.sku,quantity:1}]);});

test("20 percent default draft pricing; verified statutory exceptions preserved",()=>{assert.deepEqual(draftRetailPrice(1000),{netMinor:1000,vatBasisPoints:2000,vatMinor:200,grossMinor:1200});assert.equal(draftRetailPrice(1000,0).grossMinor,1000);assert.equal(draftRetailPrice(1000,500).grossMinor,1050);assert.equal(draftRetailPrice(1000,100),null);assert(releasedOffer(zero));assert(!releasedOffer({...zero,vatTreatmentVerified:false}));});


import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

test("approved catalogue emits crawlable product content and never fabricates an offer",()=>{
 const dir=mkdtempSync(join(tmpdir(),"np-catalogue-fixture-"));
 const put=(path,value)=>{const file=join(dir,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,value);};
 const get=path=>readFileSync(join(dir,path),"utf8");
 const gen=fileURLToPath(new URL("./generate-retail-expansion.mjs",import.meta.url));
 const run=()=>spawnSync(process.execPath,[gen],{cwd:dir,encoding:"utf8"});
 const shell='<!doctype html><html><head><title>Products</title><link rel="canonical" href="https://novapharmhealthcare.com/products/"><meta name="description" content="Products"><meta property="og:title" content="Products"></head><body data-route="/products/"><main><h1>Products</h1></main></body></html>';
 const image="/assets/media/products/connective/4006381333931/front-800.webp";
 const approved={ean:"4006381333931",brand:"Fixture Brand",name:"Fixture supplement",category:"Vitamins",pack:"30 tablets",image,identityConfirmed:true,imageRightsConfirmed:true,publicListingApproved:true,productClass:"food_supplement",description:"Reviewed fixture only.",ingredients:"Fixture ingredient",directions:"Fixture directions",warnings:"Fixture warnings"};
 try{
  put("products/index.html",shell);
  put(image.slice(1),"synthetic test asset");
  const products=["vitamin-d3-120-tablets","magnesium-daily-60-tablets","collagen-gold-30-sachets"].map(slug=>({slug,image,name:"Fixture",pack:"30 tablets"}));
  put("assets/data/nutraxin-retail-catalogue.json",JSON.stringify({products}));
  put("seo/generated/page-metadata-register.json","[]");
  put("seo/generated/structured-data-register.json","[]");
  put("sitemap.xml",'<urlset><url><loc>https://novapharmhealthcare.com/products/</loc></url></urlset>');
  const path="src/content/approved-consumer-catalogue.json";
  const route="products/health-and-wellbeing/4006381333931/index.html";
  for(const change of [{ean:"4006381333932"},{imageRightsConfirmed:false},{productClass:"medicine"},{warnings:""},{supplierCost:1}]){
   put(path,JSON.stringify([{...approved,...change}]));
   put("products/index.html",shell);
   const rejected=run();assert.notEqual(rejected.status,0,rejected.stdout+rejected.stderr);
   assert(!existsSync(join(dir,route)));
  }
  put(path,JSON.stringify([approved]));
  for(let i=0;i<2;i++){
   put("products/index.html",shell);
   const result=run();assert.equal(result.status,0,result.stdout+result.stderr);
   const html=get(route);
   assert(html.includes('data-npr-retail-sku="NP-CP-4006381333931"'));
   assert(html.includes("Fixture warnings"));
   const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
   assert.equal(schema.gtin13,approved.ean);assert.equal(schema["@type"],"Product");
   assert(!Object.hasOwn(schema,"offers"));
   assert.equal(get("sitemap.xml").split("<loc>https://novapharmhealthcare.com/products/health-and-wellbeing/4006381333931/</loc>").length,2);
   const register=JSON.parse(get("seo/generated/page-metadata-register.json"));
   assert.equal(register.length,2);assert(register.some(p=>p.file===route));
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test("Connective private intake projection self-test", async()=>{
 const {spawnSync:spawn}=await import("node:child_process");
 const {fileURLToPath}=await import("node:url");
 const result=spawn(process.execPath,[fileURLToPath(new URL("./compile-connective-approved-catalogue.mjs",import.meta.url)),"--self-test"],{encoding:"utf8"});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
