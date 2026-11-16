// NovaPharm Intelligence native adapter. No endpoint and no production activation.
// A signed native app must supply model permits only from its trusted release manifest.
import Foundation
import CoreML

struct NovaModelPermit {
    let modelIdentifier: String
    let bundledResourceName: String
    let expectedModelVersion: String
    let expectedLicence: String
    let approvedInputNames: Set<String>
    let approvedForNonClinicalUse: Bool
}

enum NovaRuntimeError: Error {
    case notApproved
    case modelUnavailable
    case inputSchemaMismatch
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaCoreMLRuntime {
    // Run locally only: no network, cloud fallback, input logging or uploads.
    func predict(
        permit: NovaModelPermit,
        inputs: [String: MLFeatureValue]
    ) throws -> [String: MLFeatureValue] {
        guard permit.approvedForNonClinicalUse &&
              !permit.modelIdentifier.isEmpty &&
              !permit.bundledResourceName.isEmpty &&
              !permit.expectedModelVersion.isEmpty &&
              !permit.expectedLicence.isEmpty &&
              !permit.approvedInputNames.isEmpty else {
            throw NovaRuntimeError.notApproved
        }
        guard let modelURL = Bundle.main.url(
            forResource: permit.bundledResourceName, withExtension: "mlmodelc"
        ) else {
            throw NovaRuntimeError.modelUnavailable
        }
        let configuration = MLModelConfiguration()
        configuration.computeUnits = .all
        let model = try MLModel(contentsOf: modelURL, configuration: configuration)
        // Require model metadata to match the audited, signed-app release manifest.
        // The permit must be issued by trusted app code, not from an input form.
        let metadata = model.modelDescription.metadata
        guard (metadata[.versionString] as? String) == permit.expectedModelVersion &&
              (metadata[.license] as? String) == permit.expectedLicence else {
            throw NovaRuntimeError.notApproved
        }
        let expected = Set(model.modelDescription.inputDescriptionsByName.keys)
        guard expected == permit.approvedInputNames &&
              Set(inputs.keys) == expected else {
            throw NovaRuntimeError.inputSchemaMismatch
        }
        let provider = try MLDictionaryFeatureProvider(dictionary: inputs)
        let prediction = try model.prediction(from: provider)
        var outputs: [String: MLFeatureValue] = [:]
        for name in prediction.featureNames {
            guard let value = prediction.featureValue(for: name) else {
                throw NovaRuntimeError.inputSchemaMismatch
            }
            outputs[name] = value
        }
        return outputs
    }
}
