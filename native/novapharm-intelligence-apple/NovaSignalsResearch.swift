// A local, source-only governance companion for an eventual signed iOS/macOS application.
// It never transcribes speech, imports datasets, calls OpenAI or authorizes compute.
import Foundation

public struct NovaSignalsResearchRequest: Sendable {
    public let sourceId: String
    public let purpose: String
    public let containsPersonalData: Bool
    public let requestsExternalTransfer: Bool
    public let automatedDecision: Bool
    public let estimatedIncrementalCostGbp: Double

    public init(sourceId: String, purpose: String, containsPersonalData: Bool,
                requestsExternalTransfer: Bool, automatedDecision: Bool,
                estimatedIncrementalCostGbp: Double) {
        self.sourceId = sourceId
        self.purpose = purpose
        self.containsPersonalData = containsPersonalData
        self.requestsExternalTransfer = requestsExternalTransfer
        self.automatedDecision = automatedDecision
        self.estimatedIncrementalCostGbp = estimatedIncrementalCostGbp
    }
}

public struct NovaSignalsResearchAssessment: Sendable {
    public let status: String
    public let reasons: [String]
    public let executionEnabled: Bool = false
}

public enum NovaSignalsResearchPolicy {
    public static func assess(_ request: NovaSignalsResearchRequest) -> NovaSignalsResearchAssessment {
        let sources: Set<String> = [
            "science-frontier", "freelance-frontier", "workers-frontier", "novices-rct",
            "enterprise-usage", "task-crossover", "eu-jobs", "adoption-global",
            "codex-agentic", "adoption-q1", "signals-v3", "enterprise-signals",
            "whisper-2022", "large-network-training-2022", "triton-2021"
        ]
        var reasons: [String] = []
        if !sources.contains(request.sourceId) { reasons.append("unregistered-source") }
        if request.purpose != "non-clinical-evidence-research" { reasons.append("unapproved-purpose") }
        if request.containsPersonalData { reasons.append("personal-data-not-admitted") }
        if request.requestsExternalTransfer { reasons.append("external-transfer-not-approved") }
        if request.automatedDecision { reasons.append("autonomous-decision-prohibited") }
        if !request.estimatedIncrementalCostGbp.isFinite || request.estimatedIncrementalCostGbp != 0 {
            reasons.append("zero-budget-only")
        }
        return NovaSignalsResearchAssessment(
            status: reasons.isEmpty ? "review-only" : "blocked",
            reasons: reasons
        )
    }
}
