import Foundation
import XCTest
@testable import NovaMLApple

final class NovaMLAppleTests: XCTestCase {
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

    func testL0HardConcreteResearchMathAndInvalidInputs() throws {
        let expected = 1 / (1 + exp(-(2.0 / 3.0) * log(11)))
        XCTAssertEqual(try NovaL0ResearchMath.activationProbability(logAlpha: 0), expected, accuracy: 1e-12)
        XCTAssertEqual(try NovaL0ResearchMath.deterministicGate(logAlpha: 0), 0.5, accuracy: 1e-12)
        XCTAssertEqual(try NovaL0ResearchMath.sampleGate(logAlpha: 0, uniform: 0.5), 0.5, accuracy: 1e-12)
        XCTAssertEqual(try NovaL0ResearchMath.deterministicGate(logAlpha: -1000), 0)
        XCTAssertEqual(try NovaL0ResearchMath.deterministicGate(logAlpha: 1000), 1)
        XCTAssertThrowsError(try NovaL0ResearchMath.sampleGate(logAlpha: 0, uniform: 0))
        XCTAssertThrowsError(try NovaL0ResearchMath.activationProbability(logAlpha: .nan))
        XCTAssertThrowsError(try NovaL0ResearchMath.deterministicGate(logAlpha: 0, gamma: 0))
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
