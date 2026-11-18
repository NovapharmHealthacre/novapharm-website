/**
 * Offline country-source discovery for the same Expo bundle on iOS and Android.
 * Reads only reviewed, public reference METADATA from the shared web catalogue.
 * No HTTP, customer authentication, medicine records or source-use rights.
 */
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import catalogue from "../../docs/intelligence/country-101-client-catalog-20261118.json";

type Country = (typeof catalogue.countries)[number];
type Filter = "all" | "with-sources" | "research-only";
const filters: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "with-sources", label: "Candidates" },
  { key: "research-only", label: "Research" }
];
const ink = "#1D1D1F";
const muted = "#515154";

function CountryCard({ country, wide }: { country: Country; wide: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <Text style={styles.name} accessibilityRole="header">{country.country}</Text>
      <Text style={styles.context}>{country.iso2} · {country.region}</Text>
      <Text style={styles.state}>{country.candidateSourceCount ? "Candidate sources only" : "National source research needed"}</Text>
      <Text style={styles.description}>{country.candidateSourceCount
        ? country.candidateSourceCount + " publisher reference(s). Licensing, ingestion and customer publication not approved."
        : "No country-level pharmaceutical dataset identified or admitted."}</Text>
      {country.publisherResearchLead && (
        <View style={styles.source}>
          <Text style={styles.state}>Official publisher research lead · Not integrated</Text>
          <Text style={styles.publisher}>{country.publisherResearchLead.publisherName}</Text>
          <Text style={styles.sourceText}>{country.publisherResearchLead.leadType} · Rights not reviewed · No live medicine API</Text>
          <Text style={styles.sourceText}>{country.publisherResearchLead.caveat}</Text>
        </View>
      )}
      {country.candidateSources.length > 0 && (
        <>
          <Pressable style={styles.action} accessibilityRole="button"
            accessibilityState={{ expanded }} accessibilityLabel={"Review candidate publishers for " + country.country}
            onPress={() => setExpanded(!expanded)}>
            <Text style={styles.actionText}>{expanded ? "Hide candidates" : "View candidate publishers"}</Text>
          </Pressable>
          {expanded && country.candidateSources.map((source) => (
            <View key={source.candidateKey} style={styles.source}>
              <Text style={styles.publisher}>{source.provider}</Text>
              <Text style={styles.sourceText}>{source.mode} · Rights not reviewed · Not connected</Text>
              <Text style={styles.sourceText}>{source.domains}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function CountryDirectoryScreen() {
  const { width } = useWindowDimensions();
  const twoColumns = width >= 760;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const countries = useMemo(() => {
    const term = query.trim().normalize("NFKC").toLocaleLowerCase();
    return catalogue.countries.filter((country) => {
      if (filter === "with-sources" && country.candidateSourceCount === 0) return false;
      if (filter === "research-only" && country.candidateSourceCount !== 0) return false;
      return !term || [
        country.country, country.iso2, country.region,
        country.publisherResearchLead?.publisherName ?? "",
        country.publisherResearchLead?.leadType ?? "",
        ...country.candidateSources.map((source) => source.provider + " " + source.domains)
      ].join(" ").normalize("NFKC").toLocaleLowerCase().includes(term);
    });
  }, [filter, query]);

  const header = (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>Global source evidence</Text>
      <Text style={styles.title} accessibilityRole="header">101 countries</Text>
      <Text style={styles.explanation}>77 countries with publisher candidates. 24 more require source research. None has been approved for customer-live pharmaceutical data.</Text>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.number}>101</Text><Text style={styles.metricLabel}>Research scope</Text></View>
        <View style={styles.metric}><Text style={styles.number}>77</Text><Text style={styles.metricLabel}>With candidate source</Text></View>
        <View style={styles.metric}><Text style={styles.number}>24</Text><Text style={styles.metricLabel}>Source discovery needed</Text></View>
        <View style={styles.metric}><Text style={styles.number}>0</Text><Text style={styles.metricLabel}>Customer-live</Text></View>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Unapproved research metadata</Text>
        <Text style={styles.noticeBody}>No live medicine records, approved source rights, clinical decisions, product availability or authenticated upstream access. Official regulator APIs must be connected only through a separately approved backend.</Text>
      </View>
      <TextInput style={styles.search} accessibilityLabel="Search countries or source candidates"
        placeholder="Country, code or publisher" placeholderTextColor="#69696F" autoCapitalize="none"
        value={query} onChangeText={setQuery} maxLength={120} returnKeyType="search" />
      <View style={styles.filters} accessibilityLabel="Country source state filter">
        {filters.map((option) => (
          <Pressable key={option.key} accessibilityRole="button"
            accessibilityState={{ selected: filter === option.key }}
            style={[styles.filter, filter === option.key && styles.selected]}
            onPress={() => setFilter(option.key)}>
            <Text style={[styles.filterText, filter === option.key && styles.selectedText]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.counter} accessibilityLiveRegion="polite">{countries.length} matching countries · no customer-live feeds</Text>
    </View>
  );

  return (
    <FlatList
      key={twoColumns ? "country-wide" : "country-narrow"}
      style={styles.list}
      data={countries}
      numColumns={twoColumns ? 2 : 1}
      columnWrapperStyle={twoColumns ? styles.columns : undefined}
      keyExtractor={(country) => country.iso2}
      renderItem={({ item }) => <CountryCard country={item} wide={twoColumns} />}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>No matching countries. No data is inferred.</Text>}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { paddingHorizontal: 20, paddingBottom: 26, maxWidth: 1000, width: "100%", alignSelf: "center" },
  header: { paddingTop: 22, paddingBottom: 14 },
  eyebrow: { color: muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: ink, fontSize: 29, fontWeight: "700", marginTop: 5 },
  explanation: { fontSize: 13, color: muted, lineHeight: 20, marginTop: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 19 },
  metric: { flexGrow: 1, minWidth: 130, padding: 14, backgroundColor: "#F5F5F7", borderRadius: 12 },
  number: { fontSize: 26, fontWeight: "700", color: ink },
  metricLabel: { color: muted, marginTop: 4, fontSize: 11 },
  notice: { backgroundColor: "#F5F5F7", borderRadius: 12, padding: 15, marginTop: 17 },
  noticeTitle: { fontSize: 13, color: ink, fontWeight: "700" },
  noticeBody: { fontSize: 12, lineHeight: 18, color: muted, marginTop: 5 },
  search: { backgroundColor: "#FFFFFF", borderColor: "#BDBDC4", borderWidth: 1, borderRadius: 10, color: ink, minHeight: 48, paddingHorizontal: 12, marginTop: 18, fontSize: 14 },
  filters: { flexDirection: "row", gap: 8, marginTop: 13 },
  filter: { flexGrow: 1, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 9, backgroundColor: "#F5F5F7", paddingHorizontal: 6 },
  selected: { backgroundColor: ink },
  filterText: { fontSize: 12, color: ink, fontWeight: "600" },
  selectedText: { color: "#FFFFFF" },
  counter: { fontSize: 12, color: muted, marginTop: 14, marginBottom: 12 },
  columns: { gap: 10 },
  card: { borderColor: "#E2E2E5", borderWidth: 1, borderRadius: 15, padding: 16, marginBottom: 11, backgroundColor: "#FFFFFF" },
  cardWide: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "700", color: ink },
  context: { fontSize: 12, marginTop: 5, color: muted },
  state: { fontSize: 11, marginTop: 10, fontWeight: "700", color: "#5F5F65" },
  description: { fontSize: 12, marginTop: 7, lineHeight: 19, color: muted },
  action: { minHeight: 44, alignItems: "flex-start", justifyContent: "center", marginTop: 10 },
  actionText: { fontSize: 12, color: "#0066CC", fontWeight: "600" },
  source: { marginTop: 7, borderTopWidth: 1, borderColor: "#E2E2E5", paddingTop: 9 },
  publisher: { fontSize: 12, color: ink, fontWeight: "600" },
  sourceText: { fontSize: 11, lineHeight: 16, color: muted, marginTop: 4 },
  empty: { color: muted, fontSize: 13, paddingTop: 24 }
});
