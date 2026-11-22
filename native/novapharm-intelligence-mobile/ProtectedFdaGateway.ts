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
async function readBoundedFdaJson(response:Response):Promise<unknown>{
  // A content-length header alone is not a memory bound. A producer may omit
  // or falsify the header; reject large responses before buffering them.
  const declared=response.headers.get("content-length");
  if(declared!==null && (!/^\\d+$/u.test(declared) ||
      Number(declared)>maxBytes || !Number.isSafeInteger(Number(declared))))
    throw Error("FDA source response too large.");
  const stream=response.body;
  if(!stream || typeof stream.getReader!=="function")
    throw Error("FDA response stream unavailable.");
  const reader=stream.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      if(!(value instanceof Uint8Array) ||
         (total+=value.byteLength)>maxBytes)throw Error("FDA source response too large.");
      chunks.push(value);
    }
  }catch{
    throw Error("FDA source response unavailable or oversized.");
  }finally{
    try{await reader.cancel();}catch{}
    try{reader.releaseLock();}catch{}
  }
  const bytes=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{throw Error("Invalid FDA research response.");}
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
   const data=await readBoundedFdaJson(response);
   if(!data || typeof data!=="object" || !("records" in data) ||
      !Array.isArray(data.records) || data.records.length>5)
     throw Error("Invalid FDA research response.");
   const normalized=data as FdaProtectedSourceResult;
   const expectedSourceId=kind==="labels"?"us.fda.openfda-labels":"us.fda.openfda."+kind;
   if(normalized.sourceId!==expectedSourceId ||
      !["no_source_matches","public_source_observations"].includes(normalized.dataState) ||
      (normalized.kind!==undefined && normalized.kind!==kind) ||
      (normalized.dataState==="no_source_matches" && normalized.records.length!==0))
      throw Error("Invalid FDA source provenance.");
   if(kind==="adverse-events" && normalized.records.length!==0)
      throw Error("FAERS records may not contain patient-level entries.");
   return normalized;
 }finally{
   clearTimeout(timeout);
 }
}
