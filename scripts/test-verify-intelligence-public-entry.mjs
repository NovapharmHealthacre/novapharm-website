import assert from "node:assert/strict";
import test from "node:test";
import { verifyIntelligencePublicEntry } from "./verify-intelligence-public-entry.mjs";

const origin="https://intelligence.novapharmhealthcare.com";
const corporate="https://novapharmhealthcare.com";
const callback=origin+"/auth/callback";
const login="/auth/customer/start";
const cookie="__Host-npi_oidc_tx=opaque.signed; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Lax";
const redirect=new URL("https://novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com/oauth2/authorize");
for(const [key,val] of Object.entries({
 response_type:"code",redirect_uri:callback,client_id:"public-client",
 scope:"openid email profile",code_challenge_method:"S256",
 code_challenge:"a".repeat(43),state:"b".repeat(43),nonce:"c".repeat(43)
}))redirect.searchParams.set(key,val);

const approvedCardMarkup = '<h1>A more human intelligence for medicine.</h1>' +
  '<p>Sign in with your business email and password. Authenticator verification follows.</p>' +
  '<p>Registering a sign-in does not approve a business account, activate a subscription or grant access to private workspaces or medicine data.</p>' +
  '<a href="/auth/customer/start?mode=reset">Forgot your password?</a>' +
  '<a href="/auth/customer/register">Register a sign-in</a>';

function mock(overrides={}) {
 const calls=[];
 const replies=new Map([
  [origin+"/",()=>new Response(approvedCardMarkup,{status:200})],
  [corporate+"/technology/",()=>new Response('<a href="'+origin+'/">Sign in</a>Invitation-only',{status:200})],
  [origin+login,()=>new Response(null,{status:302,headers:{"location":redirect.toString(),"set-cookie":cookie}})],
  [callback,()=>new Response("Denied",{status:401,headers:{"cache-control":"no-store"}})],
  [origin+"/api/v1/intelligence/medicines/search/",()=>new Response("Forbidden",{status:403})],
  [origin+"/portal/executive-platform/medicines-intelligence/",()=>new Response("Forbidden",{status:403})],
  [origin+"/assets/brand/novapharm-healthcare-logo.svg",()=>new Response("<svg/>",{status:200})],
 ]);
 for(const [url,responder] of Object.entries(overrides))replies.set(url,responder);
 const fetchImpl=async(url,options)=>{
   calls.push({url,options});
   if(!replies.has(url))throw Error("Unexpected request");
   return replies.get(url)();
 };
 return {fetchImpl,calls};
}
test("the one public launch proof verifies PKCE while still reporting no customer launch",async()=>{
 const h=mock();
 const r=await verifyIntelligencePublicEntry({fetchImpl:h.fetchImpl});
 assert.equal(r.verified,true);
 assert.equal(r.customerTenantActivated,false);
 assert.equal(r.licensedMedicineDataAccepted,false);
 assert.equal(r.recurringBillingCertified,false);
 assert.equal(r.novaInferenceProductionCertified,false);
 assert.equal(r.anonymousMedicineApi,"HTTP_403");
 assert.equal(h.calls.length,7);
 assert.ok(h.calls.every(c=>c.options.redirect==="manual" && c.options.method==="GET"));
 assert.ok(h.calls.every(c=>!c.url.includes("amazoncognito.com")));
 const printed=JSON.stringify(r);
 assert.doesNotMatch(printed,/state=|nonce=|__Host-|code_challenge=/);
});
test("any anonymous private API success or redirect fails closed",async()=>{
 for(const [path,status] of [
  ["/api/v1/intelligence/medicines/search/",200],
  ["/api/v1/intelligence/medicines/search/",307],
  ["/portal/executive-platform/medicines-intelligence/",200],
 ]) {
  const url=origin+path;
  const h=mock({[url]:()=>new Response("should not see",{status})});
  await assert.rejects(()=>verifyIntelligencePublicEntry({fetchImpl:h.fetchImpl}),/not_iam_protected/u);
 }
});
test("obsolete registration claim fails the live Writing acceptance gate", async () => {
  const html = '<h1>Understand the medicine</h1><p>Create a business account</p>' +
    '<p>Subscription checkout and medicines access become available only after organisation approval.</p>' +
    '<a href="/auth/customer/start">Sign in</a>';
  const h = mock({ [origin + "/"]: () => new Response(html, { status: 200 }) });
  await assert.rejects(() => verifyIntelligencePublicEntry({ fetchImpl: h.fetchImpl }), /legacy_account_cta_published/u);
});
test("excessive PKCE cookie lifetime is never treated as a secure sign-in", async () => {
  const h = mock({
    [origin + login]: () => new Response(null, {
      status: 302,
      headers: { location: redirect.toString(), "set-cookie": cookie.replace("Max-Age=300", "Max-Age=1800") },
    }),
  });
  await assert.rejects(() => verifyIntelligencePublicEntry({ fetchImpl: h.fetchImpl }), /secure_identity_start_not_available/u);
});
test("missing PKCE, insecure transaction cookie and wrong Cognito redirect fail",async()=>{
 const bad=new URL(redirect);bad.searchParams.delete("code_challenge");
 for(const [location,setCookie] of [
  [bad.toString(),cookie],
  [redirect.toString(),cookie.replace("; Secure","")],
  ["https://evil.example/oauth2/authorize",cookie]
 ]) {
  const h=mock({[origin+login]:()=>new Response(null,{status:302,headers:{"location":location,"set-cookie":setCookie}})});
  await assert.rejects(()=>verifyIntelligencePublicEntry({fetchImpl:h.fetchImpl}));
 }
});
test("corporate link, invitation caveat and callback denial are required",async()=>{
 const bad=[
  {[corporate+"/technology/"]:()=>new Response("<a>Nothing</a>",{status:200})},
  {[origin+"/"]:()=>new Response("Understand the medicine",{status:200})},
  {[callback]:()=>new Response("Success",{status:200})},
 ];
 for(const overrides of bad){
  const h=mock(overrides);
  await assert.rejects(()=>verifyIntelligencePublicEntry({fetchImpl:h.fetchImpl}));
 }
});

