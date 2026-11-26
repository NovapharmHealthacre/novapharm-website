/**
 * Shared native transport contract. The token is supplied by a future
 * device-accepted Cognito OIDC/PKCE session. This module never stores tokens,
 * implements password login, or infers Cognito roles from client JWT payloads.
 */
export type FdaKind = "labels" | "approvals" | "ndc" | "adverse-events" | "recalls";
export type FdaProtectedSourceResult = Readonly<{
  sourceId: string;
  kind?: FdaKind;
  dataState: "no_source_matches" | "public_source_observations";
  retrievedAt?: string;
  matchedCountReported?: number | null;
  records: readonly Record<string,unknown>[];
  limitations?: readonly string[];
}>;
export type FdaProtectedGatewayConfig = Readonly<{
  privateApiOrigin: string;
  expectedPrivateApiHost: string;
  mobileSessionAccepted: boolean;
  privateRouteAccepted: boolean;
  independentRightsAccepted: boolean;
  signedAppIdentityAccepted: boolean;
}>;
export type NativeAccessTokenProvider = ()=>Promise<string>;
export type FdaFetch = typeof fetch;
const kinds=new Set<FdaKind>(["labels","approvals","ndc","adverse-events","recalls"]);
const route="/v1/intelligence/regulatory/us/fda-research";
const maxBytes=256*1024;
export function nativeFdaGatewayReady(config:FdaProtectedGatewayConfig):boolean{
 if(!config.mobileSessionAccepted||!config.privateRouteAccepted||
    !config.independentRightsAccepted||!config.signedAppIdentityAccepted)return false;
 try{
   const u=new URL(config.privateApiOrigin);
   return u.protocol==="https:" && u.hostname===config.expectedPrivateApiHost &&
     u.port==="" && u.username==="" && u.password==="" && u.pathname==="/" &&
     u.search==="" && u.hash==="" &&
     /^(?:[a-z0-9-]+\.)+amazonaws\.com$|^[a-z0-9.-]+\.novapharmhealthcare\.com$/u.test(u.hostname);
 }catch{return false}
}
export async function queryProtectedFdaNative({
  config,kind,drug,accessToken,fetchImpl=fetch
}:{
 config:FdaProtectedGatewayConfig,kind:FdaKind,drug:string,
 accessToken:NativeAccessTokenProvider,fetchImpl?:FdaFetch
}):Promise<FdaProtectedSourceResult>{
 if(!nativeFdaGatewayReady(config))throw Error("Protected FDA mobile service has not been accepted.");
 if(!kinds.has(kind))throw Error("Unknown FDA dataset.");
 const term=drug.normalize("NFKC").trim().replace(/\s+/gu," ");
 if(!/^[A-Za-z][A-Za-z0-9 -]{1,63}$/u.test(term)||/[/\r\n]/u.test(drug))
   throw Error("Invalid medicine name.");
 const bearer=await accessToken();
 if(!/^[A-Za-z0-9_.~-]{40,8192}$/u.test(bearer))throw Error("Valid Cognito session required.");
 const url=new URL(route,config.privateApiOrigin);
 url.searchParams.set("kind",kind);
 url.searchParams.set("drug",term);
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),8000);
 let response:Response;
 try{
   response=await fetchImpl(url.toString(),{
     method:"GET",redirect:"error",cache:"no-store",signal:controller.signal,
     headers:{Accept:"application/json",Authorization:"Bearer "+bearer}
   });
   if(response.redirected || (response.url && response.url!==url.toString()))
     throw Error("Unexpected FDA service redirect.");
   if(response.status===401||response.status===403)throw Error("FDA session not authorized.");
   if(response.status===429)throw Error("FDA research quota exceeded.");
   if(response.status!==200)throw Error("FDA source unavailable.");
   if(!/\bapplication\/json\b/i.test(response.headers.get("content-type")||""))
     throw Error("Unexpected FDA content type.");
   const size=Number(response.headers.get("content-length")||0);
   if(size>maxBytes)throw Error("FDA source response too large.");
   const body=await response.text();
   if(new TextEncoder().encode(body).byteLength>maxBytes)
     throw Error("FDA source response too large.");
   const data:unknown=JSON.parse(body);
   if(!data || typeof data!=="object" || !("records" in data) ||
      !Array.isArray(data.records) || data.records.length>5)
     throw Error("Invalid FDA research response.");
   const normalized=data as FdaProtectedSourceResult;
   if(typeof normalized.sourceId!=="string"||
      !["no_source_matches","public_source_observations"].includes(normalized.dataState))
      throw Error("Invalid FDA source provenance.");
   if(kind==="adverse-events" && normalized.records.length!==0)
      throw Error("FAERS records may not contain patient-level entries.");
   return normalized;
 }finally{
   clearTimeout(timeout);
 }
}
