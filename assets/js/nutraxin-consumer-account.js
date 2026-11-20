/* Nutraxin Products-only consumer sign-in, OAuth2 code + PKCE.
 * No credentials embedded in pages, no localStorage or persistent refresh tokens.
 * Front-end identity is NOT authority for order/wholesale access.
 */
const CONFIG_URL="/assets/data/nutraxin-consumer-auth.json";
const SESSION_KEY="np.nutraxin.consumer.access.v1";
const PKCE_KEY="np.nutraxin.consumer.pkce.v1";
const ACCOUNT_PATH="/products/nutraxin/account/";
const ACCOUNT_URL="https://novapharmhealthcare.com"+ACCOUNT_PATH;
const text=(selector,value)=>{const n=document.querySelector(selector);if(n)n.textContent=String(value);};
const status=(message)=>text("[data-nx-account-status]",message);
function randomUrlSafe(bytes=32){
 const data=new Uint8Array(bytes);crypto.getRandomValues(data);
 return Array.from(data,b=>b.toString(16).padStart(2,"0")).join("");
}
function base64url(bytes){
 let chars="";for(const b of bytes)chars+=String.fromCharCode(b);
 return btoa(chars).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function sha256(data){
 return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(data))));
}
function loadSession(){
 try{
  const v=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
  if(v && typeof v.accessToken==="string" && Number.isFinite(v.expiresAt) && v.expiresAt>Date.now()+15000)return v;
 }catch{}
 sessionStorage.removeItem(SESSION_KEY);return null;
}
function clearSession(){
 sessionStorage.removeItem(SESSION_KEY);
 sessionStorage.removeItem(PKCE_KEY);
}
function saveSession(payload){
 if(!payload || typeof payload.access_token!=="string" || !Number.isSafeInteger(payload.expires_in) || payload.expires_in<30)return false;
 // The access token expires rapidly and is scoped to this browser tab.
 // Refresh token is intentionally never persisted in browser storage.
 sessionStorage.setItem(SESSION_KEY,JSON.stringify({
  accessToken:payload.access_token,
  expiresAt:Date.now()+Math.min(payload.expires_in,3600)*1000
 }));
 return true;
}
function safeConfiguration(c){
 return c && c.enabled===true && typeof c.client_id==="string" && /^[a-z0-9]{15,50}$/.test(c.client_id) &&
 typeof c.pool_id==="string" && /^eu-north-1_[A-Za-z0-9]+$/.test(c.pool_id) &&
 c.account_url===ACCOUNT_URL && c.api_origin==="https://7cs8kxkj5d.execute-api.eu-north-1.amazonaws.com" &&
 c.cognito_domain==="novapharm-nutraxin-production-250675045172.auth.eu-north-1.amazoncognito.com";
}
async function beginLogin(config,mode){
 const state=randomUrlSafe();
 const verifier=randomUrlSafe(48);
 sessionStorage.setItem(PKCE_KEY,JSON.stringify({state,verifier,startedAt:Date.now()}));
 const path=mode==="signup"?"/signup":mode==="recover"?"/forgotPassword":"/oauth2/authorize";
 const url=new URL(path,"https://"+config.cognito_domain);
 url.searchParams.set("response_type","code");
 url.searchParams.set("client_id",config.client_id);
 url.searchParams.set("redirect_uri",ACCOUNT_URL);
 url.searchParams.set("scope","openid email profile aws.cognito.signin.user.admin");
 url.searchParams.set("state",state);
 url.searchParams.set("code_challenge",await sha256(verifier));
 url.searchParams.set("code_challenge_method","S256");
 window.location.assign(url.href);
}
async function completeCallback(config,query){
 const code=query.get("code"),state=query.get("state");
 let attempt;
 try{attempt=JSON.parse(sessionStorage.getItem(PKCE_KEY)||"null");}catch{attempt=null}
 sessionStorage.removeItem(PKCE_KEY);
 // Remove one-time OAuth values from the browser history before the exchange.
 window.history.replaceState(null,"",ACCOUNT_PATH);
 if(!code || !/^[A-Za-z0-9._-]{12,2048}$/.test(code) ||
 !state || !attempt || state!==attempt.state ||
 !Number.isFinite(attempt.startedAt) || Date.now()-attempt.startedAt>600000 ||
 typeof attempt.verifier!=="string" || !/^[a-f0-9]{96}$/.test(attempt.verifier)){
  throw new Error("The sign-in session expired. Please try again.");
 }
 const data=new URLSearchParams({
  grant_type:"authorization_code",client_id:config.client_id,code,
  redirect_uri:ACCOUNT_URL,code_verifier:attempt.verifier
 });
 const r=await fetch("https://"+config.cognito_domain+"/oauth2/token",{
  method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
  body:data.toString(),credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer"
 });
 if(!r.ok)throw new Error("Your sign-in could not be completed. Please try again.");
 if(!saveSession(await r.json()))throw new Error("The identity provider returned an invalid session.");
}
async function accountRequest(config,route,accessToken){
 const url=new URL(route,config.api_origin);
 if(url.origin!==config.api_origin)throw new Error("Invalid account API");
 const r=await fetch(url.href,{method:"GET",credentials:"omit",cache:"no-store",headers:{authorization:"Bearer "+accessToken},redirect:"error",referrerPolicy:"no-referrer"});
 if(r.status===401||r.status===403){clearSession();throw new Error("Your session expired. Please sign in again.");}
 if(!r.ok)throw new Error("Account information is temporarily unavailable.");
 return r.json();
}
function showOrders(data){
 const container=document.querySelector("[data-nx-account-orders]");if(!container)return;
 container.replaceChildren();
 if(!Array.isArray(data?.orders)){container.textContent="Order history is not available.";return}
 if(!data.orders.length){container.textContent="No account-linked orders yet. Orders placed while signed in will appear here after verification.";return}
 for(const o of data.orders){
  if(typeof o.orderId!=="string" || !/^NUT-[0-9a-f-]{36}$/.test(o.orderId) || typeof o.status!=="string")continue;
  const item=document.createElement("li");item.className="nx-account-order";
  const name=document.createElement("strong");name.textContent="Order "+o.orderId;
  const state=document.createElement("span");state.textContent=o.status;
  item.append(name,state);container.append(item);
 }
}
async function showAuthenticated(config,v){
 // An unverified or expired token must never reveal the private account view.
 status("Retrieving your verified account…");
 const me=await accountRequest(config,"/account/me",v.accessToken);
 if(me?.email_verified!==true || me?.customer_type!=="personal"){
  clearSession();throw new Error("Email verification is required before account access.");
 }
 let orders=null;
 try{orders=await accountRequest(config,"/account/orders",v.accessToken);}
 catch{
  // An authorization failure clears the session; other outages only affect order history.
  if(!loadSession())throw new Error("Your session expired. Please sign in again.");
 }
 document.querySelector("[data-nx-account-public]").hidden=true;
 document.querySelector("[data-nx-account-private]").hidden=false;
 text("[data-nx-account-email]",me.email||"Verified customer");
 showOrders(orders);
 status("Signed in securely.");
}
async function init(){
 const signIn=document.querySelector("[data-nx-account-signin]");
 const signUp=document.querySelector("[data-nx-account-signup]");
 const recover=document.querySelector("[data-nx-account-recover]");
 const signOut=document.querySelector("[data-nx-account-signout]");
 if(!signIn||!signUp||!recover||!signOut)return;
 let config;
 try{const r=await fetch(CONFIG_URL,{cache:"no-store",credentials:"omit"});config=await r.json();}
 catch{config=null}
 if(!safeConfiguration(config)){
  status("Customer sign-in is not activated yet. You can continue shopping and use guest checkout.");
  signIn.disabled=true;signUp.disabled=true;recover.disabled=true;return;
 }
 signIn.disabled=false;signUp.disabled=false;recover.disabled=false;
 signIn.onclick=()=>{void beginLogin(config,"signin").catch(()=>status("Unable to start sign-in."));};
 signUp.onclick=()=>{void beginLogin(config,"signup").catch(()=>status("Unable to start registration."));};
 recover.onclick=()=>{void beginLogin(config,"recover").catch(()=>status("Unable to start password recovery."));};
 signOut.onclick=()=>{
  clearSession();
  const url=new URL("/logout","https://"+config.cognito_domain);
  url.searchParams.set("client_id",config.client_id);
  url.searchParams.set("logout_uri",ACCOUNT_URL);
  window.location.assign(url.href);
 };
 const query=new URLSearchParams(window.location.search);
 if(query.has("error")){
  window.history.replaceState(null,"",ACCOUNT_PATH);
  status("Sign-in was cancelled or could not be completed.");
  return;
 }
 if(query.has("code")){
  try{await completeCallback(config,query);}
  catch(e){status(e.message);return;}
 }
 const session=loadSession();
 if(session)try{await showAuthenticated(config,session);}catch(e){
  document.querySelector("[data-nx-account-public]").hidden=false;
  document.querySelector("[data-nx-account-private]").hidden=true;
  status(e.message);
 }
 else status("Sign in or create your account with a verified email address. Guest checkout is still available.");
}
if(typeof document!=="undefined")void init();
