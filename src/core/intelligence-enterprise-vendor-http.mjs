/**
 * Server-only, strictly bounded HTTP transport for independently authorised
 * Foundry and Prisma Cloud inventory probes. No other URL can be requested.
 *
 * This transport does not create a vendor licence, identity, enterprise
 * entitlement or outbound network exception. Never run in the browser.
 */
const prismaHosts=new Set([
 "api.prismacloud.io","api2.prismacloud.io","api3.prismacloud.io",
 "api4.prismacloud.io","api.anz.prismacloud.io","api.eu.prismacloud.io",
 "api2.eu.prismacloud.io","api.ca.prismacloud.io",
 "api.sg.prismacloud.io","api.uk.prismacloud.io","api.ind.prismacloud.io"
]);
const palantirHost=/^[a-z0-9][a-z0-9-]{0,62}\.palantirfoundry\.com$/u;
const MAX_BYTES=32768;
const MAX_TIMEOUT=5000;
const denied=()=>Object.assign(new Error("Enterprise vendor transport denied."),{
 code:"enterprise_vendor_transport_denied",statusCode:403
});
function allowedRequest(request){
 if(!request || typeof request!=="object" || Array.isArray(request) ||
  typeof request.url!=="string" || request.url.length>300)return false;
 let url;
 try{url=new URL(request.url);}catch{return false;}
 if(url.protocol!=="https:"||url.username||url.password||url.port||
  url.search||url.hash)return false;
 const host=url.hostname,path=url.pathname,method=request.method;
 const foundry=palantirHost.test(host);
 const prisma=prismaHosts.has(host);
 const allowed=(foundry&&(
  (path==="/multipass/api/oauth2/token"&&method==="POST")||
  (path==="/api/v2/ontologies"&&method==="GET")))||
  (prisma&&((path==="/login"&&method==="POST")||
  (path==="/cloud"&&method==="GET")));
 if(!allowed || request.redirect!=="error" ||
  !Number.isInteger(request.timeoutMs)||request.timeoutMs<1||
  request.timeoutMs>MAX_TIMEOUT||
  !Number.isInteger(request.maxBytes)||request.maxBytes<1||
  request.maxBytes>MAX_BYTES||
  !request.headers||typeof request.headers!=="object"||
  Array.isArray(request.headers))return false;
 const keys=Object.keys(request.headers);
 if(keys.some(k=>!["accept","content-type","authorization","x-redlock-auth"].includes(k)||
  typeof request.headers[k]!=="string" ||
  request.headers[k].length>8192 ||
  /[\r\n\0]/u.test(request.headers[k])))return false;
 if(method==="GET"){
  if(request.body!==undefined || request.headers["content-type"]!==undefined)return false;
  return foundry ? typeof request.headers.authorization==="string" &&
   request.headers.authorization.startsWith("Bearer ") :
   typeof request.headers["x-redlock-auth"]==="string" &&
   request.headers["x-redlock-auth"].length>8;
 }
 if(typeof request.body!=="string" || request.body.length===0 ||
  request.body.length>4096 || request.headers.authorization ||
  request.headers["x-redlock-auth"])return false;
 return foundry?
  request.headers["content-type"]==="application/x-www-form-urlencoded" :
  request.headers["content-type"]==="application/json";
}
async function boundedJson(response,url,limit){
 if(!response||typeof response.status!=="number"||
  response.redirected===true)throw denied();
 if(response.url && response.url!==url)throw denied();
 if(response.status>=300 && response.status<400)throw denied();
 // Do not read or expose any server error body; it may contain credentials.
 if(response.status!==200)return {status:response.status,json:null};
 const contentType=response.headers?.get?.("content-type");
 if(typeof contentType!=="string"||
    !/^application\/(?:[a-z0-9.+-]*\+)?json(?:\s*;|\s*$)/iu.test(contentType))throw denied();
 const sizeHeader=response.headers?.get?.("content-length");
 if(sizeHeader!=null && /^\d+$/u.test(sizeHeader) &&
  Number(sizeHeader)>limit)throw denied();
 const reader=response.body?.getReader?.();
 if(!reader)throw denied();
 const chunks=[];
 let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array))throw denied();
   total+=value.byteLength;
   if(total>limit)throw denied();
   chunks.push(Buffer.from(value));
  }
 }finally{
  try {await reader.cancel();} catch {}
 }
 if(total===0)throw denied();
 let data;
 try{data=JSON.parse(Buffer.concat(chunks,total).toString("utf8"));}
 catch{throw denied();}
 return {status:200,json:data};
}
/**
 * Uses Node's real fetch by default. Caller MUST separately enforce outbound
 * network egress and keep vendor secrets in server-managed credentials storage.
 * For offline acceptance, inject an HTTP mock as fetchImpl.
 */
export function createStrictEnterpriseVendorTransport({fetchImpl=fetch}={}){
 if(typeof fetchImpl!=="function")throw denied();
 return async function vendorTransport(request){
  if(!allowedRequest(request))throw denied();
  try{
   const response=await fetchImpl(request.url,{
    method:request.method,headers:{...request.headers},
    ...(request.method==="POST"?{body:request.body}:{}),
    redirect:"error",cache:"no-store",credentials:"omit",
    signal:AbortSignal.timeout(request.timeoutMs)
   });
   return await boundedJson(response,request.url,request.maxBytes);
  }catch{throw denied();}
 };
}
