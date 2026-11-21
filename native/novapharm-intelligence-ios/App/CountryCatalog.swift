import Foundation

/// Generated offline directory from docs/intelligence/country-101-client-catalog-20261118.json
/// Public publisher-reference metadata only; NOT medicine records, live integrations or rights approvals.
public enum NovaCountryCoverage: String, Codable, Sendable {
    case sourceCandidatesOnly
    case geographyResearchOnly
}

public struct NovaCountryReference: Identifiable, Codable, Equatable, Sendable {
    public let iso2: String
    public let country: String
    public let region: String
    public let coverage: NovaCountryCoverage
    public let candidateSourceCount: Int

    public var id: String { iso2 }
    public var hasApprovedMedicineSource: Bool { false }
    public var customerLive: Bool { false }

    public init(iso2: String, country: String, region: String,
                coverage: NovaCountryCoverage, candidateSourceCount: Int) {
        self.iso2 = iso2
        self.country = country
        self.region = region
        self.coverage = coverage
        self.candidateSourceCount = candidateSourceCount
    }
}

public enum NovaCountryCatalog {
    public static let contract = "novapharm.intelligence.country-client-catalog.v1"
    public static let sourceAsOf = "2026-11-18"
    public static let licensedSources = 0
    public static let liveNationalCountries = 0

    /// Keep displayed research coverage aligned with the bundled directory.
    /// Publisher candidates never grant source rights or customer publication.
    public static var candidateSourceCountries: Int {
        all.filter { $0.coverage == .sourceCandidatesOnly }.count
    }
    public static var geographyResearchCountries: Int {
        all.filter { $0.coverage == .geographyResearchOnly }.count
    }
    public static var coverageStatement: String {
        "\(all.count) national scopes. \(candidateSourceCountries) have candidate source references; \(geographyResearchCountries) need further publisher research."
    }

    // Synchronized to the shared source with the native country parity test.
    public static let all: [NovaCountryReference] = [
        .init(iso2: "DZ", country: "Algeria", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "AR", country: "Argentina", region: "Latin America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "AM", country: "Armenia", region: "Asia", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "AU", country: "Australia", region: "Oceania", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "AT", country: "Austria", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "BH", country: "Bahrain", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "BD", country: "Bangladesh", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "BE", country: "Belgium", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "BO", country: "Bolivia", region: "Americas", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "BW", country: "Botswana", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "BR", country: "Brazil", region: "Latin America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "BG", country: "Bulgaria", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "KH", country: "Cambodia", region: "Asia", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "CM", country: "Cameroon", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "CA", country: "Canada", region: "North America", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "CL", country: "Chile", region: "Latin America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "CN", country: "China", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "CO", country: "Colombia", region: "Latin America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "CR", country: "Costa Rica", region: "Americas", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "CI", country: "Côte d’Ivoire", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "HR", country: "Croatia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "CY", country: "Cyprus", region: "Europe", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "CZ", country: "Czechia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "DK", country: "Denmark", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "DO", country: "Dominican Republic", region: "Americas", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "EC", country: "Ecuador", region: "Latin America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "EG", country: "Egypt", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "EE", country: "Estonia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "ET", country: "Ethiopia", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "FI", country: "Finland", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "FR", country: "France", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "GE", country: "Georgia", region: "Asia", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "DE", country: "Germany", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "GH", country: "Ghana", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "GR", country: "Greece", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "GT", country: "Guatemala", region: "Americas", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "HU", country: "Hungary", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "IS", country: "Iceland", region: "Europe", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "IN", country: "India", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 4),
        .init(iso2: "ID", country: "Indonesia", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "IE", country: "Ireland", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "IL", country: "Israel", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "IT", country: "Italy", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "JP", country: "Japan", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "JO", country: "Jordan", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "KE", country: "Kenya", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "KW", country: "Kuwait", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "LV", country: "Latvia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "LI", country: "Liechtenstein", region: "Europe", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "LT", country: "Lithuania", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "LU", country: "Luxembourg", region: "Europe", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "MY", country: "Malaysia", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "MT", country: "Malta", region: "Europe", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "MX", country: "Mexico", region: "North America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "MN", country: "Mongolia", region: "Asia", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "MA", country: "Morocco", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "MM", country: "Myanmar", region: "Asia", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "NA", country: "Namibia", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "NP", country: "Nepal", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "NL", country: "Netherlands", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "NZ", country: "New Zealand", region: "Oceania", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "NG", country: "Nigeria", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "NO", country: "Norway", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "OM", country: "Oman", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "PK", country: "Pakistan", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "PA", country: "Panama", region: "Americas", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "PY", country: "Paraguay", region: "Americas", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "PE", country: "Peru", region: "Latin America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "PH", country: "Philippines", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "PL", country: "Poland", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "PT", country: "Portugal", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "QA", country: "Qatar", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "RO", country: "Romania", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "RU", country: "Russia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "RW", country: "Rwanda", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "SA", country: "Saudi Arabia", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "SN", country: "Senegal", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "RS", country: "Serbia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "SG", country: "Singapore", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "SK", country: "Slovakia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "SI", country: "Slovenia", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "ZA", country: "South Africa", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "KR", country: "South Korea", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "ES", country: "Spain", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "LK", country: "Sri Lanka", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "SE", country: "Sweden", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "CH", country: "Switzerland", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "TW", country: "Taiwan", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "TZ", country: "Tanzania", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "TH", country: "Thailand", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "TN", country: "Tunisia", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "TR", country: "Türkiye", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "UG", country: "Uganda", region: "Africa", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "UA", country: "Ukraine", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "AE", country: "United Arab Emirates", region: "Middle East", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "GB", country: "United Kingdom", region: "Europe", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "US", country: "United States", region: "North America", coverage: .sourceCandidatesOnly, candidateSourceCount: 2),
        .init(iso2: "UY", country: "Uruguay", region: "Latin America", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "VN", country: "Vietnam", region: "Asia Pacific", coverage: .sourceCandidatesOnly, candidateSourceCount: 1),
        .init(iso2: "ZM", country: "Zambia", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
        .init(iso2: "ZW", country: "Zimbabwe", region: "Africa", coverage: .geographyResearchOnly, candidateSourceCount: 0),
    ]

    public static func lookup(iso2: String) -> NovaCountryReference? {
        all.first { $0.iso2 == iso2 }
    }
}
