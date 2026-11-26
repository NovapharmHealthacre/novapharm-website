/**
 * Cross-platform, offline location reference tool for the Expo research candidate.
 * No position permission, background tracking, network fetch or map credential.
 * Platform-specific map URLs open an external map/browser only on user action.
 */
import React, { useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobileDarkPalette, mobileLightPalette } from "./appearance";
import { buildAndroidMapUrl } from "./android-map-url";
type MobilePalette = Readonly<Record<keyof typeof mobileLightPalette, string>>;

function decimal(value: string, minimum: number, maximum: number): number | null {
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/u.test(value.trim())) return null;
  const result = Number(value.trim());
  return Number.isFinite(result) && result >= minimum && result <= maximum ? result : null;
}

export function MapsResearchScreen({ darkMode = false }: { darkMode?: boolean }) {
  const palette = darkMode ? mobileDarkPalette : mobileLightPalette;
  const styles = useMemo(() => createStyles(palette), [darkMode]);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState("No location selected.");
  const [opening, setOpening] = useState(false);

  async function openMap() {
    const lat = decimal(latitude, -90, 90);
    const lon = decimal(longitude, -180, 180);
    if (lat === null || lon === null) {
      setStatus("Enter valid latitude (−90 to 90) and longitude (−180 to 180).");
      return;
    }
    const safeLabel = label.trim().slice(0, 80) || "Reference location";
    const target = Platform.OS === "android"
      ? buildAndroidMapUrl(lat, lon)
      : `https://maps.apple.com/?ll=${encodeURIComponent(String(lat))},${encodeURIComponent(String(lon))}`;
    setOpening(true);
    try {
      await Linking.openURL(target);
      setStatus("Opened " + safeLabel + " in an external map. The reference coordinate has not been independently verified.");
    } catch {
      setStatus("Could not confirm that an external map opened. The app does not store the coordinates.");
    } finally {
      setOpening(false);
    }
  }

  return <View style={styles.wrapper}>
    <Text style={styles.heading} accessibilityRole="header">Maps and location</Text>
    <Text style={styles.description}>Research preview. Enter a non-sensitive, source-reviewed coordinate. Opening an external map shares the coordinates with that provider; your optional reference label stays local and is not included in the link. This is not a live, authenticated geography dataset.</Text>
    <View style={styles.form}>
      <Text style={styles.label}>Latitude</Text>
      <TextInput accessibilityLabel="Latitude in decimal degrees" value={latitude} onChangeText={setLatitude}
        placeholder="e.g. 51.500" keyboardType="numbers-and-punctuation" autoCapitalize="none"
        style={styles.input} placeholderTextColor={palette.tertiary} />
      <Text style={styles.label}>Longitude</Text>
      <TextInput accessibilityLabel="Longitude in decimal degrees" value={longitude} onChangeText={setLongitude}
        placeholder="e.g. -0.120" keyboardType="numbers-and-punctuation" autoCapitalize="none"
        style={styles.input} placeholderTextColor={palette.tertiary} />
      <Text style={styles.label}>Reference label (optional; stays on this screen)</Text>
      <TextInput accessibilityLabel="Reference label" value={label} onChangeText={setLabel}
        placeholder="Non-sensitive local reference" maxLength={80} style={styles.input}
        placeholderTextColor={palette.tertiary} />
      <Pressable accessibilityRole="button" accessibilityLabel="Open reference in external maps" disabled={opening}
        style={[styles.button, opening && styles.disabled]} onPress={() => void openMap()}>
        <Text style={styles.buttonText}>Open in Maps</Text>
      </Pressable>
      <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>
    </View>
    <Text style={styles.note}>No device-location permission, account access, saved locations, delivery tracking or live pharmacy data. A reference map is not clinical, commercial or routing evidence. Indoor IMDF requires an authorised real venue and surveyed floor geometry.</Text>
  </View>;
}

function createStyles(palette: MobilePalette) {
  return StyleSheet.create({
  wrapper: { paddingVertical: 12 },
  heading: { color: palette.primary, fontSize: 23, lineHeight: 31, fontWeight: "700", marginBottom: 8 },
  description: { color: palette.secondary, fontSize: 17, lineHeight: 25, marginBottom: 18 },
  form: { gap: 10, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { color: palette.primary, fontSize: 15, lineHeight: 21, fontWeight: "600" },
  input: { minHeight: 48, color: palette.primary, borderColor: palette.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, fontSize: 17 },
  button: { minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary, borderRadius: 12, marginTop: 10 },
  disabled: { opacity: 0.5 },
  buttonText: { color: palette.canvas, fontSize: 16, fontWeight: "600" },
  status: { color: palette.secondary, fontSize: 14, lineHeight: 21, marginTop: 4 },
  note: { color: palette.tertiary, fontSize: 14, lineHeight: 22 }
  });
}
