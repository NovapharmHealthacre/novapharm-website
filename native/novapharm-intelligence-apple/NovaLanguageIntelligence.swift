// Nova Device Intelligence — local Natural Language inspection of approved public text.
// Candidate source only. No browser bridge, network access, persistence or training.
import Foundation
#if canImport(NaturalLanguage)
import NaturalLanguage

@available(iOS 17.0, macOS 14.0, *)
struct NovaLanguagePermit {
    let trustedSourceApproved: Bool
    let explicitlyRequestedByUser: Bool
    let containsPatientOrRestrictedContent: Bool
}

@available(iOS 17.0, macOS 14.0, *)
enum NovaLanguageError: Error {
    case permissionOrPurposeMissing
    case emptyOrOversizedInput
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaLanguageInspection {
    let sourceReference: String
    let dominantLanguageCode: String?
    let approximateWordCount: Int
    let requiresHumanVerification: Bool = true
    let automaticallyApproved: Bool = false
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaLanguageIntelligence {
    // Only pass sources approved by the signed application's trusted source controller.
    // Neither a browser-supplied flag nor self-attestation is a substitute for that gate.
    func inspect(
        approvedPublicText: String,
        sourceReference: String,
        permit: NovaLanguagePermit
    ) throws -> NovaLanguageInspection {
        guard permit.trustedSourceApproved &&
              permit.explicitlyRequestedByUser &&
              !permit.containsPatientOrRestrictedContent &&
              !sourceReference.isEmpty else {
            throw NovaLanguageError.permissionOrPurposeMissing
        }
        guard !approvedPublicText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
              approvedPublicText.count <= 10_000 else {
            throw NovaLanguageError.emptyOrOversizedInput
        }
        // Each invocation creates its own recognizer and tokenizer; no mutable global state.
        let recognizer = NLLanguageRecognizer()
        recognizer.processString(approvedPublicText)
        let tokenizer = NLTokenizer(unit: .word)
        tokenizer.string = approvedPublicText
        let wordCount = tokenizer.tokens(
            for: approvedPublicText.startIndex..<approvedPublicText.endIndex
        ).count
        // Apple's language detector is less reliable on short/ambiguous text.
        // Do not claim a calibrated probability or guess the language of short snippets.
        let language = approvedPublicText.count >= 40
            ? recognizer.dominantLanguage?.rawValue
            : nil
        return NovaLanguageInspection(
            sourceReference: sourceReference,
            dominantLanguageCode: language,
            approximateWordCount: wordCount
        )
    }
}
#endif
