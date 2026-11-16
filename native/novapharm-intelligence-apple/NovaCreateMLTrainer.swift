// NovaPharm Intelligence — macOS-only Create ML training candidate.
// Not shipped in the web portal; never train on patient or licensed data without approval.
// The caller must obtain and verify independent data, rights and training approvals.
#if os(macOS)
import Foundation
import CreateML
import TabularData

@available(macOS 14.0, *)
struct NovaTrainingPermit {
    let sourceRightsApproved: Bool
    let privacyReviewApproved: Bool
    let independentHoldoutApproved: Bool
    let trainingDatasetVersion: String
    let licenceReference: String
    let minimumHoldoutAccuracy: Double
    let fixedValidationRatio: Double
    let fixedValidationSeed: Int
    let classBalanceAndLeakageReviewed: Bool
}

@available(macOS 14.0, *)
struct NovaTrainingEvaluation {
    let modelVersion: String
    let holdoutClassificationError: Double
    let requiresHumanRelease: Bool = true
    let productionApproved: Bool = false
    let perClassPrecisionRecallReviewRequired: Bool = true
}

@available(macOS 14.0, *)
enum NovaTrainingError: Error {
    case approvalMissing
    case invalidEvaluation
    case belowAcceptanceThreshold
    case trainingCancelled
    case trainingDataChanged
    case modelParameterInvalid
    case modelIOFailure
    case createMLFailure
}

@available(macOS 14.0, *)
private func translatedCreateMLError(_ error: MLCreateError) -> NovaTrainingError {
    // Do not propagate raw paths, dataset rows or protected error details into UI/logs.
    switch error {
    case .cancelled: return .trainingCancelled
    case .modifiedTrainingData: return .trainingDataChanged
    case .incompatibleParameters, .type: return .modelParameterInvalid
    case .io: return .modelIOFailure
    case .generic: return .createMLFailure
    @unknown default: return .createMLFailure
    }
}

@available(macOS 14.0, *)
func trainNovaPublicTextClassifier(
    trainingCSV: URL,
    independentHoldoutCSV: URL,
    outputModelURL: URL,
    permit: NovaTrainingPermit
) throws -> NovaTrainingEvaluation {
    guard permit.sourceRightsApproved && permit.privacyReviewApproved &&
          permit.independentHoldoutApproved &&
          !permit.trainingDatasetVersion.isEmpty &&
          !permit.licenceReference.isEmpty &&
          (0...1).contains(permit.minimumHoldoutAccuracy) &&
          (0.1...0.3).contains(permit.fixedValidationRatio) &&
          permit.fixedValidationSeed >= 0 &&
          permit.classBalanceAndLeakageReviewed &&
          trainingCSV.isFileURL && independentHoldoutCSV.isFileURL &&
          outputModelURL.isFileURL &&
          trainingCSV.standardizedFileURL != independentHoldoutCSV.standardizedFileURL &&
          outputModelURL.pathExtension.lowercased() == "mlmodel" else {
        throw NovaTrainingError.approvalMissing
    }
    // CSVs must be supplied by the approved data process, with 'text' and 'label'
    // columns. This function never fetches or uploads data.
    let trainingData = try DataFrame(contentsOfCSVFile: trainingCSV)
    let heldOut = try DataFrame(contentsOfCSVFile: independentHoldoutCSV)
    // MLSplitStrategy is deterministic for internal training/validation.
    // independentHoldoutCSV must be a separate, leakage-reviewed TEST dataset.
    let parameters = MLTextClassifier.ModelParameters(
        validation: .split(strategy: .fixed(
            ratio: permit.fixedValidationRatio,
            seed: permit.fixedValidationSeed
        ))
    )
    let classifier: MLTextClassifier
    do {
        classifier = try MLTextClassifier(
            trainingData: trainingData,
            textColumn: "text",
            labelColumn: "label",
            parameters: parameters
        )
    } catch let error as MLCreateError {
        throw translatedCreateMLError(error)
    }
    let metrics = classifier.evaluation(
        on: heldOut, textColumn: "text", labelColumn: "label"
    )
    guard metrics.isValid else {
        throw NovaTrainingError.invalidEvaluation
    }
    let error = metrics.classificationError
    guard error.isFinite && (0...1).contains(error) else {
        throw NovaTrainingError.invalidEvaluation
    }
    guard 1 - error >= permit.minimumHoldoutAccuracy else {
        throw NovaTrainingError.belowAcceptanceThreshold
    }
    let version = permit.trainingDatasetVersion
    let metadata = MLModelMetadata(
        author: "NovaPharm Intelligence",
        shortDescription: "Candidate classification of approved public text. Not clinical decision support.",
        license: permit.licenceReference,
        version: version,
        additional: [
            "datasetVersion": version,
            "validationSeed": String(permit.fixedValidationSeed),
            "validationRatio": String(permit.fixedValidationRatio),
            "purpose": "approved-public-text-nonclinical"
        ]
    )
    do {
        try classifier.write(to: outputModelURL, metadata: metadata)
    } catch let error as MLCreateError {
        throw translatedCreateMLError(error)
    }
    // A model artifact is not an approved model: independent evaluation,
    // licensing, signing, security review and clinical-risk exclusions remain.
    return NovaTrainingEvaluation(
        modelVersion: version,
        holdoutClassificationError: error
    )
}
#endif
