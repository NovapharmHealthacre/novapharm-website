// A display-only adapter for the shared NovaPharm sparse-circuit research summary.
// It does not fetch data or grant AI, medical, source or production permissions.
import Foundation

public struct NovaSparseCircuitSummary: Decodable {
    public let schemaVersion: String
    public let valid: Bool
    public let status: String
    public let modelId: String
    public let taskId: String
    public let nodeCount: Int
    public let edgeCount: Int
    public let lossDeltaCircuitVsBaseline: Double
    public let lossDeltaAblatedVsCircuit: Double
    public let sampleCount: Int
    public let ablation: String
    public let mechanisticExplanationVerified: Bool
    public let productionEligible: Bool
    public let clinicalUsePermitted: Bool
}

public enum NovaSparseCircuitReadError: Error {
    case unsupportedOrUntrusted
}

public struct NovaSparseCircuitReader {
    // Data must already have come from an authenticated, authorised app service.
    // Decoding is NOT authentication, signature verification or model validation.
    public static func readResearchSummary(_ data: Data) throws -> NovaSparseCircuitSummary {
        guard data.count > 0 && data.count <= 32_768,
              let raw = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NovaSparseCircuitReadError.unsupportedOrUntrusted
        }
        let expectedKeys: Set<String> = [
            "schemaVersion", "valid", "status", "modelId", "taskId",
            "nodeCount", "edgeCount", "lossDeltaCircuitVsBaseline",
            "lossDeltaAblatedVsCircuit", "sampleCount", "ablation",
            "mechanisticExplanationVerified", "productionEligible",
            "clinicalUsePermitted"
        ]
        guard Set(raw.keys) == expectedKeys else {
            throw NovaSparseCircuitReadError.unsupportedOrUntrusted
        }
        let summary = try JSONDecoder().decode(NovaSparseCircuitSummary.self, from: data)
        let idPattern = "^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$"
        guard summary.schemaVersion == "npi.sparse-circuit.v1",
              summary.valid,
              summary.modelId.range(of: idPattern, options: .regularExpression) != nil,
              summary.taskId.range(of: idPattern, options: .regularExpression) != nil,
              summary.status == "unverified-research-candidate",
              summary.nodeCount > 0, summary.nodeCount <= 2_000,
              summary.edgeCount > 0, summary.edgeCount <= 8_000,
              summary.sampleCount > 0, summary.sampleCount <= 1_000_000,
              summary.ablation == "mean",
              summary.lossDeltaCircuitVsBaseline.isFinite,
              summary.lossDeltaAblatedVsCircuit.isFinite,
              !summary.mechanisticExplanationVerified,
              !summary.productionEligible,
              !summary.clinicalUsePermitted else {
            throw NovaSparseCircuitReadError.unsupportedOrUntrusted
        }
        return summary
    }
}
