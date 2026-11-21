import AuthenticationServices
import CryptoKit
import Foundation
import Security
import UIKit

/// Host-controlled OIDC configuration: never read client IDs or redirects from a remote API.
struct NovaFDAOIDCConfiguration: Sendable {
    let clientID: String
    let authorizeURL: URL
    let tokenURL: URL
    let redirectURL: URL
    let expectedBundleID: String
    let acceptedNativeClient: Bool

    func isValid(bundleID: String?) -> Bool {
        guard acceptedNativeClient, bundleID == expectedBundleID,
              expectedBundleID != "com.example.NovaPharmNativePreview",
              authorizeURL.scheme == "https", tokenURL.scheme == "https",
              authorizeURL.host == tokenURL.host,
              authorizeURL.path == "/oauth2/authorize", tokenURL.path == "/oauth2/token",
              authorizeURL.host?.hasSuffix(".auth.eu-north-1.amazoncognito.com") == true,
              redirectURL.scheme != nil, redirectURL.host == "oauth",
              redirectURL.path == "/callback",
              (redirectURL.scheme ?? "").hasPrefix("novapharm"),
              !clientID.isEmpty else { return false }
        return true
    }
}

private enum NovaFDAOIDCError: Error {
    case unapproved, entropy, callback, state, token
}

private func fdaURLSafeBase64(_ value: Data) -> String {
    value.base64EncodedString().replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
}

private func secureRandomData(length: Int) throws -> Data {
    var bytes = [UInt8](repeating: 0, count: length)
    guard SecRandomCopyBytes(kSecRandomDefault, length, &bytes) == errSecSuccess
        else { throw NovaFDAOIDCError.entropy }
    return Data(bytes)
}

private struct NovaFDATokenResponse: Decodable {
    let access_token: String
    let token_type: String
    let expires_in: Int
}

/// Stores access token only. No refresh token, ID token, password or user profile.
final class NovaFDAKeychainAccessTokenStore {
    private let service = "com.novapharm.intelligence.fda"
    func clear() {
        SecItemDelete([kSecClass:kSecClassGenericPassword,
            kSecAttrService:service,kSecAttrAccount:"access"] as CFDictionary)
    }
    func save(_ token: String, expiresIn: Int) throws {
        guard expiresIn > 0 && expiresIn <= 3600 else { throw NovaFDAOIDCError.token }
        let payload = "\(Date().addingTimeInterval(TimeInterval(expiresIn-30)).timeIntervalSince1970)|\(token)"
        clear()
        let status = SecItemAdd([
            kSecClass:kSecClassGenericPassword,kSecAttrService:service,kSecAttrAccount:"access",
            kSecValueData:Data(payload.utf8),
            kSecAttrAccessible:kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecAttrSynchronizable:kCFBooleanFalse as Any
        ] as CFDictionary,nil)
        guard status == errSecSuccess else { throw NovaFDAOIDCError.token }
    }
    func token() -> String? {
        var result: CFTypeRef?
        let status=SecItemCopyMatching([
            kSecClass:kSecClassGenericPassword,kSecAttrService:service,
            kSecAttrAccount:"access",kSecReturnData:true,kSecMatchLimit:kSecMatchLimitOne
        ] as CFDictionary,&result)
        guard status == errSecSuccess,let data=result as? Data,
              let value=String(data:data,encoding:.utf8),
              let separator=value.firstIndex(of:"|"),
              let expiry=Double(value[..<separator]),
              expiry>Date().timeIntervalSince1970 else { clear();return nil }
        return String(value[value.index(after:separator)...])
    }
}

