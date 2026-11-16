// Read-only shortcut to a future signed NovaPharm Intelligence native app.
// A shortcut NEVER queries or exposes private tenant, medical or customer data.
import AppIntents

@available(iOS 17.0, macOS 14.0, *)
struct OpenNovaResearchIntent: AppIntent {
    static var title: LocalizedStringResource { "Open NovaPharm research" }
    static let description = IntentDescription(
        "Open the NovaPharm Intelligence app to continue authorised research."
    )
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // Only foreground the installed app. Its own verified session and
        // workspace permissions must govern any subsequent record access.
        return .result()
    }
}
