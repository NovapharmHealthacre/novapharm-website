/**
 * Same offline, fail-closed research contract used by protected Nova ML web.
 * No camera, OCR, network, persistence, medical content or inference service.
 */
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { assessMultimodalEvidence, type MultimodalReviewResult } from "../../src/core/intelligence-multimodal-evidence-review.mjs";
import { assessMultimodalResearchBasis } from "../../src/core/intelligence-multimodal-research-basis.mjs";
import { mobileDarkPalette, mobileLightPalette } from "./appearance";
type MobilePalette = Readonly<Record<keyof typeof mobileLightPalette, string>>;

const fieldsInitial = {
  sourceReference: "", country: "", visionMedicineName: "", imageTextMedicineName: "",
  referenceProductCode: "", observedProductCode: "",
  referenceStrength: "", observedStrength: "", referenceDoseForm: "", observedDoseForm: "",
  referenceManufacturer: "", observedManufacturer: ""
};
type Key = keyof typeof fieldsInitial;
const labels: ReadonlyArray<readonly [Key, string]> = [
  ["sourceReference","Source reference"], ["country","Country / jurisdiction"],
  ["visionMedicineName","Visual-model medicine name candidate"],
  ["imageTextMedicineName","Image-text medicine name candidate"],
  ["referenceProductCode","Reference product code (optional)"],
  ["observedProductCode","Observed product code (optional)"],
  ["referenceStrength","Reference strength (optional)"],
  ["observedStrength","Observed strength (optional)"],
  ["referenceDoseForm","Reference dose form (optional)"],
  ["observedDoseForm","Observed dose form (optional)"],
  ["referenceManufacturer","Reference manufacturer (optional)"],
  ["observedManufacturer","Observed manufacturer (optional)"]
];
const researchPlan = assessMultimodalResearchBasis();

export function MultimodalReviewScreen({ darkMode = false }: { darkMode?: boolean }) {
  const styles = useMemo(() => createReviewStyles(darkMode ? mobileDarkPalette : mobileLightPalette), [darkMode]);
  const palette = darkMode ? mobileDarkPalette : mobileLightPalette;
  const [fields, setFields] = useState(fieldsInitial);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<MultimodalReviewResult | null>(null);
  const update = (key: Key, value: string) => { setFields(p=>({...p,[key]:value}));setResult(null); };
  const run = () => setResult(assessMultimodalEvidence({
    ...fields, userInitiated:true, nonSensitiveMaterialConfirmed:consent, purpose:"catalogue-research"
  }));
  const reset = () => {setFields(fieldsInitial);setConsent(false);setResult(null)};
  return <View style={styles.root}>
    <Text style={styles.heading} accessibilityRole="header">Multimodal review</Text>
    <Text style={styles.paragraph}>Research-only, offline conflict screening of manually supplied candidate strings. No image recognition, OCR, model inference, upload, medicine identity verification or sensitive material is allowed.</Text>
    <Text style={styles.paragraph}>Research basis: {researchPlan.distinctWorks} unique publications, {researchPlan.suppliedEntries} supplied references, {researchPlan.dimensions.length} research dimensions. Validated image models: {researchPlan.realModelEvaluationCount}. Research is not permission to process licensed or private data.</Text>
    {labels.map(([key,label]) => <View style={styles.field} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={fields[key]} onChangeText={(v)=>update(key,v)}
        accessibilityLabel={label} accessibilityHint="Local research sample only. Do not enter patient or confidential information." style={styles.input} selectionColor={palette.accent} maxLength={240}
        autoCorrect={false} autoCapitalize="none" />
    </View>)}
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} accessibilityLabel="Confirm non-sensitive approved material" accessibilityHint="Required before submitting research samples for an offline conflict check"
      style={styles.checkboxRow} onPress={()=>{setConsent(p=>!p);setResult(null)}}>
      <View style={[styles.checkbox,consent && styles.checked]} />
      <Text style={styles.checkboxText}>I confirm these are non-sensitive, non-patient research samples.</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityHint="Runs an offline string consistency check; does not verify medicine identity" style={styles.primary} onPress={run}>
      <Text style={styles.primaryText}>Review candidates</Text>
    </Pressable>
    <Pressable accessibilityRole="button" style={styles.secondary} onPress={reset}>
      <Text style={styles.secondaryText}>Clear locally</Text>
    </Pressable>
    {result && <View accessibilityRole="summary" accessibilityLiveRegion="polite" style={styles.output}>
      <Text style={styles.outputHeading}>{result.status.replace(/_/g," ")}</Text>
      <Text style={styles.paragraph}>{result.signals.length ? result.signals.join(", ").replace(/_/g," ") : "No observed string conflict. This is not a verified match."}</Text>
      <Text style={styles.paragraph}>{result.next}</Text>
      <Text style={styles.outputHeading}>Not verified · Not publishable · Human review required</Text>
    </View>}
  </View>;
}
function createReviewStyles(palette: MobilePalette) {
  return StyleSheet.create({
  root:{paddingTop:6,paddingBottom:26},heading:{fontSize:23,fontWeight:"700",color:palette.primary,marginBottom:8},
  paragraph:{fontSize:16,lineHeight:24,color:palette.secondary,marginBottom:10},
  field:{marginTop:12},label:{fontSize:16,fontWeight:"600",color:palette.primary,marginBottom:6},
  input:{borderWidth:1,borderColor:palette.border,backgroundColor:palette.canvas,borderRadius:10,minHeight:48,paddingHorizontal:12,color:palette.primary,fontSize:17},
  checkboxRow:{flexDirection:"row",gap:12,alignItems:"center",minHeight:54,marginTop:18},
  checkbox:{width:21,height:21,borderRadius:5,borderWidth:2,borderColor:palette.border},checked:{backgroundColor:palette.primary},
  checkboxText:{flex:1,fontSize:16,lineHeight:24,color:palette.secondary},
  primary:{backgroundColor:palette.primary,borderRadius:10,minHeight:48,alignItems:"center",justifyContent:"center",marginTop:12},
  primaryText:{color:palette.canvas,fontWeight:"700",fontSize:16},secondary:{borderWidth:1,borderColor:palette.border,borderRadius:10,minHeight:48,alignItems:"center",justifyContent:"center",marginTop:10},
  secondaryText:{color:palette.primary,fontWeight:"600",fontSize:16},output:{padding:16,backgroundColor:palette.grouped,borderRadius:12,marginTop:18},
  outputHeading:{color:palette.primary,fontWeight:"700",fontSize:16,marginBottom:8}
  });
}
