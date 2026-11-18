/**
 * NovaPharm Intelligence — private mobile candidate.
 * No HTTP, credentials, customer records or source facts are included.
 * Existing web workspace states and global source candidates remain non-live.
 */
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { inspectSyntheticFeature } from "../../src/core/ai/model-microscope-synthetic-reference.mjs";
import { intelligenceWorkspaceCatalogue } from "../../apps/portal/data/intelligence-workspaces";
import { novaMlWorkspaceCatalogue, modelMicroscopeInspectionStages } from "../../apps/portal/data/nova-ml-modules";
import sourceRegister from "../../docs/intelligence/global-pharma-sources-20261117.json";

type Screen = "overview" | "workspaces" | "sources" | "inspect" | "account";
type Workspace = (typeof intelligenceWorkspaceCatalogue)[number];
type Source = (typeof sourceRegister.sources)[number];

const palette = Object.freeze({
  canvas: "#FFFFFF",
  grouped: "#F5F5F7",
  raised: "#E8E8ED",
  border: "#D2D2D7",
  primary: "#1D1D1F",
  secondary: "#424245",
  tertiary: "#595961",
  accent: "#E3120B"
});
const workspaceGroups = [...new Set(intelligenceWorkspaceCatalogue.map((item) => item.group))];
const sourceRegions = ["All regions", ...new Set(sourceRegister.sources.map((item) => item.region))];
const tabs: ReadonlyArray<{ screen: Screen; label: string }> = [
  { screen: "overview", label: "Overview" },
  { screen: "workspaces", label: "Workspaces" },
  { screen: "sources", label: "Sources" },
  { screen: "inspect", label: "Inspect" },
  { screen: "account", label: "Account" }
];
const pilotSlugs = new Set([
  "medicine-search", "medicine-overview", "identity",
  "evidence", "observed-market", "geography"
]);

function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {detail ? <Text style={styles.sectionIntro}>{detail}</Text> : null}
    </View>
  );
}

function Metric({ number, label }: { number: string; label: string }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={number + ". " + label}>
      <Text style={styles.metricNumber}>{number}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function WorkspaceCard({ item, onPress }: { item: Workspace; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title + ". Read prerequisites. Not enabled in this mobile app."}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardAction}>Details</Text>
      </View>
      <Text style={styles.description}>{item.summary}</Text>
      <Text style={styles.meta}>
        {item.state === "gated" ? "Gated · not available" : "Web read-only foundation · mobile unavailable"}
      </Text>
    </Pressable>
  );
}

function SourceCard({ item, twoColumns }: { item: Source; twoColumns: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={item.provider + ", " + item.country + ". " + item.mode + ". Not connected; source rights have not been reviewed."}
      style={[styles.sourceCard, twoColumns ? styles.sourceHalf : null]}
    >
      <Text style={styles.cardTitle}>{item.provider}</Text>
      <Text style={styles.sourceCountry}>{item.country} · {item.region}</Text>
      <Text style={styles.description}>{item.domains}</Text>
      <View style={styles.sourceDivider} />
      <Text style={styles.meta}>{item.mode} · Rights not reviewed · Not connected</Text>
    </View>
  );
}

