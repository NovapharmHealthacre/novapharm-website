/**
 * Offline country-source discovery for the same Expo bundle on iOS and Android.
 * Reads only publicly discoverable, rights-unreviewed reference METADATA from the shared web catalogue.
 * No HTTP, customer authentication, medicine records or source-use rights.
 */
import React, { useMemo, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, TextInput, useColorScheme, useWindowDimensions, View } from "react-native";
import catalogue from "../../docs/intelligence/country-101-client-catalog-20261118.json";
import ownerNationalBrief from "../../docs/intelligence/owner-national-pharma-source-brief-20261120.json";
import integrationPlan from "../../docs/intelligence/global-integration-execution-20261126.json";
import worldwide from "../../docs/intelligence/worldwide-jurisdiction-scope-20261126.json";
import { mobileDarkPalette, mobileLightPalette } from "./appearance";

type Country = (typeof catalogue.countries)[number];
const ownerBriefByCountry = new Map(ownerNationalBrief.countries.map((brief) => [brief.country, brief] as const));
type Filter = "all" | "with-sources" | "research-only";
const filters: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "with-sources", label: "Candidates" },
  { key: "research-only", label: "Research" }
];
type MobilePalette = Readonly<Record<keyof typeof mobileLightPalette, string>>;
type CountryStyles = ReturnType<typeof createStyles>;

