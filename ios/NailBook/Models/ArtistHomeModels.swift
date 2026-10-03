import Foundation

// MARK: - Public Artist Profile (from /public/artist/id/:id)

struct PublicArtistResponse: Codable {
    var artist: PublicArtistProfile?
    var works: [NailWork]?
    var qualifications: [ArtistQualification]?
    var featuredReviews: [FeaturedReview]?
}

struct PublicArtistProfile: Codable, Identifiable {
    let id: Int
    var name: String?
    var avatarUrl: String?
    var phone: String?
    var city: String?
    var serviceArea: String?
    var bio: String?
    var servicePhilosophy: String?
    var experienceYears: Int?
    var specialties: [String]?
    var styleTags: [String]?
    var status: String?
    var acceptingBookings: Bool?
    var homeService: Bool?
    var shopService: Bool?
    var invitationCode: String?
    var isVerified: Bool?

    // Shop info
    var shopName: String?
    var shopAddress: String?
    var shopPhone: String?
    var shopLatitude: Double?
    var shopLongitude: Double?
    var businessHours: String?
    var shopAddresses: [ShopAddress]?

    // Stats
    var serviceCount: Int?
    var satisfactionRate: Double?
    var workCount: Int?
    var followerCount: Int?
    var reviewCount: Int?
    var rating: Double?

    // Services
    var serviceItems: [PublicArtistService]?

    // Social media
    var socialMedia: ArtistSocialMedia?

    // Booking readiness
    var bookingReadinessIssues: [String]?

    // Brand profile extras
    var brandProfile: BrandProfile?

    var isOnline: Bool { status == "active" }
}

struct PublicArtistService: Codable, Identifiable {
    var id: String?
    var name: String?
    var description: String?
    var category: String?
    var priceCents: Int?
    var price: Double?
    var durationMinutes: Int?
    var depositMode: String?
    var depositValue: Double?
    var isActive: Bool?

    var displayPrice: Double {
        if let p = price, p > 0 { return p }
        if let c = priceCents { return Double(c) / 100.0 }
        return 0
    }
}

struct ArtistSocialMedia: Codable {
    var wechat: String?
    var xiaohongshu: String?
    var douyin: String?
}

struct ArtistQualification: Codable, Identifiable {
    var id: Int?
    var type: String?
    var title: String?
    var detail: String?
    var organization: String?
    var year: Int?
    var month: Int?
    var imageUrl: String?
    var isVerified: Bool?
}

struct FeaturedReview: Codable, Identifiable {
    var id: Int
    var content: String?
    var rating: Int?
    var clientName: String?
    var clientAvatarUrl: String?
    var createdAt: String?
}

struct FollowStatus: Codable {
    var followed: Bool?
}