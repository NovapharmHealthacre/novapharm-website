import SwiftUI
import SwiftData

@main
struct NovaPharmNativeApp: App {
    var body: some Scene {
        WindowGroup {
            NovaRootView()
        }
        // Local-only generic workspace bookmarks; no CloudKit entitlement or private content.
        .modelContainer(for: OfflineBookmark.self)
    }
}
