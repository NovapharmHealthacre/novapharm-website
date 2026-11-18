/**
 * OpenAI research reading in the unsigned NovaPharm Intelligence Expo candidate.
 * No HTTP client, raw prompts, microphone, model or compute work is created here.
 * External source links launch only after an explicit user tap.
 */
import React, { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { novaSignalsResearchGroups, novaSignalsResearchSources } from "../../apps/portal/data/nova-signals-research";

type ResearchGroup = "All research" | (typeof novaSignalsResearchGroups)[number];
const validSourceUrl = (url: string) => /^https:\/\/(?:openai\.com|cdn\.openai\.com)\//.test(url);

export function SignalsResearchScreen() {
  const [group, setGroup] = useState<ResearchGroup>("All research");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const sources = useMemo(
    () => novaSignalsResearchSources.filter((item) => group === "All research" || item.group === group),
    [group]
  );

  const openSource = async (url: string) => {
    setLinkError(false);
    if (!validSourceUrl(url)) {
      setLinkError(true);
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError(true);
    }
  };

  return (
    <View style={styles.root} accessible={false}>
      <Text accessibilityRole="header" style={styles.title}>Scientific and AI engineering research</Text>
      <Text style={styles.intro}>
        Fifteen original OpenAI sources, including ten studies, OpenAI Signals,
        Whisper, large-model training and Triton. These are human-reviewed
        research references, not a live AI or pharmaceutical data service.
      </Text>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Source-only mobile preview</Text>
        <Text style={styles.noticeCopy}>
          No OpenAI account access, patient data, voice capture, prediction,
          automatic decision, GPU job or external dataset transfer is enabled.
          Signals documents 24 aggregate tables; only three are candidates
          for separately authorised, offline review.
        </Text>
      </View>
      <Text style={styles.groupTitle} accessibilityRole="header">Filter research</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Research category filters"
        contentContainerStyle={styles.filters}
      >
        {(["All research", ...novaSignalsResearchGroups] as ResearchGroup[]).map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityState={{ selected: group === name }}
            accessibilityLabel={name + " research"}
            onPress={() => { setGroup(name); setExpandedId(null); }}
            style={[styles.filter, group === name && styles.filterSelected]}
          >
            <Text style={[styles.filterText, group === name && styles.filterTextSelected]}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.count}>{sources.length} of {novaSignalsResearchSources.length} registered sources</Text>
      {sources.map((source) => {
        const expanded = expandedId === source.id;
        return (
          <View style={styles.card} key={source.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={source.title + ". " + (expanded ? "Hide" : "Show") + " research details"}
              style={styles.cardToggle}
              onPress={() => { setExpandedId(expanded ? null : source.id); setLinkError(false); }}
            >
              <Text style={styles.sourceGroup}>{source.group}</Text>
              <Text style={styles.sourceTitle}>{source.title}</Text>
              <Text style={styles.action}>{expanded ? "Hide details" : "Read details"}</Text>
            </Pressable>
            {expanded && (
              <View style={styles.details}>
                <Text style={styles.sectionLabel}>Research observation</Text>
                <Text style={styles.detailText}>{source.finding}</Text>
                <Text style={styles.sectionLabel}>NovaPharm application</Text>
                <Text style={styles.detailText}>{source.adaptation}</Text>
                <Text style={styles.sectionLabel}>Limitations and boundaries</Text>
                <Text style={styles.detailText}>{source.boundary}</Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={"Open original OpenAI source: " + source.title}
                  style={styles.link}
                  onPress={() => { void openSource(source.url); }}
                >
                  <Text style={styles.linkText}>View original research</Text>
                </Pressable>
                {linkError && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    The source link could not be opened. No data was sent from NovaPharm.
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
      <Text style={styles.footer}>
        Source summaries describe published research, not an inference service,
        treatment recommendation, regulatory decision, clinical validation or
        independently verified NovaPharm business result.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 16 },
  title: { fontSize: 23, lineHeight: 30, letterSpacing: -0.4, color: "#1D1D1F", fontWeight: "700" },
  intro: { marginTop: 9, color: "#424245", fontSize: 14, lineHeight: 22 },
  notice: { marginTop: 20, marginBottom: 20, borderRadius: 12, padding: 16, backgroundColor: "#F5F5F7" },
  noticeTitle: { color: "#1D1D1F", fontWeight: "700", fontSize: 13 },
  noticeCopy: { marginTop: 7, color: "#424245", fontSize: 12, lineHeight: 19 },
  groupTitle: { color: "#424245", fontWeight: "700", fontSize: 12, marginBottom: 8 },
  filters: { gap: 8, paddingVertical: 6 },
  filter: { borderRadius: 22, borderColor: "#D2D2D7", borderWidth: 1, minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  filterSelected: { backgroundColor: "#1D1D1F", borderColor: "#1D1D1F" },
  filterText: { color: "#1D1D1F", fontWeight: "600", fontSize: 12 },
  filterTextSelected: { color: "#FFFFFF" },
  count: { color: "#595961", fontSize: 12, marginTop: 8, marginBottom: 12 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#D2D2D7", marginBottom: 10, overflow: "hidden", backgroundColor: "#FFFFFF" },
  cardToggle: { minHeight: 78, padding: 15, justifyContent: "center" },
  sourceGroup: { color: "#595961", fontSize: 11, fontWeight: "600", marginBottom: 5 },
  sourceTitle: { fontSize: 15, lineHeight: 22, color: "#1D1D1F", fontWeight: "600" },
  action: { color: "#A8151D", marginTop: 7, fontSize: 12, fontWeight: "600" },
  details: { paddingHorizontal: 15, paddingBottom: 17, borderTopWidth: 1, borderTopColor: "#E8E8ED" },
  sectionLabel: { color: "#1D1D1F", fontSize: 12, fontWeight: "700", marginTop: 14, marginBottom: 5 },
  detailText: { color: "#424245", fontSize: 13, lineHeight: 20 },
  link: { borderColor: "#D2D2D7", borderWidth: 1, borderRadius: 9, minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 14, marginTop: 16 },
  linkText: { color: "#0756A3", fontSize: 13, fontWeight: "600" },
  error: { color: "#A8151D", marginTop: 10, fontSize: 12, lineHeight: 19 },
  footer: { color: "#595961", fontSize: 12, lineHeight: 19, marginTop: 10, marginBottom: 20 }
});
