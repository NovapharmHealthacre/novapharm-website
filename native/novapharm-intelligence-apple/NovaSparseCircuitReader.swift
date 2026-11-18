// A display-only adapter for the shared NovaPharm sparse-circuit research summary.
// It does not fetch data or grant AI, medical, source or production permissions.
import Foundation

struct NovaSparseCircuitSummary: Decodable {
    let schemaVersion: String
    let valid: Bool
    let status: String
    let modelId: String
    let taskId: String
    let nodeCount: Int
    let edgeCount: Int
    let lossDeltaCircuitVsBaseline: Double
    let lossDeltaAblatedVsCircuit: Double
    let sampleCount: Int
    let ablation: String
    let mechanisticExplanationVerified: Bool
    let productionEligible: Bool
    let clinicalUsePermitted: Bool
}

enum NovaSparseCircuitReadError: Error {
    case unsupportedOrUntrusted
}

struct NovaSparseCircuitReader {
    // Data must already have come from an authenticated, authorised app service.
    // Decoding is NOT authentication, signature verification or model validation.
    static func readResearchSummary(_ data: Data) throws -> NovaSparseCircuitSummary {
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
