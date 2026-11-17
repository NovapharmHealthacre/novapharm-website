import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { intelligenceWorkspaceCatalogue } from "../../apps/portal/data/intelligence-workspaces";
import sourceRegister from "../../docs/intelligence/global-pharma-sources-20261117.json";

type Screen = "workspaces" | "sources" | "account";
type Workspace = (typeof intelligenceWorkspaceCatalogue)[number];
const palette = {
  canvas: "#FFFFFF",
  surface: "#F5F5F7",
  border: "#D2D2D7",
  primary: "#1D1D1F",
  secondary: "#424245",
  tertiary: "#595961",
  brand: "#E3120B"
} as const;

const groups = [...new Set(intelligenceWorkspaceCatalogue.map((workspace) => workspace.group))];

function Action({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      style={[styles.action, active ? styles.actionActive : null]}
    >
      <Text style={[styles.actionText, active ? styles.actionTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function WorkspaceRow({ item, onPress }: { item: Workspace; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title + ". Inspect availability and prerequisites"}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.spaceBetween}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.chevron}>View</Text>
      </View>
      <Text style={styles.description}>{item.summary}</Text>
      <Text style={styles.meta}>
        {item.state === "gated" ? "Restricted workspace" : "Read-only foundation · not a live mobile service"}
      </Text>
    </Pressable>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("workspaces");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Workspace | null>(null);
  const sourceItems = useMemo(() => {
    const query = search.toLocaleLowerCase().trim();
    if (!query) return sourceRegister.sources;
    return sourceRegister.sources.filter((source) =>
      [source.country, source.provider, source.domains, source.region].join(" ").toLocaleLowerCase().includes(query)
    );
  }, [search]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.brand}>NOVAPHARM</Text>
        <Text style={styles.heading}>Intelligence</Text>
        <Text style={styles.subheading}>Pharmaceutical intelligence, with evidence at every level.</Text>
      </View>
      <View style={styles.tabBar}>
        <Action label="Workspaces" active={screen === "workspaces"} onPress={() => { setScreen("workspaces"); setSelected(null); }} />
        <Action label="Data sources" active={screen === "sources"} onPress={() => { setScreen("sources"); setSelected(null); }} />
        <Action label="Account" active={screen === "account"} onPress={() => { setScreen("account"); setSelected(null); }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={styles.notice} accessible accessibilityRole="text">
          <Text style={styles.noticeTitle}>Private mobile preview</Text>
          <Text style={styles.noticeText}>
            No live medicine data, customer session, payment or AI access is enabled. Sources listed here are research candidates only.
          </Text>
        </View>
        {screen === "workspaces" && !selected && (
          <>
            <Text style={styles.sectionTitle}>22 research workspaces</Text>
            <Text style={styles.sectionIntro}>The canonical catalogue is shared with the secure NovaPharm web platform.</Text>
            {groups.map((group) => (
              <View key={group}>
                <Text style={styles.groupTitle}>{group}</Text>
                {intelligenceWorkspaceCatalogue.filter((workspace) => workspace.group === group).map((item) => (
                  <WorkspaceRow key={item.slug} item={item} onPress={() => setSelected(item)} />
                ))}
              </View>
            ))}
          </>
        )}
        {screen === "workspaces" && selected && (
          <>
            <Action label="Back to workspaces" onPress={() => setSelected(null)} />
            <Text style={styles.sectionTitle}>{selected.title}</Text>
            <Text style={styles.sectionIntro}>{selected.summary}</Text>
            <Text style={styles.groupTitle}>Required before activation</Text>
            {selected.requirements.map((condition) => (
              <View key={condition} style={styles.requirement}>
                <Text style={styles.description}>{condition}</Text>
              </View>
            ))}
            <Text style={styles.meta}>Not connected. Mobile entitlement and evidence checks remain mandatory.</Text>
          </>
        )}
        {screen === "sources" && (
          <>
            <Text style={styles.sectionTitle}>Global source registry</Text>
            <Text style={styles.sectionIntro}>
              {sourceRegister.sources.length} candidate source entries. None is approved for mobile data publication.
            </Text>
            <TextInput
              accessibilityLabel="Search country, regulator or pharmaceutical dataset"
              style={styles.input}
              placeholder="Search country or source"
              placeholderTextColor={palette.tertiary}
              autoCapitalize="none"
              value={search}
              onChangeText={setSearch}
            />
            {sourceItems.map((item) => (
              <View key={[item.country, item.provider, item.url].join("|")} style={styles.card}>
                <Text style={styles.cardTitle}>{item.provider}</Text>
                <Text style={styles.description}>{item.country} · {item.region}</Text>
                <Text style={styles.description}>{item.domains}</Text>
                <Text style={styles.meta}>{item.mode} · Rights not reviewed · Not connected</Text>
              </View>
            ))}
            {sourceItems.length === 0 && <Text style={styles.description}>No source candidates match this search.</Text>}
          </>
        )}
        {screen === "account" && (
          <>
            <Text style={styles.sectionTitle}>Secure account</Text>
            <Text style={styles.sectionIntro}>Sign-in will use the approved NovaPharm Cognito OIDC flow with PKCE, MFA and revocable device sessions.</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Authentication not enabled</Text>
              <Text style={styles.description}>No account credentials, JWTs, tokens or tenant content are collected or stored in this candidate build.</Text>
              <Text style={styles.meta}>Production sign-in requires a reviewed mobile OAuth client, redirect URI and backend enforcement.</Text>
            </View>
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Research preview · {Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Cross-platform"}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  header: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 14 },
  brand: { color: palette.brand, fontSize: 12, fontWeight: "700", letterSpacing: 1.6, marginBottom: 8 },
  heading: { color: palette.primary, fontSize: 32, fontWeight: "700", letterSpacing: -0.9 },
  subheading: { color: palette.secondary, fontSize: 14, lineHeight: 21, marginTop: 6 },
  tabBar: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 1, borderColor: palette.border },
  action: { minHeight: 44, borderRadius: 9, paddingHorizontal: 12, justifyContent: "center", marginRight: 5 },
  actionActive: { backgroundColor: palette.primary },
  actionText: { fontSize: 13, fontWeight: "600", color: palette.primary },
  actionTextActive: { color: palette.canvas },
  body: { paddingHorizontal: 24, paddingBottom: 32 },
  notice: { backgroundColor: palette.surface, borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 24 },
  noticeTitle: { fontSize: 14, fontWeight: "700", color: palette.primary },
  noticeText: { fontSize: 13, color: palette.secondary, lineHeight: 20, marginTop: 6 },
  sectionTitle: { fontSize: 23, fontWeight: "700", color: palette.primary, letterSpacing: -0.3, marginBottom: 5 },
  sectionIntro: { fontSize: 14, color: palette.secondary, lineHeight: 21, marginBottom: 16 },
  groupTitle: { fontSize: 12, fontWeight: "700", color: palette.secondary, marginTop: 18, marginBottom: 10, letterSpacing: 0.5 },
  card: { backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 16, marginBottom: 10, minHeight: 96 },
  cardTitle: { color: palette.primary, fontSize: 16, fontWeight: "600", flexShrink: 1 },
  description: { color: palette.secondary, fontSize: 13, lineHeight: 20, marginTop: 6 },
  meta: { color: palette.tertiary, fontSize: 12, lineHeight: 18, marginTop: 10 },
  chevron: { color: palette.secondary, fontSize: 12, marginLeft: 12 },
  spaceBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requirement: { borderBottomWidth: 1, borderColor: palette.border, paddingVertical: 11 },
  input: { borderWidth: 1, borderColor: palette.border, borderRadius: 9, minHeight: 46, padding: 12, color: palette.primary, backgroundColor: palette.canvas },
  footer: { borderTopWidth: 1, borderColor: palette.border, paddingVertical: 12, alignItems: "center" },
  footerText: { color: palette.tertiary, fontSize: 11 }
});
