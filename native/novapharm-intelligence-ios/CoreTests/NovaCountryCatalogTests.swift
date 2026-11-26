import Testing
@testable import NovaPharmNativeCore

@Suite("Offline national research reference boundaries")
struct NovaCountryCatalogTests {
    @Test func exactCountryAndResearchScopeCounts() {
        #expect(NovaCountryCatalog.all.count == 101)
        #expect(NovaCountryCatalog.all.filter { $0.coverage == .sourceCandidatesOnly }.count == 77)
        #expect(NovaCountryCatalog.all.filter { $0.coverage == .geographyResearchOnly }.count == 24)
        #expect(Set(NovaCountryCatalog.all.map(\.iso2)).count == 101)
        #expect(NovaCountryCatalog.licensedSources == 0)
        #expect(NovaCountryCatalog.liveNationalCountries == 0)
    }

    @Test(arguments: NovaCountryCatalog.all) func noCountryGrantsDataOrPublication(_ country: NovaCountryReference) {
        #expect(!country.hasApprovedMedicineSource)
        #expect(!country.customerLive)
        #expect(country.iso2.count == 2)
        #expect(!country.country.isEmpty)
        #expect(!country.region.isEmpty)
        #expect(country.candidateSourceCount >= 0)
        if country.coverage == .geographyResearchOnly {
            #expect(country.candidateSourceCount == 0)
        }
    }
}
