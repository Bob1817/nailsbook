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
    var viewCount: Int?
    var createdAt: String?
    var updatedAt: String?
    var technicianId: Int?
    var technicianName: String?
    var technicianAvatarUrl: String?
    var technician: WorkTechnician? {
        guard let id = technicianId ?? techId else { return nil }
        return WorkTechnician(id: id, name: technicianName, avatarUrl: technicianAvatarUrl)
    }
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
