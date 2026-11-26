/**
 * ASTRA research planning contract. Offline only: never invokes a model,
 * queries evidence, grants authority, approves a decision or accesses a tenant.
 * Input is untrusted metadata; evidence references are claims, not verified facts.
 */
const kinds = Object.freeze(["pharma-research","technical-architecture","debugging","security-review","decision-review"]);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const invalid = () => Object.assign(new Error("Invalid ASTRA research planning input"), {code:"astra_invalid_input",statusCode:400});
function exact(value, keys) {
  if (!value || typeof value !== "object" || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.length !== keys.length || actual.some(k => typeof k !== "string" || !keys.includes(k)) || keys.some(k => !Object.hasOwn(descriptors,k) || !Object.hasOwn(descriptors[k],"value"))) throw invalid();
  return Object.fromEntries(keys.map(k=>[k,descriptors[k].value]));
}
function identifier(value) {
  if (typeof value !== "string" || !ID.test(value)) throw invalid();
  return value;
}
function list(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value)!==Array.prototype || value.length>32) throw invalid();
  const entries = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(entries).length !== value.length+1) throw invalid();
  return Array.from({length:value.length},(_,i)=>{
    const d=entries[String(i)]; if(!d || !Object.hasOwn(d,"value")) throw invalid(); return d.value;
  });
}
const freeze = value => {
  if(value && typeof value==="object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const steps = Object.freeze({
  "pharma-research":["resolve-scope","request-source-rights-review","reconcile-identities-and-periods","evaluate-evidence-and-limitations","request-scientific-review"],
  "technical-architecture":["resolve-scope","map-current-authority","compare-alternatives","review-security-and-rollback","request-engineering-review"],
  debugging:["resolve-scope","request-reproduction-receipt","isolate-failure","verify-regression-tests","request-engineering-review"],
  "security-review":["resolve-scope","request-threat-model","identify-control-gaps","request-isolated-negative-tests","request-security-review"],
  "decision-review":["resolve-scope","request-evidence-review","compare-alternatives","record-uncertainty","request-pandora-human-review"]
});
export const ASTRA_RESEARCH_KINDS=kinds;
export function planAstraResearch(input) {
  const {caseId,kind,evidenceReferences}=exact(input,["caseId","kind","evidenceReferences"]);
  identifier(caseId);
  if(!kinds.includes(kind)) throw invalid();
  const seen=new Set();
  const refs=list(evidenceReferences).map(entry=>{
    const {id,sha256}=exact(entry,["id","sha256"]);
    identifier(id);
    if(typeof sha256!=="string" || !DIGEST.test(sha256) || seen.has(id)) throw invalid();
    seen.add(id);
    return {id,sha256,verification:"unverified-caller-reference"};
  });
  return freeze({
    contract:"novapharm.intelligence.astra-research-plan.v1",caseId,kind,
    researchOnly:true,networkEnabled:false,inferenceExecuted:false,
    sourceRightsVerified:false,evidenceVerified:false,productionApproved:false,
    customerVisible:false,decisionAuthority:false,humanReviewRequired:true,
    evidenceReferences:refs,steps:steps[kind].map((id,index)=>({id,sequence:index+1,status:"not-executed"}))
  });
}
