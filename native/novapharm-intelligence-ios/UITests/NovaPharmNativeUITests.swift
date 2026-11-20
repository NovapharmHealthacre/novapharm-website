import XCTest

/// Native on-device UI tests. Do not change protected runtime flags to make these pass.
final class NovaPharmNativeUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testNativeTabsAndGatedWorkspaceNavigation() throws {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.navigationBars["Intelligence"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.tabBars.buttons["Intelligence"].exists)
        XCTAssertTrue(app.tabBars.buttons["Portal"].exists)
        XCTAssertTrue(app.tabBars.buttons["Distribution"].exists)
        XCTAssertTrue(app.tabBars.buttons["Saved"].exists)

        app.tabBars.buttons["Portal"].tap()
        XCTAssertTrue(app.navigationBars["Customer Portal"].waitForExistence(timeout: 10))
        let dashboard = app.buttons["novapharm.workspace.customer-portal:dashboard"]
        XCTAssertTrue(dashboard.waitForExistence(timeout: 10))
        dashboard.tap()
        XCTAssertTrue(app.navigationBars["Dashboard"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["No operational action is available in this preview."].exists)

        app.tabBars.buttons["Distribution"].tap()
        XCTAssertTrue(app.navigationBars["Distribution"].waitForExistence(timeout: 10))
        let inventory = app.buttons["novapharm.workspace.distribution:inventory"]
        XCTAssertTrue(inventory.waitForExistence(timeout: 10))
        inventory.tap()
        XCTAssertTrue(app.navigationBars["Inventory"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["No operational action is available in this preview."].exists)
    }

    @MainActor
    func testCountryDirectoryAndOfflineRights() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.navigationBars["Intelligence"].waitForExistence(timeout: 15))

        let directoryLink = app.buttons["novapharm.intelligence.countries"]
        for _ in 0..<5 where !directoryLink.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(directoryLink.waitForExistence(timeout: 10))
        directoryLink.tap()

        XCTAssertTrue(app.navigationBars["Countries"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["novapharm.countries.readonly-notice"].exists)
        let algeria = app.buttons["novapharm.country.DZ"]
        for _ in 0..<5 where !algeria.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(algeria.waitForExistence(timeout: 10))
        algeria.tap()
        XCTAssertTrue(app.navigationBars["Algeria"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["novapharm.country.live-status"].exists)
    }

    @MainActor
    func testOfflineCountryFiltersKeepUnapprovedCoverageDistinct() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.navigationBars["Intelligence"].waitForExistence(timeout: 15))

        let directory = app.buttons["novapharm.intelligence.countries"]
        for _ in 0..<5 where !directory.isHittable { app.swipeUp() }
        XCTAssertTrue(directory.waitForExistence(timeout: 10))
        directory.tap()
        XCTAssertTrue(app.navigationBars["Countries"].waitForExistence(timeout: 10))

        // Exercise real native SwiftUI segmented controls and actual list contents.
        // These are offline publisher research categories, NOT validated data rights.
        let research = app.buttons["Research"]
        let candidates = app.buttons["Candidates"]
        let count = app.descendants(matching: .any)["novapharm.countries.count"]
        XCTAssertTrue(research.waitForExistence(timeout: 10))
        XCTAssertTrue(candidates.exists)
        XCTAssertTrue(count.waitForExistence(timeout: 10),
            "Country filter must expose its accessible count")
        XCTAssertTrue(count.label.contains("101"),
            "Unfiltered directory must report all 101 offline scopes")
        research.tap()
        XCTAssertTrue(count.label.contains("24"),
            "Research coverage must identify exactly 24 geography-only scopes")
        XCTAssertTrue(app.buttons["novapharm.country.BW"].waitForExistence(timeout: 10),
            "Botswana is a geography-only research scope")
        XCTAssertFalse(app.buttons["novapharm.country.DZ"].exists,
            "Algeria has candidate references and must not appear in research-only coverage")

        candidates.tap()
        XCTAssertTrue(count.label.contains("77"),
            "Candidate coverage must identify exactly 77 unapproved publisher-reference scopes")
        XCTAssertTrue(app.buttons["novapharm.country.DZ"].waitForExistence(timeout: 10),
            "Algeria is a source-candidate scope")
        XCTAssertFalse(app.buttons["novapharm.country.BW"].exists,
            "Geography-only Botswana must not be shown as a publisher candidate")

        app.buttons["novapharm.country.DZ"].tap()
        XCTAssertTrue(app.navigationBars["Algeria"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Not reviewed"].exists,
            "Publisher rights must remain unapproved in the native candidate")
        XCTAssertTrue(app.staticTexts["Disabled"].exists,
            "Offline candidate must not imply customer release")
    }

    @MainActor
    func testSavedShortcutPersistsAcrossAppRelaunchAndCanBeDeleted() throws {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.navigationBars["Intelligence"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Portal"].tap()
        let dashboard = app.buttons["novapharm.workspace.customer-portal:dashboard"]
        XCTAssertTrue(dashboard.waitForExistence(timeout: 10))
        dashboard.tap()
        XCTAssertTrue(app.navigationBars["Dashboard"].waitForExistence(timeout: 10))

        let toggle = app.buttons["novapharm.bookmark.toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 10))
        if toggle.label == "Remove saved shortcut" {
            toggle.tap() // Clear any stale local test state before re-saving.
        }
        XCTAssertEqual(toggle.label, "Save module shortcut")
        toggle.tap()
        XCTAssertEqual(toggle.label, "Remove saved shortcut")
        app.tabBars.buttons["Saved"].tap()

        let savedLink = app.buttons["novapharm.saved.customer-portal:dashboard"]
        XCTAssertTrue(savedLink.waitForExistence(timeout: 10))

        // Simulates a process restart; checks local SwiftData bookmark persistence, not CloudKit.
        app.terminate()
        app.launch()
        app.tabBars.buttons["Saved"].tap()
        XCTAssertTrue(savedLink.waitForExistence(timeout: 10))
        savedLink.tap()
        XCTAssertTrue(app.navigationBars["Dashboard"].waitForExistence(timeout: 10))
        let remove = app.buttons["novapharm.bookmark.toggle"]
        XCTAssertTrue(remove.waitForExistence(timeout: 10))
        XCTAssertEqual(remove.label, "Remove saved shortcut")
        remove.tap()
        XCTAssertEqual(remove.label, "Save module shortcut")
        app.tabBars.buttons["Saved"].tap()
        XCTAssertFalse(savedLink.exists)
    }
}
