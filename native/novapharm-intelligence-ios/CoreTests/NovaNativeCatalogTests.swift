import Testing
@testable import NovaPharmNativeCore

@Suite("NovaPharm native iOS offline boundaries")
struct NovaNativeCatalogTests {
    @Test func workspaceCounts() {
        #expect(NovaCatalog.intelligence.count == 22)
        #expect(NovaCatalog.customerPortal.count == 10)
        #expect(NovaCatalog.distribution.count == 9)
        #expect(NovaCatalog.all.count == 41)
    }

    @Test func uniqueIdentifiersAndSourceStatus() {
        #expect(Set(NovaCatalog.all.map(\.id)).count == NovaCatalog.all.count)
        #expect(Set(NovaCatalog.intelligence.map(\.slug)).count == 22)
        #expect(NovaCatalog.intelligence.filter { $0.availability == .webReadOnly }.count == 5)
        #expect(NovaCatalog.customerPortal.allSatisfy { $0.availability == .planning })
        #expect(NovaCatalog.distribution.allSatisfy { $0.availability == .planning })
    }

    @Test(arguments: NovaCatalog.all) func protectedModuleIsNeverAvailable(_ workspace: NovaWorkspace) {
        #expect(!NovaNativeReleasePolicy.canOpenProtectedWorkspace(workspace))
        #expect(!workspace.id.isEmpty)
        #expect(!workspace.title.isEmpty)
    }

    @Test func noProductionClaims() {
        #expect(!NovaNativeReleasePolicy.productionApproved)
        #expect(!NovaNativeReleasePolicy.authenticatedMobileClientAvailable)
        #expect(!NovaNativeReleasePolicy.protectedNetworkOperationsEnabled)
        #expect(!NovaNativeReleasePolicy.billingEnabled)
        #expect(!NovaNativeReleasePolicy.privateDataCachingEnabled)
    }
}
