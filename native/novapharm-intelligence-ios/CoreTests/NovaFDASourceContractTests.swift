import Testing
@testable import NovaPharmNativeCore

@Suite("US FDA mobile source contract")
struct NovaFDASourceContractTests {
    @Test func fiveOfflineSourceTypes() {
        #expect(NovaFDAMobileReadiness.sources.count == 5)
        #expect(Set(NovaFDAMobileReadiness.sources.map(\.id)).count == 5)
        #expect(NovaFDAMobileReadiness.sources.map(\.id) ==
            ["labels", "approvals", "ndc", "adverse-events", "recalls"])
    }

    @Test func noUnsupportedNativeAccess() {
        #expect(!NovaFDAMobileReadiness.nativeAuthenticated)
        #expect(!NovaFDAMobileReadiness.authorizedResearchGatewayConnected)
        #expect(!NovaFDAMobileReadiness.sourceRightsAccepted)
        #expect(!NovaFDAMobileReadiness.realSourceRecordsAvailable)
        #expect(!NovaFDAMobileReadiness.canRequestProtectedFDAResearch)
        #expect(!NovaNativeReleasePolicy.protectedNetworkOperationsEnabled)
    }
}
