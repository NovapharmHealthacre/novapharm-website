import Foundation
import XCTest
@testable import NovaStoreKitReadOnly

final class NovaStoreKitReadOnlyCatalogTests: XCTestCase {
    private func permit(
        approved: Set<String> = ["com.novapharm.research.monthly", "com.novapharm.research.yearly"],
        reviewed: Bool = false,
        requested: Bool = false,
        production: Bool = false
    ) -> NovaStoreKitCatalogPermit {
        NovaStoreKitCatalogPermit(
            approvedProductIDs: approved,
            releaseManifestReviewed: reviewed,
            explicitlyRequestedPreview: requested,
            isProductionRelease: production
        )
    }

    func testMissingReleaseApprovalDeniesBeforeStoreKit() {
        XCTAssertThrowsError(try NovaStoreKitReadOnlyCatalog.preflight(
            productIDs: ["com.novapharm.research.monthly"],
            permit: permit(requested: true)
        )) { XCTAssertEqual($0 as? NovaStoreKitCatalogError, .releaseNotReviewed) }
    }

    func testPreviewNeedsExplicitRequest() {
        XCTAssertThrowsError(try NovaStoreKitReadOnlyCatalog.preflight(
            productIDs: ["com.novapharm.research.monthly"],
            permit: permit(reviewed: true)
        )) { XCTAssertEqual($0 as? NovaStoreKitCatalogError, .previewNotRequested) }
    }

    func testProductionNeverEnabledByThisPackage() {
        XCTAssertThrowsError(try NovaStoreKitReadOnlyCatalog.preflight(
            productIDs: ["com.novapharm.research.monthly"],
            permit: permit(reviewed: true, requested: true, production: true)
        )) { XCTAssertEqual($0 as? NovaStoreKitCatalogError, .productionNotAuthorized) }
    }

    func testMissingAndExcessProductIDsAreDenied() {
        for ids in [[], Array(repeating: "com.novapharm.research.monthly", count: 21)] {
            XCTAssertThrowsError(try NovaStoreKitReadOnlyCatalog.preflight(
                productIDs: ids, permit: permit(reviewed: true, requested: true)
            )) { XCTAssertEqual($0 as? NovaStoreKitCatalogError, .invalidProductIdentifiers) }
        }
    }

    func testDuplicatesAreDenied() {
        XCTAssertThrowsError(try NovaStoreKitReadOnlyCatalog.preflight(
            productIDs: ["com.novapharm.research.monthly", "com.novapharm.research.monthly"],
            permit: permit(reviewed: true, requested: true)
        )) { XCTAssertEqual($0 as? NovaStoreKitCatalogError, .invalidProductIdentifiers) }
    }

    func testInvalidProductIDCharactersAreDenied() {
        for id in ["x", "with spaces", "com.novapharm/path", "com.novapharm.?x", "com.novapharm.good\n", "com.novapharm.é", ""] {
            XCTAssertThrowsError(try NovaStoreKitReadOnlyCatalog.preflight(
                productIDs: [id], permit: permit(reviewed: true, requested: true)
            )) { XCTAssertEqual($0 as? NovaStoreKitCatalogError, .invalidProductIdentifiers) }
        }
    }

    func testUnapprovedProductIDsAreDenied() {
        XCTAssertThrowsError(try NovaStoreKitReadOnlyCatalog.preflight(
            productIDs: ["com.novapharm.unauthorised.paid"],
            permit: permit(reviewed: true, requested: true)
        )) { XCTAssertEqual($0 as? NovaStoreKitCatalogError, .productNotApproved) }
    }

    func testReviewOnlyPreflightSortsIDsButDoesNotGrantPurchase() throws {
        let ids = try NovaStoreKitReadOnlyCatalog.preflight(
            productIDs: ["com.novapharm.research.yearly", "com.novapharm.research.monthly"],
            permit: permit(reviewed: true, requested: true)
        )
        XCTAssertEqual(ids, ["com.novapharm.research.monthly", "com.novapharm.research.yearly"])
        let summary = NovaStoreKitProductSummary(
            productID: ids[0],
            displayName: "Research-only example",
            displayPrice: "Not a live price",
            description: "No approved paid features"
        )
        XCTAssertFalse(summary.isPurchaseEnabled)
    }

    func testUnapprovedAsyncFetchRejectsBeforeProductLookup() async {
        do {
            _ = try await NovaStoreKitReadOnlyCatalog.fetchReadOnly(
                productIDs: ["com.novapharm.research.monthly"],
                permit: permit(requested: true)
            )
            XCTFail("Unapproved read-only metadata lookup must not run")
        } catch {
            XCTAssertEqual(error as? NovaStoreKitCatalogError, .releaseNotReviewed)
        }
    }
}
