import SwiftUI

/// Original NovaPharm identity, with an accessible brighter red in Dark Mode.
/// The light brand is #E3120B; the dark adaptation #FF6961 offers a stronger
/// distinction from system dark grouped backgrounds and preserves brand character.
/// System text/surfaces remain dynamic for contrast, appearance and legibility.
enum NovaTheme {
    /// Preserve the exact NovaPharm corporate red for identity artwork and large graphics.
    static let brandRed = Color(red: 227.0 / 255, green: 18.0 / 255, blue: 11.0 / 255)

    /// Small interactive labels need >=4.5:1 against both white and grouped light surfaces.
    /// #D9130D passes on #F2F2F7 whereas the brand red #E3120B is only ~4.32:1.
    static let accent = Color(uiColor: UIColor { traits in
        if traits.userInterfaceStyle == .dark {
            return UIColor(red: 255.0 / 255, green: 105.0 / 255, blue: 97.0 / 255, alpha: 1)
        }
        return UIColor(red: 217.0 / 255, green: 19.0 / 255, blue: 13.0 / 255, alpha: 1)
    })
    static let surface = Color(uiColor: .secondarySystemGroupedBackground)
    static let background = Color(uiColor: .systemGroupedBackground)
}
