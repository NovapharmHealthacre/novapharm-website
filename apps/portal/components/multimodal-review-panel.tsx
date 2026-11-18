"use client";

import { type FormEvent, useState } from "react";
import { assessMultimodalEvidence, type MultimodalReviewResult } from "../../../src/core/intelligence-multimodal-evidence-review.mjs";
import { assessMultimodalResearchBasis } from "../../../src/core/intelligence-multimodal-research-basis.mjs";

const defaults = {
  sourceReference: "", country: "", visionMedicineName: "", imageTextMedicineName: "",
  referenceProductCode: "", observedProductCode: "",
  referenceStrength: "", observedStrength: "", referenceDoseForm: "", observedDoseForm: "",
  referenceManufacturer: "", observedManufacturer: ""
};

const researchPlan = assessMultimodalResearchBasis();

export function MultimodalReviewPanel() {
  const [fields, setFields] = useState(defaults);
  const [nonSensitive, setNonSensitive] = useState(false);
  const [result, setResult] = useState<MultimodalReviewResult | null>(null);
  const change = (key: keyof typeof defaults, value: string) => {
    setFields((previous) => ({...previous, [key]:value}));
    setResult(null);
  };
  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(assessMultimodalEvidence({
      ...fields, userInitiated:true, nonSensitiveMaterialConfirmed:nonSensitive,
      purpose:"catalogue-research"
    }));
  };
  return <section aria-labelledby="multimodal-review-heading" style={{border:"1px solid #dedee3",borderRadius:14,padding:"clamp(18px,3vw,28px)",background:"#fff"}}>
    <h2 id="multimodal-review-heading" style={{marginTop:0}}>Multimodal evidence conflict review</h2>
    <p>Offline candidate-only review inspired by OpenAI's multimodal-neuron research. Enter independently observed, non-sensitive sample labels. This does not inspect images, run CLIP, verify medicine identity, or grant source access.</p>
    <p role="note">Research register: {researchPlan.distinctWorks} unique publications from {researchPlan.suppliedEntries} supplied citations, across {researchPlan.dimensions.length} evaluation dimensions. Independently evaluated models: {researchPlan.realModelEvaluationCount}. None of these citations authorises a medical model or use of third-party training data.</p>
    <form onSubmit={review} style={{display:"grid",gap:12}}>
      {([
        ["sourceReference","Source reference"],["country","Jurisdiction / country code"],
        ["visionMedicineName","Visual-model medicine name candidate"],
        ["imageTextMedicineName","Text-in-image medicine name candidate"],
        ["referenceProductCode","Reference product code (optional)"],
        ["observedProductCode","Observed product code (optional)"],
        ["referenceStrength","Reference strength (optional)"],
        ["observedStrength","Observed strength (optional)"],
        ["referenceDoseForm","Reference dose form (optional)"],
        ["observedDoseForm","Observed dose form (optional)"],
        ["referenceManufacturer","Reference manufacturer (optional)"],
        ["observedManufacturer","Observed manufacturer (optional)"]
      ] as const).map(([key,label])=><label key={key} style={{display:"grid",gap:5,fontSize:14}}>
        <span style={{fontWeight:600}}>{label}</span>
        <input type="text" maxLength={240} value={fields[key]} onChange={(e)=>change(key,e.currentTarget.value)}
          style={{border:"1px solid #a5a5a9",borderRadius:8,minHeight:44,padding:"10px 12px",font:"inherit",color:"#1d1d1f",background:"#fff"}} />
      </label>)}
      <label style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:14,lineHeight:1.5}}>
        <input type="checkbox" checked={nonSensitive} onChange={(e)=>{setNonSensitive(e.currentTarget.checked);setResult(null)}}
          style={{width:20,height:20,flexShrink:0}} />
        <span>I confirm this is non-sensitive, non-patient material and I am requesting a local research-only comparison.</span>
      </label>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button type="submit" style={{border:0,background:"#1d1d1f",color:"#fff",borderRadius:9,padding:"12px 18px",minHeight:44,fontWeight:600,cursor:"pointer"}}>Review candidates</button>
        <button type="button" onClick={()=>{setFields(defaults);setNonSensitive(false);setResult(null)}} style={{border:"1px solid #aaa",background:"#fff",color:"#1d1d1f",borderRadius:9,padding:"12px 18px",minHeight:44,cursor:"pointer"}}>Clear locally</button>
      </div>
    </form>
    {result && <div role="status" aria-live="polite" style={{marginTop:18,padding:16,borderRadius:10,background:"#f5f5f7"}}>
      <strong>{result.status.replaceAll("_"," ")}</strong>
      <p style={{marginBottom:8}}>Signals: {result.signals.length ? result.signals.join(", ").replaceAll("_"," ") : "No contradiction in the supplied strings; this does not prove a match."}</p>
      <p style={{marginBottom:0}}>{result.next}</p>
      <p style={{fontWeight:600}}>Not verified · Not publishable · Human review required</p>
    </div>}
  </section>;
}