function CountryCard({ country, wide, styles }: { country: Country; wide: boolean; styles: CountryStyles }) {
  const [expanded, setExpanded] = useState(false);
  const [externalLinkError, setExternalLinkError] = useState("");
  const ownerBrief = ownerBriefByCountry.get(country.country);
  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <Text style={styles.name} accessibilityRole="header">{country.country}</Text>
      <Text style={styles.context}>{country.iso2} · {country.region}</Text>
      <Text style={styles.state}>{country.candidateSourceCount ? "Candidate sources only" : "National source research needed"}</Text>
      <Text style={styles.description}>{country.candidateSourceCount
        ? country.candidateSourceCount + " publisher reference(s). Licensing, ingestion and customer publication not approved."
        : "No country-level pharmaceutical dataset identified or admitted."}</Text>
      {ownerBrief && (
        <View style={styles.source}>
          <Text style={styles.state}>Owner-supplied national research requirements · Not independently verified</Text>
          <Text style={styles.sourceText}>{ownerBrief.pharmaceuticalDataRequired}</Text>
          <Text style={styles.sourceText}>{ownerBrief.sourceAccessAsSupplied}</Text>
          <Text style={styles.sourceText}>External publisher links are user-initiated; opening one contacts the destination site.</Text>
          {ownerBrief.references.map((reference) => (
            <Pressable key={reference.url} style={styles.action} accessibilityRole="link"
              accessibilityLabel={"Open unverified external source reference " + reference.label}
              onPress={() => {
                setExternalLinkError("");
                if (!/^https:\/\/[a-z0-9.-]+(?:\/|\?|$)/i.test(reference.url)) {
                  setExternalLinkError("This source reference URL is not safe to open.");
                  return;
                }
                void Linking.openURL(reference.url).catch(() => {
                  setExternalLinkError("Unable to open the external publisher reference.");
                });
              }}>
              <Text style={styles.actionText}>{reference.label} · External website</Text>
            </Pressable>
          ))}
          {!!externalLinkError && <Text style={styles.sourceText} accessibilityRole="alert">{externalLinkError}</Text>}
          <Text style={styles.sourceText}>Reference metadata only · No approved data licence · No connected upstream API</Text>
        </View>
      )}
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
              <Text style={styles.sourceText}>{integrationPlan.sources.find((entry) => entry.candidateKey === source.candidateKey)?.verifiedSourceCodeIds.length ? "Backend adapter source candidate exists; not a live feed" : "Adapter implementation or verification outstanding"}</Text>
              <Text style={styles.sourceText}>{source.domains}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function CountryDirectoryScreen() {
  const darkMode = useColorScheme() === "dark";
  const palette = darkMode ? mobileDarkPalette : mobileLightPalette;
  const styles = useMemo(() => createStyles(palette), [darkMode]);
  const { width, fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.4;
  // Prevent cramped two-column cards at accessibility text sizes.
  const twoColumns = width >= 760 && !largeText;
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
        ownerBriefByCountry.get(country.country)?.pharmaceuticalDataRequired ?? "",
        ownerBriefByCountry.get(country.country)?.sourceAccessAsSupplied ?? "",
        ...country.candidateSources.map((source) => source.provider + " " + source.domains)
      ].join(" ").normalize("NFKC").toLocaleLowerCase().includes(term);
    });
  }, [filter, query]);

  const extraMatches = worldwide.jurisdictions.filter((entry) => !entry.existingCountryCatalogue && filter !== "with-sources" && `${entry.displayName} ${entry.code}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const [showWorldwide, setShowWorldwide] = useState(false);
  const header = (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>Global source evidence</Text>
      <Text style={styles.title} accessibilityRole="header">Worldwide research</Text>
      <Text style={styles.explanation}>77 countries with publisher candidates and owner-supplied research requirements. 173 worldwide jurisdictions require further source discovery. No pharmaceutical feeds or commercial reuse rights have been approved.</Text>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.number}>{worldwide.summary.jurisdictions}</Text><Text style={styles.metricLabel}>Research jurisdictions</Text></View>
        <View style={styles.metric}><Text style={styles.number}>77</Text><Text style={styles.metricLabel}>With candidate source</Text></View>
        <View style={styles.metric}><Text style={styles.number}>{catalogue.summary.addedResearchOnlyNationalCountries + worldwide.summary.newResearchScopes}</Text><Text style={styles.metricLabel}>Source discovery needed</Text></View>
        <View style={styles.metric}><Text style={styles.number}>0</Text><Text style={styles.metricLabel}>Customer-live</Text></View>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Unapproved research metadata</Text>
        <Text style={styles.noticeBody}>No live medicine records, approved source rights, clinical decisions, product availability or authenticated upstream access. Official regulator APIs must be connected only through a separately approved backend.</Text>
      </View>
      <TextInput style={styles.search} accessibilityLabel="Search countries or source candidates"
        placeholder="Country, code or publisher" placeholderTextColor={palette.tertiary} autoCapitalize="none"
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
      <Text style={styles.counter} accessibilityLiveRegion="polite">{countries.length} existing research matches · {extraMatches.length} additional worldwide matches · no customer-live feeds</Text>
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
      renderItem={({ item }) => <CountryCard country={item} wide={twoColumns} styles={styles} />}
      ListHeaderComponent={header}
      ListEmptyComponent={!extraMatches.length ? <Text style={styles.empty}>No matching countries. No data is inferred.</Text>  : undefined}
      ListFooterComponent={extraMatches.length ? <View style={styles.header}><Pressable style={styles.action} accessibilityRole="button" accessibilityState={{expanded: showWorldwide || !!query.trim()}} onPress={() => setShowWorldwide(!showWorldwide)}><Text style={styles.actionText}>Additional worldwide research ({extraMatches.length})</Text></Pressable>{(showWorldwide || !!query.trim()) && extraMatches.map((entry) => <View key={entry.code} style={styles.source}><Text style={styles.publisher}>{entry.displayName} · {entry.code}</Text><Text style={styles.sourceText}>{entry.authorityLead ? `WHO-listed research lead: ${entry.authorityLead.name} · Dataset verification required` : "Authority and dataset discovery required"} · No live feed</Text></View>)}</View>  : undefined}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
    />
  );
}

function createStyles(palette: MobilePalette) {
  return StyleSheet.create({
  list: { flex: 1, backgroundColor: palette.canvas },
  container: { paddingHorizontal: 20, paddingBottom: 26, maxWidth: 1000, width: "100%", alignSelf: "center" },
  header: { paddingTop: 22, paddingBottom: 14 },
  eyebrow: { color: palette.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: palette.primary, fontSize: 29, fontWeight: "700", marginTop: 5 },
  explanation: { fontSize: 13, color: palette.secondary, lineHeight: 20, marginTop: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 19 },
  metric: { flexGrow: 1, minWidth: 130, padding: 14, backgroundColor: palette.grouped, borderRadius: 12 },
  number: { fontSize: 26, fontWeight: "700", color: palette.primary },
  metricLabel: { color: palette.secondary, marginTop: 4, fontSize: 11 },
  notice: { backgroundColor: palette.grouped, borderRadius: 12, padding: 15, marginTop: 17 },
  noticeTitle: { fontSize: 13, color: palette.primary, fontWeight: "700" },
  noticeBody: { fontSize: 12, lineHeight: 18, color: palette.secondary, marginTop: 5 },
  search: { backgroundColor: palette.canvas, borderColor: palette.border, borderWidth: 1, borderRadius: 10, color: palette.primary, minHeight: 48, paddingHorizontal: 12, marginTop: 18, fontSize: 17 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 },
  filter: { flexGrow: 1, minWidth: 92, alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 9, backgroundColor: palette.grouped, paddingHorizontal: 8 },
  selected: { backgroundColor: palette.primary },
  filterText: { fontSize: 12, color: palette.primary, fontWeight: "600" },
  selectedText: { color: palette.canvas },
  counter: { fontSize: 12, color: palette.secondary, marginTop: 14, marginBottom: 12 },
  columns: { gap: 10 },
  card: { borderColor: palette.border, borderWidth: 1, borderRadius: 15, padding: 16, marginBottom: 11, backgroundColor: palette.canvas },
  cardWide: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "700", color: palette.primary },
  context: { fontSize: 12, marginTop: 5, color: palette.secondary },
  state: { fontSize: 11, marginTop: 10, fontWeight: "700", color: palette.tertiary },
  description: { fontSize: 12, marginTop: 7, lineHeight: 19, color: palette.secondary },
  action: { minHeight: 44, alignItems: "flex-start", justifyContent: "center", marginTop: 10 },
  actionText: { fontSize: 12, color: palette.accent, fontWeight: "600" },
  source: { marginTop: 7, borderTopWidth: 1, borderColor: palette.border, paddingTop: 9 },
  publisher: { fontSize: 12, color: palette.primary, fontWeight: "600" },
  sourceText: { fontSize: 11, lineHeight: 16, color: palette.secondary, marginTop: 4 },
  empty: { color: palette.secondary, fontSize: 13, paddingTop: 24 }
  });
}
