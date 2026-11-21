import Foundation

/// An injected, short-lived Cognito access-token provider. A signed native app
/// must obtain these through an accepted system-browser OIDC/PKCE session;
/// this client neither stores tokens nor interprets their role claims.
public typealias NovaFDAAccessTokenProvider = @Sendable () async throws -> String

public enum NovaFDAGatewayError: Error, Equatable, Sendable {
    case notApproved
    case invalidRequest
    case unauthorized
    case quotaExceeded
    case sourceUnavailable
    case invalidSourceResponse
}

public enum NovaFDAGatewayKind: String, CaseIterable, Sendable {
    case labels
    case approvals
    case ndc
    case adverseEvents = "adverse-events"
    case recalls
}

public struct NovaFDAGatewayConfig: Sendable {
    public let privateAPIOrigin: URL
    public let expectedPrivateAPIHost: String
    public let mobileSessionAccepted: Bool
    public let privateRouteAccepted: Bool
    public let independentRightsAccepted: Bool
    public let signedAppIdentityAccepted: Bool

    public init(privateAPIOrigin: URL, expectedPrivateAPIHost: String,
        mobileSessionAccepted: Bool, privateRouteAccepted: Bool,
        independentRightsAccepted: Bool, signedAppIdentityAccepted: Bool) {
        self.privateAPIOrigin = privateAPIOrigin
        self.expectedPrivateAPIHost = expectedPrivateAPIHost
        self.mobileSessionAccepted = mobileSessionAccepted
        self.privateRouteAccepted = privateRouteAccepted
        self.independentRightsAccepted = independentRightsAccepted
        self.signedAppIdentityAccepted = signedAppIdentityAccepted
    }

    public var isApprovedConfiguration: Bool {
        guard mobileSessionAccepted && privateRouteAccepted &&
            independentRightsAccepted && signedAppIdentityAccepted,
            privateAPIOrigin.scheme == "https",
            privateAPIOrigin.host == expectedPrivateAPIHost,
            privateAPIOrigin.port == nil,
            privateAPIOrigin.user == nil,
            privateAPIOrigin.password == nil,
            (privateAPIOrigin.path.isEmpty || privateAPIOrigin.path == "/"),
            privateAPIOrigin.query == nil, privateAPIOrigin.fragment == nil else { return false }
        return expectedPrivateAPIHost.hasSuffix(".amazonaws.com") ||
            expectedPrivateAPIHost.hasSuffix(".novapharmhealthcare.com")
    }
}

public struct NovaFDASourceRow: Decodable, Sendable {
    public let productNdc: String?
    public let applicationNumber: String?
    public let recallNumber: String?
    public let recordId: String?
    public let setId: String?
    public let genericName: String?
    public let brandName: String?
    public let classification: String?
}

public struct NovaFDASourceResponse: Decodable, Sendable {
    public let sourceId: String
    public let dataState: String
    public let matchedCountReported: Int?
    public let records: [NovaFDASourceRow]
}

private final class NovaFDANoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

public struct NovaFDAProtectedResearchClient: Sendable {
    public let config: NovaFDAGatewayConfig
    private let session: URLSession

    public init(config: NovaFDAGatewayConfig) {
        self.config = config
        let options = URLSessionConfiguration.ephemeral
        options.timeoutIntervalForRequest = 8
        options.timeoutIntervalForResource = 12
        options.urlCache = nil
        options.httpCookieStorage = nil
        self.session = URLSession(configuration: options, delegate: NovaFDANoRedirects(), delegateQueue: nil)
    }

    public func search(kind: NovaFDAGatewayKind, drug: String,
        accessToken: NovaFDAAccessTokenProvider) async throws -> NovaFDASourceResponse {
        // Config alone cannot grant network access from the offline native preview.
        guard NovaNativeReleasePolicy.productionApproved &&
            NovaNativeReleasePolicy.authenticatedMobileClientAvailable &&
            NovaNativeReleasePolicy.protectedNetworkOperationsEnabled &&
            config.isApprovedConfiguration else { throw NovaFDAGatewayError.notApproved }
        let term = drug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard term.count >= 2 && term.count <= 64 &&
            term.range(of: #"^[A-Za-z][A-Za-z0-9 -]{1,63}$"#,
                options: .regularExpression) != nil else { throw NovaFDAGatewayError.invalidRequest }
        let token = try await accessToken()
        guard token.count >= 40 && token.count <= 8192 &&
            token.range(of: #"^[A-Za-z0-9_.~-]+$"#, options: .regularExpression) != nil
            else { throw NovaFDAGatewayError.unauthorized }
        var url = URLComponents(url:config.privateAPIOrigin, resolvingAgainstBaseURL:false)
        url?.path = "/v1/intelligence/regulatory/us/fda-research"
        url?.queryItems = [
            URLQueryItem(name:"kind",value:kind.rawValue),
            URLQueryItem(name:"drug",value:term)
        ]
        guard let target=url?.url, target.scheme=="https",
            target.host==config.expectedPrivateAPIHost else { throw NovaFDAGatewayError.invalidRequest }
        var req = URLRequest(url:target, cachePolicy:.reloadIgnoringLocalAndRemoteCacheData,
            timeoutInterval:8)
        req.httpMethod="GET"
        req.setValue("application/json",forHTTPHeaderField:"Accept")
        req.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")
        let (data,response) = try await session.data(for:req)
        guard let http=response as? HTTPURLResponse, response.url==target
            else { throw NovaFDAGatewayError.sourceUnavailable }
        if http.statusCode==401 || http.statusCode==403 { throw NovaFDAGatewayError.unauthorized }
        if http.statusCode==429 { throw NovaFDAGatewayError.quotaExceeded }
        guard http.statusCode==200,
            http.value(forHTTPHeaderField:"Content-Type")?.lowercased().contains("application/json")==true,
            data.count <= 256*1024 else { throw NovaFDAGatewayError.sourceUnavailable }
        guard let result=try? JSONDecoder().decode(NovaFDASourceResponse.self,from:data),
            result.records.count <= 5,
            ["public_source_observations","no_source_matches"].contains(result.dataState),
            result.sourceId == (kind == .labels ? "us.fda.openfda-labels" : "us.fda.openfda."+kind.rawValue),
            (kind != .adverseEvents || result.records.isEmpty)
            else { throw NovaFDAGatewayError.invalidSourceResponse }
        return result
    }
}
