import SwiftUI

// MARK: - OnlyNail Design Tokens (aligned with WeChat mini-program)

// Token values from wxapp styles/tokens.wxss
// rpx to pt conversion: 750rpx = 375pt, so 1pt = 2rpx

enum Spacing {
    static let xs: CGFloat = 4      // 8rpx
    static let sm: CGFloat = 8      // 16rpx
    static let md: CGFloat = 12     // 24rpx
    static let lg: CGFloat = 16     // 32rpx
    static let xl: CGFloat = 20     // 40rpx
    static let xxl: CGFloat = 24    // 48rpx
    static let xxxl: CGFloat = 32   // 64rpx

    // Page margins
    static let page: CGFloat = 16   // 32rpx
    static let cardPadding: CGFloat = 12  // 24rpx
    static let sectionGap: CGFloat = 16   // 32rpx
}

enum Radius {
    static let xs: CGFloat = 4      // 8rpx
    static let sm: CGFloat = 7      // 14rpx
    static let md: CGFloat = 10     // 20rpx
    static let lg: CGFloat = 14     // 28rpx
    static let xl: CGFloat = 22     // 44rpx
    static let pill: CGFloat = 24   // 48rpx
    static let full: CGFloat = 9999

    // Card & Button
    static let card: CGFloat = 9    // 18rpx
    static let cardLg: CGFloat = 14 // larger card radius
    static let button: CGFloat = 8  // from wxss: --btn-radius: 8px
    static let input: CGFloat = 14  // from wxss: --input-radius: 14px
    static let hero: CGFloat = 18   // hero card radius
}