@MainActor
final class NovaFDACognitoMobileSession: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let config: NovaFDAOIDCConfiguration
    private let store=NovaFDAKeychainAccessTokenStore()
    private var activeSession: ASWebAuthenticationSession?

    init(config: NovaFDAOIDCConfiguration) { self.config=config;super.init() }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
            if let window = scene.windows.first(where: { $0.isKeyWindow }) { return window }
        }
        return ASPresentationAnchor()
    }

    func signOut() { activeSession?.cancel();activeSession=nil;store.clear() }
    func cachedAccessToken() -> String? {
        guard NovaNativeReleasePolicy.productionApproved &&
              NovaNativeReleasePolicy.authenticatedMobileClientAvailable &&
              NovaNativeReleasePolicy.protectedNetworkOperationsEnabled &&
              config.isValid(bundleID:Bundle.main.bundleIdentifier) else {return nil}
        return store.token()
    }

    func beginSignIn(completion: @escaping @Sendable (Result<String, Error>)->Void) {
        guard NovaNativeReleasePolicy.productionApproved &&
              NovaNativeReleasePolicy.authenticatedMobileClientAvailable &&
              NovaNativeReleasePolicy.protectedNetworkOperationsEnabled &&
              config.isValid(bundleID:Bundle.main.bundleIdentifier) else {
            completion(.failure(NovaFDAOIDCError.unapproved));return
        }
        do {
            let verifier=fdaURLSafeBase64(try secureRandomData(length:32))
            let state=fdaURLSafeBase64(try secureRandomData(length:32))
            let challenge=fdaURLSafeBase64(Data(SHA256.hash(data:Data(verifier.utf8))))
            var authorize=URLComponents(url:config.authorizeURL,resolvingAgainstBaseURL:false)
            authorize?.queryItems=[
                URLQueryItem(name:"client_id",value:config.clientID),
                URLQueryItem(name:"redirect_uri",value:config.redirectURL.absoluteString),
                URLQueryItem(name:"response_type",value:"code"),
                URLQueryItem(name:"scope",value:"openid profile novapharm/fda.read"),
                URLQueryItem(name:"state",value:state),
                URLQueryItem(name:"code_challenge_method",value:"S256"),
                URLQueryItem(name:"code_challenge",value:challenge)
            ]
            guard let url=authorize?.url,let scheme=config.redirectURL.scheme else {
                throw NovaFDAOIDCError.unapproved
            }
            let session=ASWebAuthenticationSession(url:url,callbackURLScheme:scheme) { [weak self] callback,error in
                Task { @MainActor in
                    guard let self else {completion(.failure(NovaFDAOIDCError.callback));return}
                    self.activeSession=nil
                    do {
                        guard error==nil,let callback,
                              callback.scheme == self.config.redirectURL.scheme,
                              callback.host == self.config.redirectURL.host,
                              callback.path == self.config.redirectURL.path,
                              let items=URLComponents(url:callback,resolvingAgainstBaseURL:false)?.queryItems,
                              items.first(where:{$0.name=="state"})?.value==state,
                              let code=items.first(where:{$0.name=="code"})?.value,!code.isEmpty
                              else {throw NovaFDAOIDCError.state}
                        let token=try await self.exchange(code:code,verifier:verifier)
                        completion(.success(token))
                    } catch {self.store.clear();completion(.failure(error))}
                }
            }
            session.prefersEphemeralWebBrowserSession=true
            session.presentationContextProvider=self
            activeSession=session
            guard session.start() else {throw NovaFDAOIDCError.unapproved}
        } catch { activeSession=nil;completion(.failure(error)) }
    }

    private func exchange(code:String,verifier:String) async throws -> String {
        var req=URLRequest(url:config.tokenURL,cachePolicy:.reloadIgnoringLocalCacheData,timeoutInterval:10)
        req.httpMethod="POST"
        req.setValue("application/x-www-form-urlencoded",forHTTPHeaderField:"Content-Type")
        let values=[
            URLQueryItem(name:"grant_type",value:"authorization_code"),
            URLQueryItem(name:"client_id",value:config.clientID),
            URLQueryItem(name:"code",value:code),
            URLQueryItem(name:"redirect_uri",value:config.redirectURL.absoluteString),
            URLQueryItem(name:"code_verifier",value:verifier)
        ]
        var form=URLComponents()
        form.queryItems=values
        req.httpBody=form.percentEncodedQuery?.data(using:.utf8)
        let session=URLSession(configuration:.ephemeral)
        let (data,response)=try await session.data(for:req)
        guard let http=response as? HTTPURLResponse,
              http.statusCode==200,response.url==config.tokenURL,data.count<=16384,
              let token=try? JSONDecoder().decode(NovaFDATokenResponse.self,from:data),
              token.token_type.lowercased()=="bearer",token.access_token.count>40
              else {throw NovaFDAOIDCError.token}
        try store.save(token.access_token,expiresIn:token.expires_in)
        return token.access_token
    }
}
