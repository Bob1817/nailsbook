import Foundation

// MARK: - NailWork Models

struct NailWork: Codable, Identifiable {
    let id: Int
    let techId: Int
    var title: String?
    var coverUrl: String?
    var images: [String]?
    var description: String?
    var tags: [String]?
    var isVisible: Bool?
    var isPinned: Bool?
    var isFeatured: Bool?
    var sortOrder: Int?
    var price: Double?
    var viewCount: Int?
    var createdAt: String?
    var updatedAt: String?
    var technician: WorkTechnician?
    var isLiked: Bool?
    var isFavorited: Bool?
    var likeCount: Int?
    var favoriteCount: Int?
    var commentCount: Int?
}

struct WorkTechnician: Codable, Identifiable {
    let id: Int
    var name: String?
    var avatarUrl: String?
    var city: String?
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
