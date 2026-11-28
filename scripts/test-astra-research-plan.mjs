import test from "node:test";
import assert from "node:assert/strict";
import {planAstraResearch,ASTRA_RESEARCH_KINDS} from "../src/core/ai/astra-research-plan.mjs";
const ref={id:"source-1",sha256:"a".repeat(64)};
const input=(kind="pharma-research",evidenceReferences=[ref])=>({caseId:"case-1",kind,evidenceReferences});
test("all five research kinds return immutable non-executed plans",()=>{
  assert.equal(ASTRA_RESEARCH_KINDS.length,5);
  for(const kind of ASTRA_RESEARCH_KINDS){
    const p=planAstraResearch(input(kind));
    assert.equal(p.steps.length,5);
    assert.ok(p.steps.every(s=>s.status==="not-executed"));
    for(const k of ["networkEnabled","inferenceExecuted","sourceRightsVerified","evidenceVerified","productionApproved","customerVisible","decisionAuthority"]) assert.equal(p[k],false);
    assert.equal(p.humanReviewRequired,true);
    assert.equal(p.evidenceReferences[0].verification,"unverified-caller-reference");
    assert.ok(Object.isFrozen(p.steps[0]));
    assert.ok(Object.isFrozen(p.evidenceReferences[0]));
    assert.ok(Object.isFrozen(p));
  }
});
test("missing evidence remains explicitly unverified",()=>{
  const p=planAstraResearch(input("decision-review",[]));
  assert.equal(p.evidenceReferences.length,0);
  assert.equal(p.evidenceVerified,false);
  assert.equal(p.steps.at(-1).id,"request-pandora-human-review");
});
test("reject forged authority, duplicate references and invalid identifiers or hashes",()=>{
  for(const bad of [{...input(),productionApproved:true},input("unknown"),input("debugging",[ref,ref]),input("debugging",[{...ref,sha256:"bad"}]),input("debugging",[{...ref,verified:true}]),{...input(),caseId:"a b"},input("debugging",Array(33).fill(ref)),input("debugging",Array(2))]) assert.throws(()=>planAstraResearch(bad),{code:"astra_invalid_input"});
});
test("reject inherited properties, symbols and accessors without invoking getters",()=>{
  let invoked=false;
  const hostile={...input(),get caseId(){invoked=true;return "bad";}};
  const array=[ref];Object.defineProperty(array,"0",{get(){invoked=true;return ref;}});
  const inherited=Object.create(input());
  for(const bad of [hostile,input("debugging",array),inherited,{...input(),[Symbol("extra")]:1}]) assert.throws(()=>planAstraResearch(bad),{code:"astra_invalid_input"});
  assert.equal(invoked,false);
});
test("deterministic, input not mutated",()=>{
  const a=input();assert.deepEqual(planAstraResearch(a),planAstraResearch(a));assert.equal(Object.isFrozen(a),false);
});
