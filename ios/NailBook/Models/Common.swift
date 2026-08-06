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
    let clientId: Int
    let techId: Int
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
    let id: Int
    let technicianId: Int
    var name: String
    var description: String?
    var price: Double?
    var duration: Int?
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
    var featuredWorks: [NailWork]?
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
