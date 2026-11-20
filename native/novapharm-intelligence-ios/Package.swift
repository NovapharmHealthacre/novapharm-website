// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NovaPharmNativeCore",
    platforms: [.iOS(.v17)],
    products: [.library(name: "NovaPharmNativeCore", targets: ["NovaPharmNativeCore"])],
    targets: [
        .target(name: "NovaPharmNativeCore", path: "App",
                exclude: ["NovaRootView.swift", "NovaPharmNativeApp.swift",
                          "NovaTheme.swift", "OfflineBookmark.swift", "NovaCountryDirectoryView.swift"],
                sources: ["WorkspaceCatalog.swift", "ReleasePolicy.swift", "CountryCatalog.swift"]),
        .testTarget(name: "NovaPharmNativeCoreTests",
                    dependencies: ["NovaPharmNativeCore"], path: "CoreTests")
    ]
)
