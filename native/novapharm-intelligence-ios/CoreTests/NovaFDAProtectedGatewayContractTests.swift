import Foundation
import Testing
@testable import NovaPharmNativeCore

@Suite("Protected US FDA gateway release boundaries")
struct NovaFDAProtectedGatewayContractTests {
    private func configuration(_ host:String="q2e6ztf8ic.execute-api.eu-north-1.amazonaws.com",
        _ enabled:Bool=true)->NovaFDAGatewayConfig {
        NovaFDAGatewayConfig(
            privateAPIOrigin:URL(string:"https://\(host)/")!,
            expectedPrivateAPIHost:host,
            mobileSessionAccepted:enabled,
            privateRouteAccepted:true,
            independentRightsAccepted:true,
            signedAppIdentityAccepted:true
        )
    }

    @Test func allFiveDatasetTypesAreRepresented() {
        #expect(NovaFDAGatewayKind.allCases.map(\.rawValue) ==
            ["labels","approvals","ndc","adverse-events","recalls"])
    }

    @Test func approvedOriginIsExactAndAllGatesAreMandatory() {
        #expect(configuration().isApprovedConfiguration)
        #expect(!configuration("evil.example").isApprovedConfiguration)
        #expect(!configuration("q2e6ztf8ic.execute-api.eu-north-1.amazonaws.com",false).isApprovedConfiguration)
        let spoof = NovaFDAGatewayConfig(
            privateAPIOrigin:URL(string:"https://evil.example/")!,
            expectedPrivateAPIHost:"q2e6ztf8ic.execute-api.eu-north-1.amazonaws.com",
            mobileSessionAccepted:true,privateRouteAccepted:true,
            independentRightsAccepted:true,signedAppIdentityAccepted:true
        )
        #expect(!spoof.isApprovedConfiguration)
    }

    @Test func absentOwnerReleaseNeverInvokesTokenProvider() async {
        let client = NovaFDAProtectedResearchClient(config:configuration())
        do {
            _ = try await client.search(kind:.ndc,drug:"apixaban",accessToken:{
                Issue.record("Unapproved iOS source attempted to read credentials")
                return "unexpected credentials"
            })
            Issue.record("Unapproved iOS FDA client succeeded")
        } catch {
            #expect((error as? NovaFDAGatewayError) == .notApproved)
        }
    }
}
