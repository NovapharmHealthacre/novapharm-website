/**
 * Optional server-side vendor connectivity probes, disabled without individually
 * verified owner entitlements and a private credentials provider.
 *
 * Probe only: Foundry GET /api/v2/ontologies and Prisma CSPM GET /cloud.
 * Bloomberg Data License needs an account-specific, separately licensed adapter;
 * no Bloomberg request, endpoint, credentials or content access is presumed here.
 *
 * Strictly non-customer, non-production proof: results disclose counts only.
 * Production transport must enforce TLS validation, no redirects, private-network
 * deny lists, response-size and duration ceilings, and no logging of credentials.
 *
 * Palantir docs: /multipass/api/oauth2/token. Restricted Developer Console
 * apps use api:use-ontologies-read; approved legacy standalone clients can
 * use api:ontologies-read. Caller must provide the *approved* account scope.
 * Palo Alto docs: /login, x-redlock-auth, GET /cloud.
 */
import { randomUUID } from "node:crypto";

const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const WORKSPACE=/^[a-z0-9][a-z0-9_-]{2,63}$/u;
const prismaHosts=new Set([
 "api.prismacloud.io","api2.prismacloud.io","api3.prismacloud.io",
 "api4.prismacloud.io","api.anz.prismacloud.io","api.eu.prismacloud.io",
 "api2.eu.prismacloud.io","api.ca.prismacloud.io",
 "api.sg.prismacloud.io","api.uk.prismacloud.io","api.ind.prismacloud.io"
]);
const VENDORS=Object.freeze(["palantir_foundry","palo_alto_prisma","bloomberg_data_license"]);
const FOUNDRY_SCOPES=new Set(["api:use-ontologies-read","api:ontologies-read"]);

export const supportedEnterpriseVendorProbes=VENDORS;

function deny(){
 return Object.assign(new Error("Enterprise vendor probe was denied."),{
  code:"enterprise_vendor_probe_denied",statusCode:403
 });
}
const validId=x=>typeof x==="string"&&ID.test(x);
function originFor(vendor,value){
 if(typeof value!=="string" || value.length>250)throw deny();
 let url;
 try {url=new URL(value);}catch{throw deny();}
 if(url.protocol!=="https:" || url.username || url.password || url.port ||
    url.search || url.hash || url.pathname!=="/")throw deny();
 const host=url.hostname;
 if(vendor==="palantir_foundry"){
  if(!/^[a-z0-9][a-z0-9-]{0,62}\.palantirfoundry\.com$/u.test(host))throw deny();
 }else if(vendor==="palo_alto_prisma"){
  if(!prismaHosts.has(host))throw deny();
 }else throw deny();
 return url.origin;
}
function authorityOkay(x){
 return x?.verified===true&&validId(x.principalId)&&
  typeof x.workspaceId==="string"&&WORKSPACE.test(x.workspaceId)&&
  validId(x.authorityRevision)&&Array.isArray(x.accessScopes)&&
  x.accessScopes.some(r=>r==="admin"||r==="board");
}
function token(value){
 return typeof value==="string" && value.length>8 && value.length<=8192 &&
  !/\s/u.test(value);
}
async function safeCall(callback,value){
 try{return await callback(value);}
 catch{throw deny();}
}
async function safeRequest(httpRequest,request){
 try {return await httpRequest(request);}
 catch {throw deny();}
}
function credentialsOkay(vendor,c){
 return c && typeof c==="object" && !Array.isArray(c) &&
  (vendor==="palantir_foundry" ?
   validId(c.clientId)&&token(c.clientSecret)&&FOUNDRY_SCOPES.has(c.oauthScope) :
   validId(c.accessKeyId)&&token(c.secretKey));
}
function validReply(reply){
 return reply && typeof reply==="object" && reply.status===200 &&
  reply.json && typeof reply.json==="object" && !Array.isArray(reply.json);
}
/**
 * Strict owner-scoped read-only credentialed probe. All callbacks MUST come
 * from a trusted server. Entitlement verification must consult a real vendor
 * licence/rights ledger, not client assertions, and verify that API reading
 * only a metadata inventory is permitted for this purpose and tenant.
 */
