import {readFileSync,writeFileSync,existsSync} from "node:fs";
import assert from "node:assert/strict";
const source=JSON.parse(readFileSync("src/content/connective-source-references.json","utf8"));
const approved=existsSync("src/content/approved-consumer-catalogue.json")?JSON.parse(readFileSync("src/content/approved-consumer-catalogue.json","utf8")):[];
const verified=new Map(approved.filter(p=>p.publicListingApproved&&p.identityConfirmed&&p.imageRightsConfirmed).map(p=>[p.ean,p]));
const products=source.products.map(p=>{
  const a=verified.get(p.ean);const url="/products/health-and-wellbeing/"+p.ean+"/";
  assert(existsSync(url.slice(1)+"index.html"),"Missing Connective detail "+p.ean);
  return {id:"NP-CP-"+p.ean,name:p.name,brand:p.brand,pack:p.pack,group:"Health & wellbeing",category:a?.category||"Health & wellbeing",image:a?.image&&existsSync(a.image.slice(1))?a.image:p.supplierImageUrl||"",url};
});
assert.equal(products.length,395);assert.equal(new Set(products.map(p=>p.id)).size,395);
writeFileSync("assets/data/products-discovery-references.json",JSON.stringify({schema:"novapharm-products-discovery-v1",products})+"\n");
console.log("Generated 395 public discovery references; no price or payment authority.");
