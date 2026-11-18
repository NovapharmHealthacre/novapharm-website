/**
 * One shared offline scientific research catalogue for iOS/Android.
 * No model, upstream API, credentials, patient records or protected data.
 */
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { intelligenceWorkspaceCatalogue } from "../../apps/portal/data/intelligence-workspaces";
import scienceMethods from "../../docs/intelligence/openai-science-methods-20261118.json";
import catalog from "../../docs/intelligence/science-research-capabilities-20261118.json";

const color = { ink: "#1D1D1F", secondary: "#424245", border: "#D2D2D7", grouped: "#F5F5F7", accent: "#E3120B" };

export function ScienceResearchMobile({ onOpenWorkspace }: { onOpenWorkspace: (workspaceSlug: string) => void }) {
  return <View accessibilityLabel="Scientific research, offline planning preview" style={styles.container}>
    <Text style={styles.breadcrumb}>NOVAPHARM INTELLIGENCE / SCIENCE</Text>
    <Text style={styles.title} accessibilityRole="header">Science, grounded in evidence.</Text>
    <Text style={styles.lead}>Research across literature, data, modelling, connected tools and experiment planning, with accountable scientific review.</Text>
    <View style={styles.status}>
      <Text style={styles.statusTitle}>Design preview only</Text>
      <Text style={styles.description}>No model connected. No new scientific data ingested. No experiments, medical decisions or AI responses are enabled.</Text>
    </View>
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
          style={styles.sourceLink} onPress={() => { void Linking.openURL(entry.sourceUrl); }}>
          <Text style={styles.sourceLinkLabel}>Read original source</Text>
        </Pressable>
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

const styles = StyleSheet.create({
  container: { paddingTop: 22, paddingBottom: 30 },
  breadcrumb: { fontSize: 11, fontWeight: "700", letterSpacing: 1.1, color: color.accent },
  title: { fontSize: 29, lineHeight: 35, letterSpacing: -0.7, fontWeight: "700", color: color.ink, marginTop: 12 },
  lead: { color: color.secondary, fontSize: 14, lineHeight: 22, marginTop: 12 },
  status: { marginTop: 20, marginBottom: 28, backgroundColor: color.grouped, borderRadius: 12, padding: 16 },
  statusTitle: { fontSize: 14, fontWeight: "700", color: color.ink, lineHeight: 20 },
  description: { fontSize: 13, color: color.secondary, lineHeight: 20, marginTop: 6 },
  sectionTitle: { fontSize: 23, fontWeight: "700", lineHeight: 29, color: color.ink, marginBottom: 13 },
  card: { padding: 18, borderWidth: 1, borderColor: color.border, borderRadius: 13, marginBottom: 11 },
  index: { color: color.accent, fontSize: 11, fontWeight: "700", marginBottom: 12 },
  cardTitle: { color: color.ink, fontWeight: "700", fontSize: 17, lineHeight: 23 },
  state: { color: color.secondary, backgroundColor: color.grouped, padding: 10, fontSize: 12, marginTop: 14, borderRadius: 7 },
  smallHeading: { marginTop: 16, marginBottom: 6, fontSize: 12, fontWeight: "700", color: color.ink },
  requirement: { fontSize: 12, lineHeight: 19, color: color.secondary, marginTop: 4 },
  relatedButton: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: color.border, borderRadius: 9, paddingHorizontal: 12, marginTop: 7 },
  relatedText: { fontSize: 12, color: color.ink, lineHeight: 19, fontWeight: "600" },
  reviewStage: { padding: 14, borderWidth: 1, borderColor: color.border, borderRadius: 11, marginTop: 9 },
  methodTag: { color: color.accent, marginBottom: 10, fontSize: 11, fontWeight: "700", lineHeight: 17 },
  sourceLink: { minHeight: 44, marginTop: 14, alignSelf: "flex-start", justifyContent: "center" },
  sourceLinkLabel: { fontSize: 13, fontWeight: "700", textDecorationLine: "underline", color: color.ink },
  sourceDisclaimer: { fontSize: 11, lineHeight: 16, marginTop: 4, color: color.secondary },
  footer: { fontSize: 12, lineHeight: 19, color: color.secondary, marginTop: 18 }
});
