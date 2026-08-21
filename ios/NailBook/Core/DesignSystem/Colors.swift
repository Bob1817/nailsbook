import SwiftUI

// MARK: - NailBook Design Tokens (synced with WeChat mini-program)

extension Color {
    // Primary (Brand Pink #FF6B8A)
    static let nbPrimary = Color(hex: "FF6B8A")
    static let nbPrimaryDark = Color(hex: "E00B41")
    static let nbPrimaryLight = Color(hex: "FF8FA3")
    static let nbPrimaryPale = Color(hex: "FFB0BE")
    static let nbPrimarySoft = Color(hex: "FFF0F5")
    static let nbPrimaryBg = Color(hex: "FFF1F5")

    // Brand Purple (gradient end)
    static let nbPurple = Color(hex: "A78BFA")
    static let nbPurpleDark = Color(hex: "8B5CF6")
    static let nbPurpleSoft = Color(hex: "F5F3FF")

    // Secondary
    static let nbSecondary = Color(hex: "6B7280")
    static let nbSecondaryDark = Color(hex: "4B5563")
    static let nbSecondaryLight = Color(hex: "9CA3AF")
    static let nbSecondarySoft = Color(hex: "F3F4F6")

    // Success
    static let nbSuccess = Color(hex: "22C55E")
    static let nbSuccessDark = Color(hex: "16A34A")
    static let nbSuccessSoft = Color(hex: "ECFDF5")

    // Warning
    static let nbWarning = Color(hex: "D97706")
    static let nbWarningDark = Color(hex: "B45309")
    static let nbWarningSoft = Color(hex: "FFF4E6")

    // Error / Danger
    static let nbError = Color(hex: "DC2626")
    static let nbErrorDark = Color(hex: "B91C1C")
    static let nbErrorSoft = Color(hex: "FEF2F2")

    // Info
    static let nbInfo = Color(hex: "2563EB")
    static let nbInfoDark = Color(hex: "1D4ED8")
    static let nbInfoSoft = Color(hex: "EFF6FF")

    // Text (wxapp: #1f2937, #6b7280, #4b5563, #9ca3af)
    static let nbTextPrimary = Color(hex: "1F2937")
    static let nbTextSecondary = Color(hex: "6B7280")
    static let nbTextTertiary = Color(hex: "4B5563")
    static let nbTextMuted = Color(hex: "9CA3AF")
    static let nbTextQuaternary = Color(hex: "D1D5DB")

    // Surface
    static let nbBg = Color(hex: "F8F9FC")
    static let nbBgAlt = Color(hex: "F5F6FA")
    static let nbBgDiscover = Color(hex: "F0F0F4")
    static let nbBgWarm = Color(hex: "FFF8FB")
    static let nbSurface = Color.white
    static let nbSurfaceAlt = Color(hex: "F9FAFB")
    static let nbSurfaceGlass = Color.white.opacity(0.92)

    // Border
    static let nbBorder = Color(hex: "E5E7EB")
    static let nbBorderInput = Color(hex: "DDD8DC")
    static let nbBorderFocus = Color(hex: "BD587D")
    static let nbBorderLight = Color(hex: "F2E6EC")
    static let nbDivider = Color(hex: "F5F5F5")
    static let nbHairline = Color(hex: "E2E8F0")

    // Status badge colors (from wxapp)
    static let nbStatusAmber = Color(hex: "B45309")
    static let nbStatusAmberBg = Color(hex: "FFF4E6")
    static let nbStatusBlue = Color(hex: "1D4ED8")
    static let nbStatusBlueBg = Color(hex: "EFF6FF")
    static let nbStatusPurple = Color(hex: "6D28D9")
    static let nbStatusPurpleBg = Color(hex: "F5F3FF")
    static let nbStatusGreen = Color(hex: "047857")
    static let nbStatusGreenBg = Color(hex: "ECFDF5")
    static let nbStatusGray = Color(hex: "4B5563")
    static let nbStatusGrayBg = Color(hex: "F3F4F6")
    static let nbStatusRed = Color(hex: "B91C1C")
    static let nbStatusRedBg = Color(hex: "FEF2F2")
}

// MARK: - Gradients (synced with wxapp)

enum NBGradient {
    // Primary gradient: #FF6B8A -> #A78BFA (135deg)
    static let primary = LinearGradient(
        colors: [Color(hex: "FF6B8A"), Color(hex: "A78BFA")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Button gradient: same as primary
    static let button = LinearGradient(
        colors: [Color(hex: "FF6B8A"), Color(hex: "A78BFA")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Chat bubble gradient (self): #FF6B8A -> #FF8FA3
    static let bubbleSelf = LinearGradient(
        colors: [Color(hex: "FF6B8A"), Color(hex: "FF8FA3")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Hero header gradient: #ff6b8a -> #c084fc
    static let heroHeader = LinearGradient(
        colors: [Color(hex: "FF6B8A"), Color(hex: "C084FC")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Page background gradient: #fff8fb -> #ffffff -> #f8f9fc
    static let pageBg = LinearGradient(
        colors: [Color(hex: "FFF8FB"), Color.white, Color(hex: "F8F9FC")],
        startPoint: .top,
        endPoint: .bottom
    )

    // Order card gradient: #FF6B8A -> #FF7C98 -> #FF8FA3
    static let orderCard = LinearGradient(
        colors: [Color(hex: "FF6B8A"), Color(hex: "FF7C98"), Color(hex: "FF8FA3")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Archive card: #3c2732 -> #6f4357
    static let archiveCard = LinearGradient(
        colors: [Color(hex: "3C2732"), Color(hex: "6F4357")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // AI card: #fff1f7 -> #eee8ff
    static let aiCard = LinearGradient(
        colors: [Color(hex: "FFF1F7"), Color(hex: "EEE8FF")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Date box gradient: #fff5f7 -> #ffe8ee
    static let dateBox = LinearGradient(
        colors: [Color(hex: "FFF5F7"), Color(hex: "FFEE8EE")],
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

    // Empty state icon: #FFE2EA -> #EDE9FE
    static let emptyIcon = LinearGradient(
        colors: [Color(hex: "FFE2EA"), Color(hex: "EDE9FE")],
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
