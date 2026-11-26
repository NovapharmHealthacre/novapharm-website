import { mkdirSync, writeFileSync } from "node:fs";
const origin = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
const url = origin + "/health?restore-preflight=" + Date.now();
const report={timestamp:new Date().toISOString(),service:"NovaPharm contact intake",checkedPath:"/health",mode:"READ_ONLY_NO_EMAIL",ready:false,issues:[]};
try {
  const response=await fetch(url,{method:"GET",signal:AbortSignal.timeout(16000),cache:"no-store",headers:{Accept:"application/json","Cache-Control":"no-cache","Origin":"https://novapharmhealthcare.com"}});
  report.httpStatus=response.status;
  report.corsAllowOrigin=response.headers.get("access-control-allow-origin") || null;
  const body=await response.json();
  report.ready=response.ok && body?.service==="novapharm-contact-intake" && body?.ready===true && body?.environment==="production";
  if(!report.ready)report.issues.push("Contact backend does not meet production health contract");
  if(report.corsAllowOrigin!=="https://novapharmhealthcare.com" && report.corsAllowOrigin!=="*") report.issues.push("Health response lacks permitted corporate CORS origin");
  const preflight=await fetch(origin+"/contact",{method:"OPTIONS",signal:AbortSignal.timeout(16000),headers:{
    Origin:"https://novapharmhealthcare.com",
    "Access-Control-Request-Method":"POST",
    "Access-Control-Request-Headers":"content-type,x-novapharm-intake"
  }});
  report.preflightStatus=preflight.status;
  const allowOrigin=preflight.headers.get("access-control-allow-origin")||"";
  const allowMethods=(preflight.headers.get("access-control-allow-methods")||"").toLowerCase();
  const allowHeaders=(preflight.headers.get("access-control-allow-headers")||"").toLowerCase();
  report.preflightOrigin=allowOrigin;
  if(!preflight.ok||!["https://novapharmhealthcare.com","*"].includes(allowOrigin)||!allowMethods.includes("post")||!allowHeaders.includes("x-novapharm-intake")||!allowHeaders.includes("content-type"))
    report.issues.push("Contact POST preflight CORS not ready for approved public browser form");
} catch(error){report.issues.push(String(error).slice(0,200));}
mkdirSync("artifacts/site-restoration",{recursive:true});
writeFileSync("artifacts/site-restoration/contact-health-preflight.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({ready:report.ready,httpStatus:report.httpStatus,issues:report.issues}));
if(!report.ready||report.issues.length)process.exitCode=1;
