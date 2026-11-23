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
              authorizeURL.host == "novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com",
              redirectURL.absoluteString == "novapharmintelligence://oauth/callback",
              authorizeURL.user == nil, authorizeURL.password == nil,
              authorizeURL.port == nil, authorizeURL.query == nil, authorizeURL.fragment == nil,
              tokenURL.user == nil, tokenURL.password == nil,
              tokenURL.port == nil, tokenURL.query == nil, tokenURL.fragment == nil,
              clientID.range(of: "^[a-z0-9]{8,64}$", options: .regularExpression) != nil
              else { return false }
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
    @discardableResult
    func clear() -> Bool {
        let status=SecItemDelete([kSecClass:kSecClassGenericPassword,
            kSecAttrService:service,kSecAttrAccount:"access"] as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
    func save(_ token: String, expiresIn: Int) throws {
        guard expiresIn > 0 && expiresIn <= 3600 else { throw NovaFDAOIDCError.token }
        let payload = "\(Date().addingTimeInterval(TimeInterval(expiresIn-30)).timeIntervalSince1970)|\(token)"
        guard clear() else { throw NovaFDAOIDCError.token }
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
    // The current OAuth generation prevents in-flight token exchange from
    // restoring a board token after sign-out or a newer account switch.
    private var authGeneration: UInt64 = 0
    private var accessRevoked = false

    init(config: NovaFDAOIDCConfiguration) { self.config=config;super.init() }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
            if let window = scene.windows.first(where: { $0.isKeyWindow }) { return window }
        }
        return ASPresentationAnchor()
    }

    @discardableResult
    func signOut() -> Bool {
        authGeneration &+= 1
        accessRevoked=true
        activeSession?.cancel()
        activeSession=nil
        return store.clear()
    }
    func cachedAccessToken() -> String? {
        guard !accessRevoked && NovaNativeReleasePolicy.productionApproved &&
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
        // A cancelled or failed account switch must never leave the previous
        // board access token usable while another OAuth session is underway.
        guard activeSession == nil else {
            completion(.failure(NovaFDAOIDCError.unapproved));return
        }
        // Invalidate older exchanges before even attempting Keychain erase.
        // A failed erase must neither restore old access nor let a previous
        // in-flight callback save a token after this account-switch attempt.
        authGeneration &+= 1
        let attemptGeneration=authGeneration
        accessRevoked=true
        guard store.clear() else {
            completion(.failure(NovaFDAOIDCError.token));return
        }
        do {
            let verifier=fdaURLSafeBase64(try secureRandomData(length:32))
            let state=fdaURLSafeBase64(try secureRandomData(length:32))
            let nonce=fdaURLSafeBase64(try secureRandomData(length:32))
            let challenge=fdaURLSafeBase64(Data(SHA256.hash(data:Data(verifier.utf8))))
            var authorize=URLComponents(url:config.authorizeURL,resolvingAgainstBaseURL:false)
            authorize?.queryItems=[
                URLQueryItem(name:"client_id",value:config.clientID),
                URLQueryItem(name:"redirect_uri",value:config.redirectURL.absoluteString),
                URLQueryItem(name:"response_type",value:"code"),
                URLQueryItem(name:"scope",value:"openid profile novapharm/fda.read"),
                URLQueryItem(name:"state",value:state),
                URLQueryItem(name:"nonce",value:nonce),
                URLQueryItem(name:"code_challenge_method",value:"S256"),
                URLQueryItem(name:"code_challenge",value:challenge)
            ]
            guard let url=authorize?.url,let scheme=config.redirectURL.scheme else {
                throw NovaFDAOIDCError.unapproved
            }
            let session=ASWebAuthenticationSession(url:url,callbackURLScheme:scheme) { [weak self] callback,error in
                Task { @MainActor in
                    guard let self else {completion(.failure(NovaFDAOIDCError.callback));return}
                    guard self.authGeneration == attemptGeneration else {
                        completion(.failure(NovaFDAOIDCError.unapproved));return
                    }
                    self.activeSession=nil
                    do {
                        guard error==nil,let callback,
                              callback.scheme == self.config.redirectURL.scheme,
                              callback.host == self.config.redirectURL.host,
                              callback.path == self.config.redirectURL.path,
                              callback.port == nil,callback.user == nil,callback.password == nil,
                              callback.fragment == nil,
                              let items=URLComponents(url:callback,resolvingAgainstBaseURL:false)?.queryItems,
                              items.count==2,
                              items.filter({$0.name=="state"}).count==1,
                              items.filter({$0.name=="code"}).count==1,
                              items.first(where:{$0.name=="state"})?.value==state,
                              let code=items.first(where:{$0.name=="code"})?.value,
                              (1...2048).contains(code.utf8.count),
                              code.utf8.allSatisfy({$0>=0x21 && $0<=0x7E})
                              else {throw NovaFDAOIDCError.state}
                        let token=try await self.exchange(code:code,verifier:verifier,
                                                            generation:attemptGeneration)
                        guard self.authGeneration == attemptGeneration else {
                            throw NovaFDAOIDCError.unapproved
                        }
                        completion(.success(token))
                    } catch {
                        // A stale callback must not clear credentials issued to
                        // a newer, separately authorized sign-in.
                        if self.authGeneration == attemptGeneration { _ = self.store.clear() }
                        completion(.failure(error))
                    }
                }
            }
            session.prefersEphemeralWebBrowserSession=true
            session.presentationContextProvider=self
            activeSession=session
            guard session.start() else {throw NovaFDAOIDCError.unapproved}
        } catch {
            activeSession=nil
            if authGeneration == attemptGeneration { _ = store.clear() }
            completion(.failure(error))
        }
    }

    private func exchange(code:String,verifier:String,generation:UInt64) async throws -> String {
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
        // Never buffer an untrusted token response before checking the 16 KiB
        // limit. The resource deadline covers the body, not only its headers.
        let configuration=URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest=10
        configuration.timeoutIntervalForResource=10
        let session=URLSession(configuration:configuration)
        defer {session.invalidateAndCancel()}
        let (bytes,response)=try await session.bytes(for:req)
        guard let http=response as? HTTPURLResponse,
              http.statusCode==200,response.url==config.tokenURL
              else {throw NovaFDAOIDCError.token}
        var data=Data()
        data.reserveCapacity(16*1024)
        for try await byte in bytes {
            guard data.count<16*1024 else {throw NovaFDAOIDCError.token}
            data.append(byte)
        }
        guard let token=try? JSONDecoder().decode(NovaFDATokenResponse.self,from:data),
              token.token_type.lowercased()=="bearer",token.access_token.count>40
              else {throw NovaFDAOIDCError.token}
        // URLSession.data(for:) suspends this actor. Do not save a token
        // if signOut() or another sign-in superseded this in-flight request.
        guard authGeneration == generation else { throw NovaFDAOIDCError.unapproved }
        try store.save(token.access_token,expiresIn:token.expires_in)
        accessRevoked=false
        return token.access_token
    }
}
