/**
 * Offline, source-only previews for future NovaPharm customer and distribution
 * mobile workspaces. These are NOT live portal, WMS, ordering, stock or finance
 * operations. Do not import any account, inventory or product datasets here.
 */
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mobileDarkPalette, mobileLightPalette } from "./appearance";

export type PreviewArea = "customer-portal" | "distribution";
type Palette = Readonly<Record<keyof typeof mobileLightPalette, string>>;
type WorkspacePreview = Readonly<{
  id: string;
  title: string;
  purpose: string;
  releaseGate: string;
}>;

export const PRIVATE_PREVIEW_MODULES: Readonly<Record<PreviewArea, readonly WorkspacePreview[]>> =
  Object.freeze({
    "customer-portal": Object.freeze([
      { id: "dashboard", title: "Dashboard", purpose: "Private account and order overview",
        releaseGate: "Authenticated, scoped customer account and proven source freshness" },
      { id: "account", title: "My Account", purpose: "Company profile, contacts and address book",
        releaseGate: "Cognito MFA, explicit user consent and server-enforced account scope" },
      { id: "products", title: "Products", purpose: "Approved business-to-business catalogue",
        releaseGate: "Licensing, approved products, country availability and customer prices" },
      { id: "prices", title: "Price Lists", purpose: "Contract and customer-specific price access",
        releaseGate: "Server-side price entitlements and audit logging" },
      { id: "orders", title: "Orders", purpose: "Review order history and submit authorized requests",
        releaseGate: "Tenant-bound order services, validation, approval and idempotency" },
      { id: "invoices", title: "Invoices", purpose: "Review authorized invoices and documents",
        releaseGate: "Account-scoped billing records, retention and secure document delivery" },
      { id: "statements", title: "Statements", purpose: "Review company account statements",
        releaseGate: "Finance reconciliation and strict role-based document access" },
      { id: "delivery", title: "Delivery Tracking", purpose: "Track permitted shipments and receipt evidence",
        releaseGate: "Shipment-to-customer authorization and carrier data-sharing approval" },
      { id: "documents", title: "Documents", purpose: "Retrieve approved records and certificates",
        releaseGate: "Document classification, rights, access expiry and download audit" },
      { id: "support", title: "Support Tickets", purpose: "Track account support requests",
        releaseGate: "Authenticated support workflow and confidential-data controls" }
    ]),
    "distribution": Object.freeze([
      { id: "inventory", title: "Inventory", purpose: "Warehouse stock by location and SKU",
        releaseGate: "Authorized WMS integration and reconciled stock balances" },
      { id: "batches", title: "Batches & FEFO", purpose: "Batch, expiry and first-expiry-first-out visibility",
        releaseGate: "Validated batch identity, expiry, QA status and approved allocations" },
      { id: "quality", title: "Quality Assurance", purpose: "Quarantine, release and exception review",
        releaseGate: "Qualified-person controls where applicable and segregated QA permissions" },
      { id: "replenishment", title: "Replenishment", purpose: "Review reorder and stock transfer candidates",
        releaseGate: "Approved planning data and authorised supply decisions" },
      { id: "pick", title: "Pick & Pack", purpose: "Warehouse task and packing traceability",
        releaseGate: "Validated picking tasks, barcode checks and operator identity" },
      { id: "dispatch", title: "Dispatch", purpose: "Carrier handover and dispatch status",
        releaseGate: "Controlled shipment creation, carrier service and immutable events" },
      { id: "delivery", title: "Proof of Delivery", purpose: "Review delivery confirmation and exceptions",
        releaseGate: "Authorized customer identity, secure POD storage and retention" },
      { id: "returns", title: "Returns", purpose: "Review returned goods and disposition",
        releaseGate: "QA and GDP return procedures, lot traceability and user permissions" },
      { id: "performance", title: "Performance", purpose: "Operational KPIs and fulfilment quality",
        releaseGate: "Reconciled timestamps, tenant segmentation and approved reporting metrics" }
    ])
  });

const areaText = Object.freeze({
  "customer-portal": {
    title: "Customer Portal",
    summary: "Private module catalogue. No customer, order, invoice, payment or support data is connected."
  },
  "distribution": {
    title: "Distribution",
    summary: "Private WMS module catalogue. No stock, batch, warehouse, dispatch or QA service is connected."
  }
});

