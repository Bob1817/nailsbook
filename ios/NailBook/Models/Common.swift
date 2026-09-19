import Foundation

// MARK: - Design Request Models

struct DesignRequest: Codable, Identifiable {
    let id: Int
    let clientId: Int
    let techId: Int
    var title: String?
    var images: [String]?
    var description: String?
    var quotePrice: Double?
    var quoteRemark: String?
    var status: String
    var createdAt: String?
    var updatedAt: String?
    var technician: OrderTechnician?
}

// MARK: - Address Models

struct ClientAddress: Codable, Identifiable {
    let id: Int
    let clientId: Int
    var contactName: String
    var contactPhone: String
    var province: String?
    var city: String?
    var district: String?
    var detailAddress: String
    var doorInfo: String?
    var latitude: Double?
    var longitude: Double?
    var isDefault: Bool
    var createdAt: String?
    var updatedAt: String?
}

// MARK: - Conversation & Message Models

struct Conversation: Codable, Identifiable {
    let id: Int
    var clientId: Int?
    var techId: Int?
    var lastMessage: String?
    var lastMessageAt: String?
    var createdAt: String?
    var client: ConversationClient?
    var technician: ConversationTechnician?
    var unreadCount: Int?
}

struct ConversationClient: Codable, Identifiable {
    let id: Int
    var nickname: String?
    var avatarUrl: String?
}

struct ConversationTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var avatarUrl: String?
}

struct ChatMessage: Codable, Identifiable {
    let id: Int
    let conversationId: Int
    let senderType: String
    let senderId: Int
    let receiverType: String?
    let receiverId: Int?
    var messageType: String
    var content: String?
    var imageUrl: String?
    var relatedType: String?
    var relatedId: Int?
    var isRead: Bool?
    var createdAt: String?
}

// MARK: - Service Models

struct TechnicianService: Codable, Identifiable {
    let id: String
    var name: String
    var description: String?
    var price: Double?
    var durationMinutes: Int?
    var duration: Int? { durationMinutes }
    var category: String?
    var isActive: Bool
    var createdAt: String?
}

// MARK: - Customer Models

struct Customer: Codable, Identifiable {
    let id: Int
    let technicianId: Int
    var clientUserId: Int?
    var name: String?
    var phone: String?
    var avatarUrl: String?
    var tags: [String]?
    var notes: String?
    var sourceType: String?
    var createdAt: String?
    var orderCount: Int?
    var totalSpent: Double?
    var lastOrderAt: String?
    var followUps: [FollowUp]?
}

// MARK: - Subscription Models

struct SubscriptionPlan: Codable, Identifiable {
    let id: Int
    let name: String
    let code: String
    var price: Double?
    var billingCycle: String?
    var maxCustomers: Int?
    var maxMonthlyBookings: Int?
    var maxWorks: Int?
    var description: String?
    var features: String?
    var status: String?
}

struct TechnicianSubscription: Codable {
    let id: Int
    let technicianId: Int
    let planId: Int
    var status: String?
    var startedAt: String?
    var expiredAt: String?
    var plan: SubscriptionPlan?
}

// MARK: - Home Data

struct ClientHomeData: Codable {
    var technician: HomeTechnician?
    var works: [NailWork]?
    var featuredWorks: [NailWork]? { works }
    var latestOrder: Order?
    var pendingBindingCount: Int?
}

struct HomeTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var avatarUrl: String?
    var city: String?
    var serviceArea: String?
}

struct TechnicianHomeData: Codable {
    var todayOrders: [Order]?
    var pendingQuoteCount: Int?
    var pendingConfirmCount: Int?
    var todayIncome: Double?
    var totalCustomers: Int?
}

// MARK: - Insights Models

struct TechnicianInsights: Codable {
    var period: InsightsPeriod?
    var revenue: InsightsRevenue?
    var bookings: InsightsBookings?
    var customers: InsightsCustomers?
    var rating: InsightsRating?
    var works: InsightsWorks?
    var trends: InsightsTrends?
    var referrals: InsightsReferrals?
}

struct InsightsReferrals: Codable {
    var total: Int?
    var qualified: Int?
    var conversionRate: Double?
    var qualifiedRevenue: Double?
}

struct InsightsPeriod: Codable {
    var selectedMonth: String?
    var minMonth: String?
    var maxMonth: String?
    var monthStart: String?
    var endExclusive: String?
}

struct InsightsRevenue: Codable {
    var monthConfirmed: Double?
    var averageTicket: Double?
}

struct InsightsBookings: Codable {
    var monthCompleted: Int?
    var pending: Int?
    var today: Int?
}

struct InsightsCustomers: Codable {
    var total: Int?
    var newThisMonth: Int?
    var repeatRate: Double?
    var dueForRepurchase: Int?
}

struct InsightsRating: Codable {
    var average: Double?
    var count: Int?
}

struct InsightsWorks: Codable {
    var total: Int?
}

struct InsightsTrends: Codable {
    var daily: [TrendItem]?
    var weekly: [TrendItem]?
}

struct TrendItem: Codable {
    var period: String?
    var revenue: Double?
    var bookings: Int?
}

// MARK: - Beauty Archive Models

struct BeautyArchiveResponse: Codable {
    var records: [BeautyRecord]?
    var summary: BeautySummary?
    var recommendations: [NailWork]?
}

struct BeautyRecord: Codable, Identifiable {
    let id: Int
    var targetType: String?
    var targetId: Int?
    var title: String?
    var coverUrl: String?
    var imageUrls: [String]?
    var clientPhotos: [String]?
    var clientRecordNote: String?
    var orderId: Int?
    var workId: Int?
    var canShare: Bool?
    var technicianId: Int?
    var technicianName: String?
    var serviceDate: String?
    var price: Double?
    var tags: [String]?
}

struct BeautySummary: Codable {
    var totalSpent: Double?
    var favoriteStyle: String?
    var favoriteScene: String?
    var styleTags: [String]?
}

// MARK: - Follow Up Models

struct FollowUp: Codable, Identifiable {
    let id: Int
    var content: String?
    var plannedAt: String?
    var completedAt: String?
    var status: String?
}

// MARK: - Booking Days Models

struct BookingDaysResponse: Codable {
    var days: [BookingDay]?
    var settings: BookingSettings?
}

struct BookingDay: Codable, Identifiable {
    var id: String { serviceDate }
    let serviceDate: String
    var accepting: Bool?
    var version: Int?
}

struct BookingSettings: Codable {
    var quickBookingEnabled: Bool?
}

// MARK: - Brand Profile Models

struct BrandProfile: Codable {
    var brandName: String?
    var tagline: String?
    var heroImageUrl: String?
    var experienceYears: Int?
    var specialties: [String]?
    var certificationTitle: String?
    var artistIntroduction: String?
    var aestheticPhilosophy: String?
    var publicationStatus: String?
    var shareTitle: String?
    var shareDescription: String?
    var shareCoverUrl: String?
}

// MARK: - Referral Models

struct ReferralRelation: Codable, Identifiable {
    let id: Int
    var referrer: ReferralUser?
    var referred: ReferralUser?
    var status: String?
    var createdAt: String?
}

struct ReferralUser: Codable {
    var nickname: String?
    var avatarUrl: String?
}
