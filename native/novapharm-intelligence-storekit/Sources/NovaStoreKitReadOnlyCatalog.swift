import Foundation
import StoreKit

/// A non-authorizing, read-only product-catalog query. The caller MUST obtain
/// the approved product identifiers and release decision from trusted app state.
/// A client-created permit is not proof of authorization or Apple approval.
public struct NovaStoreKitCatalogPermit: Sendable {
    public let approvedProductIDs: Set<String>
    public let releaseManifestReviewed: Bool
    public let explicitlyRequestedPreview: Bool
    public let isProductionRelease: Bool

    public init(
        approvedProductIDs: Set<String>,
        releaseManifestReviewed: Bool,
        explicitlyRequestedPreview: Bool,
        isProductionRelease: Bool
    ) {
        self.approvedProductIDs = approvedProductIDs
        self.releaseManifestReviewed = releaseManifestReviewed
        self.explicitlyRequestedPreview = explicitlyRequestedPreview
        self.isProductionRelease = isProductionRelease
    }
}

public enum NovaStoreKitCatalogError: Error, Equatable, Sendable {
    case releaseNotReviewed
    case previewNotRequested
    case productionNotAuthorized
    case invalidProductIdentifiers
    case productNotApproved
    case paymentsRestricted
    case missingStoreProduct
}

public struct NovaStoreKitProductSummary: Sendable, Equatable {
    public let productID: String
    public let displayName: String
    public let displayPrice: String
    public let description: String
    public let isPurchaseEnabled: Bool

    public init(productID: String, displayName: String, displayPrice: String, description: String) {
        self.productID = productID
        self.displayName = displayName
        self.displayPrice = displayPrice
        self.description = description
        self.isPurchaseEnabled = false
    }
}

/// A preparatory native StoreKit integration, not embedded in an app and not
/// backed by App Store Connect product identifiers. It deliberately has NO
/// buy, external payment, entitlement, restore, or grant operations.
///
/// Apple primary source:
/// https://developer.apple.com/documentation/storekit/in-app-purchase
public enum NovaStoreKitReadOnlyCatalog {
    /// Deterministically validate a proposed product set before touching any
    /// StoreKit API. Tests exercise denial cases offline without an Apple account.
    public static func preflight(
        productIDs: [String],
        permit: NovaStoreKitCatalogPermit
    ) throws -> [String] {
        guard permit.releaseManifestReviewed else {
            throw NovaStoreKitCatalogError.releaseNotReviewed
        }
        guard permit.explicitlyRequestedPreview else {
            throw NovaStoreKitCatalogError.previewNotRequested
        }
        // A future production activation requires a separate signed native host
        // and release design. Never let this source-only preview advertise live.
        guard !permit.isProductionRelease else {
            throw NovaStoreKitCatalogError.productionNotAuthorized
        }
        guard !productIDs.isEmpty, productIDs.count <= 20 else {
            throw NovaStoreKitCatalogError.invalidProductIdentifiers
        }
        let ids = Set(productIDs)
        guard ids.count == productIDs.count,
              ids.allSatisfy({ id in
                  let bytes = Array(id.utf8)
                  guard (3...128).contains(bytes.count) else { return false }
                  return bytes.enumerated().allSatisfy { index, byte in
                      let alphanumeric = (byte >= 48 && byte <= 57) ||
                          (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122)
                      return alphanumeric || (index > 0 && (byte == 46 || byte == 95 || byte == 45))
                  }
              }) else {
            throw NovaStoreKitCatalogError.invalidProductIdentifiers
        }
        guard ids.isSubset(of: permit.approvedProductIDs) else {
            throw NovaStoreKitCatalogError.productNotApproved
        }
        return ids.sorted()
    }

    /// Reads Apple-localized metadata from StoreKit 2. No purchase API is called.
    /// Do not put this in a production screen without signed-app, policy,
    /// entitlement and App Review validation. Displayed price does not by itself
    /// satisfy subscription duration, trial and renewal disclosure requirements.
    public static func fetchReadOnly(
        productIDs: [String],
        permit: NovaStoreKitCatalogPermit
    ) async throws -> [NovaStoreKitProductSummary] {
        #if DEBUG
        let validatedIDs = try preflight(productIDs: productIDs, permit: permit)
        guard AppStore.canMakePayments else {
            throw NovaStoreKitCatalogError.paymentsRestricted
        }
        let products = try await Product.products(for: validatedIDs)
        guard Set(products.map(\.id)) == Set(validatedIDs) else {
            throw NovaStoreKitCatalogError.missingStoreProduct
        }
        return products
            .sorted { $0.id < $1.id }
            .map {
                NovaStoreKitProductSummary(
                    productID: $0.id,
                    displayName: $0.displayName,
                    displayPrice: $0.displayPrice,
                    description: $0.description
                )
            }
        #else
        // Compile-time guard: even a forged preview permit cannot turn a
        // Release build into a product-catalogue surface.
        throw NovaStoreKitCatalogError.productionNotAuthorized
        #endif
    }
}