export function PrivateOperationsPreviewScreen({
  area, darkMode = false, selectedId: controlledSelectedId, onSelectedIdChange
}: {
  area: PreviewArea;
  darkMode?: boolean;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null) => void;
}) {
  const palette = darkMode ? mobileDarkPalette : mobileLightPalette;
  const styles = useMemo(() => createStyles(palette), [darkMode]);
  const [query, setQuery] = useState("");
  // Parent-controlled selection lets Android Back close this detail before leaving the preview.
  // Standalone research previews retain their existing local state behavior.
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId === undefined ? localSelectedId : controlledSelectedId;
  const setSelectedId = onSelectedIdChange ?? setLocalSelectedId;

  const modules = PRIVATE_PREVIEW_MODULES[area];
  const selected = modules.find(item => item.id === selectedId) || null;
  const filtered = modules.filter(item =>
    (item.title + " " + item.purpose).toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()));

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>{areaText[area].title}</Text>
      <Text style={styles.description}>{areaText[area].summary}</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Private planning preview · no live access</Text>
        <Text style={styles.noticeText}>
          These are navigation and release-prerequisite screens only. There is no sign-in,
          customer data, stock, medicine processing, transaction, API or external network request.
        </Text>
      </View>
      {selected ? (
        <View>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to module catalogue"
            onPress={() => setSelectedId(null)} style={styles.button}>
            <Text style={styles.buttonText}>Back to modules</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.moduleTitle}>{selected.title}</Text>
          <Text style={styles.description}>{selected.purpose}</Text>
          <Text style={styles.label}>Required before activation</Text>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{selected.releaseGate}</Text>
            <Text style={styles.state}>Not connected · Not authorized · Not production verified</Text>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.label}>Search planned workspaces</Text>
          <TextInput
            accessibilityLabel={"Search " + areaText[area].title + " modules"}
            value={query} onChangeText={setQuery} autoCapitalize="none"
            placeholder="Search modules" placeholderTextColor={palette.tertiary}
            returnKeyType="search" style={styles.input}
          />
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {filtered.length} of {modules.length} planned modules
          </Text>
          {filtered.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.title + ". Not connected. Read release requirements."}
              accessibilityHint="Opens private module planning details only"
              onPress={() => setSelectedId(item.id)}
              style={styles.module}
            >
              <Text style={styles.moduleTitle}>{item.title}</Text>
              <Text style={styles.description}>{item.purpose}</Text>
              <Text style={styles.state}>Not connected</Text>
            </Pressable>
          ))}
          {filtered.length === 0 &&
            <Text style={styles.description}>No planned modules match this search.</Text>}
        </View>
      )}
      <Text style={styles.footer}>
        Production release requires secure mobile identity, MFA, server-side permissions,
        data-rights approval, complete device/accessibility testing and owner authorization.
      </Text>
    </View>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    section: { paddingVertical: 12 },
    heading: { fontSize: 24, lineHeight: 32, color: palette.primary, fontWeight: "700", marginBottom: 8 },
    description: { color: palette.secondary, fontSize: 16, lineHeight: 24, marginBottom: 8 },
    notice: { backgroundColor: palette.grouped, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: palette.border, marginVertical: 10 },
    noticeTitle: { color: palette.primary, fontSize: 17, lineHeight: 25, fontWeight: "600", marginBottom: 4 },
    noticeText: { color: palette.secondary, fontSize: 16, lineHeight: 24 },
    label: { color: palette.primary, fontSize: 16, lineHeight: 24, fontWeight: "600", marginTop: 10, marginBottom: 7 },
    input: { color: palette.primary, fontSize: 17, minHeight: 50, borderWidth: 1, borderColor: palette.border,
      borderRadius: 12, paddingHorizontal: 14 },
    count: { color: palette.secondary, fontSize: 14, lineHeight: 22, marginVertical: 12 },
    module: { minHeight: 72, borderWidth: 1, borderColor: palette.border, borderRadius: 14,
      padding: 16, marginBottom: 12, backgroundColor: palette.canvas },
    moduleTitle: { color: palette.primary, fontSize: 18, lineHeight: 27, fontWeight: "600", marginBottom: 5 },
    state: { color: palette.tertiary, fontSize: 14, lineHeight: 22, marginTop: 6 },
    button: { minHeight: 48, justifyContent: "center", paddingHorizontal: 14,
      borderRadius: 12, backgroundColor: palette.grouped, alignSelf: "flex-start", marginBottom: 18 },
    buttonText: { color: palette.primary, fontSize: 16, fontWeight: "600" },
    footer: { color: palette.tertiary, fontSize: 14, lineHeight: 22, marginTop: 16 }
  });
}
