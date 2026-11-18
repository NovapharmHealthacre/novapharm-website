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

    func testL0ResearchCandidateFailsClosedWithFeatureParity() throws {
        let candidate = NovaL0ResearchCandidate(
            format: "nova-l0-sparse-linear-candidate-v1",
            releaseStatus: "research-only",
            productionApproved: false, customerVisible: false,
            featureNames: ["demand", "stock", "lead_time"],
            coefficients: [2, 0, 2], bias: 3, nonZeroCount: 2
        )
        XCTAssertEqual(try candidate.score(features: ["lead_time": 4, "demand": 5, "stock": 99]), 21)
        XCTAssertThrowsError(try candidate.score(features: ["demand": 5, "stock": 99]))
        XCTAssertThrowsError(try candidate.score(features: ["demand": .nan, "stock": 1, "lead_time": 4]))
        let forbidden = NovaL0ResearchCandidate(
            format: candidate.format, releaseStatus: candidate.releaseStatus,
            productionApproved: true, customerVisible: false,
            featureNames: candidate.featureNames, coefficients: candidate.coefficients,
            bias: candidate.bias, nonZeroCount: candidate.nonZeroCount
        )
        XCTAssertThrowsError(try forbidden.score(features: ["demand": 5, "stock": 99, "lead_time": 4]))
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
