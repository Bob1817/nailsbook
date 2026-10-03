import Foundation
import KeychainAccess

actor TokenManager {
    static let shared = TokenManager()

    private let keychain: Keychain
    // Keychain 不可用时（如模拟器缺少签名权限）自动降级到 UserDefaults
    private let fallback = UserDefaults.standard
    private let fallbackPrefix = "nb_token_"

    private enum Keys {
        static let clientAccessToken = "client_access_token"
        static let clientRefreshToken = "client_refresh_token"
        static let technicianAccessToken = "technician_access_token"
        static let technicianRefreshToken = "technician_refresh_token"
        static let userType = "user_type"
    }

    init(keychain: Keychain = Keychain(service: "cn.lunails.nailbook")) {
        self.keychain = keychain.synchronizable(false).accessibility(.whenUnlockedThisDeviceOnly)
    }

    // MARK: - Save

    func saveTokens(accessToken: String, refreshToken: String, role: UserRole) async throws {
        let prefix = role.rawValue
        // 优先写 Keychain，失败则静默降级到 UserDefaults
        do {
            try keychain.set(accessToken, key: "\(prefix)_access_token")
            try keychain.set(refreshToken, key: "\(prefix)_refresh_token")
            if try keychain.get("user_type") == nil {
                try keychain.set(role.rawValue, key: "user_type")
            }
        } catch {
            // 降级：UserDefaults 存储（安全性较低但保证功能可用）
            fallback.set(accessToken, forKey: fallbackPrefix + "\(prefix)_access_token")
            fallback.set(refreshToken, forKey: fallbackPrefix + "\(prefix)_refresh_token")
            if fallback.string(forKey: fallbackPrefix + "user_type") == nil {
                fallback.set(role.rawValue, forKey: fallbackPrefix + "user_type")
            }
        }
    }

    func setCurrentRole(_ role: UserRole) throws {
        do {
            try keychain.set(role.rawValue, key: "user_type")
        } catch {
            fallback.set(role.rawValue, forKey: fallbackPrefix + "user_type")
        }
    }

    // MARK: - Read

    func getAccessToken(for role: UserRole) -> String? {
        keychain["\(role.rawValue)_access_token"]
            ?? fallback.string(forKey: fallbackPrefix + "\(role.rawValue)_access_token")
    }

    func getRefreshToken(for role: UserRole) -> String? {
        keychain["\(role.rawValue)_refresh_token"]
            ?? fallback.string(forKey: fallbackPrefix + "\(role.rawValue)_refresh_token")
    }

    func getCurrentRole() -> UserRole? {
        let raw = keychain["user_type"] ?? fallback.string(forKey: fallbackPrefix + "user_type")
        guard let raw else { return nil }
        return UserRole(rawValue: raw)
    }

    // MARK: - Clear

    func clearTokens(for role: UserRole) {
        keychain["\(role.rawValue)_access_token"] = nil
        keychain["\(role.rawValue)_refresh_token"] = nil
        fallback.removeObject(forKey: fallbackPrefix + "\(role.rawValue)_access_token")
        fallback.removeObject(forKey: fallbackPrefix + "\(role.rawValue)_refresh_token")
    }

    func clearAll() {
        keychain[data: Keys.clientAccessToken] = nil
        keychain[data: Keys.clientRefreshToken] = nil
        keychain[data: Keys.technicianAccessToken] = nil
        keychain[data: Keys.technicianRefreshToken] = nil
        keychain[data: Keys.userType] = nil
        for key in [Keys.clientAccessToken, Keys.clientRefreshToken, Keys.technicianAccessToken, Keys.technicianRefreshToken, Keys.userType] {
            fallback.removeObject(forKey: fallbackPrefix + key)
        }
    }
}

enum UserRole: String, Codable {
    case client
    case technician
}
