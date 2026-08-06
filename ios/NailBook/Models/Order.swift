import Foundation

// MARK: - Order Models

struct Order: Codable, Identifiable {
    let id: Int
    let orderNo: String
    var status: String
    var serviceType: String?
    var quotePrice: Double?
    var startTime: String?
    var endTime: String?
    var address: String?
    var remark: String?
    var customTitle: String?
    var customDescription: String?
    var customImages: [String]?
    var clientPhotos: [String]?
    var isDepositPaid: Bool?
    var depositAmount: Double?
    var quoteRemark: String?
    var cancelReason: String?
    var confirmedAt: String?
    var completedAt: String?
    var cancelledAt: String?
    var createdAt: String?
    var technician: OrderTechnician?
    var customer: OrderCustomer?
    var clientUser: OrderClientUser?
    var addressDetail: OrderAddress?
}

struct OrderTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var avatarUrl: String?
    var phone: String?
}

struct OrderCustomer: Codable, Identifiable {
    let id: Int
    var name: String?
    var phone: String?
}

struct OrderClientUser: Codable, Identifiable {
    let id: Int
    var nickname: String?
    var avatarUrl: String?
}

struct OrderAddress: Codable, Identifiable {
    let id: Int
    var contactName: String?
    var contactPhone: String?
    var province: String?
    var city: String?
    var district: String?
    var detailAddress: String?
}

// MARK: - Order Status

enum OrderStatus: String, Codable, CaseIterable {
    case pendingQuote = "pending_quote"
    case quoted
    case pendingConfirm = "pending_confirm"
    case pendingHome = "pending_home"
    case pendingShop = "pending_shop"
    case inProgress = "in_progress"
    case completed
    case cancelled
    case expired

    var displayName: String {
        switch self {
        case .pendingQuote: return "待报价"
        case .quoted: return "已报价"
        case .pendingConfirm: return "待确认"
        case .pendingHome: return "待上门"
        case .pendingShop: return "待到店"
        case .inProgress: return "服务中"
        case .completed: return "已完成"
        case .cancelled: return "已取消"
        case .expired: return "已过期"
        }
    }
}
