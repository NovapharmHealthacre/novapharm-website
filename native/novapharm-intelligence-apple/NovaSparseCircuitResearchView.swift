// Research-only SwiftUI presentation. No model execution, networking or
// entitlement checks are implemented in this view.
import SwiftUI

@available(iOS 17.0, macOS 14.0, *)
public struct NovaSparseCircuitResearchView: View {
    private let summary: NovaSparseCircuitSummary?

    public init(summary: NovaSparseCircuitSummary? = nil) {
        self.summary = summary
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("NovaPharm Intelligence")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("Sparse-circuit research")
                .font(.largeTitle)
                .fontWeight(.semibold)

            Text("Research only · Not a clinical or production AI feature")
                .font(.subheadline)
                .fontWeight(.medium)
                .accessibilityAddTraits(.isHeader)
            Text("Model-internal circuits are not equivalent to medicine evidence, regulatory approvals, or causal safety guarantees.")
                .foregroundStyle(.secondary)

            if let summary {
                Text("Unverified research candidate")
                    .font(.headline)
                LabeledContent("Model", value: summary.modelId)
                LabeledContent("Task", value: summary.taskId)
                LabeledContent("Circuit nodes", value: String(summary.nodeCount))
                LabeledContent("Circuit edges", value: String(summary.edgeCount))
                LabeledContent("Evaluation samples", value: String(summary.sampleCount))
                LabeledContent("Ablation", value: "Mean")
                Text("Evaluation deltas are descriptive, not independent experimental proof.")
                    .foregroundStyle(.secondary)
            } else {
                Text("No independently verified circuit experiment is connected.")
                    .font(.body)
            }

            Text("An offline trained attention experiment exists on generated tokens only. It is not downloaded or executed by this native view.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            Text("A qualified reviewer must independently confirm model rights, source rights, held-out evaluation, ablation controls and provenance before any release.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
    }
}
