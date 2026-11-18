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

    func testSignalsResearchIsAlwaysReviewOnlyAndRejectsUnsafeCrossRoleUse() {
        let source = NovaSignalsResearchRequest(
            sourceId: "science-frontier", purpose: "non-clinical-evidence-research",
            containsPersonalData: false, requestsExternalTransfer: false,
            automatedDecision: false, estimatedIncrementalCostGbp: 0
        )
        let review = NovaSignalsResearchPolicy.assess(source)
        XCTAssertEqual(review.status, "review-only")
        XCTAssertFalse(review.executionEnabled)
        XCTAssertTrue(review.reasons.isEmpty)

        let forbidden = NovaSignalsResearchRequest(
            sourceId: "whisper-2022", purpose: "clinical-diagnosis",
            containsPersonalData: true, requestsExternalTransfer: true,
            automatedDecision: true, estimatedIncrementalCostGbp: 2
        )
        let blocked = NovaSignalsResearchPolicy.assess(forbidden)
        XCTAssertEqual(blocked.status, "blocked")
        XCTAssertFalse(blocked.executionEnabled)
        XCTAssertTrue(blocked.reasons.contains("unapproved-purpose"))
        XCTAssertTrue(blocked.reasons.contains("personal-data-not-admitted"))
        XCTAssertTrue(blocked.reasons.contains("external-transfer-not-approved"))
        XCTAssertTrue(blocked.reasons.contains("autonomous-decision-prohibited"))
        XCTAssertTrue(blocked.reasons.contains("zero-budget-only"))
    }

    func testSparseCircuitReaderIsDisplayOnlyAndFailClosed() throws {
        let base: [String: Any] = [
            "schemaVersion": "npi.sparse-circuit.v1",
            "valid": true,
            "status": "unverified-research-candidate",
            "modelId": "experiment-1",
            "taskId": "quote-classification",
            "nodeCount": 2,
            "edgeCount": 1,
            "lossDeltaCircuitVsBaseline": 0.01,
            "lossDeltaAblatedVsCircuit": 0.56,
            "sampleCount": 128,
            "ablation": "mean",
            "mechanisticExplanationVerified": false,
            "productionEligible": false,
            "clinicalUsePermitted": false
        ]
        let data = try JSONSerialization.data(withJSONObject: base)
        let summary = try NovaSparseCircuitReader.readResearchSummary(data)
        XCTAssertEqual(summary.status, "unverified-research-candidate")
        XCTAssertFalse(summary.productionEligible)

        var forged = base
        forged["productionEligible"] = true
        XCTAssertThrowsError(try NovaSparseCircuitReader.readResearchSummary(
            JSONSerialization.data(withJSONObject: forged)
        ))

        forged = base
        forged["mechanisticExplanationVerified"] = true
        XCTAssertThrowsError(try NovaSparseCircuitReader.readResearchSummary(
            JSONSerialization.data(withJSONObject: forged)
        ))

        forged = base
        forged["sampleCount"] = 1_000_001
        XCTAssertThrowsError(try NovaSparseCircuitReader.readResearchSummary(
            JSONSerialization.data(withJSONObject: forged)
        ))

        forged = base
        forged["nodeCount"] = 90000
        XCTAssertThrowsError(try NovaSparseCircuitReader.readResearchSummary(
            JSONSerialization.data(withJSONObject: forged)
        ))
    }

}
