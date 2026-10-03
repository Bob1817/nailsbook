import Foundation

// MARK: - Failable Array Element Decoder
// 解码数组时单个元素失败不影响其他元素

struct FailableDecodable<T: Decodable>: Decodable {
    let value: T?
    init(from decoder: Decoder) throws {
        value = try? T(from: decoder)
    }
}

// MARK: - User Models

struct ClientUser: Codable, Identifiable {
    let id: Int
    var nickname: String?
    let phone: String
    var avatarUrl: String?
    var city: String?
    var bio: String?
    let status: String?
    var technicians: [BoundTechnician]?
    var pendingTechnicians: [BoundTechnician]?

    enum CodingKeys: String, CodingKey {
        case id, nickname, phone, avatarUrl, city, bio, status, technicians, pendingTechnicians
    }

    // 容错解码：嵌套数组（美甲师列表）逐元素容错，单个失败不影响其他
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        nickname = try c.decodeIfPresent(String.self, forKey: .nickname)
        phone = try c.decode(String.self, forKey: .phone)
        avatarUrl = try c.decodeIfPresent(String.self, forKey: .avatarUrl)
        city = try c.decodeIfPresent(String.self, forKey: .city)
        bio = try c.decodeIfPresent(String.self, forKey: .bio)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        technicians = Self.decodeLenientArray(from: c, forKey: .technicians)
        pendingTechnicians = Self.decodeLenientArray(from: c, forKey: .pendingTechnicians)
    }

    // 逐元素容错解码：单个元素失败时跳过，不拖垮整个数组
    private static func decodeLenientArray<T: Decodable>(from container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> [T]? {
        guard let raw = try? container.decodeIfPresent([FailableDecodable<T>].self, forKey: key) else { return nil }
        return raw.compactMap { $0.value }
    }

    init(id: Int, nickname: String? = nil, phone: String, avatarUrl: String? = nil, city: String? = nil, bio: String? = nil, status: String? = nil, technicians: [BoundTechnician]? = nil, pendingTechnicians: [BoundTechnician]? = nil) {
        self.id = id
        self.nickname = nickname
        self.phone = phone
        self.avatarUrl = avatarUrl
        self.city = city
        self.bio = bio
        self.status = status
        self.technicians = technicians
        self.pendingTechnicians = pendingTechnicians
    }
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
    var shopAddresses: [ShopAddress]?
    var showPhone: Bool?
    var showLocation: Bool?
    var allowSearch: Bool?
}

struct ClientAuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let client: ClientUser?
    let technician: TechnicianProfile?
    let technicians: [TechnicianProfile]?
    var roles: [String]?
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

// MARK: - Shop Address Models

struct ShopAddress: Codable, Identifiable {
    let id: String
    var name: String
    var province: String?
    var city: String?
    var district: String?
    var detailAddress: String
    var latitude: Double?
    var longitude: Double?
    var phone: String?
    var enabled: Bool
    var businessHours: [BusinessHour]?
    var guidance: ShopGuidance?

    var address: String {
        [province, city, district, detailAddress].compactMap { $0 }.joined()
    }

    // 自定义解码以处理后端数据格式
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // id字段可能不存在，使用name作为备用标识
        if let intId = try? container.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else if let stringId = try? container.decode(String.self, forKey: .id) {
            id = stringId
        } else {
            // 后端没有返回id字段，使用name+detailAddress生成唯一标识
            let name = try container.decode(String.self, forKey: .name)
            let detail = try container.decodeIfPresent(String.self, forKey: .detailAddress) ?? ""
            id = "\(name)_\(detail)"
        }

        name = try container.decode(String.self, forKey: .name)
        province = try container.decodeIfPresent(String.self, forKey: .province)
        city = try container.decodeIfPresent(String.self, forKey: .city)
        district = try container.decodeIfPresent(String.self, forKey: .district)
        detailAddress = try container.decodeIfPresent(String.self, forKey: .detailAddress) ?? ""

        // latitude/longitude可能是String或Double
        if let latDouble = try? container.decodeIfPresent(Double.self, forKey: .latitude) {
            latitude = latDouble
        } else if let latString = try? container.decodeIfPresent(String.self, forKey: .latitude),
                  let lat = Double(latString) {
            latitude = lat
        } else {
            latitude = nil
        }

        if let lngDouble = try? container.decodeIfPresent(Double.self, forKey: .longitude) {
            longitude = lngDouble
        } else if let lngString = try? container.decodeIfPresent(String.self, forKey: .longitude),
                  let lng = Double(lngString) {
            longitude = lng
        } else {
            longitude = nil
        }

        phone = try container.decodeIfPresent(String.self, forKey: .phone)
        enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? true
        businessHours = try container.decodeIfPresent([BusinessHour].self, forKey: .businessHours)
        guidance = try container.decodeIfPresent(ShopGuidance.self, forKey: .guidance)
    }

    init(id: String = UUID().uuidString, name: String, province: String? = nil, city: String? = nil, district: String? = nil, detailAddress: String, latitude: Double? = nil, longitude: Double? = nil, phone: String? = nil, enabled: Bool = true, businessHours: [BusinessHour]? = nil, guidance: ShopGuidance? = nil) {
        self.id = id
        self.name = name
        self.province = province
        self.city = city
        self.district = district
        self.detailAddress = detailAddress
        self.latitude = latitude
        self.longitude = longitude
        self.phone = phone
        self.enabled = enabled
        self.businessHours = businessHours
        self.guidance = guidance
    }

    enum CodingKeys: String, CodingKey {
        case id, name, province, city, district, detailAddress, latitude, longitude, phone, enabled, businessHours, guidance
    }
}

struct BusinessHour: Codable {
    var weekday: Int
    var start: String
    var end: String
    var closed: Bool
}

struct ShopGuidance: Codable {
    var enabled: Bool
    var metro: GuidanceSection?
    var bus: GuidanceSection?
    var driving: GuidanceSection?
}

struct GuidanceSection: Codable {
    var text: String?
    var images: [String]?
    var blocks: [GuidanceBlock]?
}

struct GuidanceBlock: Codable {
    var type: String?
    var url: String?
    var text: String?
}

enum AccountValidation {
    static func validPassword(_ password: String) -> Bool {
        password.count >= 8 && password.range(of: "[a-zA-Z]", options: .regularExpression) != nil && password.range(of: "[0-9]", options: .regularExpression) != nil
    }
}
