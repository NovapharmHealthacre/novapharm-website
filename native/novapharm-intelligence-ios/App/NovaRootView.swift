import Charts
import SwiftData
import SwiftUI

/// Fully native SwiftUI navigation. No WebView or embedded React Native application.
struct NovaRootView: View {
    var body: some View {
        TabView {
            NavigationStack { IntelligenceHomeView() }
                .tabItem { Text("Intelligence") }
            NavigationStack { WorkspaceListView(area: .customerPortal) }
                .tabItem { Text("Portal") }
            NavigationStack { WorkspaceListView(area: .distribution) }
                .tabItem { Text("Distribution") }
            NavigationStack { SavedModulesView() }
                .tabItem { Text("Saved") }
        }
        .tint(NovaTheme.accent)
    }
}

private struct PreviewNotice: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PRIVATE SWIFT PREVIEW")
                .font(.caption.weight(.bold))
                .foregroundStyle(NovaTheme.primaryInk)
            Text("No mobile sign-in, live medicine data, customer records, payments or warehouse operations are enabled.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(NovaTheme.surface, in: RoundedRectangle(cornerRadius: 14))
        .accessibilityElement(children: .combine)
    }
}

private struct IntelligenceHomeView: View {
    // SwiftUI adapts this chart's height to larger accessibility text sizes.
    @ScaledMetric(relativeTo: .body) private var moduleChartHeight: CGFloat = 180

    // VoiceOver must receive the same current catalogue counts as the chart.
    private var moduleChartAccessibilitySummary: String {
        "Module catalogue sizes: " + NovaArea.allCases.map { area in
            "\(area.title) \(NovaCatalog.modules(in: area).count)"
        }.joined(separator: ", ")
    }

    var body: some View {
        List {
            Section {
                PreviewNotice()
            }
            Section("Documented mobile module coverage") {
                Text("These are source catalogue counts, not live operational KPIs.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Chart(NovaArea.allCases, id: \.rawValue) { area in
                    BarMark(
                        x: .value("Planned modules", NovaCatalog.modules(in: area).count),
                        y: .value("Area", area.title)
                    )
                    .foregroundStyle(NovaTheme.accent)
                }
                .frame(height: moduleChartHeight)
                .accessibilityLabel(moduleChartAccessibilitySummary)
                .accessibilityIdentifier("novapharm.intelligence.modules-chart")
                ForEach(NovaArea.allCases, id: \.rawValue) { area in
                    LabeledContent(area.title, value: "\(NovaCatalog.modules(in: area).count) documented modules")
                        .font(.subheadline)
                }
            }
            Section("Intelligence") {
                NavigationLink("US FDA regulatory sources (offline preview)") {
                    NovaFDASourcePreviewView()
                }
                .accessibilityIdentifier("novapharm.intelligence.fda")
                NavigationLink("Explore 101 country research scopes") {
                    NovaCountryDirectoryView()
                }
                .accessibilityIdentifier("novapharm.intelligence.countries")
                NavigationLink("Explore \(NovaCatalog.modules(in: .intelligence).count) research workspaces") {
                    WorkspaceListView(area: .intelligence)
                }
                .accessibilityIdentifier("novapharm.intelligence.workspaces")
                Text("Existing read-only website foundations are not mobile services. Source rights and tenant authentication remain blocked.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Intelligence")
        .scrollContentBackground(.hidden)
        .background(NovaTheme.background)
    }
}

private struct WorkspaceListView: View {
    let area: NovaArea
    @State private var searchText = ""

    private var filtered: [NovaWorkspace] {
        let items = NovaCatalog.modules(in: area)
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return items }
        return items.filter {
            $0.title.localizedCaseInsensitiveContains(query) ||
            $0.summary.localizedCaseInsensitiveContains(query) ||
            $0.group.localizedCaseInsensitiveContains(query)
        }
    }
    private var groups: [String] {
        var groups: [String] = []
        for module in filtered where !groups.contains(module.group) { groups.append(module.group) }
        return groups
    }

    var body: some View {
        List {
            Section { PreviewNotice() }
            ForEach(groups, id: \.self) { group in
                Section(group) {
                    ForEach(filtered.filter { $0.group == group }) { module in
                        NavigationLink {
                            ModuleDetailView(module: module)
                        } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(module.title).font(.body.weight(.semibold))
                                Text(module.summary).font(.subheadline).foregroundStyle(.secondary)
                                Text(module.availability.rawValue)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 6)
                            .accessibilityElement(children: .combine)
                        }
                        .accessibilityIdentifier("novapharm.workspace.\(module.id)")
                    }
                }
            }
            if filtered.isEmpty {
                ContentUnavailableView.search(text: searchText)
            }
        }
        .searchable(text: $searchText, prompt: "Search planned workspaces")
        .navigationTitle(area.title)
        .scrollContentBackground(.hidden)
        .background(NovaTheme.background)
    }
}

private struct ModuleDetailView: View {
    let module: NovaWorkspace
    @Environment(\.modelContext) private var context
    @Query private var saved: [OfflineBookmark]
    @State private var bookmarkError = false

    private var existingBookmark: OfflineBookmark? {
        saved.first { $0.workspaceID == module.id }
    }

    var body: some View {
        List {
            Section {
                Text(module.summary)
                    .font(.body)
                LabeledContent("Current status", value: module.availability.rawValue)
                LabeledContent("Area", value: module.area.title)
            } header: { Text("Scope") }

            Section("Release requirements") {
                Text("Requires dedicated Cognito mobile OIDC/PKCE, MFA, validated native callback, revocable sessions, server-side tenant and data-rights checks, accessibility/device testing and independent approval.")
                Text("No operational action is available in this preview.")
                    .foregroundStyle(.secondary)
            }

            Section("Personal navigation") {
                Button(existingBookmark == nil ? "Save module shortcut" : "Remove saved shortcut") {
                    if let bookmark = existingBookmark {
                        context.delete(bookmark)
                    } else {
                        context.insert(OfflineBookmark(workspaceID: module.id))
                    }
                    do {
                        try context.save()
                    } catch {
                        bookmarkError = true
                    }
                }
                .accessibilityIdentifier("novapharm.bookmark.toggle")
                .frame(minHeight: 44)
                .alert("Local shortcut unavailable", isPresented: $bookmarkError) {
                    Button("OK", role: .cancel) { }
                } message: {
                    Text("Unable to save this module shortcut on this device.")
                }
                Text("Only this public module identifier is stored locally using SwiftData. No customer content is cached.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle(module.title)
        .scrollContentBackground(.hidden)
        .background(NovaTheme.background)
    }
}

private struct SavedModulesView: View {
    @Query(sort: \OfflineBookmark.createdAt, order: .reverse) private var saved: [OfflineBookmark]

    var body: some View {
        List {
            Section {
                Text("Local navigation preferences only. No documents, profiles or medicine records are stored.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            ForEach(saved, id: \.workspaceID) { bookmark in
                if let module = NovaCatalog.lookup(id: bookmark.workspaceID) {
                    NavigationLink(module.title) { ModuleDetailView(module: module) }
                        .accessibilityIdentifier("novapharm.saved.\(module.id)")
                }
            }
            if saved.isEmpty {
                ContentUnavailableView("No saved modules", systemImage: "bookmark", description: Text("Save shortcuts from a module's details."))
            }
        }
        .navigationTitle("Saved")
        .scrollContentBackground(.hidden)
        .background(NovaTheme.background)
    }
}
