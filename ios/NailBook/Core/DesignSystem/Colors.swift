import SwiftUI

// MARK: - NailBook Design Tokens (synced with WeChat mini-program)

extension Color {
    // Legacy API adapted to COLOR-STANDARD.md.
    static let nbPrimary = NBColors.action
    static let nbPrimaryDark = NBColors.action
    static let nbPrimaryLight = NBColors.action
    static let nbPrimaryPale = NBColors.action
    static let nbPrimarySoft = NBColors.page
    static let nbPrimaryBg = NBColors.page

    // Brand Purple (gradient end)
    static let nbPurple = NBColors.action
    static let nbPurpleDark = NBColors.action
    static let nbPurpleSoft = NBColors.page

    // Secondary
    static let nbSecondary = NBColors.muted
    static let nbSecondaryDark = NBColors.secondary
    static let nbSecondaryLight = NBColors.muted
    static let nbSecondarySoft = NBColors.page

    // Success
    static let nbSuccess = NBColors.action
    static let nbSuccessDark = NBColors.action
    static let nbSuccessSoft = NBColors.page

    // Warning
    static let nbWarning = NBColors.action
    static let nbWarningDark = NBColors.action
    static let nbWarningSoft = NBColors.page

    // Error / Danger
    static let nbError = NBColors.action
    static let nbErrorDark = NBColors.action
    static let nbErrorSoft = NBColors.page

    // Info
    static let nbInfo = NBColors.link
    static let nbInfoDark = NBColors.link
    static let nbInfoSoft = NBColors.page

    // Legacy API adapted to COLOR-STANDARD.md.
    static let nbTextPrimary = NBColors.ink
    static let nbTextSecondary = NBColors.muted
    static let nbTextTertiary = NBColors.secondary
    static let nbTextMuted = NBColors.muted
    static let nbTextQuaternary = NBColors.muted

    // Surface
    static let nbBg = NBColors.page
    static let nbBgAlt = NBColors.page
    static let nbBgDiscover = NBColors.page
    static let nbBgWarm = NBColors.page
    static let nbSurface = Color.white
    static let nbSurfaceAlt = NBColors.page
    static let nbSurfaceGlass = Color.white.opacity(0.92)

    // Border
    static let nbBorder = NBColors.line
    static let nbBorderInput = NBColors.line
    static let nbBorderFocus = NBColors.action
    static let nbBorderLight = NBColors.line
    static let nbDivider = NBColors.page
    static let nbHairline = NBColors.line

    // Status badge colors (from wxapp)
    static let nbStatusAmber = NBColors.action
    static let nbStatusAmberBg = NBColors.page
    static let nbStatusBlue = NBColors.link
    static let nbStatusBlueBg = NBColors.page
    static let nbStatusPurple = NBColors.action
    static let nbStatusPurpleBg = NBColors.page
    static let nbStatusGreen = NBColors.action
    static let nbStatusGreenBg = NBColors.page
    static let nbStatusGray = NBColors.secondary
    static let nbStatusGrayBg = NBColors.page
    static let nbStatusRed = NBColors.action
    static let nbStatusRedBg = NBColors.page
}

// MARK: - Gradients (synced with wxapp)

enum NBGradient {
    // Legacy API adapted to COLOR-STANDARD.md.
    static let primary = LinearGradient(
        colors: [NBColors.action, NBColors.action],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Button gradient: same as primary
    static let button = LinearGradient(
        colors: [NBColors.action, NBColors.action],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let bubbleSelf = LinearGradient(
        colors: [NBColors.action, NBColors.action],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let heroHeader = LinearGradient(
        colors: [NBColors.action, NBColors.action],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let pageBg = LinearGradient(
        colors: [NBColors.page, Color.white, NBColors.page],
        startPoint: .top,
        endPoint: .bottom
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let orderCard = LinearGradient(
        colors: [NBColors.action, NBColors.action, NBColors.action],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let archiveCard = LinearGradient(
        colors: [NBColors.ink, NBColors.action],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let aiCard = LinearGradient(
        colors: [NBColors.page, NBColors.page],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let dateBox = LinearGradient(
        colors: [NBColors.page, NBColors.page],
        startPoint: .top,
        endPoint: .bottom
    )

    // Work card overlay
    static let workOverlay = LinearGradient(
        stops: [
            .init(color: Color.black.opacity(0.25), location: 0),
            .init(color: Color.clear, location: 0.35),
            .init(color: Color.clear, location: 0.50),
            .init(color: Color.black.opacity(0.72), location: 1)
        ],
        startPoint: .top,
        endPoint: .bottom
    )

    // Legacy API adapted to COLOR-STANDARD.md.
    static let emptyIcon = LinearGradient(
        colors: [NBColors.line, NBColors.page],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB,
                  red: Double(r) / 255,
                  green: Double(g) / 255,
                  blue: Double(b) / 255,
                  opacity: Double(a) / 255)
    }
}

// BEGIN GENERATED COLOR PRIMITIVES — scripts/sync-colors.py
enum NBColors {
    static let page = Color(hex: "F5F5F7")
    static let surface = Color(hex: "FFFFFF")
    static let pressed = Color(hex: "ECECEF")
    static let ink = Color(hex: "1D1D1F")
    static let secondary = Color(hex: "48484D")
    static let muted = Color(hex: "6E6E73")
    static let line = Color(hex: "E5E5EA")
    static let control = Color(hex: "8A8A8F")
    static let link = Color(hex: "526477")
    static let activeSurface = Color(hex: "EEF1F5")
    static let action = Color(hex: "1D1D1F")
    static let actionPressed = Color(hex: "343438")
    static let inverse = Color(hex: "FFFFFF")
}
