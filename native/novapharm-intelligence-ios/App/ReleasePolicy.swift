import Foundation

/// Offline iOS source preview, not an authorization service.
public enum NovaNativeReleasePolicy {
    public static let productionApproved = false
    public static let authenticatedMobileClientAvailable = false
    public static let protectedNetworkOperationsEnabled = false
    public static let billingEnabled = false
    public static let privateDataCachingEnabled = false

    public static func canOpenProtectedWorkspace(_ workspace: NovaWorkspace) -> Bool {
        // Bundled module status or saved local preferences can never grant server access.
        false
    }
}
