// Explicitly initiated image-only text extraction for a future native app.
// No camera session, file read, upload, tracking or automatic storage.
import Foundation
import CoreGraphics
import Vision

enum NovaDocumentError: Error {
    case permissionOrPurposeMissing
}

@available(iOS 17.0, macOS 14.0, *)
struct NovaDocumentIntelligence {
    func recogniseSelectedImage(
        _ image: CGImage,
        userExplicitlySelectedImage: Bool,
        documentPurposeApproved: Bool,
        containsPatientOrSensitiveData: Bool
    ) throws -> [String] {
        guard userExplicitlySelectedImage && documentPurposeApproved &&
              !containsPatientOrSensitiveData else {
            throw NovaDocumentError.permissionOrPurposeMissing
        }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        try handler.perform([request])
        // Unverified candidate text, never a signed regulatory/document record.
        return (request.results ?? []).compactMap {
            $0.topCandidates(1).first?.string
        }
    }
}
