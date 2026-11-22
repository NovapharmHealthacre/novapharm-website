/**
 * NovaPharm Android OIDC authorization-code + S256 PKCE session CORE.
 *
 * This is deliberately transport-independent: the signed Android application
 * MUST inject system-browser session, OS cryptographic RNG/hash, installed
 * package identity and Android Keystore-backed storage. Without all five,
 * nothing authenticates or calls the network. Expo auth/session adapters are
 * NOT installed or accepted in the current project.
 *
 * Never accepts a password or user-supplied JWT as proof of board membership.
 * The protected FDA API independently verifies its signed access-token claims.
 */
export type NovaFDAOidcConfig = Readonly<{
  cognitoDomain: string;
  clientId: string;
  redirectUri: string;
  expectedAndroidPackage: string;
  installedAndroidPackage: string;
  signedPackageApproved: boolean;
  nativeClientApproved: boolean;
  mobileMfaAccepted: boolean;
  sourceRightsAccepted: boolean;
  independentReleaseAccepted: boolean;
}>;
export type NovaFDAStoredAccessToken = Readonly<{token:string;expiresAtMs:number}>;
export type NovaFDASecureTokenStore = Readonly<{
  save: (value:NovaFDAStoredAccessToken)=>Promise<void>;
  load: ()=>Promise<NovaFDAStoredAccessToken|null>;
  clear: ()=>Promise<void>;
}>;
export type NovaFDAAndroidPlatform = Readonly<{
  secureRandomBytes: (count:number)=>Promise<Uint8Array>;
  sha256: (input:Uint8Array)=>Promise<Uint8Array>;
  openSystemAuthSession: (authorizationUrl:string,redirectUri:string)=>Promise<string|null>;
  secureStore: NovaFDASecureTokenStore;
  fetchImpl: typeof fetch;
  nowMs: ()=>number;
}>;
// A signed native adapter must reuse the same secureStore object for all
// authentication, token lookup and sign-out calls. Serializing writes avoids
// an in-flight async Keystore save resurrecting access after sign-out.
type StoreSessionGate={generation:number; tail:Promise<void>; revoked:boolean};
const sessionGates=new WeakMap<NovaFDASecureTokenStore,StoreSessionGate>();
function sessionGate(store:NovaFDASecureTokenStore):StoreSessionGate {
  let gate=sessionGates.get(store);
  if(!gate){gate={generation:0,tail:Promise.resolve(),revoked:false};sessionGates.set(store,gate);}
  return gate;
}
async function withStoreLock<T>(store:NovaFDASecureTokenStore,operation:()=>Promise<T>):Promise<T>{
  const gate=sessionGate(store);
  const preceding=gate.tail;
  let release!:()=>void;
  gate.tail=new Promise<void>(resolve=>{release=resolve;});
  await preceding;
  try{return await operation();}
  finally{release();}
}
const requiredScope="novapharm/fda.read";
const expectedHostEnd=".auth.eu-north-1.amazoncognito.com";
const allowedName=/^[A-Za-z0-9_.-]+$/u;
function base64url(data:Uint8Array):string {
  const digits="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result="";
  for(let i=0;i<data.length;i+=3){
    const a=data[i],b=data[i+1],c=data[i+2];
    result+=digits[a>>2]+digits[((a&3)<<4)|((b??0)>>4)];
    if(i+1<data.length)result+=digits[((b&15)<<2)|((c??0)>>6)];
    if(i+2<data.length)result+=digits[c&63];
  }
  return result;
}
function singleParam(url:URL,name:string):string|null{
  const list=url.searchParams.getAll(name);
  return list.length===1?list[0]:null;
}
function validDomain(config:NovaFDAOidcConfig):boolean{
  try {
    const domain=new URL(config.cognitoDomain);
    const redirect=new URL(config.redirectUri);
    return config.signedPackageApproved && config.nativeClientApproved &&
      config.mobileMfaAccepted && config.sourceRightsAccepted && config.independentReleaseAccepted &&
      config.installedAndroidPackage===config.expectedAndroidPackage &&
      config.expectedAndroidPackage!=="com.example.NovaPharmNativePreview" &&
      allowedName.test(config.expectedAndroidPackage) &&
      /^[a-z0-9]{8,64}$/u.test(config.clientId) &&
      domain.protocol==="https:" && !!domain.hostname &&
      domain.hostname.endsWith(expectedHostEnd) &&
      domain.port==="" && domain.username==="" && domain.password==="" &&
      domain.pathname==="/" && domain.search==="" && domain.hash==="" &&
      redirect.protocol==="novapharmintelligence:" && redirect.hostname==="oauth" &&
      redirect.pathname==="/callback" &&
      redirect.search==="" && redirect.hash==="" &&
      redirect.username==="" && redirect.password==="";
  } catch { return false; }
}
function assertReady(config:NovaFDAOidcConfig,platform:NovaFDAAndroidPlatform):void{
  if(!validDomain(config))throw Error("Native FDA Cognito session is not approved.");
  if(!platform || typeof platform.secureRandomBytes!=="function" ||
     typeof platform.sha256!=="function" ||
     typeof platform.openSystemAuthSession!=="function" ||
     typeof platform.secureStore?.save!=="function" ||
     typeof platform.secureStore?.load!=="function" ||
     typeof platform.secureStore?.clear!=="function" ||
     typeof platform.fetchImpl!=="function" ||
     typeof platform.nowMs!=="function")
     throw Error("OS browser, crypto, identity and secure storage are required.");
}
export function nativeFdaOidcConfigured(config:NovaFDAOidcConfig):boolean{
  return validDomain(config);
}
export async function authenticateNativeFdaWithPkce(
 config:NovaFDAOidcConfig,platform:NovaFDAAndroidPlatform
):Promise<void>{
  assertReady(config,platform);
  // Invalidate all older sessions before the first asynchronous operation.
  const gate=sessionGate(platform.secureStore);
  const attempt=++gate.generation;
  gate.revoked=true;
  // Deleting the old token must finish before OS entropy/browser requests.
  await withStoreLock(platform.secureStore,()=>platform.secureStore.clear());
  if(gate.generation!==attempt)throw Error("FDA sign-in was superseded.");
  // The host platform must supply cryptographically secure 32-byte buffers.
  const [verifierBytes,stateBytes,nonceBytes]=await Promise.all([
    platform.secureRandomBytes(32),
    platform.secureRandomBytes(32),
    platform.secureRandomBytes(32)
  ]);
  if(![verifierBytes,stateBytes,nonceBytes].every(v=>v instanceof Uint8Array && v.length===32))
    throw Error("OS crypto entropy is unavailable.");
  const verifier=base64url(verifierBytes),state=base64url(stateBytes),nonce=base64url(nonceBytes);
  const asciiVerifier=new Uint8Array(verifier.split("").map(ch=>ch.charCodeAt(0)));
  const hash=await platform.sha256(asciiVerifier);
  if(!(hash instanceof Uint8Array) || hash.length!==32)throw Error("OS SHA-256 unavailable.");
  const authorization=new URL("/oauth2/authorize",config.cognitoDomain);
  authorization.searchParams.set("response_type","code");
  authorization.searchParams.set("client_id",config.clientId);
  authorization.searchParams.set("redirect_uri",config.redirectUri);
  authorization.searchParams.set("scope","openid profile "+requiredScope);
  authorization.searchParams.set("state",state);
  authorization.searchParams.set("nonce",nonce);
  authorization.searchParams.set("code_challenge_method","S256");
  authorization.searchParams.set("code_challenge",base64url(hash));
  // The injected platform MUST use Android's trusted system browser, not a WebView.
  const callback=await platform.openSystemAuthSession(authorization.toString(),config.redirectUri);
  if(!callback)throw Error("FDA sign-in was cancelled.");
  let returned:URL;
  try{returned=new URL(callback)}catch{throw Error("Invalid secure sign-in callback.");}
  const expected=new URL(config.redirectUri);
  if(returned.protocol!==expected.protocol || returned.host!==expected.host ||
     returned.pathname!==expected.pathname || returned.hash ||
     returned.username || returned.password) throw Error("Untrusted sign-in callback.");
  const code=singleParam(returned,"code");
  const observedState=singleParam(returned,"state");
  const callbackKeys=[...returned.searchParams.keys()];
  if(callbackKeys.length!==2 || !callbackKeys.includes("code") ||
    !callbackKeys.includes("state") ||
    observedState!==state || !code || code.length>2048 ||
    /[\p{Cc}\p{Cf}\p{Cs}]/u.test(code) ||
    returned.searchParams.has("error"))
    throw Error("Invalid sign-in state or authorization code.");
  const tokenUrl=new URL("/oauth2/token",config.cognitoDomain);
  const params=new URLSearchParams({
    grant_type:"authorization_code",client_id:config.clientId,
    redirect_uri:config.redirectUri,code,code_verifier:verifier
  });
  // Do not include bearer tokens, authorization codes, state or verifier in logs.
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  let response:Response;
  try {
    response=await platform.fetchImpl(tokenUrl.toString(),{
      method:"POST",redirect:"error",cache:"no-store",credentials:"omit",
      headers:{"content-type":"application/x-www-form-urlencoded","accept":"application/json"},
      body:params.toString(),signal:controller.signal
    });
  } catch {throw Error("Cognito token exchange unavailable.");}
  finally { clearTimeout(timeout); }
  if(response.status!==200 || response.redirected ||
    (response.url && response.url!==tokenUrl.toString()) ||
    !/\bapplication\/json\b/iu.test(response.headers.get("content-type")||""))
    throw Error("Cognito token exchange rejected.");
  const body=await response.text();
  if(body.length>16384)throw Error("Cognito token response oversized.");
  let payload:unknown;
  try{payload=JSON.parse(body)}catch{throw Error("Invalid Cognito token response.");}
  if(!payload || typeof payload!=="object")throw Error("Invalid Cognito token response.");
  const json=payload as {access_token?:unknown;token_type?:unknown;expires_in?:unknown};
  if(typeof json.access_token!=="string" || !/^[A-Za-z0-9_.~-]{40,8192}$/u.test(json.access_token) ||
     json.token_type!=="Bearer" ||
     typeof json.expires_in!=="number" || !Number.isInteger(json.expires_in) ||
     json.expires_in<60 || json.expires_in>3600)
    throw Error("Invalid Cognito access-token contract.");
  // Serialize the final generation check and async Keystore write with
  // sign-out's clear. A superseded login cannot restore an earlier board token.
  await withStoreLock(platform.secureStore,async()=>{
    if(gate.generation!==attempt)throw Error("FDA sign-in was superseded.");
    await platform.secureStore.save({
      token:json.access_token,
      expiresAtMs:platform.nowMs()+((json.expires_in as number)-30)*1000
    });
  });
  if(gate.generation!==attempt)throw Error("FDA sign-in was superseded.");
  gate.revoked=false;
}
export async function verifiedNativeFdaAccessToken(
 config:NovaFDAOidcConfig,platform:NovaFDAAndroidPlatform
):Promise<string>{
  assertReady(config,platform);
  const gate=sessionGate(platform.secureStore);
  const generation=gate.generation;
  return withStoreLock(platform.secureStore,async()=>{
    if(gate.revoked || gate.generation!==generation)throw Error("FDA session changed.");
    const record=await platform.secureStore.load();
    if(gate.revoked || gate.generation!==generation)throw Error("FDA session changed.");
    if(!record || !Number.isSafeInteger(record.expiresAtMs) ||
        record.expiresAtMs<=platform.nowMs() ||
        !/^[A-Za-z0-9_.~-]{40,8192}$/u.test(record.token)){
      await platform.secureStore.clear();
      throw Error("FDA session expired or unavailable.");
    }
    return record.token;
  });
}
export async function signOutNativeFda(platform:NovaFDAAndroidPlatform):Promise<void>{
  if(typeof platform?.secureStore?.clear!=="function")throw Error("No secure token storage.");
  const gate=sessionGate(platform.secureStore);
  ++gate.generation;
  gate.revoked=true;
  await withStoreLock(platform.secureStore,()=>platform.secureStore.clear());
}
