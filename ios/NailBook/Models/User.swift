import Foundation

// MARK: - User Models

struct ClientUser: Codable, Identifiable {
    let id: Int
    var nickname: String?
    let phone: String
    var avatarUrl: String?
    var city: String?
    var bio: String?
    let status: String?
}

struct TechnicianProfile: Codable, Identifiable {
    let id: Int
    var name: String
    let phone: String
    var avatarUrl: String?
    var city: String?
    var serviceArea: String?
    var homeService: Bool?
    var shopService: Bool?
    var status: String?
    var invitationCode: String?
    var customTags: [String]?
    var bookingReady: Bool?
}

struct ClientAuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let client: ClientUser?
    let technician: TechnicianProfile?
    let technicians: [TechnicianProfile]?
}

struct TechnicianAuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let technician: TechnicianProfile
    let mustChangePassword: Bool?
}

struct PhoneStatus: Codable {
    let exists: Bool
    let activated: Bool?
}
