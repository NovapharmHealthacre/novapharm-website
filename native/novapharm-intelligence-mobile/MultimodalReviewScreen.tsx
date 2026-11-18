/**
 * Same offline, fail-closed research contract used by protected Nova ML web.
 * No camera, OCR, network, persistence, medical content or inference service.
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { assessMultimodalEvidence, type MultimodalReviewResult } from "../../src/core/intelligence-multimodal-evidence-review.mjs";

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
export function MultimodalReviewScreen() {
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
    {labels.map(([key,label]) => <View style={styles.field} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={fields[key]} onChangeText={(v)=>update(key,v)}
        accessibilityLabel={label} style={styles.input} maxLength={240}
        autoCorrect={false} autoCapitalize="none" />
    </View>)}
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} accessibilityLabel="Confirm non-sensitive approved material"
      style={styles.checkboxRow} onPress={()=>{setConsent(p=>!p);setResult(null)}}>
      <View style={[styles.checkbox,consent && styles.checked]} />
      <Text style={styles.checkboxText}>I confirm these are non-sensitive, non-patient research samples.</Text>
    </Pressable>
    <Pressable accessibilityRole="button" style={styles.primary} onPress={run}>
      <Text style={styles.primaryText}>Review candidates</Text>
    </Pressable>
    <Pressable accessibilityRole="button" style={styles.secondary} onPress={reset}>
      <Text style={styles.secondaryText}>Clear locally</Text>
    </Pressable>
    {result && <View accessibilityRole="summary" style={styles.output}>
      <Text style={styles.outputHeading}>{result.status.replace(/_/g," ")}</Text>
      <Text style={styles.paragraph}>{result.signals.length ? result.signals.join(", ").replace(/_/g," ") : "No observed string conflict. This is not a verified match."}</Text>
      <Text style={styles.paragraph}>{result.next}</Text>
      <Text style={styles.outputHeading}>Not verified · Not publishable · Human review required</Text>
    </View>}
  </View>;
}
const styles=StyleSheet.create({
  root:{paddingTop:6,paddingBottom:26},heading:{fontSize:23,fontWeight:"700",color:"#1D1D1F",marginBottom:8},
  paragraph:{fontSize:13,lineHeight:21,color:"#424245",marginBottom:10},
  field:{marginTop:12},label:{fontSize:13,fontWeight:"600",color:"#1D1D1F",marginBottom:6},
  input:{borderWidth:1,borderColor:"#A5A5AA",borderRadius:10,minHeight:48,paddingHorizontal:12,color:"#1D1D1F",fontSize:14},
  checkboxRow:{flexDirection:"row",gap:12,alignItems:"center",minHeight:54,marginTop:18},
  checkbox:{width:21,height:21,borderRadius:5,borderWidth:2,borderColor:"#606068"},checked:{backgroundColor:"#1D1D1F"},
  checkboxText:{flex:1,fontSize:13,lineHeight:19,color:"#424245"},
  primary:{backgroundColor:"#1D1D1F",borderRadius:10,minHeight:48,alignItems:"center",justifyContent:"center",marginTop:12},
  primaryText:{color:"#fff",fontWeight:"700"},secondary:{borderWidth:1,borderColor:"#C7C7CC",borderRadius:10,minHeight:48,alignItems:"center",justifyContent:"center",marginTop:10},
  secondaryText:{color:"#1D1D1F",fontWeight:"600"},output:{padding:16,backgroundColor:"#F5F5F7",borderRadius:12,marginTop:18},
  outputHeading:{color:"#1D1D1F",fontWeight:"700",fontSize:14,marginBottom:8}
});
