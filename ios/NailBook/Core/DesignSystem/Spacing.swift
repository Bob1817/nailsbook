import SwiftUI

// MARK: - Spacing & Radius (synced with WeChat mini-program rpx values)
// 750rpx = screen width, on iPhone 14 (390pt): 1rpx ≈ 0.52pt

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let xxxl: CGFloat = 32
    static let page: CGFloat = 20      // wxapp: 40rpx
    static let cardPadding: CGFloat = 14 // wxapp: 28rpx
    static let sectionGap: CGFloat = 12  // wxapp: 24rpx
}

enum Radius {
    static let xs: CGFloat = 6        // wxapp: 12rpx
    static let sm: CGFloat = 8        // wxapp: 16rpx
    static let md: CGFloat = 10       // wxapp: 20rpx
    static let lg: CGFloat = 12       // wxapp: 24rpx
    static let xl: CGFloat = 14       // wxapp: 28rpx
    static let xxl: CGFloat = 16      // wxapp: 32rpx
    static let card: CGFloat = 14     // wxapp: 28rpx (standard card)
    static let cardLg: CGFloat = 20   // wxapp: 40rpx (profile section card)
    static let hero: CGFloat = 18     // wxapp: 36rpx
    static let pill: CGFloat = 44     // wxapp: 88rpx (full-round pill)
    static let full: CGFloat = 999
}