function Navigation({ selected, onSelect }: { selected: Screen; onSelect: (screen: Screen) => void }) {
  return (
    <View style={styles.navigation} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = selected === tab.screen;
        return (
          <Pressable
            key={tab.screen}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            style={[styles.navItem, active && styles.navItemActive]}
            onPress={() => onSelect(tab.screen)}
          >
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const twoColumns = width >= 760;
  const [screen, setScreen] = useState<Screen>("overview");
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [syntheticExample, setSyntheticExample] = useState<ReturnType<typeof inspectSyntheticFeature> | null>(null);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All regions");

  const sources = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return sourceRegister.sources.filter((item) => {
      if (region !== "All regions" && item.region !== region) return false;
      if (!needle) return true;
      return [item.provider, item.country, item.region, item.domains]
        .join(" ").toLocaleLowerCase().includes(needle);
    });
  }, [query, region]);

  const changeScreen = (value: Screen) => {
    setSelectedWorkspace(null);
    setScreen(value);
  };

  const notice = (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>Research preview · private and unconnected</Text>
      <Text style={styles.noticeText}>
        No live medicine data, customer session, payments, external API calls or production AI inference is enabled.
        Every source needs independent rights and data acceptance.
      </Text>
    </View>
  );

  const sourceHeader = (
    <>
      {notice}
      <SectionHeading title="Global data sources" detail="Official and commercial candidate sources. No entry is yet approved for customer publication." />
      <Text style={styles.count}>{sources.length} of {sourceRegister.sources.length} source candidates</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search country, regulator or pharmaceutical dataset"
        placeholder="Search source or country"
        placeholderTextColor={palette.tertiary}
        autoCapitalize="none"
        style={styles.input}
        returnKeyType="search"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroller} contentContainerStyle={styles.regionRow} accessibilityLabel="Filter sources by region">
        {sourceRegions.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityState={{ selected: region === name }}
            style={[styles.regionOption, region === name && styles.regionSelected]}
            onPress={() => setRegion(name)}
          >
            <Text style={[styles.regionLabel, region === name && styles.regionLabelSelected]}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.appHeader}>
        <Text style={styles.brand}>NOVAPHARM</Text>
        <Text style={styles.appTitle} accessibilityRole="header">Intelligence</Text>
        <Text style={styles.appSubtitle}>Global pharmaceutical research</Text>
      </View>

      {screen === "sources" ? (
        <FlatList
          key={twoColumns ? "sources-wide" : "sources-narrow"}
          style={styles.list}
          data={sources}
          numColumns={twoColumns ? 2 : 1}
          columnWrapperStyle={twoColumns ? styles.sourceRow : undefined}
          keyExtractor={(item) => item.candidateKey}
          renderItem={({ item }) => <SourceCard item={item} twoColumns={twoColumns} />}
          ListHeaderComponent={sourceHeader}
          ListEmptyComponent={<Text style={styles.noResults}>No source candidates match this filter.</Text>}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          contentContainerStyle={[styles.content, styles.contentLimit]}
        />
      ) : (
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, styles.contentLimit]}>
          {notice}
          {screen === "overview" && (
            <>
              <SectionHeading title="Intelligence overview" detail="One governed platform. National source identities retained. No fabricated data or availability." />
              <View style={styles.metricGrid}>
                <Metric number={String(intelligenceWorkspaceCatalogue.length)} label="Canonical workspaces" />
                <Metric number={String(sourceRegister.sources.length)} label="Source candidates" />
                <Metric number={String(sourceRegions.length - 1)} label="Source regions" />
              </View>
              <View style={styles.rule} />
              <SectionHeading title="First medicine pilot" detail="Six repository journeys requiring independent identity, rights, data, MFA and tenant-isolation acceptance." />
              {intelligenceWorkspaceCatalogue.filter((item) => pilotSlugs.has(item.slug)).map((item) => (
                <WorkspaceCard key={item.slug} item={item} onPress={() => { setScreen("workspaces"); setSelectedWorkspace(item); }} />
              ))}
              <View style={styles.rule} />
              <SectionHeading title="Our evidence standard" />
              <Text style={styles.description}>
                Medicine identity, regulatory status, safety, utilization, reimbursement and stock are separate facts.
                Each needs its own source, country, period, units, review status and provenance before it can be shown as intelligence.
              </Text>
            </>
          )}
          {screen === "workspaces" && !selectedWorkspace && (
            <>
              <SectionHeading title="Research workspaces" detail="The canonical 22-workspace list from NovaPharm Intelligence. A route is not production readiness." />
              {workspaceGroups.map((group) => (
                <View key={group}>
                  <Text style={styles.groupTitle} accessibilityRole="header">{group}</Text>
                  {intelligenceWorkspaceCatalogue.filter((item) => item.group === group).map((item) => (
                    <WorkspaceCard key={item.slug} item={item} onPress={() => setSelectedWorkspace(item)} />
                  ))}
                </View>
              ))}
            </>
          )}
          {screen === "workspaces" && selectedWorkspace && (
            <>
              <Pressable accessibilityRole="button" style={styles.back} onPress={() => setSelectedWorkspace(null)}>
                <Text style={styles.backText}>Back to workspaces</Text>
              </Pressable>
              <SectionHeading title={selectedWorkspace.title} detail={selectedWorkspace.summary} />
              <Text style={styles.groupTitle}>Release prerequisites</Text>
              {selectedWorkspace.requirements.map((item) => (
                <View style={styles.requirement} key={item}><Text style={styles.description}>{item}</Text></View>
              ))}
              <Text style={styles.meta}>Unavailable on mobile. A separately verified session and accepted evidence are required.</Text>
            </>
          )}
          {screen === "inspect" && (
            <>
              <SectionHeading title="Model Microscope" detail="Read-only neural-network inspection research. No live models or approved inspection artifacts are installed." />
              <View style={styles.card}>
                <Text style={styles.cardTitle}>No approved model inspections</Text>
                <Text style={styles.description}>The future inspector will select a governed model and version, layer, feature and provenance-linked hypothesis. The OpenAI research does not provide NovaPharm with an inference or microscopy API.</Text>
                <Text style={styles.meta}>Private source-only preview · Zero production inference · Zero network requests · No patient data</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Synthetic model reference</Text>
                <Text style={styles.description}>Run a locally defined 4 × 4 neural-network feature demonstration. It is not an approved medicine model, clinical explanation or live AI service.</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Run synthetic neuron feature reference" style={styles.syntheticButton} onPress={() => setSyntheticExample(inspectSyntheticFeature({ layerId: "features", featureId: "center-columns" }))}>
                  <Text style={styles.syntheticButtonLabel}>Run synthetic reference</Text>
                </Pressable>
                {syntheticExample ? <View accessible accessibilityLabel="Synthetic four by four feature grid, no medical data" style={styles.syntheticGrid}>
                  {syntheticExample.optimizedGrid.map((line, row) => <View key={row} style={styles.syntheticRow}>
                    {line.map((value, column) => <View key={column} style={[styles.syntheticPixel, { backgroundColor: "rgba(29,29,31," + value + ")" }]} />)}
                  </View>)}
                  <Text style={styles.meta}>Initial activation {syntheticExample.initialActivation} · Maximized {syntheticExample.finalActivation}. Synthetic only.</Text>
                </View> : null}
              </View>
              <SectionHeading title="Interpretability research lifecycle" />
              {modelMicroscopeInspectionStages.map((stage) => (
                <View key={stage.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{stage.title}</Text>
                  <Text style={styles.description}>{stage.summary}</Text>
                  <Text style={styles.meta}>Not operational · Requires: {stage.requiredEvidence}</Text>
                </View>
              ))}
              <SectionHeading title="Research requirements" />
              {novaMlWorkspaceCatalogue.find((module) => module.slug === "nova-model-microscope")?.requirements.map((requirement) => (
                <View style={styles.requirement} key={requirement}><Text style={styles.description}>{requirement}</Text></View>
              ))}
              <Text style={styles.meta}>Visualizations may suggest hypotheses but cannot establish model causality, clinical safety or regulatory validity. Use accepted source records and human review.</Text>
            </>
          )}
          {screen === "account" && (
            <>
              <SectionHeading title="Enterprise access" detail="Identity and data availability are independent permission decisions." />
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Authentication not enabled</Text>
                <Text style={styles.description}>A reviewed mobile Cognito authorization-code and PKCE flow, MFA, tenant scoping, secure storage, revocation and signed release are required.</Text>
                <Text style={styles.meta}>No credentials, JWTs or private customer/medicine records are collected by this preview.</Text>
              </View>
              <SectionHeading title="Private access controls" />
              {["A verified person and tenant", "Source-specific rights and country", "Independent data admission", "Session expiry and revocation", "Complete auditing and rollback"].map((item) => (
                <View style={styles.requirement} key={item}><Text style={styles.description}>{item}</Text></View>
              ))}
            </>
          )}
          <View style={styles.endSpacing} />
        </ScrollView>
      )}
      <Navigation selected={screen} onSelect={changeScreen} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  appHeader: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderColor: palette.border },
  brand: { fontSize: 11, fontWeight: "700", letterSpacing: 1.8, color: palette.accent, marginBottom: 7 },
  appTitle: { fontSize: 29, lineHeight: 36, fontWeight: "700", letterSpacing: -0.7, color: palette.primary },
  appSubtitle: { fontSize: 13, lineHeight: 19, color: palette.secondary, marginTop: 2 },
  list: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 28 },
  contentLimit: { alignSelf: "center", width: "100%", maxWidth: 960 },
  notice: { marginTop: 20, marginBottom: 24, padding: 16, borderRadius: 13, backgroundColor: palette.grouped },
  noticeTitle: { color: palette.primary, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  noticeText: { color: palette.secondary, fontSize: 13, lineHeight: 20, marginTop: 6 },
  sectionHeading: { marginBottom: 12 },
  sectionTitle: { fontSize: 23, lineHeight: 30, fontWeight: "700", color: palette.primary, letterSpacing: -0.4 },
  sectionIntro: { fontSize: 14, color: palette.secondary, lineHeight: 22, marginTop: 5 },
  count: { color: palette.secondary, fontSize: 12, marginBottom: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metric: { flexGrow: 1, minWidth: 100, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 15 },
  metricNumber: { fontSize: 26, fontWeight: "700", color: palette.primary, fontVariant: ["tabular-nums"] },
  metricLabel: { fontSize: 12, color: palette.secondary, lineHeight: 18, marginTop: 4 },
  rule: { height: 1, backgroundColor: palette.border, marginVertical: 22 },
  groupTitle: { fontSize: 12, color: palette.secondary, fontWeight: "700", marginTop: 17, marginBottom: 11, letterSpacing: 0.4 },
  card: { backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 16, marginBottom: 10 },
  sourceCard: { backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 15, marginBottom: 10 },
  sourceHalf: { flex: 1, minWidth: 0 },
  sourceRow: { gap: 10 },
  sourceCountry: { color: palette.secondary, fontSize: 12, marginTop: 4, lineHeight: 19 },
  sourceDivider: { marginTop: 12, backgroundColor: palette.border, height: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: palette.primary, fontSize: 15, fontWeight: "600", lineHeight: 22, flexShrink: 1 },
  cardAction: { color: palette.secondary, fontSize: 12, marginLeft: 10 },
  description: { color: palette.secondary, fontSize: 13, lineHeight: 20, marginTop: 6 },
  meta: { color: palette.tertiary, fontSize: 12, lineHeight: 18, marginTop: 10 },
  input: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.canvas, color: palette.primary, minHeight: 48, padding: 13, borderRadius: 10 },
  regionScroller: { flexGrow: 0, marginBottom: 15, marginTop: 12 },
  regionRow: { gap: 8, paddingBottom: 2 },
  regionOption: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: palette.border, borderRadius: 22 },
  regionSelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  regionLabel: { color: palette.primary, fontSize: 12, fontWeight: "600" },
  regionLabelSelected: { color: palette.canvas },
  noResults: { fontSize: 14, color: palette.secondary, lineHeight: 22, marginTop: 16 },
  back: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginBottom: 15 },
  backText: { color: palette.primary, fontSize: 14, fontWeight: "600" },
  requirement: { borderBottomWidth: 1, borderColor: palette.border, paddingVertical: 11 },
  endSpacing: { height: 24 },
  syntheticButton: { backgroundColor: palette.primary, minHeight: 46, borderRadius: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: 14 },
  syntheticButtonLabel: { color: palette.canvas, fontSize: 13, fontWeight: "600" },
  syntheticGrid: { marginTop: 14, alignSelf: "flex-start", gap: 5 },
  syntheticRow: { flexDirection: "row", gap: 5 },
  syntheticPixel: { width: 40, height: 40, borderColor: palette.border, borderWidth: 1, borderRadius: 4 },
  navigation: { flexDirection: "row", borderTopWidth: 1, borderColor: palette.border, backgroundColor: palette.grouped, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 },
  navItem: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 10, marginHorizontal: 2 },
  navItemActive: { backgroundColor: palette.primary },
  navLabel: { fontSize: 11, fontWeight: "600", color: palette.secondary, textAlign: "center" },
  navLabelActive: { color: palette.canvas }
});
