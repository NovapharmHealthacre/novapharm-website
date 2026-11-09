import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const read=(path)=>readFileSync(path,"utf8");
const prod=JSON.parse(read("infra/aws/nutraxin-consumer-identity-production.json"));
const storefront=JSON.parse(read("infra/aws/nutraxin-products-checkout-api.json"));
const src=read("apps/nutraxin-products-checkout/index.py");
const cf=storefront.Resources.ShopLambda.Properties.Code.ZipFile;

test("consumer identities use a separate verified-email pool and product callback",()=>{
 const pool=prod.Resources.NutraxinConsumerPool.Properties;
 const client=prod.Resources.NutraxinConsumerWeb.Properties;
 assert.deepEqual(pool.AutoVerifiedAttributes,["email"]);
 assert.equal(pool.AdminCreateUserConfig.AllowAdminCreateUserOnly,false);
 assert.equal(pool.DeletionProtection,"ACTIVE");
 assert.equal(client.GenerateSecret,false);
 assert.equal(client.AllowedOAuthFlowsUserPoolClient,true);
 assert.deepEqual(client.AllowedOAuthFlows,["code"]);
 assert.deepEqual(client.CallbackURLs,["https://novapharmhealthcare.com/products/nutraxin/account/"]);
 assert.equal(client.CallbackURLs.some(url=>url.includes("/portal/")),false);
 assert.equal(client.PreventUserExistenceErrors,"ENABLED");
 assert.equal(client.EnableTokenRevocation,true);
 assert.equal(prod.Resources.NutraxinConsumerPool.DeletionPolicy,"Retain");
});
test("Products account enables only after a verified release, with OAuth code+PKCE",()=>{
 const config=JSON.parse(read("assets/data/nutraxin-consumer-auth.json"));
 const js=read("assets/js/nutraxin-consumer-account.js");
 const html=read("products/nutraxin/account/index.html");
 assert.equal(config.enabled,false);
 assert.equal(config.account_url,"https://novapharmhealthcare.com/products/nutraxin/account/");
 assert.match(js,/code_challenge_method","S256"/);
 assert.match(js,/grant_type:"authorization_code"/);
 assert.match(js,/state!==attempt\.state/);
 assert.match(js,/window\.history\.replaceState/);
 assert.match(js,/credentials:"omit"/);
 assert.match(js,/sessionStorage\.setItem\(SESSION_KEY/);
 assert.doesNotMatch(js,/localStorage\.setItem\([^\n]*[Tt]oken/);
 assert.match(js,/signIn\.disabled=false;signUp\.disabled=false/);
 assert.match(html,/data-nx-account-signup/);
 assert.match(html,/data-nx-account-orders/);
 assert.doesNotMatch(html,/sk_live_|rk_live_|whsec_|client_secret/);
 assert.doesNotMatch(html,/portal\.novapharmhealthcare\.com/);
});
test("account orders are server-owned and never rely on browser-selected identity",()=>{
 assert.equal(src,cf,"The checkout Lambda and CloudFormation inline worker must be byte-identical");
 for(const clause of [
 'COGNITO.get_user(AccessToken=token)',
 'claims.get("client_id")!=CONSUMER_CLIENT_ID',
 'claims.get("token_use")!="access"',
 'claims.get("iss")!=',
 'attrs.get("email_verified")!="true"',
 '"customerSub":{"S":subject}',
 '"CONSUMER#"+customer["subject"]',
 'summary.get("customerSub")!={"S":customer["subject"]}',
 'return direct_checkout(event,customer["subject"])'
 ]) assert.ok(src.includes(clause),"Missing account security contract: "+clause);
 assert.deepEqual(storefront.Resources.ShopApi.Properties.CorsConfiguration.AllowHeaders,["content-type","authorization"]);
 const policy=storefront.Resources.ShopRole.Properties.Policies[0].PolicyDocument.Statement;
 assert.ok(policy.some(p=>Array.isArray(p.Action)&&p.Action.includes("dynamodb:Query")));
 assert.ok(src.includes("PAYMENT_DDB.transact_write_items"),"Authenticated order index must be atomic");
 const bag=read("assets/js/nutraxin-retail-store.js");
 assert.match(bag,/const target=accountToken\?"\/account\/checkout":"\/checkout"/);
 assert.match(bag,/consumerAccess\(\)/);
 assert.match(bag,/sessionStorage\.removeItem\(ACCOUNT_SESSION_KEY\)/);
 assert.ok(!bag.includes("PORTAL_ORIGIN"));
});
test("authenticated idempotent retries reconcile DynamoDB transaction conflicts",()=>{
 const src=read("apps/nutraxin-products-checkout/index.py");
 const cf=JSON.parse(read("infra/aws/nutraxin-products-checkout-api.json")).Resources.ShopLambda.Properties.Code.ZipFile;
 assert.equal(src,cf);
 assert.match(src,/code not in \("ConditionalCheckFailedException", "TransactionCanceledException"\)/);
 assert.match(src,/if not prior:\s*return error\(503, "order_creation_unavailable"\)/);
 assert.match(src,/prior\.get\("customerSub"\) != item\["customerSub"\]/);
 assert.match(src,/prior\.get\("basketHash"\) != item\["basketHash"\]/);
});

test("private account panel is revealed only after server-verified identity and order authorization",()=>{
 const js=read("assets/js/nutraxin-consumer-account.js");
 const method=js.slice(js.indexOf("async function showAuthenticated"),js.indexOf("async function init"));
 assert.ok(method.includes('const me=await accountRequest(config,"/account/me",v.accessToken)'));
 assert.ok(method.includes('me?.email_verified!==true'));
 assert.ok(method.includes('orders=await accountRequest(config,"/account/orders",v.accessToken)'));
 assert.ok(method.indexOf('const me=await accountRequest') < method.indexOf('document.querySelector("[data-nx-account-private]").hidden=false'));
 assert.ok(method.indexOf('if(!loadSession())throw') < method.indexOf('document.querySelector("[data-nx-account-private]").hidden=false'));
 assert.match(js,/document\.querySelector\("\[data-nx-account-public\]"\)\.hidden=false;\s*document\.querySelector\("\[data-nx-account-private\]"\)\.hidden=true;/);
});

test("server Python remains parsable without importing boto3",()=>{
 const python=spawnSync("python3",["-c","import ast,sys;ast.parse(sys.stdin.read())"],{input:src,encoding:"utf8"});
 assert.equal(python.status,0,python.stderr||"Python syntax failure");
});
test("Bag markup remains exactly matched to generator, including account entry",()=>{
 const html=read("products/nutraxin/bag/index.html");
 const source=read("scripts/apply-corporate-product-discipline.mjs");
 const expected=html.match(/<main id="main" class="npd-main nx-shop-bag" data-nx-public-bag>[\s\S]*?<\/main>/)?.[0];
 const generator=source.split("function nutraxinBagMain() {")[1]?.split("function nutraxinOrderRequestMain()")[0];
 const actual=generator?.split("  return \`")[1]?.split("\`;")[0];
 assert.equal(actual,expected);
 assert.match(expected,/\/products\/nutraxin\/account\//);
});
