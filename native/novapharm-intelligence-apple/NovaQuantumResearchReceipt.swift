import Foundation
/// A typed *display-only* view of an unverified offline Bell experiment.
public enum NovaQuantumResearchError: Error { case untrustedReceipt }
public struct NovaQuantumResearchReceipt: Decodable {
    public let schemaVersion: String
    public let experimentId: String
    public let method: String
    public let engine: String
    public let qubits: Int
    public let shots: Int
    public let seed: Int
    public let noiseModel: String
    public let counts: [String: Int]
    public let inputSha256: String
    public let codeSha256: String
    public let calibrationId: String?
    public let simulatedOnly: Bool
    public let hardwareMeasured: Bool
    public let independentlyVerified: Bool
    public let dataRightsApproved: Bool
    public let productionApproved: Bool
    public let customerVisible: Bool
    public let clinicalUsePermitted: Bool
}
public enum NovaQuantumResearchReader {
    /// Decoding is not signature verification, authentication or scientific replication.
    public static func decodeForResearchDisplay(_ data: Data) throws -> NovaQuantumResearchReceipt {
        guard !data.isEmpty, data.count <= 16_384,
              let raw = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NovaQuantumResearchError.untrustedReceipt
        }
        let keys: Set<String> = ["schemaVersion","experimentId","method","engine","qubits","shots","seed",
            "noiseModel","counts","inputSha256","codeSha256","calibrationId","simulatedOnly",
            "hardwareMeasured","independentlyVerified","dataRightsApproved","productionApproved",
            "customerVisible","clinicalUsePermitted"]
        guard Set(raw.keys) == keys else { throw NovaQuantumResearchError.untrustedReceipt }
        let item = try JSONDecoder().decode(NovaQuantumResearchReceipt.self, from: data)
        let digest = "^[a-f0-9]{64}$"
        let identifier = "^bell-[a-f0-9]{16}$"
        guard item.schemaVersion == "npi.quantum-research.v1",
              item.experimentId.range(of: identifier, options: .regularExpression) != nil,
              item.method == "bell-sampling",
              item.engine == "cirq-local-simulator", item.qubits == 2,
              item.shots >= 1, item.shots <= 10_000,
              item.seed >= 0, item.seed <= 2_147_483_647,
              item.noiseModel == "ideal", item.calibrationId == nil,
              item.inputSha256.range(of: digest, options: .regularExpression) != nil,
              item.codeSha256.range(of: digest, options: .regularExpression) != nil,
              item.simulatedOnly, !item.hardwareMeasured, !item.independentlyVerified,
              !item.dataRightsApproved, !item.productionApproved,
              !item.customerVisible, !item.clinicalUsePermitted,
              Set(item.counts.keys) == Set(["00","01","10","11"]),
              item.counts.values.allSatisfy({ $0 >= 0 && $0 <= item.shots }),
              item.counts.values.reduce(0,+) == item.shots,
              item.counts["01"] == 0, item.counts["10"] == 0 else {
            throw NovaQuantumResearchError.untrustedReceipt
        }
        return item
    }
}
