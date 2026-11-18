// Advisory planning only. Never authorizes, queues or executes compute.
import Foundation

public struct NovaComputeProposal: Sendable {
    public let mode: String
    public let accelerator: String
    public let datasetDigest: String
    public let modelDigest: String
    public let purpose: String
    public let dataClass: String
    public let containsPersonalData: Bool
    public let cpuCores: Int
    public let gpuCount: Int
    public let memoryGiB: Int
    public let durationMinutes: Int
    public let retentionDays: Int
    public let region: String
    public let estimatedCostGbp: Double

    public init(
        mode: String, accelerator: String, datasetDigest: String, modelDigest: String,
        purpose: String, dataClass: String, containsPersonalData: Bool,
        cpuCores: Int, gpuCount: Int, memoryGiB: Int, durationMinutes: Int,
        retentionDays: Int, region: String, estimatedCostGbp: Double
    ) {
        self.mode = mode
        self.accelerator = accelerator
        self.datasetDigest = datasetDigest
        self.modelDigest = modelDigest
        self.purpose = purpose
        self.dataClass = dataClass
        self.containsPersonalData = containsPersonalData
        self.cpuCores = cpuCores
        self.gpuCount = gpuCount
        self.memoryGiB = memoryGiB
        self.durationMinutes = durationMinutes
        self.retentionDays = retentionDays
        self.region = region
        self.estimatedCostGbp = estimatedCostGbp
    }
}

public struct NovaComputeAssessment: Sendable {
    public let status: String
    public let executionEnabled: Bool = false
    public let reasons: [String]
}

public enum NovaComputePlanner {
    // A candidate can only be review-only. A signed application and server
    // must verify identity, actual budget, licences and release independently.
    public static func assess(
        _ proposal: NovaComputeProposal,
        allowedRegions: Set<String> = ["eu-west-2"],
        maximumBudgetGbp: Double = 0
    ) -> NovaComputeAssessment {
        var reasons: [String] = []
        func digestValid(_ value: String) -> Bool {
            value.range(of: #"^sha256:[0-9a-f]{64}$"#, options: .regularExpression) != nil
        }
        if !["experiment", "training", "batch-inference"].contains(proposal.mode) { reasons.append("invalid-mode") }
        if !["cpu", "gpu"].contains(proposal.accelerator) { reasons.append("invalid-accelerator") }
        if !digestValid(proposal.datasetDigest) { reasons.append("unversioned-dataset") }
        if !digestValid(proposal.modelDigest) { reasons.append("unversioned-model") }
        if proposal.purpose != "non-clinical-research" { reasons.append("unapproved-purpose") }
        if !["public-approved", "internal-nonpersonal-approved"].contains(proposal.dataClass) { reasons.append("data-class-not-admitted") }
        if proposal.containsPersonalData { reasons.append("personal-data-not-admitted") }
        for (name, value, lower, upper) in [
            ("cpuCores", proposal.cpuCores, 1, 32),
            ("gpuCount", proposal.gpuCount, 0, 4),
            ("memoryGiB", proposal.memoryGiB, 1, 256),
            ("durationMinutes", proposal.durationMinutes, 1, 1440),
            ("retentionDays", proposal.retentionDays, 0, 30)
        ] where value < lower || value > upper {
            reasons.append("invalid-" + name)
        }
        if proposal.accelerator == "cpu" && proposal.gpuCount != 0 { reasons.append("cpu-gpu-mismatch") }
        if proposal.accelerator == "gpu" && proposal.gpuCount < 1 { reasons.append("gpu-count-required") }
        if !allowedRegions.contains(proposal.region) { reasons.append("region-not-allowed") }
        if !proposal.estimatedCostGbp.isFinite || proposal.estimatedCostGbp < 0 ||
            !maximumBudgetGbp.isFinite || maximumBudgetGbp < 0 ||
            proposal.estimatedCostGbp > maximumBudgetGbp {
            reasons.append("budget-not-approved")
        }
        return NovaComputeAssessment(status: reasons.isEmpty ? "review-only" : "blocked", reasons: reasons)
    }
}
