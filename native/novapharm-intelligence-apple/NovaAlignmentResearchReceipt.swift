// NovaPharm native source-only research receipt validator.
// Not a signed app, model SDK, training integration or production release authority.
import Foundation

enum NovaAlignmentResearchError: Error {
    case invalidReceipt
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaAlignmentResearchReceipt {
    let contract: String
    let kind: String
    let researchOnly: Bool
    let productionApproved: Bool
    let customerVisible: Bool
    let independentGroundTruthVerified: Bool
    let dataRightsVerified: Bool
    let humanAdjudicationRequired: Bool

    // A display permit for an offline research disclaimer is NOT a signed
    // service/model permit, and never accepts asserted positive approval.
    func validateForResearchDisplay() throws -> String {
        let supported: Set<String> = [
            "reward_proxy_sweep",
            "critique_assistance",
            "instruction_conformance",
            "offline_multiagent_scenario_scoreboard"
        ]
        guard contract == "novapharm.intelligence.nova-alignment-research.v1" &&
              supported.contains(kind) &&
              researchOnly && !productionApproved && !customerVisible &&
              !independentGroundTruthVerified && !dataRightsVerified &&
              humanAdjudicationRequired else {
            throw NovaAlignmentResearchError.invalidReceipt
        }
        return "Unverified offline Nova ML research; human review required."
    }
}
