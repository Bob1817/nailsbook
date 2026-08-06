import Foundation
import KeychainAccess

actor TokenManager {
    static let shared = TokenManager()

    private let keychain = Keychain(service: "cn.lunails.nailbook")
        .synchronizable(false)
        .accessibility(.whenUnlockedThisDeviceOnly)

    private enum Keys {
        static let clientAccessToken = "client_access_token"
        static let clientRefreshToken = "client_refresh_token"
        static let technicianAccessToken = "technician_access_token"
        static let technicianRefreshToken = "technician_refresh_token"
        static let userType = "user_type"
    }

    private init() {}

    // MARK: - Save

    func saveTokens(accessToken: String, refreshToken: String, role: UserRole) async {
        let prefix = role.rawValue
        keychain["\(prefix)_access_token"] = accessToken
        keychain["\(prefix)_refresh_token"] = refreshToken
        keychain["user_type"] = role.rawValue
    }

    // MARK: - Read

    func getAccessToken(for role: UserRole) -> String? {
        keychain["\(role.rawValue)_access_token"]
    }

    func getRefreshToken(for role: UserRole) -> String? {
        keychain["\(role.rawValue)_refresh_token"]
    }

    func getCurrentRole() -> UserRole? {
        guard let raw = keychain["user_type"] else { return nil }
        return UserRole(rawValue: raw)
    }

    // MARK: - Clear

    func clearTokens(for role: UserRole) {
        keychain["\(role.rawValue)_access_token"] = nil
        keychain["\(role.rawValue)_refresh_token"] = nil
    }

    func clearAll() {
        keychain[data: Keys.clientAccessToken] = nil
        keychain[data: Keys.clientRefreshToken] = nil
        keychain[data: Keys.technicianAccessToken] = nil
        keychain[data: Keys.technicianRefreshToken] = nil
        keychain[data: Keys.userType] = nil
    }
}

enum UserRole: String, Codable {
    case client
    case technician
}
