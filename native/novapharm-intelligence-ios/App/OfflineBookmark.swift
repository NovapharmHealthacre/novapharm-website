import Foundation
import SwiftData

/// Non-sensitive app navigation preference only. No account, order, medicine or patient data.
@Model
final class OfflineBookmark {
    @Attribute(.unique) var workspaceID: String
    var createdAt: Date

    init(workspaceID: String, createdAt: Date = .now) {
        self.workspaceID = workspaceID
        self.createdAt = createdAt
    }
}
