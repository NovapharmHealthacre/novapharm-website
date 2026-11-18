import Foundation

/// Candidate adapter, not an app, authentication implementation, model or release approval.
/// Uses only the existing protected NovaPharm gateway. Never talks to a model host.
public struct NovaClipVisualResult: Decodable, Sendable {
    public let rank: Int
    public let assetId: String
    public let title: String
    public let rightsReference: String
    public let sourceUrl: URL
    public let status: String
}
public struct NovaClipVisualResponse: Decodable, Sendable {
    public let contract: String
    public let query: String
    public let results: [NovaClipVisualResult]
    public let humanReviewRequired: Bool
    public let similarityIsNotEvidence: Bool
    public let regulatoryStatusVerified: Bool
    public let productIdentityVerified: Bool
}
public enum NovaClipVisualError: Error {
    case invalidConfiguration, invalidQuery, unavailable, invalidResponse
}

@available(iOS 17.0, macOS 14.0, *)
public struct NovaClipVisualSearch {
    private let trustedPortalOrigin: URL

    /// Must originate from signed, app-controlled configuration, not pasted URLs.
    public init(trustedPortalOrigin: URL) throws {
        guard trustedPortalOrigin.scheme == "https",
              trustedPortalOrigin.host == "portal.novapharmhealthcare.com",
              trustedPortalOrigin.user == nil, trustedPortalOrigin.password == nil,
              trustedPortalOrigin.path.isEmpty || trustedPortalOrigin.path == "/" else {
            throw NovaClipVisualError.invalidConfiguration
        }
        self.trustedPortalOrigin = trustedPortalOrigin
    }

    /// Caller supplies the existing authenticated/CSRF-bound session from a
    /// trusted sign-in flow. No credentials are persisted by this adapter.
    public func search(
        query: String,
        csrfToken: String,
        session: URLSession
    ) async throws -> NovaClipVisualResponse {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 3, trimmed.count <= 240, !csrfToken.isEmpty,
              !trimmed.unicodeScalars.contains(where: { $0.value < 32 || $0.value == 127 }) else {
            throw NovaClipVisualError.invalidQuery
        }
        var request = URLRequest(url: trustedPortalOrigin.appendingPathComponent("gateway/v1/intelligence/visual/search"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(csrfToken, forHTTPHeaderField: "X-CSRF-Token")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["query": trimmed, "limit": 5])
        request.timeoutInterval = 8
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw NovaClipVisualError.unavailable
        }
        let result = try JSONDecoder().decode(NovaClipVisualResponse.self, from: data)
        guard result.contract == "novapharm.intelligence.visual-search.v1",
              result.humanReviewRequired, result.similarityIsNotEvidence,
              !result.regulatoryStatusVerified, !result.productIdentityVerified,
              result.results.count <= 5,
              result.results.allSatisfy({ $0.sourceUrl.scheme == "https" && $0.status == "unverified_visual_match" }) else {
            throw NovaClipVisualError.invalidResponse
        }
        return result
    }
}
