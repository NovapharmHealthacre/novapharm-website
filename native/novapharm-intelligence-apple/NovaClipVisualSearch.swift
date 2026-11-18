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

/// Per-task redirect denial so an authenticated request cannot follow an unexpected host.
private final class NovaClipNoRedirectDelegate: NSObject, URLSessionTaskDelegate {
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }
}

@available(iOS 17.0, macOS 14.0, *)
public struct NovaClipVisualSearch {
    private let trustedPortalOrigin: URL

    /// Must originate from signed, app-controlled configuration, not pasted URLs.
    public init(trustedPortalOrigin: URL) throws {
        guard trustedPortalOrigin.scheme == "https",
              trustedPortalOrigin.host == "portal.novapharmhealthcare.com",
              trustedPortalOrigin.user == nil, trustedPortalOrigin.password == nil,
              (trustedPortalOrigin.port == nil || trustedPortalOrigin.port == 443),
              trustedPortalOrigin.query == nil, trustedPortalOrigin.fragment == nil,
              (trustedPortalOrigin.path.isEmpty || trustedPortalOrigin.path == "/") else {
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
        let (data, response) = try await session.data(
            for: request, delegate: NovaClipNoRedirectDelegate()
        )
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              http.url == request.url, data.count <= 32_768 else {
            throw NovaClipVisualError.unavailable
        }
        let result = try JSONDecoder().decode(NovaClipVisualResponse.self, from: data)
        guard result.contract == "novapharm.intelligence.visual-search.v1",
              result.humanReviewRequired, result.similarityIsNotEvidence,
              !result.regulatoryStatusVerified, !result.productIdentityVerified,
              result.results.count <= 5,
              Set(result.results.map(\.assetId)).count == result.results.count,
              result.results.enumerated().allSatisfy({ index, candidate in
                  candidate.rank == index + 1 &&
                  !candidate.assetId.isEmpty && candidate.assetId.count <= 120 &&
                  !candidate.title.isEmpty && candidate.title.count <= 200 &&
                  !candidate.rightsReference.isEmpty &&
                  candidate.sourceUrl.scheme == "https" &&
                  candidate.sourceUrl.user == nil && candidate.sourceUrl.password == nil &&
                  candidate.sourceUrl.fragment == nil &&
                  candidate.status == "unverified_visual_match"
              }) else {
            throw NovaClipVisualError.invalidResponse
        }
        return result
    }
}
