import SwiftUI

/// Offline reference discovery only. No regulator API, live medicine data, login or source grant.
struct NovaCountryDirectoryView: View {
    private enum CoverageFilter: String, CaseIterable {
        case all = "All"
        case candidates = "Candidates"
        case research = "Research"
    }

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

    private var additionalWorldwide: [(code: String, name: String)] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard filter != .candidates else { return [] }
        return Self.worldwideExtension.filter { query.isEmpty || $0.code.localizedCaseInsensitiveContains(query) || $0.name.localizedCaseInsensitiveContains(query) }
    }

    private static let whoAuthorityLeads: [String: String] = [
        "AF": "Afghanistan Food and Drug Authority",
        "AO": "ARMED",
        "BB": "Barbados Drug Service",
        "BY": "Ministry of Health pharmaceutical inspection department",
        "BJ": "ABRP",
        "BT": "Drug Regulatory Authority",
        "BN": "Department of Pharmaceutical Services",
        "BF": "ANRP",
        "BI": "ABREMA",
        "NI": "Ministry of Health medical supplies standardisation directorate",
        "SB": "Ministry of Health and Medical Services pharmacy services",
        "SD": "National Medicines and Poisons Board",
        "SR": "Ministry of Health",
        "SY": "Ministry of Health pharmaceutical affairs directorate",
        "TG": "Public Health pharmacies and laboratories directorate",
        "TT": "Ministry of Health chemistry, food and drugs division",
        "TM": "Medical Products Registration and State Quality Control Centre",
        "VE": "Instituto Nacional de Higiene Rafael Rangel",
        "XK": "Kosovo drug regulatory authority (historical UNMIK entry)"
    ]

    private static let worldwideExtension: [(code: String, name: String)] = [
        ("AF", "Afghanistan"),
        ("AX", "Åland Islands"),
        ("AL", "Albania"),
        ("AS", "American Samoa"),
        ("AD", "Andorra"),
        ("AO", "Angola"),
        ("AI", "Anguilla"),
        ("AQ", "Antarctica"),
        ("AG", "Antigua & Barbuda"),
        ("AW", "Aruba"),
        ("AZ", "Azerbaijan"),
        ("BS", "Bahamas"),
        ("BB", "Barbados"),
        ("BY", "Belarus"),
        ("BZ", "Belize"),
        ("BJ", "Benin"),
        ("BM", "Bermuda"),
        ("BT", "Bhutan"),
        ("BA", "Bosnia & Herzegovina"),
        ("BV", "Bouvet Island"),
        ("IO", "British Indian Ocean Territory"),
        ("VG", "British Virgin Islands"),
        ("BN", "Brunei"),
        ("BF", "Burkina Faso"),
        ("BI", "Burundi"),
        ("CV", "Cape Verde"),
        ("BQ", "Caribbean Netherlands"),
        ("KY", "Cayman Islands"),
        ("CF", "Central African Republic"),
        ("TD", "Chad"),
        ("CX", "Christmas Island"),
        ("CC", "Cocos (Keeling) Islands"),
        ("KM", "Comoros"),
        ("CG", "Congo - Brazzaville"),
        ("CD", "Congo - Kinshasa"),
        ("CK", "Cook Islands"),
        ("CU", "Cuba"),
        ("CW", "Curaçao"),
        ("DJ", "Djibouti"),
        ("DM", "Dominica"),
        ("SV", "El Salvador"),
        ("GQ", "Equatorial Guinea"),
        ("ER", "Eritrea"),
        ("SZ", "Eswatini"),
        ("FK", "Falkland Islands (Islas Malvinas)"),
        ("FO", "Faroe Islands"),
        ("FJ", "Fiji"),
        ("GF", "French Guiana"),
        ("PF", "French Polynesia"),
        ("TF", "French Southern Territories"),
        ("GA", "Gabon"),
        ("GM", "Gambia"),
        ("GI", "Gibraltar"),
        ("GL", "Greenland"),
        ("GD", "Grenada"),
        ("GP", "Guadeloupe"),
        ("GU", "Guam"),
        ("GG", "Guernsey"),
        ("GN", "Guinea"),
        ("GW", "Guinea-Bissau"),
        ("GY", "Guyana"),
        ("HT", "Haiti"),
        ("HM", "Heard & McDonald Islands"),
        ("HN", "Honduras"),
        ("HK", "Hong Kong"),
        ("IR", "Iran"),
        ("IQ", "Iraq"),
        ("IM", "Isle of Man"),
        ("JM", "Jamaica"),
        ("JE", "Jersey"),
        ("KZ", "Kazakhstan"),
        ("KI", "Kiribati"),
        ("XK", "Kosovo"),
        ("KG", "Kyrgyzstan"),
        ("LA", "Laos"),
        ("LB", "Lebanon"),
        ("LS", "Lesotho"),
        ("LR", "Liberia"),
        ("LY", "Libya"),
        ("MO", "Macao"),
        ("MG", "Madagascar"),
        ("MW", "Malawi"),
        ("MV", "Maldives"),
        ("ML", "Mali"),
        ("MH", "Marshall Islands"),
        ("MQ", "Martinique"),
        ("MR", "Mauritania"),
        ("MU", "Mauritius"),
        ("YT", "Mayotte"),
        ("FM", "Micronesia"),
        ("MD", "Moldova"),
        ("MC", "Monaco"),
        ("ME", "Montenegro"),
        ("MS", "Montserrat"),
        ("MZ", "Mozambique"),
        ("NR", "Nauru"),
        ("NC", "New Caledonia"),
        ("NI", "Nicaragua"),
        ("NE", "Niger"),
        ("NU", "Niue"),
        ("NF", "Norfolk Island"),
        ("KP", "North Korea"),
        ("MK", "North Macedonia"),
        ("MP", "Northern Mariana Islands"),
        ("PW", "Palau"),
        ("PS", "Palestine"),
        ("PG", "Papua New Guinea"),
        ("PN", "Pitcairn Islands"),
        ("PR", "Puerto Rico"),
        ("RE", "Réunion"),
        ("WS", "Samoa"),
        ("SM", "San Marino"),
        ("ST", "São Tomé & Príncipe"),
        ("SC", "Seychelles"),
        ("SL", "Sierra Leone"),
        ("SX", "Sint Maarten"),
        ("SB", "Solomon Islands"),
        ("SO", "Somalia"),
        ("GS", "South Georgia & South Sandwich Islands"),
        ("SS", "South Sudan"),
        ("BL", "St. Barthélemy"),
        ("SH", "St. Helena"),
        ("KN", "St. Kitts & Nevis"),
        ("LC", "St. Lucia"),
        ("MF", "St. Martin"),
        ("PM", "St. Pierre & Miquelon"),
        ("VC", "St. Vincent & Grenadines"),
        ("SD", "Sudan"),
        ("SR", "Suriname"),
        ("SJ", "Svalbard & Jan Mayen"),
        ("SY", "Syria"),
        ("TJ", "Tajikistan"),
        ("TL", "Timor-Leste"),
        ("TG", "Togo"),
        ("TK", "Tokelau"),
        ("TO", "Tonga"),
        ("TT", "Trinidad & Tobago"),
        ("TM", "Turkmenistan"),
        ("TC", "Turks & Caicos Islands"),
        ("TV", "Tuvalu"),
        ("UM", "U.S. Outlying Islands"),
        ("VI", "U.S. Virgin Islands"),
        ("UZ", "Uzbekistan"),
        ("VU", "Vanuatu"),
        ("VA", "Vatican City"),
        ("VE", "Venezuela"),
        ("WF", "Wallis & Futuna"),
        ("EH", "Western Sahara"),
        ("YE", "Yemen")
    ]

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 7) {
                    Text("COUNTRY RESEARCH DIRECTORY")
                        .font(.caption.weight(.semibold))
                    Text("250 worldwide jurisdictions. 101 existing research scopes; 149 additional scopes require authority and dataset discovery.")
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
                Picker("Reference coverage", selection: $filter) {
                    ForEach(CoverageFilter.allCases, id: \.self) { value in
                        Text(value.rawValue).tag(value)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("novapharm.countries.coverage-filter")
                LabeledContent("Matching countries", value: "\(visibleCountries.count + additionalWorldwide.count)")
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
            if !additionalWorldwide.isEmpty {
                Section("Additional worldwide research") {
                    ForEach(additionalWorldwide.indices, id: \.self) { index in
                        let entry = additionalWorldwide[index]
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.name).font(.body.weight(.semibold))
                            Text(entry.code + " · " + (Self.whoAuthorityLeads[entry.code].map { "WHO-listed research lead: " + $0 + " · Dataset verification required" } ?? "Authority and dataset discovery required") + " · No live feed").font(.caption).foregroundStyle(.secondary)
                        }.accessibilityIdentifier("novapharm.worldwide." + entry.code)
                    }
                }
            }
            if visibleCountries.isEmpty && additionalWorldwide.isEmpty {
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
                    .accessibilityIdentifier("novapharm.country.rights-status")
                LabeledContent("Medicine datasets admitted", value: "None")
                LabeledContent("Customer publication", value: "Disabled")
                    .accessibilityIdentifier("novapharm.country.live-status")
                Text(country.coverage == .sourceCandidatesOnly
                    ? "Existing discovery references need independent publisher rights, source validation and release authorization."
                    : "This scope has no admitted national medicine-level dataset. Publisher research and independent evidence are required.")
                    .foregroundStyle(.secondary)
            }
            Section("Backend integration planning") {
                Text(["CA", "PL", "PT", "SG", "ES", "GB", "US"].contains(country.iso2) ? "Backend adapter source candidate exists; not a live feed" : "Adapter implementation or verification outstanding")
                    .font(.subheadline)
            }
            Section("Safety and release requirements") {
                Text("Source links, national medicine data, commercial and AI reuse, clinical decisions and customer availability are not enabled in this offline iOS app.")
                    .font(.subheadline)
            }
        }
        .navigationTitle(country.country)
    }
}
