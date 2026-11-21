import XCTest

/// Simulator audits complement, but do not replace, human VoiceOver and real-device testing.
final class NovaPharmAccessibilityUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testAppleAccessibilityAuditsOnHomeAndPortal() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.navigationBars["Intelligence"].waitForExistence(timeout: 15))
        try app.performAccessibilityAudit(for: [
            .contrast, .textClipped, .hitRegion, .sufficientElementDescription
        ])

        let portal = app.tabBars.buttons["Portal"]
        XCTAssertTrue(portal.exists)
        portal.tap()
        XCTAssertTrue(app.navigationBars["Customer Portal"].waitForExistence(timeout: 10))
        try app.performAccessibilityAudit(for: [
            .contrast, .textClipped, .hitRegion, .sufficientElementDescription
        ])
    }

    /// The CI workflow sets this Simulator to accessibility-extra-extra-extra-large first.
    /// This verifies key destinations remain reachable rather than assuming dynamic layout from code.
    @MainActor
    func testLargestDynamicTypeMaintainsResearchNavigation() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.navigationBars["Intelligence"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.tabBars.buttons["Portal"].exists)
        XCTAssertTrue(app.tabBars.buttons["Distribution"].exists)
        XCTAssertTrue(app.tabBars.buttons["Saved"].exists)

        let directory = app.buttons["novapharm.intelligence.countries"]
        for _ in 0..<12 {
            if directory.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(directory.isHittable, "Country directory must remain reachable at accessibility text sizes")
        directory.tap()
        XCTAssertTrue(app.navigationBars["Countries"].waitForExistence(timeout: 12))
        XCTAssertTrue(app.descendants(matching: .any)["novapharm.countries.readonly-notice"].exists)
        let inlineSearch = app.textFields["novapharm.countries.inline-search"]
        for _ in 0..<12 {
            if inlineSearch.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(inlineSearch.isHittable,
            "Country search must remain operable at accessibility text sizes")

        // Lazy SwiftUI List sections can be absent from the accessibility tree
        // until scrolled into view; do not assume off-screen rows are materialized.
        let coverageFilter = app.descendants(matching: .any)["novapharm.countries.coverage-filter"]
        for _ in 0..<12 {
            if coverageFilter.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(coverageFilter.isHittable,
            "Country coverage filter must remain reachable at accessibility text sizes")
    }
}
