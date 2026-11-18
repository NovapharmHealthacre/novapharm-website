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

    func testAlignmentResearchReceiptAcceptsOnlyOfflineUnverifiedLabels() throws {
        let sample = NovaAlignmentResearchReceipt(
            contract: "novapharm.intelligence.nova-alignment-research.v1",
            kind: "critique_assistance",
            researchOnly: true,
            productionApproved: false,
            customerVisible: false,
            independentGroundTruthVerified: false,
            dataRightsVerified: false,
            humanAdjudicationRequired: true
        )
        XCTAssertNoThrow(try sample.validateForResearchDisplay())
        let forbidden = NovaAlignmentResearchReceipt(
            contract: sample.contract, kind: sample.kind,
            researchOnly: true, productionApproved: true,
            customerVisible: false, independentGroundTruthVerified: false,
            dataRightsVerified: false, humanAdjudicationRequired: true
        )
        XCTAssertThrowsError(try forbidden.validateForResearchDisplay())
        let fakeTruth = NovaAlignmentResearchReceipt(
            contract: sample.contract, kind: sample.kind,
            researchOnly: true, productionApproved: false,
            customerVisible: false, independentGroundTruthVerified: true,
            dataRightsVerified: false, humanAdjudicationRequired: true
        )
        XCTAssertThrowsError(try fakeTruth.validateForResearchDisplay())
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
