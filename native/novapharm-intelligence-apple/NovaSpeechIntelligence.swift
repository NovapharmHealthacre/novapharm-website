// Nova Device Intelligence — file-only, on-device speech recognition candidate.
// No live microphone, continuous recording, speech upload or automatic save.
import Foundation
#if canImport(Speech)
import Speech

@available(iOS 17.0, macOS 14.0, *)
struct NovaSpeechPermit {
    let explicitlySelectedLocalFile: Bool
    let trustedSourceApproved: Bool
    let transcriptionPurposeApproved: Bool
    let containsPatientOrRestrictedContent: Bool
}

@available(iOS 17.0, macOS 14.0, *)
enum NovaSpeechError: Error {
    case unapprovedAudio
    case speechPermissionMissing
    case offlineLanguageUnavailable
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaSpeechTranscriptCandidate {
    let text: String
    let sourceReference: String
    let requiresHumanCorrection: Bool = true
    let automaticallyApproved: Bool = false
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaSpeechIntelligence {
    // Caller must first present Apple's speech recognition permission prompt in context.
    // Its Info.plist needs NSSpeechRecognitionUsageDescription; the user selects one local
    // audio file using the operating system's secure document picker.
    // Caller retains the returned task so they can cancel at any time or on sign-out.
    func transcribeSelectedFile(
        audioURL: URL,
        sourceReference: String,
        localeIdentifier: String,
        permit: NovaSpeechPermit,
        onCompletion: @escaping (Result<NovaSpeechTranscriptCandidate, Error>) -> Void
    ) throws -> SFSpeechRecognitionTask {
        guard permit.explicitlySelectedLocalFile &&
              permit.trustedSourceApproved &&
              permit.transcriptionPurposeApproved &&
              !permit.containsPatientOrRestrictedContent &&
              !sourceReference.isEmpty &&
              !localeIdentifier.isEmpty &&
              audioURL.isFileURL &&
              ["wav", "m4a", "caf", "aiff"].contains(audioURL.pathExtension.lowercased())
        else {
            throw NovaSpeechError.unapprovedAudio
        }
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            throw NovaSpeechError.speechPermissionMissing
        }
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier)),
              recognizer.isAvailable,
              recognizer.supportsOnDeviceRecognition else {
            // Fail closed; never silently use server-side Apple or third-party recognition.
            throw NovaSpeechError.offlineLanguageUnavailable
        }
        let request = SFSpeechURLRecognitionRequest(url: audioURL)
        request.shouldReportPartialResults = false
        request.requiresOnDeviceRecognition = true
        return recognizer.recognitionTask(with: request) { result, error in
            if let error {
                onCompletion(.failure(error))
                return
            }
            guard let result, result.isFinal else { return }
            onCompletion(.success(NovaSpeechTranscriptCandidate(
                text: result.bestTranscription.formattedString,
                sourceReference: sourceReference
            )))
        }
    }
}
#endif
