import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const origin="https://novapharmhealthcare.com";
const results=[],errors=[];
for(const [name,engine] of [["Chromium",chromium],["WebKit",webkit]]){
  const row={browser:name,catalogue:false,addToBag:false,bag:false,publicPriceSafe:false,blockedExternal:0,issues:[]};
  let browser;
  try {
    browser=await engine.launch({headless:true});
    const context=await browser.newContext({acceptDownloads:false});
    await context.route("**/*",async route=>{
      const target=new URL(route.request().url());
      if(target.origin===origin){await route.continue();return;}
      row.blockedExternal++;
      await route.abort("blockedbyclient");
    });
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(origin+"/products/esco/?restore_test="+Date.now(),{waitUntil:"domcontentloaded",timeout:30000});
    const input=page.locator("[data-esco-search]");
    await input.waitFor();
    await input.fill("Fowler Bed");
    await page.waitForFunction(()=>document.querySelector("[data-esco-visible-count]")?.textContent?.trim().startsWith("1 catalogue"));
    await input.fill("");
    row.catalogue=await page.locator("[data-esco-entry]").count()===373;
    if(!row.catalogue)throw Error("Live ESCO collection lacks 373 entries");
    const add=page.locator('[data-esco-add="ESCO-CAT-0001"]').first();
    await add.click();
    const bagSaved=await page.evaluate(()=>{
      try{return JSON.parse(localStorage.getItem("novapharm-esco-quote-list-v1")||"[]");}
      catch{return[];}
    });
    row.addToBag=bagSaved.some(x=>x.id==="ESCO-CAT-0001"&&x.quantity===1);
    if(!row.addToBag)throw Error("Add to Bag did not persist an isolated client-side item");
    await page.goto(origin+"/products/esco/bag/?restore_test="+Date.now(),{waitUntil:"domcontentloaded",timeout:30000});
    await page.locator(".esco-shopping-product-name").first().waitFor({timeout:18000});
    const names=await page.locator(".esco-shopping-product-name").allTextContents();
    const labels=await page.locator(".esco-shopping-unitprice").allTextContents();
    row.bag=names.some(x=>x.includes("Fowler Bed"))&&labels.some(x=>x.includes("£800.00"));
    if(!row.bag)throw Error("ESCO Bag failed to render correct 373-record catalogue guide price");
    const publicGuide=await page.evaluate(async()=>{
      const response=await fetch("/assets/data/esco-uk-guide-prices.json?restore_test="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw Error("Price guide HTTP "+response.status);
      return response.json();
    });
    const guideText=JSON.stringify(publicGuide);
    row.publicPriceSafe=publicGuide.entriesTotal===373&&
      Object.keys(publicGuide.guidePrices||{}).length===373&&
      publicGuide.guidePrices["ESCO-CAT-0001"]?.guidePriceExVatGbp===800&&
      publicGuide.requestQuoteOnly===true&&
      publicGuide.checkoutEnabled===false&&
      !/unitEconomics|grossMargin|marginPolicy|targetGrossMargin|maximumSupplier|supplierCost|ownerDeclared/i.test(guideText);
    if(!row.publicPriceSafe)throw Error("Public ESCO data contains private economics or lacks price parity");
    await context.close();
  }catch(e){row.issues.push(String(e).slice(0,350));errors.push(name+": "+String(e).slice(0,180));}
  finally{if(browser)await browser.close();}
  results.push(row);
}
const report={checkedAt:new Date().toISOString(),site:origin,mode:"READ_ONLY_SYNTHETIC_BROWSER_LOCALSTORAGE_NO_PAYMENTS",passed:errors.length===0,results};
mkdirSync("artifacts/site-restoration",{recursive:true});
writeFileSync("artifacts/site-restoration/live-esco-bag-browser.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report));
if(errors.length)process.exitCode=1;
