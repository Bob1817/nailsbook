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
    var shopName: String?
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
    // 对齐 wxapp order-detail 所需字段
    var bookingPhase: String?
    var expectedDate: String?
    var expectedTimeSlot: String?
    var totalDurationMinutes: Int?
    var serviceLines: [OrderServiceLine]?
    var sourceWork: OrderSourceWork?
}

/// 订单服务线明细（后端 mapOrder.serviceLines，金额为分）
struct OrderServiceLine: Codable, Identifiable {
    let id: Int?
    let serviceId: Int?
    let servicePublicId: String?
    let name: String
    let unitPriceFen: Int?
    let durationMinutes: Int?
    let quantity: Int?
    let subtotalFen: Int?
}

/// 预约来源作品
struct OrderSourceWork: Codable, Identifiable {
    let id: Int
    let title: String?
    let coverUrl: String?
    let standardPriceFen: Int?
    let priceText: String?

    var displayPriceText: String? {
        if let priceText, !priceText.isEmpty { return priceText }
        if let fen = standardPriceFen, fen > 0 {
            let yuan = Double(fen) / 100
            return yuan == yuan.rounded() ? "¥\(String(format: "%.0f", yuan))" : "¥\(String(format: "%.1f", yuan))"
        }
        return nil
    }
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

extension Order {
    enum CodingKeys: String, CodingKey {
        case id, orderNo, status, serviceType, quotePrice, startTime, endTime, address, remark, customTitle, customDescription, customImages, clientPhotos, isDepositPaid, depositAmount, quoteRemark, cancelReason, confirmedAt, completedAt, cancelledAt, createdAt, technician, customer, clientUser, addressDetail
        case bookingPhase, expectedDate, expectedTimeSlot, totalDurationMinutes, serviceLines, sourceWork
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        id = try values.decode(Int.self, forKey: .id)
        orderNo = try values.decode(String.self, forKey: .orderNo)
        status = try values.decode(String.self, forKey: .status)
        serviceType = try values.decodeIfPresent(String.self, forKey: .serviceType)
        quotePrice = try values.decodeIfPresent(Double.self, forKey: .quotePrice)
        startTime = try values.decodeIfPresent(String.self, forKey: .startTime)
        endTime = try values.decodeIfPresent(String.self, forKey: .endTime)
        address = try values.decodeIfPresent(String.self, forKey: .address)
        remark = try values.decodeIfPresent(String.self, forKey: .remark)
        customTitle = try values.decodeIfPresent(String.self, forKey: .customTitle)
        customDescription = try values.decodeIfPresent(String.self, forKey: .customDescription)
        if let array = try? values.decode([String].self, forKey: .customImages) {
            customImages = array
        } else if let json = try values.decodeIfPresent(String.self, forKey: .customImages) {
            customImages = try JSONDecoder().decode([String].self, from: Data(json.utf8))
        } else { customImages = nil }
        if let array = try? values.decode([String].self, forKey: .clientPhotos) {
            clientPhotos = array
        } else if let json = try values.decodeIfPresent(String.self, forKey: .clientPhotos) {
            clientPhotos = try JSONDecoder().decode([String].self, from: Data(json.utf8))
        } else { clientPhotos = nil }
        isDepositPaid = try values.decodeIfPresent(Bool.self, forKey: .isDepositPaid)
        depositAmount = try values.decodeIfPresent(Double.self, forKey: .depositAmount)
        quoteRemark = try values.decodeIfPresent(String.self, forKey: .quoteRemark)
        cancelReason = try values.decodeIfPresent(String.self, forKey: .cancelReason)
        confirmedAt = try values.decodeIfPresent(String.self, forKey: .confirmedAt)
        completedAt = try values.decodeIfPresent(String.self, forKey: .completedAt)
        cancelledAt = try values.decodeIfPresent(String.self, forKey: .cancelledAt)
        createdAt = try values.decodeIfPresent(String.self, forKey: .createdAt)
        technician = try values.decodeIfPresent(OrderTechnician.self, forKey: .technician)
        customer = try values.decodeIfPresent(OrderCustomer.self, forKey: .customer)
        clientUser = try values.decodeIfPresent(OrderClientUser.self, forKey: .clientUser)
        addressDetail = try values.decodeIfPresent(OrderAddress.self, forKey: .addressDetail)
        bookingPhase = try values.decodeIfPresent(String.self, forKey: .bookingPhase)
        expectedDate = try values.decodeIfPresent(String.self, forKey: .expectedDate)
        expectedTimeSlot = try values.decodeIfPresent(String.self, forKey: .expectedTimeSlot)
        totalDurationMinutes = try values.decodeIfPresent(Int.self, forKey: .totalDurationMinutes)
        serviceLines = try values.decodeIfPresent([OrderServiceLine].self, forKey: .serviceLines)
        sourceWork = try values.decodeIfPresent(OrderSourceWork.self, forKey: .sourceWork)
    }
}
