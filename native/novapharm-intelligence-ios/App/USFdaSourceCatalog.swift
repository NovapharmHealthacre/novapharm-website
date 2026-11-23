import Foundation

/// Metadata only: public-source records and protected NovaPharm sessions are not bundled.
public struct NovaFDAResearchSource: Identifiable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let caution: String

    public init(id: String, title: String, caution: String) {
        self.id = id
        self.title = title
        self.caution = caution
    }
}

public enum NovaFDAMobileReadiness {
    public static let nativeAuthenticated = false
    public static let authorizedResearchGatewayConnected = false
    public static let sourceRightsAccepted = false
    public static let realSourceRecordsAvailable = false

    public static let sources: [NovaFDAResearchSource] = [
        .init(id: "labels", title: "FDA drug labeling", caution: "Submitted labeling is not proof of current approval or suitability."),
        .init(id: "approvals", title: "Drugs@FDA applications", caution: "Verify approvals and product status from original application evidence."),
        .init(id: "ndc", title: "National Drug Code directory", caution: "An NDC listing does not establish FDA approval."),
        .init(id: "adverse-events", title: "FAERS adverse-event reports", caution: "Reports cannot establish causation or incidence."),
        .init(id: "recalls", title: "Drug recall enforcement", caution: "Recall status is time-dependent and source-specific.")
    ]

    public static var canRequestProtectedFDAResearch: Bool {
        nativeAuthenticated && authorizedResearchGatewayConnected && sourceRightsAccepted
    }
}
