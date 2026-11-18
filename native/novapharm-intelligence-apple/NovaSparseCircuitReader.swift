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
        let summary = try JSONDecoder().decode(NovaSparseCircuitSummary.self, from: data)
        guard summary.schemaVersion == "npi.sparse-circuit.v1",
              summary.valid,
              summary.status == "unverified-research-candidate",
              summary.nodeCount > 0, summary.nodeCount <= 2_000,
              summary.edgeCount > 0, summary.edgeCount <= 8_000,
              summary.sampleCount > 0,
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
