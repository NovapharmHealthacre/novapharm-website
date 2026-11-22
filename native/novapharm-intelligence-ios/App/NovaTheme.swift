import SwiftUI

/// NovaPharm Intelligence Regal Ultramarine; preserve system semantic surfaces.
enum NovaTheme {
    static let accent = Color(uiColor: UIColor { trait in\n        trait.userInterfaceStyle == .dark\n            ? UIColor(red: 168.0 / 255, green: 184.0 / 255, blue: 255.0 / 255, alpha: 1)\n            : UIColor(red: 37.0 / 255, green: 70.0 / 255, blue: 216.0 / 255, alpha: 1)\n    })
    static let surface = Color(uiColor: .secondarySystemGroupedBackground)
    static let background = Color(uiColor: .systemGroupedBackground)
}
