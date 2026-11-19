/**
 * Cross-platform, offline location reference tool for the Expo research candidate.
 * No position permission, background tracking, network fetch or map credential.
 * Apple Maps URLs open the operating system's external map/browser on demand.
 */
import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

function decimal(value: string, minimum: number, maximum: number): number | null {
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/u.test(value.trim())) return null;
  const result = Number(value.trim());
  return Number.isFinite(result) && result >= minimum && result <= maximum ? result : null;
}

export function MapsResearchScreen() {
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
    const target = `https://maps.apple.com/?ll=${encodeURIComponent(String(lat))},${encodeURIComponent(String(lon))}&q=${encodeURIComponent(safeLabel)}`;
    setOpening(true);
    try {
      await Linking.openURL(target);
      setStatus("Opened the reference coordinate in an external map. The point has not been independently verified.");
    } catch {
      setStatus("No compatible map/browser could open the reference. The app did not transmit or save it.");
    } finally {
      setOpening(false);
    }
  }

  return <View style={styles.wrapper}>
    <Text style={styles.heading} accessibilityRole="header">Maps and location</Text>
    <Text style={styles.description}>Research preview. Enter a non-sensitive, source-reviewed reference coordinate. This opens an external map on iOS or Android; it is not the platform's live, authenticated geography dataset.</Text>
    <View style={styles.form}>
      <Text style={styles.label}>Latitude</Text>
      <TextInput accessibilityLabel="Latitude in decimal degrees" value={latitude} onChangeText={setLatitude}
        placeholder="e.g. 51.500" keyboardType="numbers-and-punctuation" autoCapitalize="none"
        style={styles.input} placeholderTextColor="#595961" />
      <Text style={styles.label}>Longitude</Text>
      <TextInput accessibilityLabel="Longitude in decimal degrees" value={longitude} onChangeText={setLongitude}
        placeholder="e.g. -0.120" keyboardType="numbers-and-punctuation" autoCapitalize="none"
        style={styles.input} placeholderTextColor="#595961" />
      <Text style={styles.label}>Reference label (optional)</Text>
      <TextInput accessibilityLabel="Reference label" value={label} onChangeText={setLabel}
        placeholder="Organisation or site reference" maxLength={80} style={styles.input}
        placeholderTextColor="#595961" />
      <Pressable accessibilityRole="button" accessibilityLabel="Open reference in external maps" disabled={opening}
        style={[styles.button, opening && styles.disabled]} onPress={() => void openMap()}>
        <Text style={styles.buttonText}>Open in Maps</Text>
      </Pressable>
      <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>
    </View>
    <Text style={styles.note}>No device-location permission, account access, saved locations, delivery tracking or live pharmacy data. A reference map is not clinical, commercial or routing evidence. Indoor IMDF requires an authorised real venue and surveyed floor geometry.</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: 12 },
  heading: { color: "#1D1D1F", fontSize: 23, lineHeight: 31, fontWeight: "700", marginBottom: 8 },
  description: { color: "#424245", fontSize: 17, lineHeight: 25, marginBottom: 18 },
  form: { gap: 10, borderColor: "#D2D2D7", borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { color: "#1D1D1F", fontSize: 15, lineHeight: 21, fontWeight: "600" },
  input: { minHeight: 48, color: "#1D1D1F", borderColor: "#D2D2D7", borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, fontSize: 17 },
  button: { minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: "#1D1D1F", borderRadius: 12, marginTop: 10 },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  status: { color: "#424245", fontSize: 14, lineHeight: 21, marginTop: 4 },
  note: { color: "#595961", fontSize: 14, lineHeight: 22 }
});
