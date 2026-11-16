// NovaPharm Intelligence: Apple Foundation Models research candidate.
// Compiled only into a future signed native app. There is no web or server endpoint.
// Inputs must be independently checked as permitted PUBLIC material by the caller.
import Foundation

#if canImport(FoundationModels)
import FoundationModels

@available(iOS 26.0, macOS 26.0, *)
enum NovaWritingError: Error {
    case unavailable
    case unapprovedInput
}

@available(iOS 26.0, macOS 26.0, *)
struct NovaProposedWriting {
    let text: String
    let originalSourceID: String
    let humanReviewRequired: Bool = true
    let evidenceVerified: Bool = false
    let publicationApproved: Bool = false
}

@available(iOS 26.0, macOS 26.0, *)
struct NovaFoundationModelsAssist {
    func proposePlainLanguage(
        approvedPublishedText: String,
        sourceID: String,
        sourceApprovedByTrustedController: Bool,
        explicitlyRequestedByUser: Bool
    ) async throws -> NovaProposedWriting {
        guard sourceApprovedByTrustedController && explicitlyRequestedByUser &&
              !sourceID.isEmpty && sourceID.count <= 128 &&
              !approvedPublishedText.isEmpty && approvedPublishedText.count <= 1600 else {
            throw NovaWritingError.unapprovedInput
        }
        // Eligible devices and supported regions/OS versions only.
        guard SystemLanguageModel.default.isAvailable else {
            throw NovaWritingError.unavailable
        }
        // Apple maintains a transcript in each LanguageModelSession while it exists.
        // Use a per-request session and never serialize, upload or log that transcript.
        let session = LanguageModelSession(instructions: """
            Rewrite only the supplied public corporate excerpt in plain British English.
            Do not introduce facts, clinical recommendations, regulatory authorisations,
            forecasts, stock status or personal information. Do not call external tools.
            Output is a draft that always requires independent human verification.
            """)
        let answer = try await session.respond(to:
            "Suggest a clearer version of the following published source excerpt:\n" + approvedPublishedText
        )
        // The calling app must show the original side-by-side and allow reject/edit.
        // An apparent faithful rewrite is never proof of factual correctness.
        return NovaProposedWriting(text: answer.content, originalSourceID: sourceID)
    }
}
#endif