test("previous human-entry branding cannot certify the current approved registration copy", async () => {
  const html = '<h1>A more human intelligence for medicine.</h1>' +
    '<p>Your business email, password and verification are handled by NovaPharm secure identity provider.</p>' +
    '<a href="/auth/customer/start">Sign in securely</a><a href="/auth/customer/register">Create a business account</a>';
  const h = mock({ [origin + "/"]: () => new Response(html, { status: 200 }) });
  await assert.rejects(() => verifyIntelligencePublicEntry({ fetchImpl: h.fetchImpl }), /legacy_account_cta_published/u);
});

test("approved Cognito password and TOTP card proves the revised public writing contract only", async () => {
  const h = mock({ [origin + "/"]: () => new Response(approvedCardMarkup, { status: 200 }) });
  const result = await verifyIntelligencePublicEntry({ fetchImpl: h.fetchImpl });
  assert.equal(result.verified, true);
  assert.equal(result.customerTenantActivated, false);
  assert.equal(result.scope, "public-entry-and-anonymous-denial-only");
});

test("new registration link without the mandatory approval boundary is rejected", async () => {
  const html = approvedCardMarkup.replace(
    "Registering a sign-in does not approve a business account, activate a subscription or grant access to private workspaces or medicine data.",
    ""
  );
  const h = mock({ [origin + "/"]: () => new Response(html, { status: 200 }) });
  await assert.rejects(() => verifyIntelligencePublicEntry({ fetchImpl: h.fetchImpl }), /approval_disclaimer_not_published/u);
});

test("obsolete registration CTA is rejected even when the new boundary copy is present", async () => {
  const html = approvedCardMarkup.replace('>Register a sign-in</a>', '>Create a business account</a>');
  const h = mock({ [origin + "/"]: () => new Response(html, { status: 200 }) });
  await assert.rejects(() => verifyIntelligencePublicEntry({ fetchImpl: h.fetchImpl }), /legacy_account_cta_published/u);
});

test("uncontrolled direct Cognito card without recovery cannot pass public entry", async () => {
  const html = approvedCardMarkup.replace('/auth/customer/start?mode=reset', '/auth/customer/unapproved-recovery');
  const h = mock({ [origin + "/"]: () => new Response(html, { status: 200 }) });
  await assert.rejects(() => verifyIntelligencePublicEntry({ fetchImpl: h.fetchImpl }), /login_copy_or_constraints_invalid/u);
});


