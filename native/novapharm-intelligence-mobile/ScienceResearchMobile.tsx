/**
 * One shared offline scientific research catalogue for iOS/Android.
 * No model, upstream API, credentials, patient records or protected data.
 */
import React, { useState } from "react";
import { AccessibilityInfo, Linking, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { intelligenceWorkspaceCatalogue } from "../../apps/portal/data/intelligence-workspaces";
import { assessQuantumResourcePlan } from "../../src/core/intelligence-quantum-resource-estimate.mjs";
import quantumProgram from "../../docs/intelligence/quantum-research-program-v1.json";
import scienceMethods from "../../docs/intelligence/openai-science-methods-20261118.json";
import catalog from "../../docs/intelligence/science-research-capabilities-20261118.json";
import { mobileDarkPalette, mobileLightPalette } from "./appearance";

type MobilePalette = Readonly<Record<keyof typeof mobileLightPalette, string>>;

export function ScienceResearchMobile({ onOpenWorkspace }: { onOpenWorkspace: (workspaceSlug: string) => void }) {
  const styles = useColorScheme() === "dark" ? darkStyles : lightStyles;
  const [selectedQubits, setSelectedQubits] = React.useState(20);
  const resourceReview = assessQuantumResourcePlan({
    schemaVersion: "npi.quantum-simulator-preflight.v1",
    backend: "classical-state-vector-only",
    qubits: selectedQubits,
    shots: 512,
    circuitGates: 500,
    memoryBudgetMiB: 64,
    hardwareExecutionRequested: false,
    paidComputeRequested: false,
    protectedDataRequested: false,
    productionApproved: false
  });
  const [sourceOpenFeedback, setSourceOpenFeedback] = useState<{ id: string; message: string } | null>(null);

  async function openResearchReference(id: string, sourceUrl: string) {
    setSourceOpenFeedback(null);
    // Never pass data-driven deep links or non-OpenAI origins to the OS browser.
    const approvedReference = /^https:\/\/openai\.com(?:\/|$)/.test(sourceUrl);
    if (!approvedReference) {
      const message = "The research reference is not an allowed HTTPS source.";
      setSourceOpenFeedback({ id, message });
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    try {
      await Linking.openURL(sourceUrl);
    } catch {
      const message = "The external research link could not be opened. Please try again in your browser.";
      setSourceOpenFeedback({ id, message });
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  return <View accessibilityLabel="Scientific research, offline planning preview" style={styles.container}>
    <Text style={styles.breadcrumb}>NOVAPHARM INTELLIGENCE / SCIENCE</Text>
    <Text style={styles.title} accessibilityRole="header">Science, grounded in evidence.</Text>
    <Text style={styles.lead}>Research across literature, data, modelling, connected tools and experiment planning, with accountable scientific review.</Text>
    <View style={styles.status}>
      <Text style={styles.statusTitle}>Design preview only</Text>
      <Text style={styles.description}>No model connected. No new scientific data ingested. No experiments, medical decisions or AI responses are enabled.</Text>
    </View>
    <Text style={styles.sectionTitle} accessibilityRole="header">Quantum and computational science</Text>
    <Text style={styles.description}>Offline source catalogue only. Cirq, OpenFermion, Qualtran and qsim are research references; no packages, model, processor, cloud jobs or private data are connected to this app.</Text>
    {quantumProgram.modules.map((module) =>
      <View style={styles.card} key={module.id}>
        <Text style={styles.methodTag}>{module.status.replaceAll("-", " ").toUpperCase()}</Text>
        <Text style={styles.cardTitle} accessibilityRole="header">{module.title}</Text>
        <Text style={styles.description}>{module.description}</Text>
      </View>
    )}
    <View style={styles.card} accessibilityLabel="Classical state vector capacity preflight; no quantum execution">
      <Text style={styles.cardTitle} accessibilityRole="header">State-vector RAM preflight</Text>
      <Text style={styles.description}>Illustrative complex128 vector only; 64 MiB declared limit. This tool does not execute models, reserve memory, contact servers or approve research.</Text>
      {([10, 20, 25, 30] as const).map((count) =>
        <Pressable key={count} accessibilityRole="button" accessibilityLabel={count + " qubits, preview theoretical memory only"} accessibilityState={{ selected: count === selectedQubits }} style={styles.relatedButton} onPress={() => setSelectedQubits(count)}>
          <Text style={styles.relatedText}>{count} qubits{count === selectedQubits ? " · selected" : ""}</Text>
        </Pressable>
      )}
      <Text style={styles.state} accessibilityLiveRegion="polite">{selectedQubits} qubits · {resourceReview.stateVectorMemoryMiB.toLocaleString("en-GB")} MiB theoretical storage · {resourceReview.conservativeResearchCandidate ? "Review-only candidate" : "Exceeds conservative advisory"}</Text>
      <Text style={styles.description}>This is not a RAM availability, runtime, price, fault tolerance or production approval. No compute job is started.</Text>
    </View>
    <Text style={styles.smallHeading} accessibilityRole="header">Verification DNA</Text>
    {quantumProgram.principles.map((item) =>
      <View style={styles.reviewStage} key={item.title}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.description}>{item.detail}</Text>
      </View>
    )}
    <Text style={styles.footer}>No H₂ or drug computation has been validated. Simulations are not physical quantum measurements. Source checks, clinical safety, licences, human review and deployment remain separately gated.</Text>
    <Pressable accessibilityRole="link" accessibilityLabel="Read Google Quantum AI software documentation in external browser" style={styles.sourceLink} onPress={() => { void Linking.openURL("https://quantumai.google/software"); }}>
      <Text style={styles.sourceLinkLabel}>Google Quantum AI — official software documentation</Text>
    </Pressable>
    <Text style={styles.sectionTitle} accessibilityRole="header">Six research workflows</Text>
    {catalog.workflows.map((workflow, index) =>
      <View style={styles.card} key={workflow.id}>
        <Text style={styles.index}>{"0" + (index + 1)}</Text>
        <Text style={styles.cardTitle} accessibilityRole="header">{workflow.title}</Text>
        <Text style={styles.description}>{workflow.description}</Text>
        <Text style={styles.state}>Planning only · Human review required</Text>
        <Text style={styles.smallHeading}>Before activation</Text>
        {workflow.requirements.map((requirement) => <Text key={requirement} style={styles.requirement}>– {requirement}</Text>)}
        <Text style={styles.smallHeading}>Related Intelligence workspaces</Text>
        {workflow.linkedWorkspaces.map((slug) => {
          const workspace = intelligenceWorkspaceCatalogue.find((item) => item.slug === slug);
          return workspace ? <Pressable key={slug} style={styles.relatedButton} accessibilityRole="button"
            accessibilityLabel={`Review ${workspace.title} prerequisites, not enabled on mobile`}
            onPress={() => onOpenWorkspace(slug)}>
            <Text style={styles.relatedText}>{workspace.title} · {workspace.state === "gated" ? "Gated" : "Read-only foundation"}</Text>
          </Pressable> : null;
        })}
      </View>
    )}
    <Text style={styles.sectionTitle} accessibilityRole="header">Research methods and sources</Text>
    <Text style={styles.description}>{scienceMethods.scientificMethodologyCount} research methods and {scienceMethods.discoveryIndexCount} discovery indexes reviewed on {scienceMethods.reviewedAt}. Reference only; no independent NovaPharm replication.</Text>
    {scienceMethods.methods.map((entry) =>
      <View style={styles.card} key={entry.id}>
        <Text style={styles.methodTag}>{entry.sourceType === "reference_index" ? "DISCOVERY INDEX" : "RESEARCH EXAMPLE"} · {entry.publishedAt ?? "Updated website"}</Text>
        <Text style={styles.cardTitle} accessibilityRole="header">{entry.title}</Text>
        <Text style={styles.description}>{entry.reportedFinding}</Text>
        <Text style={styles.smallHeading}>Transferable method</Text>
        <Text style={styles.description}>{entry.transferablePattern}</Text>
        <Text style={styles.smallHeading}>Limits</Text>
        <Text style={styles.description}>{entry.limitations}</Text>
        <Text style={styles.smallHeading}>Independent research verification</Text>
        <Text style={styles.description}>{entry.validationTrack.replaceAll("_", " ")} track · Publisher report not independently verified · Retractions/corrections: {entry.retractionCorrectionStatus.replaceAll("_", " ")}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel={`Read original OpenAI source: ${entry.title}`}
          accessibilityHint="Opens a public source in your device browser. No research data is sent."
          style={styles.sourceLink} onPress={() => { void openResearchReference(entry.id, entry.sourceUrl); }}>
          <Text style={styles.sourceLinkLabel}>Read original source</Text>
        </Pressable>
        {sourceOpenFeedback?.id === entry.id && (
          <Text style={styles.sourceOpenError} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {sourceOpenFeedback.message}
          </Text>
        )}
        <Text style={styles.sourceDisclaimer}>Opens external browser on request · No Science model or dataset connected</Text>
      </View>
    )}
    <Text style={styles.sectionTitle} accessibilityRole="header">Eight evidence checks before release</Text>
    <Text style={styles.description}>All eight stages require independent verification. None is certified by this offline reference catalogue.</Text>
    {scienceMethods.claimIntegrityPolicy.requiredStages.map((stage, index) =>
      <View key={stage} style={styles.reviewStage}>
        <Text style={styles.methodTag}>{String(index + 1).padStart(2, "0")}</Text>
        <Text style={styles.cardTitle}>{stage.replaceAll("_", " ")}</Text>
        <Text style={styles.description}>Not independently verified</Text>
      </View>)}
    <Text style={styles.footer}>OpenAI Science is a public research reference, not an API. GPT-Rosalind API use is limited to separately approved internal research and cannot be offered to customers. Source licences and release approvals remain separate.</Text>
  </View>;
}

function createStyles(palette: MobilePalette) {
  const color = { ink: palette.primary, secondary: palette.secondary, border: palette.border, grouped: palette.grouped, accent: palette.accent };
  return StyleSheet.create({
  container: { paddingTop: 22, paddingBottom: 30 },
  breadcrumb: { fontSize: 13, fontWeight: "700", letterSpacing: 1.1, color: color.accent },
  title: { fontSize: 29, lineHeight: 35, letterSpacing: -0.7, fontWeight: "700", color: color.ink, marginTop: 12 },
  lead: { color: color.secondary, fontSize: 17, lineHeight: 26, marginTop: 12 },
  status: { marginTop: 20, marginBottom: 28, backgroundColor: color.grouped, borderRadius: 12, padding: 16 },
  statusTitle: { fontSize: 16, fontWeight: "700", color: color.ink, lineHeight: 20 },
  description: { fontSize: 16, color: color.secondary, lineHeight: 24, marginTop: 6 },
  sectionTitle: { fontSize: 23, fontWeight: "700", lineHeight: 29, color: color.ink, marginBottom: 13 },
  card: { padding: 18, borderWidth: 1, borderColor: color.border, borderRadius: 13, marginBottom: 11 },
  index: { color: color.accent, fontSize: 13, fontWeight: "700", marginBottom: 12 },
  cardTitle: { color: color.ink, fontWeight: "700", fontSize: 17, lineHeight: 23 },
  state: { color: color.secondary, backgroundColor: color.grouped, padding: 10, fontSize: 15, lineHeight: 22, marginTop: 14, borderRadius: 7 },
  smallHeading: { marginTop: 16, marginBottom: 6, fontSize: 15, fontWeight: "700", color: color.ink },
  requirement: { fontSize: 16, lineHeight: 24, color: color.secondary, marginTop: 4 },
  relatedButton: { minHeight: 48, justifyContent: "center", borderWidth: 1, borderColor: color.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, marginTop: 7 },
  relatedText: { fontSize: 16, color: color.ink, lineHeight: 24, fontWeight: "600" },
  reviewStage: { padding: 14, borderWidth: 1, borderColor: color.border, borderRadius: 11, marginTop: 9 },
  methodTag: { color: color.accent, marginBottom: 10, fontSize: 13, fontWeight: "700", lineHeight: 20 },
  sourceLink: { minHeight: 48, marginTop: 14, alignSelf: "flex-start", justifyContent: "center" },
  sourceLinkLabel: { fontSize: 16, fontWeight: "700", textDecorationLine: "underline", color: color.ink },
  sourceOpenError: { fontSize: 14, lineHeight: 21, marginTop: 8, color: color.ink },
  sourceDisclaimer: { fontSize: 14, lineHeight: 21, marginTop: 4, color: color.secondary },
  footer: { fontSize: 15, lineHeight: 23, color: color.secondary, marginTop: 18 }
});
}
const lightStyles = createStyles(mobileLightPalette);
const darkStyles = createStyles(mobileDarkPalette);
