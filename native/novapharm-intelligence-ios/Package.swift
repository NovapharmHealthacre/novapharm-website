// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NovaPharmNativeCore",
    platforms: [.iOS(.v17), .macOS(.v12)],
    products: [.library(name: "NovaPharmNativeCore", targets: ["NovaPharmNativeCore"])],
    targets: [
        .target(name: "NovaPharmNativeCore", path: "App",
                exclude: ["Assets.xcassets", "NovaRootView.swift", "NovaPharmNativeApp.swift",
                          "NovaTheme.swift", "OfflineBookmark.swift", "NovaCountryDirectoryView.swift",
                          "USFdaSourcePreviewView.swift", "CognitoFDAAuthSession.swift"],
                sources: ["WorkspaceCatalog.swift", "ReleasePolicy.swift", "CountryCatalog.swift",
                          "USFdaSourceCatalog.swift", "ProtectedFdaGateway.swift"]),
        /* END */
                exclude: ["NovaRootView.swift", "NovaPharmNativeApp.swift",
                          "NovaTheme.swift", "OfflineBookmark.swift", "NovaCountryDirectoryView.swift",
                          "USFdaSourcePreviewView.swift", "CognitoFDAAuthSession.swift"],
                sources: ["WorkspaceCatalog.swift", "ReleasePolicy.swift", "CountryCatalog.swift",
                          "USFdaSourceCatalog.swift", "ProtectedFdaGateway.swift"]),
        .testTarget(name: "NovaPharmNativeCoreTests",
                    dependencies: ["NovaPharmNativeCore"], path: "CoreTests")
    ]
)
