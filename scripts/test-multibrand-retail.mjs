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
