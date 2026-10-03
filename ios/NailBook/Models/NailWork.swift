import Foundation

// MARK: - NailWork Models

struct NailWork: Codable, Identifiable {
    let id: Int
    var techId: Int?
    var title: String?
    var coverUrl: String?
    var imageUrls: [String]?
    var images: [String]? { imageUrls }
    var description: String?
    var tags: [String]?
    var isVisible: Bool?
    var isPinned: Bool?
    var isFeatured: Bool?
    var publicationStatus: String?
    var visibilityScope: String?
    var archivedAt: String?
    var reviewNote: String?
    var sortOrder: Int?
    var price: Double?
    var priceText: String?
    var standardPriceFen: Int?
    var serviceSubtotalFen: Int?
    var priceCents: Int?
    var viewCount: Int?
    var createdAt: String?
    var updatedAt: String?
    var technicianId: Int?
    var technicianName: String?
    var technicianAvatarUrl: String?
    var technicianShopName: String?
    var technicianShopAddress: String?
    var technician: WorkTechnician? {
        guard let id = technicianId ?? techId else { return nil }
        return WorkTechnician(id: id, name: technicianName, avatarUrl: technicianAvatarUrl)
    }
    var isLiked: Bool?
    var isFavorited: Bool?
    var likeCount: Int?
    var favoriteCount: Int?
    var commentCount: Int?
    var totalDurationMinutes: Int?
    var serviceLines: [WorkServiceLine]?

    /// 价格口径对齐小程序 formatCardPrice：priceText → 分单位字段换算 → price 元
    var displayPrice: String? {
        if let priceText = priceText, !priceText.isEmpty { return priceText }
        let fen = standardPriceFen ?? serviceSubtotalFen ?? priceCents ?? 0
        let yuan = Double(fen) / 100
        if yuan > 0 {
            return yuan == yuan.rounded()
                ? "¥\(String(format: "%.0f", yuan))"
                : "¥\(String(format: "%.1f", yuan))"
        }
        let value = price ?? 0
        return value > 0 ? "¥\(String(format: "%.0f", value))" : nil
    }
}

struct WorkTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var avatarUrl: String?
    var city: String?
}

/// 作品服务线（预约同款读取的服务项目与报价）
struct WorkServiceLine: Codable, Identifiable {
    var servicePublicIdSnapshot: String?
    var nameSnapshot: String
    var unitPriceFen: Int
    var durationMinutes: Int
    var quantity: Int
    var subtotalFen: Int
    var id: String { servicePublicIdSnapshot ?? nameSnapshot }
}

struct NailWorkComment: Codable, Identifiable {
    let id: Int
    let workId: Int
    var content: String
    var clientId: Int?
    var technicianId: Int?
    var parentId: Int?
    var isPinned: Bool?
    var isHidden: Bool?
    var createdAt: String?
    var client: CommentUser?
    var technician: CommentTechnician?
    var replies: [NailWorkComment]?
}

struct CommentUser: Codable, Identifiable {
    let id: Int
    var nickname: String?
    var avatarUrl: String?
}

struct CommentTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var avatarUrl: String?
}
