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
import { intelligenceWorkspaceCatalogue } from "../../apps/portal/data/intelligence-workspaces";
import sourceRegister from "../../docs/intelligence/global-pharma-sources-20261117.json";
import { MultimodalReviewScreen } from "./MultimodalReviewScreen";
import { MapsResearchScreen } from "./MapsResearchScreen";
import { CountryDirectoryScreen } from "./CountryDirectoryScreen";
import { novaMlAlignmentResearchMethods, novaMlSparseResearchMethod, novaMlSparseCircuitAssurance, novaMlWorkspaceCatalogue } from "../../apps/portal/data/nova-ml-modules";

type Screen = "overview" | "workspaces" | "sources" | "countries" | "more" | "review" | "research" | "maps" | "account";
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
  { screen: "more", label: "More" }
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

function Navigation({ selected, onSelect, largeText }: { selected: Screen; onSelect: (screen: Screen) => void; largeText: boolean }) {
  return (
    <View style={[styles.navigation, largeText && styles.navigationLarge]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = selected === tab.screen || (tab.screen === "more" && (selected === "review" || selected === "research" || selected === "maps" || selected === "account" || selected === "countries"));
        return (
          <Pressable
            key={tab.screen}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            style={[styles.navItem, largeText && styles.navItemLarge, active && styles.navItemActive]}
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
  const { width, fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.4;
  const twoColumns = width >= 760 && !largeText;
  const [screen, setScreen] = useState<Screen>("overview");
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
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
        No live medicine data, customer session, payments, external API calls or AI inference is enabled.
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

      {screen === "countries" ? (
        <CountryDirectoryScreen />
      ) : screen === "sources" ? (
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
          {screen === "more" && (
            <>
              <SectionHeading title="More" detail="Additional research and access previews. Nothing here enables clinical, commercial or customer operations." />
              {([
                { screen: "countries", label: "Countries", detail: "101 national research scopes and unapproved source references" },
                { screen: "review", label: "Evidence review", detail: "Offline multimodal research and identity-conflict checks" },
                { screen: "research", label: "Nova ML research", detail: "Unverified methods and native-model prerequisites" },
                { screen: "maps", label: "Maps and location", detail: "Offline source-reference coordinates; external maps only" },
                { screen: "account", label: "Enterprise access", detail: "Authentication requirements; sign-in is not enabled" }
              ] as const).map((item) => (
                <Pressable
                  key={item.screen}
                  accessibilityRole="button"
                  accessibilityLabel={item.label + ". " + item.detail}
                  style={[styles.card, styles.moreAction]}
                  onPress={() => changeScreen(item.screen)}
                >
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.description}>{item.detail}</Text>
                </Pressable>
              ))}
            </>
          )}
          {screen === "review" && <MultimodalReviewScreen />}
          {screen === "maps" && <MapsResearchScreen />}

          {screen === "research" && (
            <>
              <SectionHeading
                title={novaMlSparseCircuitAssurance.title}
                detail="Research-only candidate. No live model inference, clinical decision or production activation."
              />
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Unverified research candidate</Text>
                <Text style={styles.description}>{novaMlSparseCircuitAssurance.offlineExperiment.description}</Text>
                <Text style={styles.meta}>{novaMlSparseCircuitAssurance.offlineExperiment.sample}</Text>
                <Text style={styles.meta}>{novaMlSparseCircuitAssurance.offlineExperiment.isolatedAccuracy}</Text>
                <Text style={styles.meta}>{novaMlSparseCircuitAssurance.offlineExperiment.ablatedAccuracy}</Text>
                <Text style={styles.description}>{novaMlSparseCircuitAssurance.offlineExperiment.limitation}</Text>
                <Text style={styles.meta}>{novaMlSparseCircuitAssurance.offlineExperiment.status}</Text>
              </View>
              <SectionHeading title="Independent release requirements" detail={novaMlSparseCircuitAssurance.releasePolicy} />
              {novaMlSparseCircuitAssurance.methodGates.map((gate) => (
                <View key={gate.name} style={styles.requirement}>
                  <Text style={styles.cardTitle}>{gate.name}</Text>
                  <Text style={styles.description}>{gate.detail}</Text>
                </View>
              ))}
              <Text style={styles.meta}>
                This screen reads bundled, non-sensitive governance metadata only.
                No model weights, pharmaceutical data, patient imagery, external requests or verification receipts are loaded.
              </Text>
              <View style={styles.rule} />
              <SectionHeading
                title="Nova ML research"
                detail="One shared method catalogue for web, iOS and Android. This is an offline educational preview, not model inference."
              />
              <View style={styles.card} accessible>
                <Text style={styles.cardTitle}>Research only · Not production approved</Text>
                <Text style={styles.description}>
                  L₀ sparsity, reward overoptimisation, critiques, instruction evaluation and long-horizon simulation
                  are unverified research foundations. No model weights, clinical predictions, independent ground truth,
                  source-rights grants, customer session or network service is available here.
                </Text>
              </View>
              {[novaMlSparseResearchMethod, ...novaMlAlignmentResearchMethods].map((method) => (
                <View key={method.id} style={styles.card} accessible accessibilityLabel={method.title + ". " + method.researchStatus + ". " + method.approval}>
                  <Text style={styles.cardTitle}>{method.title}</Text>
                  <Text style={styles.description}>{method.summary}</Text>
                  <Text style={styles.meta}>{method.researchStatus}</Text>
                  <Text style={styles.description}>{method.approval}</Text>
                </View>
              ))}
              <View style={styles.rule} />
              <SectionHeading
                title="Native model programme"
                detail="The four protected Nova ML workspaces need separate mobile identity, licensing, signed model and device approval."
              />
              {novaMlWorkspaceCatalogue.map((item) => (
                <View key={item.slug} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.description}>{item.summary}</Text>
                  <Text style={styles.meta}>{item.platform} · Not enabled in this preview</Text>
                </View>
              ))}
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
      <Navigation selected={screen} onSelect={changeScreen} largeText={largeText} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  appHeader: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderColor: palette.border },
  brand: { fontSize: 11, fontWeight: "700", letterSpacing: 1.8, color: palette.accent, marginBottom: 7 },
  appTitle: { fontSize: 29, lineHeight: 36, fontWeight: "700", letterSpacing: -0.7, color: palette.primary },
  appSubtitle: { fontSize: 15, lineHeight: 22, color: palette.secondary, marginTop: 2 },
  list: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 28 },
  contentLimit: { alignSelf: "center", width: "100%", maxWidth: 960 },
  notice: { marginTop: 20, marginBottom: 24, padding: 16, borderRadius: 13, backgroundColor: palette.grouped },
  noticeTitle: { color: palette.primary, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  noticeText: { color: palette.secondary, fontSize: 17, lineHeight: 25, marginTop: 6 },
  sectionHeading: { marginBottom: 12 },
  sectionTitle: { fontSize: 23, lineHeight: 30, fontWeight: "700", color: palette.primary, letterSpacing: -0.4 },
  sectionIntro: { fontSize: 17, color: palette.secondary, lineHeight: 26, marginTop: 5 },
  count: { color: palette.secondary, fontSize: 14, marginBottom: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metric: { flexGrow: 1, minWidth: 100, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 15 },
  metricNumber: { fontSize: 26, fontWeight: "700", color: palette.primary, fontVariant: ["tabular-nums"] },
  metricLabel: { fontSize: 14, color: palette.secondary, lineHeight: 21, marginTop: 4 },
  rule: { height: 1, backgroundColor: palette.border, marginVertical: 22 },
  groupTitle: { fontSize: 14, color: palette.secondary, fontWeight: "700", marginTop: 17, marginBottom: 11, letterSpacing: 0.4 },
  card: { backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 16, marginBottom: 10 },
  moreAction: { minHeight: 56, justifyContent: "center" },
  sourceCard: { backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 15, marginBottom: 10 },
  sourceHalf: { flex: 1, minWidth: 0 },
  sourceRow: { gap: 10 },
  sourceCountry: { color: palette.secondary, fontSize: 14, marginTop: 4, lineHeight: 21 },
  sourceDivider: { marginTop: 12, backgroundColor: palette.border, height: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: palette.primary, fontSize: 17, fontWeight: "600", lineHeight: 25, flexShrink: 1 },
  cardAction: { color: palette.secondary, fontSize: 14, marginLeft: 10 },
  description: { color: palette.secondary, fontSize: 17, lineHeight: 26, marginTop: 6 },
  meta: { color: palette.tertiary, fontSize: 14, lineHeight: 21, marginTop: 10 },
  input: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.canvas, color: palette.primary, minHeight: 48, padding: 13, borderRadius: 10 },
  regionScroller: { flexGrow: 0, marginBottom: 15, marginTop: 12 },
  regionRow: { gap: 8, paddingBottom: 2 },
  regionOption: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: palette.border, borderRadius: 22 },
  regionSelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  regionLabel: { color: palette.primary, fontSize: 14, fontWeight: "600" },
  regionLabelSelected: { color: palette.canvas },
  noResults: { fontSize: 14, color: palette.secondary, lineHeight: 22, marginTop: 16 },
  back: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginBottom: 15 },
  backText: { color: palette.primary, fontSize: 16, fontWeight: "600" },
  requirement: { borderBottomWidth: 1, borderColor: palette.border, paddingVertical: 11 },
  endSpacing: { height: 24 },
  navigation: { flexDirection: "row", borderTopWidth: 1, borderColor: palette.border, backgroundColor: palette.grouped, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 },
  navigationLarge: { flexWrap: "wrap" },
  navItem: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 10, marginHorizontal: 2 },
  navItemLarge: { flex: 0, flexBasis: "46%", minHeight: 56, minWidth: 0 },
  navItemActive: { backgroundColor: palette.primary },
  navLabel: { fontSize: 14, fontWeight: "600", color: palette.secondary, textAlign: "center" },
  navLabelActive: { color: palette.canvas }
});
