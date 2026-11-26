/**
 * Android/Expo research preview only. No sign-in, network, FDA records,
 * clinical interpretation or public/customer data entitlement.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { mobileDarkPalette, mobileLightPalette } from "./appearance";

export const US_FDA_MOBILE_SOURCES = Object.freeze([
  { id: "labels", title: "Drug labeling", notice: "The submitted label is not proof of current approval." },
  { id: "approvals", title: "Drugs@FDA applications", notice: "Application records require independent regulatory interpretation." },
  { id: "ndc", title: "NDC directory", notice: "NDC assignment is not FDA approval." },
  { id: "adverse-events", title: "FAERS adverse-event reports", notice: "Reports do not establish incidence or causation." },
  { id: "recalls", title: "Drug recall enforcement", notice: "Source status can change and needs independent checking." }
] as const);

export const US_FDA_MOBILE_RELEASE = Object.freeze({
  signedAppIdentitiesVerified: false,
  nativeOidcPkceApproved: false,
  mfaAccepted: false,
  protectedBoardApiVerified: false,
  sourceRightsAccepted: false,
  customerPublicationAllowed: false,
  canFetchProtectedFacts: false
});

export function USFdaSourcePreviewScreen({ darkMode }: { darkMode: boolean }) {
  const tokens = darkMode ? mobileDarkPalette : mobileLightPalette;
  const styles = StyleSheet.create({
    container: { gap: 12 },
    heading: { fontSize: 22, fontWeight: "600", color: tokens.primary },
    intro: { fontSize: 15, lineHeight: 22, color: tokens.secondary },
    card: { padding: 16, gap: 7, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, backgroundColor: tokens.grouped },
    cardHeading: { color: tokens.primary, fontSize: 17, fontWeight: "600" },
    detail: { color: tokens.secondary, fontSize: 14, lineHeight: 20 },
    state: { color: tokens.tertiary, fontSize: 12, fontWeight: "500" }
  });
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>United States FDA sources</Text>
      <Text style={styles.intro}>
        Five documented source types, not five connected mobile APIs. This private preview contains no medicines, patient records, credentials or live FDA requests.
      </Text>
      <Text style={styles.intro}>
        Native PKCE, MFA, signed Android identity, board API authorization, source rights and release acceptance must pass before protected research is enabled.
      </Text>
      {US_FDA_MOBILE_SOURCES.map((source) => (
        <View key={source.id} style={styles.card} accessible accessibilityLabel={source.title + ". Not connected. " + source.notice}>
          <Text style={styles.cardHeading}>{source.title}</Text>
          <Text style={styles.detail}>{source.notice}</Text>
          <Text style={styles.state}>Not connected on Android</Text>
        </View>
      ))}
    </View>
  );
}
