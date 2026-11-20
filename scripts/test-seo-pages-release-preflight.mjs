import { test } from "node:test";
import assert from "node:assert/strict";
import { auditSeoCandidate } from "./verify-seo-pages-release-preflight.mjs";

const base = "https://novapharmhealthcare.com";
function fixture({ ownerApproved = false, candidateActive = false, liveActive = true } = {}) {
  const files = {}, lines = ["id\ttitle\tdescription\tlink\tprice\tavailability"];
  files["sitemap.xml"] = "<urlset>";
  for (let i=0;i<19;i++) {
    const id = "NUT-UK-TEST-" + (i+1), slug="test-"+(i+1), url=base+"/products/nutraxin/"+slug+"/";
    const description = "Validated supplier ingredient listing " + i;
    lines.push([id,"Sample product",description,url,"15.00 GBP","in_stock"].join("\t"));
    const j={"@type":"Product",sku:id,description,offers:{url,price:"15.00",priceCurrency:"GBP",
      seller:{logo:base+"/assets/brand/novapharm-healthcare-logo.png"}}};
    files["products/nutraxin/"+slug+"/index.html"] =
      '<meta name="description" content="Food supplement with a verified ingredient and pack description.">' +
      '<meta name="robots" content="index,follow"><link rel="canonical" href="'+url+'">' +
      '<script type="application/ld+json">'+JSON.stringify(j)+"</script>";
    files["sitemap.xml"] += "<url><loc>"+url+"</loc></url>";
  }
  files["sitemap.xml"] += "</urlset>";
  files["shopping/nutraxin-uk.tsv"] = lines.join("\n");
  const paths = "\nDisallow: /portal/\nDisallow: /admin/\nDisallow: /employee/\nDisallow: /api/\n";
  files["robots.txt"] = ["Googlebot","Bingbot","OAI-SearchBot","Claude-SearchBot","PerplexityBot","Applebot"]
    .map(x=>"User-agent: "+x+"\nAllow: /"+paths).join("\n") +
    "\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /\n";
  files["llms.txt"] = "# NovaPharm Healthcare\n"+base+"/products/nutraxin/\n"+base+"/sitemap.xml";
  files["portal/index.html"] = "This public website never asks for a portal username, password or confidential company record";
  const active = '<form data-live-b2b-enquiry-form><input name="privacyAcknowledgement"><input name="safetyConfirmation"></form><script src="/assets/js/contact-production.js"></script>';
  files["contact/index.html"] = candidateActive?active:"<form data-email-enquiry-form></form>";
  return {files,owner:{productionSignoff:ownerApproved?"granted":"not_granted",
    productionPermissions:{activatePublicCustomerAccess:ownerApproved}},
    liveContactHttp:200,liveContactHtml:liveActive?active:""};
}
test("valid 19 offers but owner hold and active form downgrade make release unsafe",()=>{
  const r=auditSeoCandidate(fixture());
  assert.equal(r.sourceReady,true);assert.equal(r.releaseReady,false);
  assert.deepEqual(r.holds,["WOULD_DOWNGRADE_LIVE_CONTACT","OWNER_APPROVAL_NOT_GRANTED"]);
});
test("even explicit owner approval cannot allow contact downgrade",()=>{
  const r=auditSeoCandidate(fixture({ownerApproved:true}));
  assert.equal(r.sourceReady,true);assert.equal(r.releaseReady,false);
});
test("owner-approved, contact-preserving mock candidate passes read-only checks",()=>{
  const r=auditSeoCandidate(fixture({ownerApproved:true,candidateActive:true}));
  assert.equal(r.releaseReady,true);assert.equal(r.products.length,19);
});
test("feed/offer discrepancy fails source verification",()=>{
  const x=fixture({ownerApproved:true,candidateActive:true});
  x.files["products/nutraxin/test-3/index.html"] =
    x.files["products/nutraxin/test-3/index.html"].replace('"price":"15.00"','"price":"30.00"');
  const r=auditSeoCandidate(x);
  assert.equal(r.sourceReady,false);assert(r.issues.some(x=>x.includes("NUT-UK-TEST-3")));
});
test("crawler model-training rules cannot be relaxed by the preflight",()=>{
  const x=fixture({ownerApproved:true,candidateActive:true});
  x.files["robots.txt"]=x.files["robots.txt"].replace("User-agent: GPTBot\nDisallow: /","User-agent: GPTBot\nAllow: /");
  const r=auditSeoCandidate(x);
  assert.equal(r.sourceReady,false);assert(r.issues.some(x=>x.includes("GPTBot")));
});
test("unavailable live contact evidence blocks the release",()=>{
  const x=fixture({ownerApproved:true,candidateActive:true});
  x.liveContactHttp=0;x.liveContactHtml="";
  const r=auditSeoCandidate(x);
  assert.equal(r.sourceReady,true);assert.equal(r.releaseReady,false);
  assert(r.holds.includes("LIVE_CONTACT_UNKNOWN"));
});
