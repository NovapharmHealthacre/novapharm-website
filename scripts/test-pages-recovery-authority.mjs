import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {evaluateManualPagesReleaseReadiness as check} from "./check-pages-recovery-authority.mjs";

const repo = "NovapharmHealthacre/novapharm-website";
const sha = "a".repeat(40);
const owner = Object.freeze({
  contract: "novapharm.intelligence.owner-constraints.v1",
  productionSignoff: "granted",
  initialInfrastructureBudget: {monthlyCapGbp:0,newChargeableResourceProvisioning:false}
});
const branch = (name, protectedValue=true, revision=sha) =>
  ({name, protected:protectedValue, commit:{sha:revision}});
const approved = () => ({
  repository:repo,eventName:"workflow_dispatch",ref:"refs/heads/main",
  candidateSha:sha,checkedOutSha:sha,owner,
  main:branch("main"),pages:branch("gh-pages")
});

test("synthetic protected branches, exact main and explicitly granted owner signoff pass preflight only",()=>{
  const result=check(approved());
  assert.equal(result.allowed,true,JSON.stringify(result.issues));
  assert.equal(result.independentHigAcceptance,false);
  assert.equal(result.branchProtectionSignalIsNotAnAdminRulesetAudit,true);
});
test("current owner source state still blocks ALL public manual recoveries",()=>{
  const current=JSON.parse(readFileSync("config/intelligence/owner-production-constraints.json","utf8"));
  assert.equal(current.productionSignoff,"not_granted");
  const result=check({...approved(),owner:current});
  assert.equal(result.allowed,false);
  assert.ok(result.issues.some(x=>/Owner production signoff/.test(x)));
});
test("unprotected main or public publishing branch denies recovery",()=>{
  for(const name of ["main","gh-pages"]){
    const x=approved();
    x[name]=branch(name,false);
    assert.equal(check(x).allowed,false,name);
    assert.ok(check(x).issues.some(k=>k.includes(name+" branch")));
  }
});
test("wrong ref, repository or event are not manual NovaPharm release authority",()=>{
  for(const patch of [
    {repository:"other/website"},
    {eventName:"pull_request"},
    {eventName:"push"},
    {ref:"refs/heads/gh-pages"},
    {ref:"refs/pull/123/merge"}
  ]) assert.equal(check({...approved(),...patch}).allowed,false,JSON.stringify(patch));
});
test("stale main, unsigned/non-SHA source and mismatched checkout cannot ship",()=>{
  for(const patch of [
    {candidateSha:"b".repeat(40)},
    {checkedOutSha:"c".repeat(40)},
    {candidateSha:"not-valid"},
    {main:branch("main",true,"b".repeat(40))},
    {main:{name:"main",protected:true}},
    {pages:{name:"gh-pages",protected:true}}
  ]) assert.equal(check({...approved(),...patch}).allowed,false,JSON.stringify(patch));
});
test("missing or malformed API response must fail closed",()=>{
  for(const patch of [
    {main:null},{pages:null},{main:{}},{pages:{}},
    {main:{protected:"true",name:"main",commit:{sha}}},
    {pages:{protected:1,name:"gh-pages",commit:{sha}}},
    {owner:null}
  ]) assert.equal(check({...approved(),...patch}).allowed,false,JSON.stringify(patch));
});
test("zero-spend owner limits cannot be silently weakened",()=>{
  for(const budget of [
    {monthlyCapGbp:12,newChargeableResourceProvisioning:false},
    {monthlyCapGbp:0,newChargeableResourceProvisioning:true},
    {}
  ]) assert.equal(check({...approved(),
    owner:{...owner,initialInfrastructureBudget:budget}}).allowed,false);
});
