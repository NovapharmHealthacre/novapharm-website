import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  authenticateNativeFdaWithPkce, nativeFdaOidcConfigured,
  verifiedNativeFdaAccessToken, signOutNativeFda
} from "../native/novapharm-intelligence-mobile/NativeFdaOidcCore.ts";

const issuer="https://novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com/";
const config={
  cognitoDomain:issuer,clientId:"7c76122stt76k4d8cjvd7tf6ck",
  redirectUri:"novapharmintelligence://oauth/callback",
  expectedAndroidPackage:"com.novapharm.intelligence",
  installedAndroidPackage:"com.novapharm.intelligence",
  signedPackageApproved:true,nativeClientApproved:true,
  mobileMfaAccepted:true,sourceRightsAccepted:true,independentReleaseAccepted:true
};
const mockedToken="a".repeat(80);
function platform(overrides={}){
  let stored=null,network=0,browser=0,random=0;
  const store={
    save:async x=>{stored=x},
    load:async()=>stored,
    clear:async()=>{stored=null}
  };
  const adapter={
    secureRandomBytes:async n=>{random++;return new Uint8Array(n).fill(random+5);},
    sha256:async value=>new Uint8Array(createHash("sha256").update(value).digest()),
    openSystemAuthSession:async (uri,redirect)=>{
      browser++;
      const url=new URL(uri);
      assert.equal(url.origin,new URL(issuer).origin);
      assert.equal(url.pathname,"/oauth2/authorize");
      assert.equal(url.searchParams.get("scope"),"openid profile novapharm/fda.read");
      assert.equal(url.searchParams.get("code_challenge_method"),"S256");
      assert.equal(url.searchParams.get("response_type"),"code");
      assert.equal(url.searchParams.get("client_id"),config.clientId);
      assert.ok(url.searchParams.get("nonce")?.length>=40);
      assert.ok(url.searchParams.get("code_challenge")?.length>=40);
      return redirect+"?code=PROTECTED_CODE&state="+url.searchParams.get("state");
    },
    secureStore:store,
    fetchImpl:async (url,init)=>{
      network++;
      assert.equal(url,new URL("/oauth2/token",issuer).toString());
      assert.equal(init.method,"POST");
      assert.equal(init.redirect,"error");
      assert.equal(init.credentials,"omit");
      const fields=new URLSearchParams(init.body);
      assert.equal(fields.get("code"),"PROTECTED_CODE");
      assert.equal(fields.get("grant_type"),"authorization_code");
      assert.equal(fields.get("redirect_uri"),config.redirectUri);
      assert.equal(fields.get("client_id"),config.clientId);
      assert.ok(fields.get("code_verifier")?.length>=40);
      assert.equal(init.headers.Authorization,undefined);
      return new Response(JSON.stringify({
        token_type:"Bearer",access_token:mockedToken,expires_in:3600,
        refresh_token:"NEVER_STORE",id_token:"NEVER_STORE"
      }),{status:200,headers:{"content-type":"application/json"}});
    },
    nowMs:()=>1795260000000,
    ...overrides
  };
  return {adapter,stats:()=>({stored,network,browser,random})};
}
test("default unsupported/native-unapproved state cannot open browser, call token endpoint, or request entropy",async()=>{
  for(const key of ["signedPackageApproved","nativeClientApproved","mobileMfaAccepted",
    "sourceRightsAccepted","independentReleaseAccepted"]){
    const {adapter,stats}=platform();
    const unapproved={...config,[key]:false};
    assert.equal(nativeFdaOidcConfigured(unapproved),false,key);
    await assert.rejects(authenticateNativeFdaWithPkce(unapproved,adapter),/not approved/);
    assert.equal(stats().network,0);assert.equal(stats().browser,0);assert.equal(stats().random,0);
  }
});
test("unregistered Android package, callback, redirect and Cognito origin fail before network",async()=>{
 for(const options of [
   {installedAndroidPackage:"com.attacker.wrong"},
   {redirectUri:"https://evil.example/callback"},
   {redirectUri:"novapharmintelligence://oauth/unknown"},
   {cognitoDomain:"https://evil.example/"},
   {cognitoDomain:"http://novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com/"},
   {clientId:"bad-id"}
 ]){
   const {adapter,stats}=platform();
   await assert.rejects(authenticateNativeFdaWithPkce({...config,...options},adapter),/not approved/);
   assert.equal(stats().browser,0);assert.equal(stats().network,0);
 }
});
test("PKCE uses secure random S256 and stores only expiring access token via injected keystore",async()=>{
 const {adapter,stats}=platform();
 await authenticateNativeFdaWithPkce(config,adapter);
 assert.equal(stats().random,3);
 assert.equal(stats().browser,1);
 assert.equal(stats().network,1);
 assert.deepEqual(stats().stored,{token:mockedToken,expiresAtMs:1795260000000+3570000});
 assert.equal(await verifiedNativeFdaAccessToken(config,adapter),mockedToken);
 await signOutNativeFda(adapter);
 assert.equal(stats().stored,null);
 await assert.rejects(verifiedNativeFdaAccessToken(config,adapter),/expired/);
});
test("callback state replay, duplicate states, cross-origin and error redirects are rejected",async()=>{
 for(const url of [
   "novapharmintelligence://oauth/callback?code=OK&state=attacker",
   "novapharmintelligence://oauth/callback?code=OK&state=attacker&state=attacker",
   "novapharmintelligence://attacker/callback?code=OK&state=attacker",
   "https://evil.example/callback?code=OK&state=attacker",
   "novapharmintelligence://oauth/callback?error=access_denied",
   "novapharmintelligence://oauth/callback#code=leaked"
 ]){
   const {adapter,stats}=platform({openSystemAuthSession:async()=>url});
   await assert.rejects(authenticateNativeFdaWithPkce(config,adapter));
   assert.equal(stats().network,0,url);
 }
});
test("missing OS crypto, browser, secure store and bad entropy are denied",async()=>{
 for(const alternative of [
   {secureRandomBytes:undefined},
   {sha256:undefined},
   {openSystemAuthSession:undefined},
   {secureStore:undefined},
   {secureRandomBytes:async()=>new Uint8Array(1)},
   {sha256:async()=>new Uint8Array(12)}
 ]){
   const {adapter,stats}=platform(alternative);
   await assert.rejects(authenticateNativeFdaWithPkce(config,adapter));
   assert.equal(stats().network,0);
 }
});
test("invalid token responses never save identity or bearer content",async()=>{
 const fixtures=[
  new Response("unavailable",{status:503,headers:{"content-type":"application/json"}}),
  new Response("<html>bad</html>",{status:200,headers:{"content-type":"text/html"}}),
  new Response(JSON.stringify({access_token:mockedToken,token_type:"basic",expires_in:3600}),{status:200,headers:{"content-type":"application/json"}}),
  new Response(JSON.stringify({access_token:mockedToken,token_type:"Bearer",expires_in:-5}),{status:200,headers:{"content-type":"application/json"}}),
  new Response(JSON.stringify({access_token:"",token_type:"Bearer",expires_in:3600}),{status:200,headers:{"content-type":"application/json"}})
 ];
 for(const value of fixtures){
   const {adapter,stats}=platform({fetchImpl:async()=>value});
   await assert.rejects(authenticateNativeFdaWithPkce(config,adapter));
   assert.equal(stats().stored,null);
 }
});
test("expiry and revoked or empty keystore entries deny subsequent requests",async()=>{
 const {adapter,stats}=platform({nowMs:()=>1795300000000});
 await assert.rejects(verifiedNativeFdaAccessToken(config,adapter),/expired/);
 assert.equal(stats().stored,null);
});
