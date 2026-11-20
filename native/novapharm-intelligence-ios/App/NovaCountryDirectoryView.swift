import SwiftUI

/// Offline reference discovery only. No regulator API, live medicine data, login or source grant.
struct NovaCountryDirectoryView: View {
    private enum CoverageFilter: String, CaseIterable {
        case all = "All"
        case candidates = "Candidates"
        case research = "Research"
    }

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var searchText = ""
    @State private var filter: CoverageFilter = .all

    private var visibleCountries: [NovaCountryReference] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        return NovaCountryCatalog.all.filter { country in
            let matchesCoverage = switch filter {
            case .all: true
            case .candidates: country.coverage == .sourceCandidatesOnly
            case .research: country.coverage == .geographyResearchOnly
            }
            let matchesQuery = query.isEmpty
                || country.country.localizedCaseInsensitiveContains(query)
                || country.iso2.localizedCaseInsensitiveContains(query)
                || country.region.localizedCaseInsensitiveContains(query)
            return matchesCoverage && matchesQuery
        }
    }

    private var regions: [String] {
        Array(Set(visibleCountries.map(\.region))).sorted()
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 7) {
                    Text("COUNTRY RESEARCH DIRECTORY")
                        .font(.caption.weight(.semibold))
                    Text("101 national scopes. 77 have candidate source references; 24 need further publisher research.")
                        .font(.subheadline)
                    Text("0 independently approved national sources. 0 customer-live countries. No medicine facts or private information are loaded.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 5)
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("novapharm.countries.readonly-notice")
            }
            Section {
                if dynamicTypeSize.isAccessibilitySize {
                    Picker("Reference coverage", selection: $filter) {
                        ForEach(CoverageFilter.allCases, id: \.self) { value in
                            Text(value.rawValue).tag(value)
                        }
                    }
                    .pickerStyle(.menu)
                    .accessibilityIdentifier("novapharm.countries.coverage-filter")
                } else {
                    Picker("Reference coverage", selection: $filter) {
                        ForEach(CoverageFilter.allCases, id: \.self) { value in
                            Text(value.rawValue).tag(value)
                        }
                    }
                    .pickerStyle(.segmented)
                    .accessibilityIdentifier("novapharm.countries.coverage-filter")
                }
                LabeledContent("Matching countries", value: "\(visibleCountries.count)")
                    .accessibilityIdentifier("novapharm.countries.count")
            }
            ForEach(regions, id: \.self) { region in
                Section(region) {
                    ForEach(visibleCountries.filter { $0.region == region }) { country in
                        NavigationLink {
                            NovaCountryDetailView(country: country)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(country.country)
                                    .font(.body.weight(.semibold))
                                Text("\(country.iso2) · \(country.candidateSourceCount) candidate reference(s)")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Text(country.coverage == .sourceCandidatesOnly
                                    ? "Unapproved discovery references"
                                    : "Geography-only research scope")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 5)
                        }
                        .accessibilityIdentifier("novapharm.country.\(country.iso2)")
                    }
                }
            }
            if visibleCountries.isEmpty {
                ContentUnavailableView.search(text: searchText)
            }
        }
        .searchable(text: $searchText, prompt: "Country, ISO code or region")
        .navigationTitle("Countries")
    }
}

private struct NovaCountryDetailView: View {
    let country: NovaCountryReference

    var body: some View {
        List {
            Section("Reference identity") {
                LabeledContent("Country", value: country.country)
                LabeledContent("ISO 3166-1 alpha-2", value: country.iso2)
                LabeledContent("Research region", value: country.region)
            }
            Section("Unverified source discovery") {
                LabeledContent("Publisher reference candidates", value: "\(country.candidateSourceCount)")
                LabeledContent("Licence / source access", value: "Not reviewed")
                LabeledContent("Medicine datasets admitted", value: "None")
                LabeledContent("Customer publication", value: "Disabled")
                    .accessibilityIdentifier("novapharm.country.live-status")
                Text(country.coverage == .sourceCandidatesOnly
                    ? "Existing discovery references need independent publisher rights, source validation and release authorization."
                    : "This scope has no admitted national medicine-level dataset. Publisher research and independent evidence are required.")
                    .foregroundStyle(.secondary)
            }
            Section("Safety and release requirements") {
                Text("Source links, national medicine data, commercial and AI reuse, clinical decisions and customer availability are not enabled in this offline iOS app.")
                    .font(.subheadline)
            }
        }
        .navigationTitle(country.country)
    }
}
