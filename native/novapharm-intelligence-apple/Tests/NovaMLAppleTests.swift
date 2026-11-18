import Foundation
import XCTest
@testable import NovaMLApple

final class NovaMLAppleTests: XCTestCase {
    func testCLIPClientRejectsUntrustedOriginBeforeNetworkAccess() throws {
        XCTAssertThrowsError(try NovaClipVisualSearch(
            trustedPortalOrigin: URL(string: "https://unapproved.example")!
        ))
        XCTAssertThrowsError(try NovaClipVisualSearch(
            trustedPortalOrigin: URL(string: "http://portal.novapharmhealthcare.com")!
        ))
    }

    func testCLIPSourceUrlsEnforcePublicHttpsAttribution() throws {
        for text in [
            "https://127.0.0.1/private",
            "https://[::1]/private",
            "https://warehouse.internal/secret",
            "https://docs.local/secret",
            "https://attacker@novapharmhealthcare.com/public",
            "https://novapharmhealthcare.com:8443/public",
            "https://novapharmhealthcare.com/public#fragment",
            "http://novapharmhealthcare.com/public"
        ] {
            XCTAssertFalse(NovaClipVisualSearch.sourceAllowed(URL(string: text)!), text)
        }
        XCTAssertTrue(NovaClipVisualSearch.sourceAllowed(
            URL(string: "https://novapharmhealthcare.com/products/")!
        ))
    }

    func testCoreMLRejectsMissingModelApprovalBeforeLoadingBundle() throws {
        let permit = NovaModelPermit(
            modelIdentifier: "",
            bundledResourceName: "",
            expectedModelVersion: "",
            expectedLicence: "",
            approvedInputNames: [],
            approvedForNonClinicalUse: false
        )
        XCTAssertThrowsError(try NovaCoreMLRuntime().predict(permit: permit, inputs: [:]))
    }

    func testCLIPClientRejectsRedirectableOrInjectedOrigins() throws {
        let invalid = [
            "https://portal.novapharmhealthcare.com:8443/",
            "https://portal.novapharmhealthcare.com/?redirect=1",
            "https://portal.novapharmhealthcare.com/#fragment",
            "https://user@portal.novapharmhealthcare.com/",
            "https://portal.novapharmhealthcare.com/evil"
        ]
        for text in invalid {
            XCTAssertThrowsError(try NovaClipVisualSearch(trustedPortalOrigin: URL(string: text)!))
        }
    }

    func testNaturalLanguageRejectsUnapprovedOrUnattributedText() throws {
        let permit = NovaLanguagePermit(
            trustedSourceApproved: false,
            explicitlyRequestedByUser: true,
            containsPatientOrRestrictedContent: false
        )
        XCTAssertThrowsError(try NovaLanguageIntelligence().inspect(
            approvedPublicText: "Public nonclinical text, without source verification.",
            sourceReference: "",
            permit: permit
        ))
    }

    func testSpeechRejectsUnapprovedFileBeforePermissionOrRecognizerAccess() throws {
        let permit = NovaSpeechPermit(
            explicitlySelectedLocalFile: false,
            trustedSourceApproved: false,
            transcriptionPurposeApproved: false,
            containsPatientOrRestrictedContent: true
        )
        XCTAssertThrowsError(try NovaSpeechIntelligence().transcribeSelectedFile(
            audioURL: URL(fileURLWithPath: "/tmp/no-audio.wav"),
            sourceReference: "",
            localeIdentifier: "en_GB",
            permit: permit,
            onCompletion: { _ in XCTFail("No unapproved transcription may start") }
        ))
    }

    func testComputePlannerCannotEnableExecutionOrAllowPersonalDataOrGPUCost() {
        let digest = "sha256:" + String(repeating: "a", count: 64)
        let proposal = NovaComputeProposal(
            mode: "experiment", accelerator: "cpu",
            datasetDigest: digest, modelDigest: digest,
            purpose: "non-clinical-research", dataClass: "public-approved",
            containsPersonalData: false, cpuCores: 2, gpuCount: 0,
            memoryGiB: 4, durationMinutes: 20, retentionDays: 0,
            region: "eu-west-2", estimatedCostGbp: 0
        )
        let allowed = NovaComputePlanner.assess(proposal)
        XCTAssertEqual(allowed.status, "review-only")
        XCTAssertFalse(allowed.executionEnabled)
        XCTAssertTrue(allowed.reasons.isEmpty)

        let costly = NovaComputeProposal(
            mode: "training", accelerator: "gpu",
            datasetDigest: digest, modelDigest: digest,
            purpose: "non-clinical-research", dataClass: "public-approved",
            containsPersonalData: true, cpuCores: 2, gpuCount: 1,
            memoryGiB: 4, durationMinutes: 20, retentionDays: 0,
            region: "us-east-1", estimatedCostGbp: 10
        )
        let denied = NovaComputePlanner.assess(costly)
        XCTAssertEqual(denied.status, "blocked")
        XCTAssertFalse(denied.executionEnabled)
        XCTAssertTrue(denied.reasons.contains("personal-data-not-admitted"))
        XCTAssertTrue(denied.reasons.contains("region-not-allowed"))
        XCTAssertTrue(denied.reasons.contains("budget-not-approved"))
    }

    #if os(macOS)
    func testCreateMLRejectsMissingGovernanceBeforeReadingFiles() throws {
        let permit = NovaTrainingPermit(
            sourceRightsApproved: false,
            privacyReviewApproved: false,
            independentHoldoutApproved: false,
            trainingDatasetVersion: "",
            licenceReference: "",
            minimumHoldoutAccuracy: 1,
            fixedValidationRatio: 0.2,
            fixedValidationSeed: 42,
            classBalanceAndLeakageReviewed: false
        )
        XCTAssertThrowsError(try trainNovaPublicTextClassifier(
            trainingCSV: URL(fileURLWithPath: "/tmp/forbidden-training.csv"),
            independentHoldoutCSV: URL(fileURLWithPath: "/tmp/forbidden-holdout.csv"),
            outputModelURL: URL(fileURLWithPath: "/tmp/forbidden-model.mlmodel"),
            permit: permit
        ))
    }
    #endif
}