export async function probeEnterpriseVendor({
 vendor,authority,origin,resolveCredentials,verifyEntitlement,
 verifyCurrentAuthority,recordAudit,httpRequest,clock=()=>Date.now()
}={}){
 if(!VENDORS.includes(vendor)||vendor==="bloomberg_data_license"||
  !authorityOkay(authority)||
  [resolveCredentials,verifyEntitlement,verifyCurrentAuthority,recordAudit,httpRequest]
   .some(fn=>typeof fn!=="function"))throw deny();
 const base=originFor(vendor,origin);
 const now=clock();
 if(!Number.isSafeInteger(now)||now<=0)throw deny();
 const context={principalId:authority.principalId,workspaceId:authority.workspaceId,
  authorityRevision:authority.authorityRevision,vendor,
  purpose:"vendor_read_only_inventory",origin:base};
 async function allowed(){
  return await safeCall(verifyCurrentAuthority,context)===true &&
   await safeCall(verifyEntitlement,context)===true;
 }
 if(!await allowed())throw deny();
 const eventId=randomUUID();
 const acknowledgement=await safeCall(recordAudit,{
  ...context,eventId,action:"vendor.inventory_probe.preflight",
  credentialsStored:false,resultsStored:false,customerVisible:false
 });
 if(acknowledgement?.committed!==true||acknowledgement.eventId!==eventId)throw deny();
 if(!await allowed())throw deny();
 const credentials=await safeCall(resolveCredentials,context);
 if(!credentialsOkay(vendor,credentials))throw deny();
 if(!await allowed())throw deny();
 // HTTP is an independently approved private server transport. The only
 // allowed paths are constants below: never take a model/user-supplied path.
 let auth,read;
 if(vendor==="palantir_foundry"){
  const body=new URLSearchParams({
   grant_type:"client_credentials",client_id:credentials.clientId,
   client_secret:credentials.clientSecret,scope:credentials.oauthScope
  }).toString();
  auth=await safeRequest(httpRequest,{url:base+"/multipass/api/oauth2/token",method:"POST",
   headers:{"content-type":"application/x-www-form-urlencoded"},body,
   redirect:"error",timeoutMs:5000,maxBytes:32768});
  if(!validReply(auth)||!token(auth.json.access_token))throw deny();
  if(!await allowed())throw deny();
  read=await safeRequest(httpRequest,{url:base+"/api/v2/ontologies",method:"GET",
   headers:{authorization:"Bearer "+auth.json.access_token,accept:"application/json"},
   redirect:"error",timeoutMs:5000,maxBytes:32768});
 }else{
  auth=await safeRequest(httpRequest,{url:base+"/login",method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({username:credentials.accessKeyId,password:credentials.secretKey}),
   redirect:"error",timeoutMs:5000,maxBytes:32768});
  if(!validReply(auth)||!token(auth.json.token))throw deny();
  if(!await allowed())throw deny();
  read=await safeRequest(httpRequest,{url:base+"/cloud",method:"GET",
   headers:{"x-redlock-auth":auth.json.token,accept:"application/json"},
   redirect:"error",timeoutMs:5000,maxBytes:32768});
 }
 if(!read || read.status!==200)throw deny();
 const items=vendor==="palantir_foundry"?read.json?.data:read.json;
 if(!Array.isArray(items)||items.length>500)throw deny();
 if(!await allowed())throw deny();
 const completionEventId=randomUUID();
 const completion=await safeCall(recordAudit,{
  ...context,eventId:completionEventId,preflightEventId:eventId,
  action:"vendor.inventory_probe.completed",
  resourceCount:items.length,credentialsStored:false,
  resultsStored:false,customerVisible:false
 });
 if(completion?.committed!==true||completion.eventId!==completionEventId)throw deny();
 if(!await allowed())throw deny();
 return {
  contract:"novapharm.intelligence.vendor-inventory-probe.v1",
  vendor,scope:"read_only_service_inventory",
  providerConnectivityObserved:true,productionCertified:false,
  customerReleaseApproved:false,dataLicenceForReuseVerified:false,
  workspaceId:authority.workspaceId,probeEventId:completionEventId,
  resourceCount:items.length,
  evidenceStatus:"connectivity_only_no_data_acceptance"
 };
}
