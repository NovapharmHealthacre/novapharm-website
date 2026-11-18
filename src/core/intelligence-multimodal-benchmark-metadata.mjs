/**
 * Experimental multimodal benchmark scoring over strictly non-sensitive categorical
 * labels and synthetic or independently prepared case IDs. No patient/media/text
 * content, model weights, source rights grants, inference or persistence.
 *
 * Caller-provided labels are NOT independently verified ground truth. Even
 * excellent reported metrics do NOT authorize a medicine identity decision.
 */
export function assessMultimodalBenchmark(input) {
  const fail = () => { const e = new Error("Multimodal benchmark metadata rejected"); e.code = "novapharm_multimodal_benchmark_rejected"; throw e; };
  const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
  const shape = (v, keys) => plain(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v,k));
  const scenarios = new Set(["clean", "typographic-overlay", "adversarial-patch", "blur", "low-light", "translation", "lookalike-pack", "occlusion", "distribution-shift"]);
  const truthLabels = new Set(["match","non_match"]), predictedLabels = new Set(["match","non_match","abstain"]);
  if (!shape(input, ["cases","predictions"]) || !Array.isArray(input.cases) ||
      input.cases.length === 0 || input.cases.length > 10000 ||
      !Array.isArray(input.predictions) || input.predictions.length !== input.cases.length) fail();
  const casesById = new Map(), guessesById = new Map();
  for (const item of input.cases) {
    if (!shape(item,["caseId","truth","country","scenario"]) ||
        typeof item.caseId !== "string" || !/^case_[a-z0-9_-]{3,50}$/u.test(item.caseId) ||
        !truthLabels.has(item.truth) || typeof item.country !== "string" ||
        !/^[A-Z]{2}$/u.test(item.country) || !scenarios.has(item.scenario) ||
        casesById.has(item.caseId)) fail();
    casesById.set(item.caseId,item);
  }
  for (const item of input.predictions) {
    if (!shape(item,["caseId","predicted"]) || typeof item.caseId !== "string" ||
        !casesById.has(item.caseId) || !predictedLabels.has(item.predicted) ||
        guessesById.has(item.caseId)) fail();
    guessesById.set(item.caseId,item.predicted);
  }
  if (guessesById.size !== casesById.size) fail();
  const blank = () => ({trueMatch:0,trueNonMatch:0,falseMatch:0,falseNonMatch:0,abstainOnMatch:0,abstainOnNonMatch:0});
  const overall=blank(), byScenario=new Map(), byCountry=new Map();
  const add = (c,k)=>{c[k]++;};
  for(const item of casesById.values()) {
    const guess=guessesById.get(item.caseId);
    const k=guess==="abstain"?(item.truth==="match"?"abstainOnMatch":"abstainOnNonMatch") :
      item.truth==="match"?(guess==="match"?"trueMatch":"falseNonMatch") :
      guess==="match"?"falseMatch":"trueNonMatch";
    add(overall,k);
    if(!byScenario.has(item.scenario)) byScenario.set(item.scenario,blank());
    if(!byCountry.has(item.country)) byCountry.set(item.country,blank());
    add(byScenario.get(item.scenario),k);
    add(byCountry.get(item.country),k);
  }
  const metrics=(c)=>{
    const size=Object.values(c).reduce((a,b)=>a+b,0);
    const knownNonMatch=c.trueNonMatch+c.falseMatch+c.abstainOnNonMatch;
    const assertedMatch=c.trueMatch+c.falseMatch;
    const abstained=c.abstainOnMatch+c.abstainOnNonMatch;
    return Object.freeze({
      sampleSize:size,
      counts:Object.freeze({...c}),
      falseMatchPerNonMatchingCase:knownNonMatch?c.falseMatch/knownNonMatch:null,
      falseMatchAmongClaimedMatches:assertedMatch?c.falseMatch/assertedMatch:null,
      correctDecisionPerAllCases:(c.trueMatch+c.trueNonMatch)/size,
      abstentionRate:abstained/size,
      decisionCoverage:1-abstained/size
    });
  };
  const dimensions=(map)=>Object.freeze([...map].sort(([a],[b])=>a.localeCompare(b)).map(([key,c])=>Object.freeze({key,...metrics(c)})));
  // Silence is not evidence: an attack type missing from caller-supplied data
  // MUST be represented explicitly rather than disappearing from the report.
  const unmeasuredScenarios = Object.freeze([...scenarios].filter(s => !byScenario.has(s)).sort());
  return Object.freeze({
    contract:"novapharm.intelligence.multimodal-benchmark-metadata.v1",
    context:"Unverified caller-supplied aggregate experimental metadata; NOT model validation",
    total:metrics(overall),
    byScenario:dimensions(byScenario),
    byCountry:dimensions(byCountry),
    plannedScenarioCount:scenarios.size,
    unmeasuredScenarios,
    allPlannedScenariosRepresented:unmeasuredScenarios.length===0,
    modelExecuted:false, independentlyVerified:false, licensedSourceRightsVerified:false,
    tenantAuthorised:false, productionAccepted:false, canPublish:false,
    clinicalUseAllowed:false, decisionReady:false
  });
}
